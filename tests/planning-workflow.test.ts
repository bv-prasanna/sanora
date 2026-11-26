import test from "node:test";
import assert from "node:assert/strict";
import { validateTaskTransition } from "../src/skeleton/policies.mjs";

test("task workflow permits normal delivery progression", () => {
  assert.equal(validateTaskTransition("TODO", "IN_PROGRESS", "staff-1", true).to, "IN_PROGRESS");
  assert.equal(validateTaskTransition("IN_PROGRESS", "IN_REVIEW", "staff-1", true).to, "IN_REVIEW");
  assert.equal(validateTaskTransition("IN_REVIEW", "COMPLETED", "staff-1", true).to, "COMPLETED");
});

test("task workflow rejects skipping review or reopening cancelled work", () => {
  assert.throws(() => validateTaskTransition("TODO", "COMPLETED", "staff-1", true), /Invalid status transition/);
  assert.throws(() => validateTaskTransition("CANCELLED", "IN_PROGRESS", "staff-1", true), /Invalid status transition/);
});

test("task workflow requires an authorised actor", () => {
  assert.throws(() => validateTaskTransition("TODO", "IN_PROGRESS", "staff-1", false), /not authorized/);
});

import { validateMilestoneTransition } from "../src/skeleton/policies.mjs";

test("milestone workflow requires planned work to start before completion", () => {
  assert.equal(validateMilestoneTransition("PLANNED", "IN_PROGRESS", "manager-1", true).to, "IN_PROGRESS");
  assert.throws(() => validateMilestoneTransition("PLANNED", "COMPLETED", "manager-1", true), /Invalid status transition/);
  assert.throws(() => validateMilestoneTransition("CANCELLED", "IN_PROGRESS", "manager-1", true), /Invalid status transition/);
});
