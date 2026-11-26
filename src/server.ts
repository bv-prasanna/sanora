import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma, PrismaClient, UserRole, LedgerType, LedgerStatus, EstimateStatus, PurchaseOrderStatus, LabourRecordStatus, ProjectUpdateCategory, ProjectDocumentCategory, ProjectDocumentStatus, TopUpRequestStatus, ProjectMilestoneStatus, ProjectTaskStatus, ProjectTaskPriority } from "@prisma/client";
import { z, ZodError } from "zod";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { calculateProjectBalance, type PostedLedgerLine } from "./domain/ledger-balance.js";
import { hasSanoraPermission, redactAuditMetadata, estimateProjectTotal, validateProjectTransition, validateTaskTransition, validateMilestoneTransition } from "./skeleton/policies.mjs";

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
const routeParam = (req: Request, key: string): string => { const value = req.params[key]; if (typeof value !== "string") throw Object.assign(new Error("Invalid route parameter."), { status: 400, code: "INVALID_ROUTE_PARAMETER" }); return value; };
const asyncRoute = (fn: (req: AuthedRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req as AuthedRequest, res)).catch(next);

async function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: { code: "AUTH_REQUIRED", message: "Please sign in to continue." } });
  let claims: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, jwtSecret!);
    if (typeof decoded === "string" || typeof decoded.id !== "string") throw new Error("Invalid session claims");
    claims = decoded;
  } catch {
    return res.status(401).json({ error: { code: "SESSION_INVALID", message: "Your session has expired. Please sign in again." } });
  }
  // Refresh account state and role on every request so deactivation and role changes take effect immediately.
  const currentUser = await prisma.user.findUnique({
    where: { id: claims.id },
    select: { id: true, email: true, role: true, active: true }
  });
  if (!currentUser?.active) return res.status(401).json({ error: { code: "ACCOUNT_DISABLED", message: "This account is not active. Please contact Sanora support." } });
  req.user = { id: currentUser.id, email: currentUser.email, role: currentUser.role };
  return next();
}
const allow = (...roles: UserRole[]) => (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role) || !hasSanoraPermission([req.user.role], "edit")) return res.status(403).json({ error: { code: "ACCESS_DENIED", message: "You do not have permission to perform this action." } });
  next();
};
const allowView = (...roles: UserRole[]) => (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role) || !hasSanoraPermission([req.user.role], "view")) return res.status(403).json({ error: { code: "ACCESS_DENIED", message: "You do not have permission to view this information." } });
  next();
};
const staffRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.BRANCH_MANAGER, UserRole.BRANCH_PARTNER, UserRole.SALES, UserRole.SITE_ENGINEER, UserRole.PROCUREMENT, UserRole.FINANCE];
const expenseRoles: UserRole[] = staffRoles.filter(role => role !== UserRole.SALES);
const financeRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.FINANCE];
const projectWideViewRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.FINANCE, UserRole.AUDITOR];
const projectWideEditRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.FINANCE];
const projectAccess = async (user: AuthUser, projectId: string, requiredAccess: "VIEW" | "UPDATE" | "MANAGE" = "VIEW") => {
  if (projectWideEditRoles.includes(user.role)) return true;
  if (requiredAccess === "VIEW" && projectWideViewRoles.includes(user.role)) return true;
  const [member, project] = await Promise.all([
    prisma.projectMember.findFirst({ where: { projectId, userId: user.id }, select: { access: true } }),
    prisma.project.findUnique({ where: { id: projectId }, select: { customerId: true, createdById: true } })
  ]);
  if (!project) return false;
  if (project.createdById === user.id) return true;
  if (project.customerId === user.id) return requiredAccess === "VIEW";
  if (!member) return false;
  if (requiredAccess === "VIEW") return true;
  if (requiredAccess === "UPDATE") return member.access === "UPDATE" || member.access === "MANAGE";
  return member.access === "MANAGE";
};

const documentMaxBytes = 15 * 1024 * 1024;
const allowedDocumentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
let privateObjectStore: S3Client | null = null;
function getPrivateObjectStore() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw Object.assign(new Error("Private document storage is not configured. Please contact the administrator."), { status: 503, code: "DOCUMENT_STORAGE_NOT_CONFIGURED" });
  if (!privateObjectStore) {
    privateObjectStore = new S3Client({
      region: process.env.S3_REGION || "ap-south-1",
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? {
        credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
      } : {}),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true"
    });
  }
  return { client: privateObjectStore, bucket };
}
const documentUploadSchema = z.object({
  fileName: z.string().min(1).max(180),
  contentType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(documentMaxBytes),
  category: z.nativeEnum(ProjectDocumentCategory).default(ProjectDocumentCategory.OTHER),
  description: z.string().max(500).optional()
});
const safeFileName = (name: string) => name.replace(/[\/\\\u0000-\u001f\u007f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 180) || "document";

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
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret!, { expiresIn: (process.env.JWT_EXPIRES_IN || "8h") as jwt.SignOptions["expiresIn"] });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));
app.get("/api/auth/me", authenticate, asyncRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true, role: true, active: true } });
  if (!user?.active) return res.status(401).json({ error: { code: "ACCOUNT_DISABLED", message: "This account is not active." } });
  return res.json({ user });
}));

app.get("/api/projects", authenticate, asyncRoute(async (req, res) => {
  const where: Prisma.ProjectWhereInput = projectWideViewRoles.includes(req.user!.role)
    ? {}
    : req.user!.role === UserRole.CUSTOMER
      ? { OR: [{ customerId: req.user!.id }, { members: { some: { userId: req.user!.id } } }] }
      : { OR: [{ createdById: req.user!.id }, { members: { some: { userId: req.user!.id } } }] };
  const projects = await prisma.project.findMany({ where, orderBy: { updatedAt: "desc" }, include: { estimates: { where: req.user!.role === UserRole.CUSTOMER ? { status: { in: [EstimateStatus.SUBMITTED, EstimateStatus.APPROVED, EstimateStatus.SUPERSEDED, EstimateStatus.REJECTED] } } : undefined, orderBy: { version: "desc" }, take: 1, include: { lines: true } } } });
  return res.json({ projects });
}));
app.post("/api/projects", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().min(2).max(120), customerId: z.string().uuid(), location: z.string().max(180).optional(), description: z.string().max(2000).optional() }).parse(req.body);
  const code = "SNR-" + new Date().getFullYear().toString().slice(-2) + "-" + randomUUID().slice(0, 6).toUpperCase();
  const project = await prisma.$transaction(async tx => {
    const p = await tx.project.create({ data: { ...body, code, createdById: req.user!.id } });
    await tx.projectMember.create({ data: { projectId: p.id, userId: body.customerId, access: "VIEW" } });
    await tx.projectMember.create({ data: { projectId: p.id, userId: req.user!.id, access: "MANAGE" } });
    await audit(tx, req.user!.id, "PROJECT_CREATED", "Project", p.id, { code, customerId: body.customerId });
    return p;
  });
  return res.status(201).json({ project });
}));

