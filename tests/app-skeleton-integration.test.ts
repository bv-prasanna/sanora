import test from "node:test";
import assert from "node:assert/strict";
import { hasSanoraPermission, redactAuditMetadata, estimateProjectTotal, validateProjectTransition } from "../src/skeleton/policies.mjs";

test("Sanora API permissions are delegated to App Skeleton RBAC", () => {
  assert.equal(hasSanoraPermission(["SITE_ENGINEER"], "edit"), true);
  assert.equal(hasSanoraPermission(["CUSTOMER"], "delete"), false);
  assert.equal(hasSanoraPermission(["UNKNOWN"], "manage"), false);
});

test("BOQ estimate uses paise-safe App Skeleton billing arithmetic", () => {
  const total = estimateProjectTotal([
    { quantity: 2.5, unitRate: 100.25 },
    { quantity: 3, unitRate: 49.50 }
  ]);
  assert.deepEqual(total, { totalPaise: 40063, totalRupees: "400.63", currency: "INR" });
});

test("project workflow rejects invalid transitions", () => {
  assert.equal(validateProjectTransition("ENQUIRY", "ESTIMATION", "staff-1", true).to, "ESTIMATION");
  assert.throws(() => validateProjectTransition("COMPLETED", "IN_PROGRESS", "staff-1", true), /Invalid status transition/);
  assert.throws(() => validateProjectTransition("ENQUIRY", "ESTIMATION", "staff-1", false), /not authorized/);
});

test("audit metadata redacts credential-like keys", () => {
  assert.deepEqual(redactAuditMetadata({ safe: "ok", password: "secret", nested: { accessToken: "abc" } }), {
    safe: "ok", password: "[REDACTED]", nested: { accessToken: "[REDACTED]" }
  });
});
