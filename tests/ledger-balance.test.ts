import test from "node:test";
import assert from "node:assert/strict";
import { calculateProjectBalance } from "../src/domain/ledger-balance";

test("only posted receipts and expenses affect available funds; commitments stay separate", () => {
  const result = calculateProjectBalance([
    { type: "TOP_UP", amount: "100000.00" },
    { type: "TOP_UP", amount: "25000.00" },
    { type: "MATERIAL_EXPENSE", amount: "32450.75" },
    { type: "LABOUR_EXPENSE", amount: "12500.00" },
    { type: "REFUND", amount: "1000.00" }
  ], [{ amount: "20000.00", fulfilledAmount: "5000.00" }]);
  assert.deepEqual(result, {
    fundsReceived: "125000.00",
    actualExpenses: "44950.75",
    refunds: "1000.00",
    availableFunds: "79049.25",
    pendingCommitments: "15000.00",
    projectedAfterCommitments: "64049.25"
  });
});

test("does not lose precision with fractional quantities and rates in currency amounts", () => {
  const result = calculateProjectBalance([
    { type: "TOP_UP", amount: "0.30" },
    { type: "MATERIAL_EXPENSE", amount: "0.10" }
  ], []);
  assert.equal(result.availableFunds, "0.20");
});
