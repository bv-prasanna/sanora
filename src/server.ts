import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma, PrismaClient, UserRole, LedgerType, LedgerStatus, EstimateStatus } from "@prisma/client";
import { z, ZodError } from "zod";
import { randomUUID } from "node:crypto";
import { calculateProjectBalance } from "./domain/ledger-balance";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) throw new Error("JWT_SECRET must be configured with at least 32 characters.");

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map(s => s.trim()), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));

type AuthUser = { id: string; email: string; role: UserRole };
type AuthedRequest = Request & { user?: AuthUser };
const asyncRoute = (fn: (req: AuthedRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req as AuthedRequest, res)).catch(next);

function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: { code: "AUTH_REQUIRED", message: "Please sign in to continue." } });
  try {
    req.user = jwt.verify(token, jwtSecret!) as AuthUser;
    next();
  } catch {
    return res.status(401).json({ error: { code: "SESSION_INVALID", message: "Your session has expired. Please sign in again." } });
  }
}
const allow = (...roles: UserRole[]) => (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: { code: "ACCESS_DENIED", message: "You do not have permission to perform this action." } });
  next();
};
const staffRoles = [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.BRANCH_MANAGER, UserRole.SITE_ENGINEER, UserRole.PROCUREMENT, UserRole.FINANCE];
const financeRoles = [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.FINANCE];
const projectAccess = async (user: AuthUser, projectId: string) => {
  if (user.role !== UserRole.CUSTOMER) return true;
  const member = await prisma.projectMember.findFirst({ where: { projectId, userId: user.id } });
  const project = await prisma.project.findFirst({ where: { id: projectId, customerId: user.id } });
  return Boolean(member || project);
};
const money = (v: Prisma.Decimal | number | string) => new Prisma.Decimal(v);
const audit = (tx: Prisma.TransactionClient, actorId: string, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) =>
  tx.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } });

app.get("/health", (_req, res) => res.json({ status: "ok", service: "sanora-api", timestamp: new Date().toISOString() }));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user || !user.active || !(await bcrypt.compare(body.password, user.passwordHash))) {
    return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret!, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));
app.get("/api/auth/me", authenticate, asyncRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true, role: true, active: true } });
  if (!user?.active) return res.status(401).json({ error: { code: "ACCOUNT_DISABLED", message: "This account is not active." } });
  return res.json({ user });
}));

app.get("/api/projects", authenticate, asyncRoute(async (req, res) => {
  const where = req.user!.role === UserRole.CUSTOMER
    ? { OR: [{ customerId: req.user!.id }, { members: { some: { userId: req.user!.id } } }] }
    : {};
  const projects = await prisma.project.findMany({ where, orderBy: { updatedAt: "desc" }, include: { estimates: { orderBy: { version: "desc" }, take: 1, include: { lines: true } } } });
  return res.json({ projects });
}));
app.post("/api/projects", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().min(2).max(120), customerId: z.string().uuid(), location: z.string().max(180).optional(), description: z.string().max(2000).optional() }).parse(req.body);
  const code = "SNR-" + new Date().getFullYear().toString().slice(-2) + "-" + randomUUID().slice(0, 6).toUpperCase();
  const project = await prisma.$transaction(async tx => {
    const p = await tx.project.create({ data: { ...body, code, createdById: req.user!.id } });
    await tx.projectMember.create({ data: { projectId: p.id, userId: body.customerId, access: "VIEW" } });
    await audit(tx, req.user!.id, "PROJECT_CREATED", "Project", p.id, { code, customerId: body.customerId });
    return p;
  });
  return res.status(201).json({ project });
}));
app.get("/api/projects/:id", authenticate, asyncRoute(async (req, res) => {
  if (!(await projectAccess(req.user!, req.params.id))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: { estimates: { orderBy: { version: "desc" }, include: { lines: true } }, commitments: true } });
  if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  return res.json({ project });
}));

