import test from "node:test";
import assert from "node:assert/strict";
import { calculateWeightedProgress } from "../src/domain/weighted-progress";

test("weights physical progress by task importance", () => {
  assert.equal(calculateWeightedProgress([
    { progressPercent: 100, weight: 1 },
    { progressPercent: 0, weight: 3 }
  ]), 25);
});

test("excludes cancelled tasks from progress denominator", () => {
  assert.equal(calculateWeightedProgress([
    { progressPercent: 50, weight: 2 },
    { progressPercent: 0, weight: 100, status: "CANCELLED" }
  ]), 50);
});

test("clamps progress and rejects invalid weights", () => {
  assert.equal(calculateWeightedProgress([{ progressPercent: 150, weight: 2 }]), 100);
  assert.throws(() => calculateWeightedProgress([{ progressPercent: 50, weight: 0 }]));
});