app.post("/api/projects/:id/status", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const body = z.object({ status: z.enum(["ENQUIRY","ESTIMATION","AWAITING_APPROVAL","PLANNING","IN_PROGRESS","ON_HOLD","HANDOVER","COMPLETED","CANCELLED"]) }).parse(req.body);
  const project = await prisma.project.findUnique({ where: { id: routeParam(req, "id") } });
  if (!project || !(await projectAccess(req.user!, project.id, "UPDATE"))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  validateProjectTransition(project.status, body.status, req.user!.id, true);
  const updated = await prisma.$transaction(async tx => {
    const p = await tx.project.update({ where: { id: project.id }, data: { status: body.status } });
    await audit(tx, req.user!.id, "PROJECT_STATUS_CHANGED", "Project", p.id, { from: project.status, to: body.status });
    return p;
  });
  return res.json({ project: updated });
}));
app.get("/api/projects/:id", authenticate, asyncRoute(async (req, res) => {
  if (!(await projectAccess(req.user!, routeParam(req, "id")))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const project = await prisma.project.findUnique({ where: { id: routeParam(req, "id") }, include: { estimates: { where: req.user!.role === UserRole.CUSTOMER ? { status: { in: [EstimateStatus.SUBMITTED, EstimateStatus.APPROVED, EstimateStatus.SUPERSEDED, EstimateStatus.REJECTED] } } : undefined, orderBy: { version: "desc" }, include: { lines: true } }, commitments: true } });
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
  const project = await prisma.project.findUnique({ where: { id: routeParam(req, "id") } });
  if (!project || !(await projectAccess(req.user!, project.id))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
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
  const total = estimateProjectTotal(estimate.lines.map(line => ({ quantity: line.quantity.toString(), unitRate: line.unitRate.toString() })));
  return res.status(201).json({ estimate, indicativeTotal: total.totalRupees, currency: total.currency, disclaimer: "Indicative estimate only; actual material and labour costs may vary with approved scope, quantities, specifications, site conditions and prevailing rates." });
}));
app.post("/api/estimates/:id/submit", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const estimate = await prisma.estimate.findUnique({ where: { id: routeParam(req, "id") } });
  if (!estimate || !(await projectAccess(req.user!, estimate.projectId, "UPDATE"))) return res.status(404).json({ error: { code: "ESTIMATE_NOT_FOUND", message: "Estimate was not found." } });
  if (estimate.status !== EstimateStatus.DRAFT) return res.status(409).json({ error: { code: "ESTIMATE_NOT_DRAFT", message: "Only a draft estimate can be submitted." } });
  const updated = await prisma.$transaction(async tx => {
    const submitted = await tx.estimate.update({ where: { id: estimate.id }, data: { status: EstimateStatus.SUBMITTED } });
    await audit(tx, req.user!.id, "ESTIMATE_SUBMITTED", "Estimate", submitted.id, { projectId: submitted.projectId, version: submitted.version });
    return submitted;
  });
  return res.json({ estimate: updated });
}));
app.post("/api/estimates/:id/approve", authenticate, allow(...financeRoles), asyncRoute(async (req, res) => {
  const estimateForAccess = await prisma.estimate.findUnique({ where: { id: routeParam(req, "id") } });
  if (!estimateForAccess || !(await projectAccess(req.user!, estimateForAccess.projectId, "UPDATE"))) return res.status(404).json({ error: { code: "ESTIMATE_NOT_FOUND", message: "Estimate was not found." } });
  const estimate = await prisma.$transaction(async tx => {
    const current = await tx.estimate.findUnique({ where: { id: routeParam(req, "id") } });
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
  const projectId = routeParam(req, "id");
  if (body.type === "TOP_UP") {
    return res.status(409).json({ error: { code: "USE_TOP_UP_RECONCILIATION", message: "Top-ups must be created through the customer submission and finance reconciliation workflow." } });
  }
  if (!(await projectAccess(req.user!, projectId, req.user!.role === UserRole.CUSTOMER ? "VIEW" : "UPDATE"))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  if (req.user!.role === UserRole.CUSTOMER) return res.status(403).json({ error: { code: "CUSTOMER_LEDGER_RESTRICTED", message: "Customers submit payment details through the top-up reconciliation workflow. Expense entries are recorded by authorised project staff." } });
  if (body.type === "REFUND" && !financeRoles.includes(req.user!.role)) return res.status(403).json({ error: { code: "FINANCE_APPROVAL_REQUIRED", message: "Only finance-authorised users can submit project refunds." } });
  if (!expenseRoles.includes(req.user!.role)) return res.status(403).json({ error: { code: "STAFF_ROLE_REQUIRED", message: "Only authorised project or finance staff can submit expenses." } });
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
  const entryForAccess = await prisma.ledgerEntry.findUnique({ where: { id: routeParam(req, "id") } });
  if (!entryForAccess || !(await projectAccess(req.user!, entryForAccess.projectId))) return res.status(404).json({ error: { code: "LEDGER_ENTRY_NOT_FOUND", message: "Ledger entry was not found." } });
  const entry = await prisma.$transaction(async tx => {
    const current = await tx.ledgerEntry.findUnique({ where: { id: routeParam(req, "id") } });
    if (!current || current.status !== LedgerStatus.PENDING) throw Object.assign(new Error("This entry is not awaiting approval."), { status: 409, code: "LEDGER_NOT_PENDING" });
    const updated = await tx.ledgerEntry.update({ where: { id: current.id }, data: { status: LedgerStatus.APPROVED, approvedById: req.user!.id, approvedAt: new Date() } });
    await audit(tx, req.user!.id, "LEDGER_ENTRY_APPROVED", "LedgerEntry", updated.id, { projectId: current.projectId });
    return updated;
  });
  return res.json({ entry });
}));
app.post("/api/ledger/:id/post", authenticate, allow(...financeRoles), asyncRoute(async (req, res) => {
  const entry = await prisma.$transaction(async tx => {
    const current = await tx.ledgerEntry.findUnique({ where: { id: routeParam(req, "id") } });
    if (!current || current.status !== LedgerStatus.APPROVED) throw Object.assign(new Error("Only an approved entry can be posted."), { status: 409, code: "LEDGER_NOT_APPROVED" });
    const posted = await tx.ledgerEntry.update({ where: { id: current.id }, data: { status: LedgerStatus.POSTED, postedAt: new Date() } });
    await audit(tx, req.user!.id, "LEDGER_ENTRY_POSTED", "LedgerEntry", posted.id, { projectId: current.projectId });
    return posted;
  });
  return res.json({ entry, message: "Entry posted to the project ledger." });
}));
app.get("/api/projects/:id/ledger", authenticate, asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const [entries, commitments] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { projectId, status: LedgerStatus.POSTED }, orderBy: { postedAt: "desc" } }),
    prisma.commitment.findMany({ where: { projectId, status: { in: ["OPEN", "PARTIALLY_FULFILLED"] } } })
  ]);
  const summary = calculateProjectBalance(entries.filter(e => e.type !== LedgerType.REVERSAL).map(e => ({ type: e.type as PostedLedgerLine["type"], amount: e.amount })), commitments);
  return res.json({ entries, summary: { currency: "INR", ...summary }, note: "Only posted ledger entries affect actual balances. Pending commitments are shown separately and are not double-deducted from actual expenses." });
}));

const topUpRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount with up to two decimal places.").transform(value => money(value)).refine(value => value.gt(0) && value.lte(100000000), "Enter a valid top-up amount."),
  paymentMode: z.enum(["UPI", "BANK_TRANSFER", "CHEQUE", "CASH", "OTHER"]),
  reference: z.string().trim().min(3).max(120),
  notes: z.string().trim().max(500).optional()
});
app.get("/api/projects/:id/top-ups", authenticate, asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const customer = req.user!.role === UserRole.CUSTOMER;
  const topUps = await prisma.topUpRequest.findMany({
    where: { projectId, ...(customer ? { requestedById: req.user!.id } : {}) },
    include: { requestedBy: { select: { id: true, name: true } }, reviewedBy: { select: { id: true, name: true } } },
    orderBy: { submittedAt: "desc" }, take: 100
  });
  return res.json({ topUps });
}));
app.post("/api/projects/:id/top-ups", authenticate, asyncRoute(async (req, res) => {
  if (req.user!.role !== UserRole.CUSTOMER) return res.status(403).json({ error: { code: "CUSTOMER_ROLE_REQUIRED", message: "Only the assigned customer can submit a project top-up notification." } });
  const projectId = routeParam(req, "id");
  const project = await prisma.project.findFirst({ where: { id: projectId, customerId: req.user!.id }, select: { id: true } });
  if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const body = topUpRequestSchema.parse(req.body);
  let request;
  try {
    request = await prisma.$transaction(async tx => {
      const created = await tx.topUpRequest.create({ data: {
        projectId, requestedById: req.user!.id, amount: body.amount, paymentMode: body.paymentMode,
        reference: body.reference, notes: body.notes
      } });
      await audit(tx, req.user!.id, "CUSTOMER_TOP_UP_SUBMITTED", "TopUpRequest", created.id, { projectId, amount: body.amount.toFixed(2), paymentMode: body.paymentMode });
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: { code: "PAYMENT_REFERENCE_ALREADY_SUBMITTED", message: "This payment reference has already been submitted for this project." } });
    }
    throw error;
  }
  return res.status(201).json({ topUp: request, message: "Payment details submitted for reconciliation. Your project balance will update only after Finance verifies the receipt." });
}));
app.post("/api/top-ups/:id/reconcile", authenticate, allow(...financeRoles), asyncRoute(async (req, res) => {
  const body = z.object({
    decision: z.enum(["CONFIRM", "REJECT"]),
    reason: z.string().trim().min(3).max(500).optional()
  }).superRefine((value, ctx) => {
    if (value.decision === "REJECT" && !value.reason) ctx.addIssue({ code: "custom", message: "A reason is required when rejecting a top-up.", path: ["reason"] });
  }).parse(req.body);
  const topUp = await prisma.topUpRequest.findUnique({ where: { id: routeParam(req, "id") } });
  if (!topUp || !(await projectAccess(req.user!, topUp.projectId, "UPDATE"))) return res.status(404).json({ error: { code: "TOP_UP_NOT_FOUND", message: "Top-up request was not found." } });
  const result = await prisma.$transaction(async tx => {
    const claimed = await tx.topUpRequest.updateMany({
      where: { id: topUp.id, status: TopUpRequestStatus.SUBMITTED },
      data: { status: body.decision === "CONFIRM" ? TopUpRequestStatus.CONFIRMED : TopUpRequestStatus.REJECTED, reviewedById: req.user!.id, reviewedAt: new Date(), reviewReason: body.reason }
    });
    if (claimed.count !== 1) throw Object.assign(new Error("This top-up has already been reviewed."), { status: 409, code: "TOP_UP_ALREADY_REVIEWED" });
    let ledgerEntry = null;
    if (body.decision === "CONFIRM") {
      const now = new Date();
      ledgerEntry = await tx.ledgerEntry.create({ data: {
        projectId: topUp.projectId, type: LedgerType.TOP_UP, status: LedgerStatus.POSTED,
        amount: topUp.amount, description: "Customer project top-up — finance reconciled",
        reference: topUp.reference, idempotencyKey: "top-up-request:" + topUp.id,
        createdById: topUp.requestedById, approvedById: req.user!.id, approvedAt: now, postedAt: now
      } });
      await tx.topUpRequest.update({ where: { id: topUp.id }, data: { ledgerEntryId: ledgerEntry.id } });
    }
    await audit(tx, req.user!.id, body.decision === "CONFIRM" ? "CUSTOMER_TOP_UP_RECONCILED" : "CUSTOMER_TOP_UP_REJECTED", "TopUpRequest", topUp.id, {
      projectId: topUp.projectId, amount: topUp.amount.toFixed(2), ledgerEntryId: ledgerEntry?.id, reason: body.reason
    });
    return { ledgerEntry };
  });
  return res.json({ topUp: { id: topUp.id, status: body.decision === "CONFIRM" ? TopUpRequestStatus.CONFIRMED : TopUpRequestStatus.REJECTED, ledgerEntryId: result.ledgerEntry?.id || null }, message: body.decision === "CONFIRM" ? "Payment reconciled and posted to the project ledger." : "Top-up request rejected with a recorded reason." });
}));

app.post("/api/projects/:id/commitments", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const body = z.object({ description: z.string().min(3).max(300), vendor: z.string().max(180).optional(), amount: z.number().positive(), reference: z.string().max(120).optional() }).parse(req.body);
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId, "UPDATE"))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const commitment = await prisma.commitment.create({ data: { projectId, ...body, amount: money(body.amount) } });
  return res.status(201).json({ commitment });
}));


const vendorSchema = z.object({
  name: z.string().min(2).max(180),
  contactName: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  gstin: z.string().max(20).optional(),
  address: z.string().max(500).optional()
});
app.get("/api/vendors", authenticate, allowView(...[...staffRoles, UserRole.AUDITOR]), asyncRoute(async (_req, res) => {
  const vendors = await prisma.vendor.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return res.json({ vendors });
}));
app.post("/api/vendors", authenticate, allow(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.BRANCH_MANAGER, UserRole.BRANCH_PARTNER, UserRole.PROCUREMENT), asyncRoute(async (req, res) => {
  const body = vendorSchema.parse(req.body);
  const vendor = await prisma.vendor.create({ data: body });
  await prisma.auditLog.create({ data: { actorId: req.user!.id, action: "VENDOR_CREATED", entityType: "Vendor", entityId: vendor.id, metadata: { name: vendor.name } } });
  return res.status(201).json({ vendor });
}));