const lineSchema = z.object({
  category: z.enum(["MATERIAL", "LABOUR", "SERVICE", "OTHER"]),
  description: z.string().min(2).max(240),
  specification: z.string().max(500).optional(),
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().min(1).max(24),
  unitRate: z.number().nonnegative().max(1_000_000_000)
});
app.post("/api/projects/:id/estimates", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const body = z.object({ title: z.string().min(2).max(160), assumptions: z.string().max(4000).optional(), exclusions: z.string().max(4000).optional(), validUntil: z.string().datetime().optional(), lines: z.array(lineSchema).min(1).max(500) }).parse(req.body);
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const estimate = await prisma.$transaction(async tx => {
    const last = await tx.estimate.findFirst({ where: { projectId: project.id }, orderBy: { version: "desc" } });
    const created = await tx.estimate.create({ data: {
      projectId: project.id, version: (last?.version || 0) + 1, title: body.title,
      assumptions: body.assumptions, exclusions: body.exclusions,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined, createdById: req.user!.id,
      lines: { create: body.lines.map(l => ({ ...l, quantity: money(l.quantity), unitRate: money(l.unitRate) })) }
    }, include: { lines: true } });
    await audit(tx, req.user!.id, "ESTIMATE_CREATED", "Estimate", created.id, { projectId: project.id, version: created.version });
    return created;
  });
  const total = estimate.lines.reduce((sum, line) => sum.plus(line.quantity.mul(line.unitRate)), money(0));
  return res.status(201).json({ estimate, indicativeTotal: total.toFixed(2), currency: "INR", disclaimer: "Indicative estimate only; actual material and labour costs may vary with approved scope, quantities, specifications, site conditions and prevailing rates." });
}));
app.post("/api/estimates/:id/submit", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const estimate = await prisma.estimate.findUnique({ where: { id: req.params.id } });
  if (!estimate || estimate.status !== EstimateStatus.DRAFT) return res.status(409).json({ error: { code: "ESTIMATE_NOT_DRAFT", message: "Only a draft estimate can be submitted." } });
  const updated = await prisma.estimate.update({ where: { id: estimate.id }, data: { status: EstimateStatus.SUBMITTED } });
  return res.json({ estimate: updated });
}));
app.post("/api/estimates/:id/approve", authenticate, allow(...financeRoles), asyncRoute(async (req, res) => {
  const estimate = await prisma.$transaction(async tx => {
    const current = await tx.estimate.findUnique({ where: { id: req.params.id } });
    if (!current || current.status !== EstimateStatus.SUBMITTED) throw Object.assign(new Error("Only a submitted estimate can be approved."), { status: 409, code: "ESTIMATE_NOT_SUBMITTED" });
    await tx.estimate.updateMany({ where: { projectId: current.projectId, status: EstimateStatus.APPROVED }, data: { status: EstimateStatus.SUPERSEDED } });
    const updated = await tx.estimate.update({ where: { id: current.id }, data: { status: EstimateStatus.APPROVED, approvedAt: new Date() } });
    await audit(tx, req.user!.id, "ESTIMATE_APPROVED", "Estimate", updated.id, { projectId: current.projectId });
    return updated;
  });
  return res.json({ estimate });
}));

