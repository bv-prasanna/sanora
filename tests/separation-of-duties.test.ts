import test from "node:test";
import assert from "node:assert/strict";
import { isMakerCheckerValid } from "../src/domain/separation-of-duties";

test("allows an independent reviewer", () => {
  assert.equal(isMakerCheckerValid("maker-1", "checker-2"), true);
});

test("blocks self approval and self posting", () => {
  assert.equal(isMakerCheckerValid("finance-1", "finance-1"), false);
});

test("fails closed when either actor is missing", () => {
  assert.equal(isMakerCheckerValid("", "finance-1"), false);
  assert.equal(isMakerCheckerValid("maker-1", ""), false);
});