const purchaseOrderLineSchema = z.object({
  description: z.string().min(2).max(240),
  specification: z.string().max(500).optional(),
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().min(1).max(24),
  unitRate: z.number().nonnegative().max(1_000_000_000)
});
app.get("/api/projects/:id/purchase-orders", authenticate, asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const purchaseOrders = await prisma.purchaseOrder.findMany({ where: { projectId }, include: { vendor: true, lines: true, receipts: true }, orderBy: { createdAt: "desc" } });
  return res.json({ purchaseOrders });
}));
app.post("/api/projects/:id/purchase-orders", authenticate, allow(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.BRANCH_MANAGER, UserRole.BRANCH_PARTNER, UserRole.PROCUREMENT), asyncRoute(async (req, res) => {
  const body = z.object({ vendorId: z.string().uuid(), notes: z.string().max(2000).optional(), lines: z.array(purchaseOrderLineSchema).min(1).max(200) }).parse(req.body);
  const projectId = routeParam(req, "id");
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project || !(await projectAccess(req.user!, projectId, "UPDATE"))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const vendor = await prisma.vendor.findFirst({ where: { id: body.vendorId, active: true } });
  if (!vendor) return res.status(404).json({ error: { code: "VENDOR_NOT_FOUND", message: "Select an active vendor." } });
  const subtotal = body.lines.reduce((sum, line) => sum.plus(money(line.quantity).mul(money(line.unitRate))), new Prisma.Decimal(0));
  const orderNumber = "SNR-PO-" + new Date().getFullYear().toString().slice(-2) + "-" + randomUUID().slice(0, 8).toUpperCase();
  const purchaseOrder = await prisma.$transaction(async tx => {
    const po = await tx.purchaseOrder.create({ data: {
      projectId, vendorId: vendor.id, orderNumber, notes: body.notes, subtotal,
      createdById: req.user!.id,
      lines: { create: body.lines.map(line => ({ ...line, quantity: money(line.quantity), unitRate: money(line.unitRate) })) }
    }, include: { vendor: true, lines: true } });
    await audit(tx, req.user!.id, "PURCHASE_ORDER_CREATED", "PurchaseOrder", po.id, { projectId, orderNumber, subtotal: subtotal.toFixed(2) });
    return po;
  });
  return res.status(201).json({ purchaseOrder, message: "Purchase order created as draft. Submit it for approval before sending it to the vendor." });
}));
app.post("/api/purchase-orders/:id/submit", authenticate, allow(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.BRANCH_MANAGER, UserRole.BRANCH_PARTNER, UserRole.PROCUREMENT), asyncRoute(async (req, res) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: routeParam(req, "id") } });
  if (!po || !(await projectAccess(req.user!, po.projectId, "UPDATE"))) return res.status(404).json({ error: { code: "PURCHASE_ORDER_NOT_FOUND", message: "Purchase order was not found." } });
  if (po.status !== PurchaseOrderStatus.DRAFT) return res.status(409).json({ error: { code: "PURCHASE_ORDER_NOT_DRAFT", message: "Only a draft purchase order can be submitted." } });
  const updated = await prisma.$transaction(async tx => {
    const value = await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: PurchaseOrderStatus.SUBMITTED } });
    await audit(tx, req.user!.id, "PURCHASE_ORDER_SUBMITTED", "PurchaseOrder", po.id, { orderNumber: po.orderNumber });
    return value;
  });
  return res.json({ purchaseOrder: updated });
}));
app.post("/api/purchase-orders/:id/approve", authenticate, allow(...financeRoles), asyncRoute(async (req, res) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: routeParam(req, "id") } });
  if (!po || !(await projectAccess(req.user!, po.projectId))) return res.status(404).json({ error: { code: "PURCHASE_ORDER_NOT_FOUND", message: "Purchase order was not found." } });
  if (po.status !== PurchaseOrderStatus.SUBMITTED) return res.status(409).json({ error: { code: "PURCHASE_ORDER_NOT_SUBMITTED", message: "Only a submitted purchase order can be approved." } });
  const updated = await prisma.$transaction(async tx => {
    const value = await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: PurchaseOrderStatus.APPROVED, approvedById: req.user!.id, approvedAt: new Date() } });
    await audit(tx, req.user!.id, "PURCHASE_ORDER_APPROVED", "PurchaseOrder", po.id, { orderNumber: po.orderNumber, subtotal: po.subtotal.toString() });
    return value;
  });
  return res.json({ purchaseOrder: updated, message: "Purchase order approved. Material receipts can now be recorded." });
}));
app.post("/api/purchase-orders/:id/receipts", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const body = z.object({
    receiptNumber: z.string().min(2).max(100),
    receivedAt: z.string().datetime().optional(),
    evidenceUrl: z.string().url().optional(),
    notes: z.string().max(1000).optional(),
    lines: z.array(z.object({ lineId: z.string().uuid(), receivedQty: z.number().positive().max(1_000_000) })).min(1).max(200)
  }).parse(req.body);
  const receivedLineIds = body.lines.map(line => line.lineId);
  if (new Set(receivedLineIds).size !== receivedLineIds.length) return res.status(400).json({ error: { code: "DUPLICATE_RECEIPT_LINE", message: "Each purchase-order line can appear only once in a material receipt." } });
  const poId = routeParam(req, "id");
  const poForAccess = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { projectId: true } });
  if (!poForAccess || !(await projectAccess(req.user!, poForAccess.projectId, "UPDATE"))) return res.status(404).json({ error: { code: "PURCHASE_ORDER_NOT_FOUND", message: "Purchase order was not found." } });
  const result = await prisma.$transaction(async tx => {
    const po = await tx.purchaseOrder.findUnique({ where: { id: poId }, include: { lines: true } });
    if (!po || (po.status !== PurchaseOrderStatus.APPROVED && po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED)) throw Object.assign(new Error("Material can only be received against an approved purchase order."), { status: 409, code: "PURCHASE_ORDER_NOT_APPROVED" });
    const lineMap = new Map(po.lines.map(line => [line.id, line]));
    for (const received of body.lines) {
      const line = lineMap.get(received.lineId);
      if (!line || line.receivedQty.plus(received.receivedQty).greaterThan(line.quantity)) throw Object.assign(new Error("Received quantity exceeds the purchase order quantity or references an invalid line."), { status: 400, code: "INVALID_RECEIPT_QUANTITY" });
    }
    for (const received of body.lines) {
      const line = lineMap.get(received.lineId);
      if (!line) throw Object.assign(new Error("Receipt references an invalid purchase-order line."), { status: 400, code: "INVALID_RECEIPT_LINE" });
      const updatedLine = await tx.purchaseOrderLine.updateMany({
        where: { id: received.lineId, receivedQty: { lte: line.quantity.minus(money(received.receivedQty)) } },
        data: { receivedQty: { increment: money(received.receivedQty) } }
      });
      if (updatedLine.count !== 1) throw Object.assign(new Error("Another receipt changed this purchase-order line. Refresh and retry the receipt."), { status: 409, code: "RECEIPT_QUANTITY_CONFLICT" });
    }
    const receipt = await tx.materialReceipt.create({ data: {
      purchaseOrderId: po.id, receiptNumber: body.receiptNumber, receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
      receivedBy: req.user!.id, evidenceUrl: body.evidenceUrl, notes: body.notes, lines: body.lines
    } });
    const fresh = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: po.id }, include: { lines: true } });
    const complete = fresh.lines.every(line => line.receivedQty.greaterThanOrEqualTo(line.quantity));
    const updated = await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: complete ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED } });
    await audit(tx, req.user!.id, "MATERIAL_RECEIPT_RECORDED", "MaterialReceipt", receipt.id, { purchaseOrderId: po.id, receiptNumber: receipt.receiptNumber, complete });
    return { receipt, purchaseOrder: updated };
  });
  return res.status(201).json({ ...result, message: "Material receipt recorded. Invoice/payment must still be verified and posted separately to the project ledger." });
}));

