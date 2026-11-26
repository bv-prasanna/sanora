import { allowedSimple } from "../../vendor/app-skeleton/modules/authorization/simple.mjs";
import { createWorkflow, transition } from "../../vendor/app-skeleton/modules/workflow/index.mjs";
import { redact } from "../../vendor/app-skeleton/modules/audit/index.mjs";
import { calculateQuote } from "../../vendor/app-skeleton/modules/billing/index.mjs";

const roleGrants = Object.freeze({
  SUPER_ADMIN: { sanora: ["view","create","edit","delete","approve","export","manage"] },
  DIRECTOR: { sanora: ["view","create","edit","delete","approve","export","manage"] },
  CORPORATE_OPS: { sanora: ["view","create","edit","export","manage"] },
  BRANCH_MANAGER: { sanora: ["view","create","edit","export"] },
  SITE_ENGINEER: { sanora: ["view","create","edit"] },
  PROCUREMENT: { sanora: ["view","create","edit"] },
  FINANCE: { sanora: ["view","create","edit","approve","export"] },
  CUSTOMER: { sanora: ["view","create"] }
});
export function hasSanoraPermission(roles, action) {
  return allowedSimple({ roles, roleGrants, resource: "sanora", action });
}
export function redactAuditMetadata(metadata) { return redact(metadata); }
export function estimateProjectTotal(lines) {
  const quote = calculateQuote({
    tenantId: "sanora-single-tenant",
    unitPriceMinor: 0,
    quantity: 1,
    currency: "INR"
  });
  const totalMinor = lines.reduce((sum, line) => {
    const quantityMilli = Math.round(Number(line.quantity) * 1000);
    const ratePaise = Math.round(Number(line.unitRate) * 100);
    if (!Number.isSafeInteger(quantityMilli) || quantityMilli <= 0 || !Number.isSafeInteger(ratePaise) || ratePaise < 0) throw new Error("Invalid BOQ quantity or rate");
    const linePaise = Math.round(quantityMilli * ratePaise / 1000);
    if (!Number.isSafeInteger(linePaise) || !Number.isSafeInteger(sum + linePaise)) throw new Error("BOQ total exceeds safe range");
    return sum + linePaise;
  }, quote.totalMinor);
  return { totalPaise: totalMinor, totalRupees: (totalMinor / 100).toFixed(2), currency: "INR" };
}
const projectWorkflow = createWorkflow({
  initial: "ENQUIRY",
  transitions: {
    ENQUIRY: ["ESTIMATION", "CANCELLED"],
    ESTIMATION: ["AWAITING_APPROVAL", "ENQUIRY", "CANCELLED"],
    AWAITING_APPROVAL: ["PLANNING", "ESTIMATION", "CANCELLED"],
    PLANNING: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
    IN_PROGRESS: ["ON_HOLD", "HANDOVER"],
    ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
    HANDOVER: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: []
  }
});
export function validateProjectTransition(current, next, actorId, allowed) {
  return transition(projectWorkflow, current, next, { actorId, reason: "Project status update", allowed });
}