const ledgerSchema = z.object({
  type: z.enum(["TOP_UP", "MATERIAL_EXPENSE", "LABOUR_EXPENSE", "OTHER_EXPENSE", "REFUND"]),
  amount: z.number().positive().max(1_000_000_000),
  description: z.string().min(3).max(500),
  reference: z.string().max(120).optional(),
  vendorOrWorker: z.string().max(180).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().max(24).optional(),
  unitRate: z.number().nonnegative().optional(),
  invoiceNumber: z.string().max(100).optional(),
  evidenceUrl: z.string().url().optional()
});
app.post("/api/projects/:id/ledger", authenticate, asyncRoute(async (req, res) => {
  const body = ledgerSchema.parse(req.body);
  const projectId = req.params.id;
  if (!(await projectAccess(req.user!, projectId))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  if (req.user!.role === UserRole.CUSTOMER && body.type !== "TOP_UP") return res.status(403).json({ error: { code: "CUSTOMER_LEDGER_RESTRICTED", message: "Customers can submit top-up receipts. Expense entries are recorded by authorised project staff." } });
  if (body.type === "TOP_UP" && ![...financeRoles, UserRole.CUSTOMER].includes(req.user!.role)) return res.status(403).json({ error: { code: "TOP_UP_ROLE_REQUIRED", message: "Only customers or finance staff can record a top-up receipt." } });
  if (body.type === "REFUND" && !financeRoles.includes(req.user!.role)) return res.status(403).json({ error: { code: "FINANCE_APPROVAL_REQUIRED", message: "Only finance-authorised users can submit project refunds." } });
  if (body.type !== "TOP_UP" && !staffRoles.includes(req.user!.role)) return res.status(403).json({ error: { code: "STAFF_ROLE_REQUIRED", message: "Only authorised project staff can submit expenses." } });
  const key = req.header("Idempotency-Key");
  if (!key || key.length < 8 || key.length > 120) return res.status(400).json({ error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "Provide a unique Idempotency-Key header for this transaction." } });
  const entry = await prisma.$transaction(async tx => {
    const exists = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: key } });
    if (exists) {
      if (exists.projectId !== projectId || exists.createdById !== req.user!.id) {
        throw Object.assign(new Error("This idempotency key has already been used for another request."), { status: 409, code: "IDEMPOTENCY_KEY_CONFLICT" });
      }
      return exists;
    }
    const created = await tx.ledgerEntry.create({ data: {
      projectId, type: body.type as LedgerType, amount: money(body.amount),
      description: body.description, reference: body.reference, vendorOrWorker: body.vendorOrWorker,
      quantity: body.quantity === undefined ? undefined : money(body.quantity),
      unit: body.unit, unitRate: body.unitRate === undefined ? undefined : money(body.unitRate),
      invoiceNumber: body.invoiceNumber, evidenceUrl: body.evidenceUrl,
      idempotencyKey: key, createdById: req.user!.id,
      status: body.type === "TOP_UP" ? LedgerStatus.PENDING : LedgerStatus.PENDING
    } });
    await audit(tx, req.user!.id, "LEDGER_ENTRY_SUBMITTED", "LedgerEntry", created.id, { projectId, type: body.type, amount: body.amount });
    return created;
  });
  return res.status(201).json({ entry, message: "Entry submitted. It will affect the project balance only after authorised verification and posting." });
}));
app.post("/api/ledger/:id/approve", authenticate, allow(...financeRoles), asyncRoute(async (req, res) => {
  const entry = await prisma.$transaction(async tx => {
    const current = await tx.ledgerEntry.findUnique({ where: { id: req.params.id } });
    if (!current || current.status !== LedgerStatus.PENDING) throw Object.assign(new Error("This entry is not awaiting approval."), { status: 409, code: "LEDGER_NOT_PENDING" });
    const updated = await tx.ledgerEntry.update({ where: { id: current.id }, data: { status: LedgerStatus.APPROVED, approvedById: req.user!.id, approvedAt: new Date() } });
    await audit(tx, req.user!.id, "LEDGER_ENTRY_APPROVED", "LedgerEntry", updated.id, { projectId: current.projectId });
    return updated;
  });
  return res.json({ entry });
}));
app.post("/api/ledger/:id/post", authenticate, allow(...financeRoles), asyncRoute(async (req, res) => {
  const entry = await prisma.$transaction(async tx => {
    const current = await tx.ledgerEntry.findUnique({ where: { id: req.params.id } });
    if (!current || current.status !== LedgerStatus.APPROVED) throw Object.assign(new Error("Only an approved entry can be posted."), { status: 409, code: "LEDGER_NOT_APPROVED" });
    const posted = await tx.ledgerEntry.update({ where: { id: current.id }, data: { status: LedgerStatus.POSTED, postedAt: new Date() } });
    await audit(tx, req.user!.id, "LEDGER_ENTRY_POSTED", "LedgerEntry", posted.id, { projectId: current.projectId });
    return posted;
  });
  return res.json({ entry, message: "Entry posted to the project ledger." });
}));
app.get("/api/projects/:id/ledger", authenticate, asyncRoute(async (req, res) => {
  const projectId = req.params.id;
  if (!(await projectAccess(req.user!, projectId))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const [entries, commitments] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { projectId, status: LedgerStatus.POSTED }, orderBy: { postedAt: "desc" } }),
    prisma.commitment.findMany({ where: { projectId, status: { in: ["OPEN", "PARTIALLY_FULFILLED"] } } })
  ]);
  const summary = calculateProjectBalance(entries.map(e => ({ type: e.type, amount: e.amount })), commitments);
  return res.json({ entries, summary: { currency: "INR", ...summary }, note: "Only posted ledger entries affect actual balances. Pending commitments are shown separately and are not double-deducted from actual expenses." });
}));
app.post("/api/projects/:id/commitments", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const body = z.object({ description: z.string().min(3).max(300), vendor: z.string().max(180).optional(), amount: z.number().positive(), reference: z.string().max(120).optional() }).parse(req.body);
  const commitment = await prisma.commitment.create({ data: { projectId: req.params.id, ...body, amount: money(body.amount) } });
  return res.status(201).json({ commitment });
}));

app.use((req, res) => res.status(404).json({ error: { code: "ROUTE_NOT_FOUND", message: "The requested service endpoint was not found." } }));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Please check the submitted information.", details: err.issues.map(i => ({ field: i.path.join("."), message: i.message })) } });
  const e = err as { status?: number; code?: string; message?: string };
  if (e.status) return res.status(e.status).json({ error: { code: e.code || "REQUEST_FAILED", message: e.message || "The request could not be completed." } });
  if (e.code === "P2002") return res.status(409).json({ error: { code: "DUPLICATE_REQUEST", message: "This request has already been recorded." } });
  console.error("Unhandled API error", err);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again or contact support." } });
});

app.listen(port, () => console.log(`Sanora API listening on :${port}`));
process.on("SIGINT", async () => { await prisma.$disconnect(); process.exit(0); });
process.on("SIGTERM", async () => { await prisma.$disconnect(); process.exit(0); });