app.get("/api/projects/:id/labour", authenticate, asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const records = await prisma.labourRecord.findMany({ where: { projectId }, orderBy: { workDate: "desc" } });
  return res.json({ labourRecords: records });
}));
app.post("/api/projects/:id/labour", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const body = z.object({
    workerName: z.string().min(2).max(160),
    workDate: z.string().datetime(),
    workType: z.string().min(2).max(100),
    description: z.string().min(3).max(500),
    quantity: z.number().positive().max(1_000_000),
    unit: z.string().min(1).max(24),
    rate: z.number().nonnegative().max(1_000_000_000),
    evidenceUrl: z.string().url().optional()
  }).parse(req.body);
  const projectId = routeParam(req, "id");
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project || !(await projectAccess(req.user!, projectId, "UPDATE"))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const amount = money(body.quantity).mul(money(body.rate));
  const record = await prisma.$transaction(async tx => {
    const labour = await tx.labourRecord.create({ data: {
      projectId, workerName: body.workerName, workDate: new Date(body.workDate), workType: body.workType,
      description: body.description, quantity: money(body.quantity), unit: body.unit, rate: money(body.rate),
      amount, evidenceUrl: body.evidenceUrl, recordedById: req.user!.id
    } });
    await audit(tx, req.user!.id, "LABOUR_RECORD_SUBMITTED", "LabourRecord", labour.id, { projectId, amount: amount.toFixed(2) });
    return labour;
  });
  return res.status(201).json({ labourRecord: record, message: "Labour record submitted for supervisor and finance review. It has not been charged to the project ledger." });
}));
app.post("/api/labour/:id/approve", authenticate, allow(...financeRoles), asyncRoute(async (req, res) => {
  const recordForAccess = await prisma.labourRecord.findUnique({ where: { id: routeParam(req, "id") } });
  if (!recordForAccess || !(await projectAccess(req.user!, recordForAccess.projectId, "UPDATE"))) return res.status(404).json({ error: { code: "LABOUR_RECORD_NOT_FOUND", message: "Labour record was not found." } });
  const record = await prisma.$transaction(async tx => {
    const current = await tx.labourRecord.findUnique({ where: { id: routeParam(req, "id") } });
    if (!current || current.status !== LabourRecordStatus.SUBMITTED) throw Object.assign(new Error("Only submitted labour records can be approved."), { status: 409, code: "LABOUR_RECORD_NOT_SUBMITTED" });
    const approved = await tx.labourRecord.update({ where: { id: current.id }, data: { status: LabourRecordStatus.APPROVED, approvedById: req.user!.id, approvedAt: new Date() } });
    await tx.ledgerEntry.create({ data: {
      projectId: current.projectId, type: LedgerType.LABOUR_EXPENSE, status: LedgerStatus.PENDING,
      amount: current.amount, description: "Approved labour: " + current.description,
      vendorOrWorker: current.workerName, quantity: current.quantity, unit: current.unit, unitRate: current.rate,
      evidenceUrl: current.evidenceUrl, idempotencyKey: "labour-record:" + current.id, createdById: req.user!.id
    } });
    await audit(tx, req.user!.id, "LABOUR_RECORD_APPROVED", "LabourRecord", current.id, { projectId: current.projectId, amount: current.amount.toString() });
    return approved;
  });
  return res.json({ labourRecord: record, message: "Labour approved and queued as a pending ledger expense. Finance must separately approve and post the expense." });
}));

const projectMemberSchema = z.object({
  userId: z.string().uuid(),
  access: z.enum(["VIEW", "UPDATE", "MANAGE"]).default("UPDATE")
});
app.post("/api/projects/:id/members", authenticate, allow(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.BRANCH_MANAGER, UserRole.BRANCH_PARTNER), asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId, "MANAGE"))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const body = projectMemberSchema.parse(req.body);
  const memberUser = await prisma.user.findFirst({ where: { id: body.userId, active: true, role: { not: UserRole.CUSTOMER } }, select: { id: true, name: true, role: true } });
  if (!memberUser) return res.status(404).json({ error: { code: "STAFF_USER_NOT_FOUND", message: "Select an active staff account." } });
  const membership = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: memberUser.id } },
    create: { projectId, userId: memberUser.id, access: body.access },
    update: { access: body.access }
  });
  await prisma.auditLog.create({ data: { actorId: req.user!.id, action: "PROJECT_MEMBER_ASSIGNED", entityType: "ProjectMember", entityId: membership.id, metadata: { projectId, userId: memberUser.id, access: body.access } } });
  return res.status(201).json({ membership, user: memberUser });
}));

const projectUpdateSchema = z.object({
  category: z.nativeEnum(ProjectUpdateCategory).default(ProjectUpdateCategory.GENERAL),
  title: z.string().min(3).max(160),
  description: z.string().min(3).max(2000),
  recordedAt: z.string().datetime().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
}).superRefine((value, ctx) => {
  if ((value.latitude === undefined) !== (value.longitude === undefined)) {
    ctx.addIssue({ code: "custom", message: "Latitude and longitude must be supplied together.", path: ["latitude"] });
  }
});
app.get("/api/projects/:id/updates", authenticate, asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const updates = await prisma.projectUpdate.findMany({
    where: { projectId }, orderBy: { recordedAt: "desc" }, take: 100,
    include: { createdBy: { select: { id: true, name: true, role: true } } }
  });
  return res.json({ updates });
}));
app.post("/api/projects/:id/updates", authenticate, allow(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.BRANCH_MANAGER, UserRole.BRANCH_PARTNER, UserRole.SITE_ENGINEER), asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId, "UPDATE"))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const body = projectUpdateSchema.parse(req.body);
  const update = await prisma.$transaction(async tx => {
    const created = await tx.projectUpdate.create({
      data: {
        projectId, category: body.category, title: body.title, description: body.description,
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
        latitude: body.latitude === undefined ? undefined : money(body.latitude),
        longitude: body.longitude === undefined ? undefined : money(body.longitude),
        createdById: req.user!.id
      },
      include: { createdBy: { select: { id: true, name: true, role: true } } }
    });
    await audit(tx, req.user!.id, "PROJECT_UPDATE_RECORDED", "ProjectUpdate", created.id, {
      projectId, category: body.category, hasLocation: body.latitude !== undefined
    });
    return created;
  });
  return res.status(201).json({ update, message: "Site update recorded successfully." });
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


app.get("/api/projects/:id/documents", authenticate, asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const customer = req.user!.role === UserRole.CUSTOMER;
  const documents = await prisma.projectDocument.findMany({
    where: { projectId, status: ProjectDocumentStatus.AVAILABLE, ...(customer ? { customerVisible: true } : {}) },
    select: { id: true, category: true, originalName: true, contentType: true, sizeBytes: true, description: true, customerVisible: true, createdAt: true, availableAt: true, uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" }, take: 100
  });
  return res.json({ documents });
}));

app.post("/api/projects/:id/documents/upload-url", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId, "UPDATE"))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const body = documentUploadSchema.parse(req.body);
  if (!allowedDocumentTypes.has(body.contentType)) return res.status(415).json({ error: { code: "DOCUMENT_TYPE_NOT_ALLOWED", message: "This file type is not supported. Upload PDF, JPG, PNG, WebP, DOC, DOCX or XLSX files." } });
  const { client, bucket } = getPrivateObjectStore();
  const documentId = randomUUID();
  const storageKey = "projects/" + projectId + "/documents/" + documentId;
  const document = await prisma.projectDocument.create({
    data: { id: documentId, projectId, uploadedById: req.user!.id, category: body.category, originalName: safeFileName(body.fileName), storageKey, contentType: body.contentType, sizeBytes: body.sizeBytes, description: body.description }
  });
  try {
    const command = new PutObjectCommand({
      Bucket: bucket, Key: storageKey, ContentType: body.contentType,
      Metadata: { "sanora-document-id": documentId, "sanora-project-id": projectId, "sanora-uploader-id": req.user!.id }
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    await prisma.auditLog.create({ data: { actorId: req.user!.id, action: "PROJECT_DOCUMENT_UPLOAD_REQUESTED", entityType: "ProjectDocument", entityId: documentId, metadata: { projectId, category: body.category, sizeBytes: body.sizeBytes } } });
    return res.status(201).json({ document: { id: document.id, fileName: document.originalName, contentType: document.contentType, sizeBytes: document.sizeBytes }, uploadUrl, method: "PUT", requiredHeaders: { "Content-Type": body.contentType, "x-amz-meta-sanora-document-id": documentId, "x-amz-meta-sanora-project-id": projectId, "x-amz-meta-sanora-uploader-id": req.user!.id }, expiresInSeconds: 300, message: "Upload URL created. Upload the file, then confirm completion." });
  } catch (error) {
    await prisma.projectDocument.delete({ where: { id: documentId } }).catch(() => undefined);
    throw error;
  }
}));

app.post("/api/documents/:id/complete", authenticate, allow(...staffRoles), asyncRoute(async (req, res) => {
  const document = await prisma.projectDocument.findUnique({ where: { id: routeParam(req, "id") } });
  if (!document || document.status !== ProjectDocumentStatus.PENDING_UPLOAD || document.uploadedById !== req.user!.id) return res.status(404).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "Pending document upload was not found." } });
  if (!(await projectAccess(req.user!, document.projectId, "UPDATE"))) return res.status(404).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "Pending document upload was not found." } });
  const { client, bucket } = getPrivateObjectStore();
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: document.storageKey }));
  if (Number(head.ContentLength || 0) !== document.sizeBytes || head.ContentType !== document.contentType || head.Metadata?.["sanora-document-id"] !== document.id || head.Metadata?.["sanora-uploader-id"] !== req.user!.id) {
    return res.status(422).json({ error: { code: "DOCUMENT_UPLOAD_MISMATCH", message: "Uploaded file details do not match the authorised upload. Please retry the upload." } });
  }
  const updated = await prisma.$transaction(async tx => {
    const saved = await tx.projectDocument.update({ where: { id: document.id, status: ProjectDocumentStatus.PENDING_UPLOAD }, data: { status: ProjectDocumentStatus.AVAILABLE, availableAt: new Date() } });
    await audit(tx, req.user!.id, "PROJECT_DOCUMENT_UPLOADED", "ProjectDocument", saved.id, { projectId: saved.projectId, category: saved.category, sizeBytes: saved.sizeBytes });
    return saved;
  });
  return res.json({ document: { id: updated.id, fileName: updated.originalName, status: updated.status, availableAt: updated.availableAt }, message: "Document uploaded and verified." });
}));

app.post("/api/documents/:id/download-url", authenticate, asyncRoute(async (req, res) => {
  const document = await prisma.projectDocument.findUnique({ where: { id: routeParam(req, "id") } });
  if (!document || document.status !== ProjectDocumentStatus.AVAILABLE) return res.status(404).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "Document was not found." } });
  if (!(await projectAccess(req.user!, document.projectId))) return res.status(404).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "Document was not found." } });
  if (req.user!.role === UserRole.CUSTOMER && !document.customerVisible) return res.status(404).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "Document was not found." } });
  const { client, bucket } = getPrivateObjectStore();
  const downloadUrl = await getSignedUrl(client, new GetObjectCommand({
    Bucket: bucket, Key: document.storageKey,
    ResponseContentDisposition: "attachment; filename*=UTF-8''" + encodeURIComponent(document.originalName)
  }), { expiresIn: 180 });
  await prisma.auditLog.create({ data: { actorId: req.user!.id, action: "PROJECT_DOCUMENT_DOWNLOAD_LINK_CREATED", entityType: "ProjectDocument", entityId: document.id, metadata: { projectId: document.projectId } } });
  return res.json({ downloadUrl, expiresInSeconds: 180 });
}));

app.post("/api/documents/:id/customer-visibility", authenticate, allow(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.BRANCH_MANAGER, UserRole.BRANCH_PARTNER), asyncRoute(async (req, res) => {
  const document = await prisma.projectDocument.findUnique({ where: { id: routeParam(req, "id") } });
  if (!document || document.status !== ProjectDocumentStatus.AVAILABLE || !(await projectAccess(req.user!, document.projectId, "MANAGE"))) return res.status(404).json({ error: { code: "DOCUMENT_NOT_FOUND", message: "Document was not found." } });
  const body = z.object({ customerVisible: z.boolean() }).parse(req.body);
  const updated = await prisma.$transaction(async tx => {
    const saved = await tx.projectDocument.update({ where: { id: document.id }, data: { customerVisible: body.customerVisible } });
    await audit(tx, req.user!.id, "PROJECT_DOCUMENT_VISIBILITY_CHANGED", "ProjectDocument", saved.id, { projectId: saved.projectId, customerVisible: body.customerVisible });
    return saved;
  });
  return res.json({ document: { id: updated.id, customerVisible: updated.customerVisible }, message: body.customerVisible ? "Document is now available to the customer." : "Document is now internal only." });
}));


const planningRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CORPORATE_OPS, UserRole.BRANCH_MANAGER, UserRole.BRANCH_PARTNER, UserRole.SITE_ENGINEER];
const milestoneCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1200).optional(),
  targetDate: z.string().datetime().optional(),
  forecastDate: z.string().datetime().optional(),
  sequence: z.number().int().min(0).max(10000).optional(),
  customerVisible: z.boolean().default(false)
}).superRefine((value, ctx) => {
  if (value.targetDate && value.forecastDate && new Date(value.forecastDate) < new Date(value.targetDate)) ctx.addIssue({ code: "custom", message: "Forecast date cannot be earlier than the target date.", path: ["forecastDate"] });
});
const taskCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional(),
  workPackage: z.string().trim().max(120).optional(),
  milestoneId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  priority: z.nativeEnum(ProjectTaskPriority).default(ProjectTaskPriority.MEDIUM),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  customerVisible: z.boolean().default(false),
  dependsOnIds: z.array(z.string().uuid()).max(20).default([])
}).superRefine((value, ctx) => {
  if (value.startDate && value.dueDate && new Date(value.dueDate) < new Date(value.startDate)) ctx.addIssue({ code: "custom", message: "Due date cannot be earlier than the start date.", path: ["dueDate"] });
  if (new Set(value.dependsOnIds).size !== value.dependsOnIds.length) ctx.addIssue({ code: "custom", message: "A task dependency can be selected only once.", path: ["dependsOnIds"] });
});
async function validateTaskAssignee(projectId: string, userId: string) {
  const assignee = await prisma.user.findFirst({ where: { id: userId, active: true, role: { not: UserRole.CUSTOMER } }, select: { id: true, name: true, role: true } });
  if (!assignee) return null;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { createdById: true } });
  if (project?.createdById === userId) return assignee;
  const membership = await prisma.projectMember.findFirst({ where: { projectId, userId, access: { in: ["UPDATE", "MANAGE"] } }, select: { id: true } });
  return membership ? assignee : null;
}
app.get("/api/projects/:id/members", authenticate, asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  if (!planningRoles.includes(req.user!.role)) return res.status(403).json({ error: { code: "STAFF_DIRECTORY_RESTRICTED", message: "Only assigned project staff can view the project assignment list." } });
  const [project, memberships] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, include: { createdBy: { select: { id: true, name: true, role: true, active: true } } } }),
    prisma.projectMember.findMany({ where: { projectId, user: { active: true, role: { not: UserRole.CUSTOMER } } }, include: { user: { select: { id: true, name: true, role: true } } } })
  ]);
  const staff = new Map<string, { id: string; name: string; role: UserRole }>();
  if (project?.createdBy.active && project.createdBy.role !== UserRole.CUSTOMER) staff.set(project.createdBy.id, { id: project.createdBy.id, name: project.createdBy.name, role: project.createdBy.role });
  memberships.forEach(member => staff.set(member.user.id, member.user));
  return res.json({ members: [...staff.values()] });
}));
app.get("/api/projects/:id/work-plan", authenticate, asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const customer = req.user!.role === UserRole.CUSTOMER;
  const [milestones, tasks] = await Promise.all([
    prisma.projectMilestone.findMany({
      where: { projectId, ...(customer ? { customerVisible: true } : {}) },
      orderBy: [{ sequence: "asc" }, { targetDate: "asc" }],
      include: { _count: { select: { tasks: customer ? { where: { customerVisible: true } } : true } } }
    }),
    prisma.projectTask.findMany({
      where: { projectId, ...(customer ? { customerVisible: true } : {}) },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        ...(customer ? {} : { blockedBy: { include: { predecessor: { select: { id: true, title: true, status: true } } } } })
      }
    })
  ]);
  const activeTasks = tasks.filter(task => task.status !== ProjectTaskStatus.CANCELLED);
  const progressPercent = activeTasks.length ? Math.round(activeTasks.reduce((sum, task) => sum + task.progressPercent, 0) / activeTasks.length) : 0;
  return res.json({
    milestones, tasks,
    summary: {
      progressPercent,
      totalTasks: activeTasks.length,
      completedTasks: activeTasks.filter(task => task.status === ProjectTaskStatus.COMPLETED).length,
      blockedTasks: activeTasks.filter(task => task.status === ProjectTaskStatus.BLOCKED).length
    }
  });
}));
app.post("/api/projects/:id/milestones", authenticate, allow(...planningRoles), asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId, "UPDATE"))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const body = milestoneCreateSchema.parse(req.body);
  if (body.customerVisible && !(await projectAccess(req.user!, projectId, "MANAGE"))) return res.status(403).json({ error: { code: "MILESTONE_VISIBILITY_REQUIRES_MANAGER", message: "Only a project manager can publish milestones to the customer portal." } });
  const milestone = await prisma.$transaction(async tx => {
    const created = await tx.projectMilestone.create({ data: {
      projectId, title: body.title, description: body.description,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      forecastDate: body.forecastDate ? new Date(body.forecastDate) : undefined,
      sequence: body.sequence, customerVisible: body.customerVisible, createdById: req.user!.id
    } });
    await audit(tx, req.user!.id, "PROJECT_MILESTONE_CREATED", "ProjectMilestone", created.id, { projectId, title: body.title });
    return created;
  });
  return res.status(201).json({ milestone, message: "Project milestone created." });
}));
app.patch("/api/milestones/:id", authenticate, allow(...planningRoles), asyncRoute(async (req, res) => {
  const id = routeParam(req, "id");
  const current = await prisma.projectMilestone.findUnique({ where: { id } });
  if (!current || !(await projectAccess(req.user!, current.projectId, "UPDATE"))) return res.status(404).json({ error: { code: "MILESTONE_NOT_FOUND", message: "Milestone was not found." } });
  const body = z.object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(1200).nullable().optional(),
    status: z.nativeEnum(ProjectMilestoneStatus).optional(),
    targetDate: z.string().datetime().nullable().optional(),
    forecastDate: z.string().datetime().nullable().optional(),
    sequence: z.number().int().min(0).max(10000).optional(),
    customerVisible: z.boolean().optional()
  }).parse(req.body);
  if (body.customerVisible !== undefined && !(await projectAccess(req.user!, current.projectId, "MANAGE"))) return res.status(403).json({ error: { code: "MILESTONE_VISIBILITY_REQUIRES_MANAGER", message: "Only a project manager can change customer visibility." } });
  if (body.status && body.status !== current.status) {
    try { validateMilestoneTransition(current.status, body.status, req.user!.id, true); }
    catch { return res.status(409).json({ error: { code: "INVALID_MILESTONE_TRANSITION", message: "This milestone cannot move from " + current.status + " to " + body.status + "." } }); }
  }
  if (body.status === ProjectMilestoneStatus.COMPLETED) {
    const unfinished = await prisma.projectTask.count({ where: { milestoneId: id, status: { notIn: [ProjectTaskStatus.COMPLETED, ProjectTaskStatus.CANCELLED] } } });
    if (unfinished > 0) return res.status(409).json({ error: { code: "MILESTONE_TASKS_INCOMPLETE", message: "Complete or cancel all milestone tasks before completing this milestone." } });
  }
  const updated = await prisma.$transaction(async tx => {
    const saved = await tx.projectMilestone.update({ where: { id }, data: {
      ...body,
      targetDate: body.targetDate === undefined ? undefined : body.targetDate === null ? null : new Date(body.targetDate),
      forecastDate: body.forecastDate === undefined ? undefined : body.forecastDate === null ? null : new Date(body.forecastDate),
      completedAt: body.status === ProjectMilestoneStatus.COMPLETED ? new Date() : body.status ? null : undefined
    } });
    await audit(tx, req.user!.id, "PROJECT_MILESTONE_UPDATED", "ProjectMilestone", id, { projectId: current.projectId, changes: Object.keys(body) });
    return saved;
  });
  return res.json({ milestone: updated, message: "Milestone updated." });
}));
app.post("/api/projects/:id/tasks", authenticate, allow(...planningRoles), asyncRoute(async (req, res) => {
  const projectId = routeParam(req, "id");
  if (!(await projectAccess(req.user!, projectId, "UPDATE"))) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project was not found." } });
  const body = taskCreateSchema.parse(req.body);
  if (body.customerVisible && !(await projectAccess(req.user!, projectId, "MANAGE"))) return res.status(403).json({ error: { code: "TASK_VISIBILITY_REQUIRES_MANAGER", message: "Only a project manager can publish tasks to the customer portal." } });
  if (body.milestoneId) {
    const milestone = await prisma.projectMilestone.findFirst({ where: { id: body.milestoneId, projectId }, select: { id: true } });
    if (!milestone) return res.status(400).json({ error: { code: "MILESTONE_PROJECT_MISMATCH", message: "Select a milestone from this project." } });
  }
  if (body.assignedToId && !(await validateTaskAssignee(projectId, body.assignedToId))) return res.status(400).json({ error: { code: "INVALID_TASK_ASSIGNEE", message: "Assignee must be an active staff member assigned to this project." } });
  if (body.dependsOnIds.length) {
    const predecessors = await prisma.projectTask.findMany({ where: { id: { in: body.dependsOnIds }, projectId }, select: { id: true } });
    if (predecessors.length !== body.dependsOnIds.length) return res.status(400).json({ error: { code: "INVALID_TASK_DEPENDENCY", message: "All dependencies must be different tasks from the same project." } });
  }
  const task = await prisma.$transaction(async tx => {
    const created = await tx.projectTask.create({ data: {
      projectId, milestoneId: body.milestoneId, title: body.title, description: body.description,
      workPackage: body.workPackage, assignedToId: body.assignedToId, priority: body.priority,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      customerVisible: body.customerVisible, createdById: req.user!.id,
      ...(body.dependsOnIds.length ? { blockedBy: { create: body.dependsOnIds.map(predecessorId => ({ predecessorId })) } } : {})
    } });
    await audit(tx, req.user!.id, "PROJECT_TASK_CREATED", "ProjectTask", created.id, { projectId, milestoneId: body.milestoneId, assignedToId: body.assignedToId, dependsOn: body.dependsOnIds });
    return created;
  });
  return res.status(201).json({ task, message: "Project task created and assigned." });
}));
app.patch("/api/tasks/:id", authenticate, allow(...planningRoles), asyncRoute(async (req, res) => {
  const id = routeParam(req, "id");
  const current = await prisma.projectTask.findUnique({ where: { id }, include: { blockedBy: { include: { predecessor: { select: { id: true, title: true, status: true } } } } } });
  if (!current || !(await projectAccess(req.user!, current.projectId, "UPDATE"))) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Project task was not found." } });
  const body = z.object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z.nativeEnum(ProjectTaskStatus).optional(),
    priority: z.nativeEnum(ProjectTaskPriority).optional(),
    progressPercent: z.number().int().min(0).max(100).optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    startDate: z.string().datetime().nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    blockedReason: z.string().trim().min(3).max(500).nullable().optional(),
    customerVisible: z.boolean().optional()
  }).parse(req.body);
  if (body.customerVisible !== undefined && !(await projectAccess(req.user!, current.projectId, "MANAGE"))) return res.status(403).json({ error: { code: "TASK_VISIBILITY_REQUIRES_MANAGER", message: "Only a project manager can change customer visibility." } });
  if (body.assignedToId && !(await validateTaskAssignee(current.projectId, body.assignedToId))) return res.status(400).json({ error: { code: "INVALID_TASK_ASSIGNEE", message: "Assignee must be an active staff member assigned to this project." } });
  const nextStatus = body.status || current.status;
  if (body.status && body.status !== current.status) {
    try { validateTaskTransition(current.status, body.status, req.user!.id, true); }
    catch { return res.status(409).json({ error: { code: "INVALID_TASK_TRANSITION", message: "This task cannot move from " + current.status + " to " + body.status + "." } }); }
  }
  if ([ProjectTaskStatus.IN_PROGRESS, ProjectTaskStatus.IN_REVIEW, ProjectTaskStatus.COMPLETED].includes(nextStatus)) {
    const incomplete = current.blockedBy.filter(link => link.predecessor.status !== ProjectTaskStatus.COMPLETED && link.predecessor.status !== ProjectTaskStatus.CANCELLED);
    if (incomplete.length) return res.status(409).json({ error: { code: "TASK_DEPENDENCIES_INCOMPLETE", message: "Complete prerequisite tasks before starting, reviewing or completing this task.", blockers: incomplete.map(link => ({ id: link.predecessor.id, title: link.predecessor.title })) } });
  }
  if (nextStatus === ProjectTaskStatus.BLOCKED && !(body.blockedReason || current.blockedReason)) return res.status(400).json({ error: { code: "BLOCK_REASON_REQUIRED", message: "Provide a reason when marking a task as blocked." } });
  const progressPercent = nextStatus === ProjectTaskStatus.COMPLETED ? 100 : nextStatus === ProjectTaskStatus.TODO ? 0 : body.progressPercent ?? current.progressPercent;
  const updated = await prisma.$transaction(async tx => {
    const saved = await tx.projectTask.update({ where: { id }, data: {
      title: body.title, description: body.description, status: body.status, priority: body.priority,
      progressPercent, assignedToId: body.assignedToId,
      startDate: body.startDate === undefined ? undefined : body.startDate === null ? null : new Date(body.startDate),
      dueDate: body.dueDate === undefined ? undefined : body.dueDate === null ? null : new Date(body.dueDate),
      blockedReason: nextStatus === ProjectTaskStatus.BLOCKED ? body.blockedReason ?? current.blockedReason : body.blockedReason ?? (body.status ? null : undefined),
      customerVisible: body.customerVisible,
      completedAt: nextStatus === ProjectTaskStatus.COMPLETED ? new Date() : body.status ? null : undefined
    } });
    await audit(tx, req.user!.id, "PROJECT_TASK_UPDATED", "ProjectTask", id, { projectId: current.projectId, changes: Object.keys(body), status: nextStatus, progressPercent });
    return saved;
  });
  return res.json({ task: updated, message: "Project task updated." });
}));

app.listen(port, () => console.log(`Sanora API listening on :${port}`));
process.on("SIGINT", async () => { await prisma.$disconnect(); process.exit(0); });
process.on("SIGTERM", async () => { await prisma.$disconnect(); process.exit(0); });
