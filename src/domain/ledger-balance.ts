import { Prisma } from "@prisma/client";

export type PostedLedgerLine = { type: "TOP_UP" | "MATERIAL_EXPENSE" | "LABOUR_EXPENSE" | "OTHER_EXPENSE" | "REFUND"; amount: Prisma.Decimal | string | number };
export type OpenCommitment = { amount: Prisma.Decimal | string | number; fulfilledAmount: Prisma.Decimal | string | number };

export function calculateProjectBalance(entries: PostedLedgerLine[], commitments: OpenCommitment[]) {
  const zero = new Prisma.Decimal(0);
  const sum = (types: PostedLedgerLine["type"][]) =>
    entries.filter(e => types.includes(e.type)).reduce((total, e) => total.plus(e.amount), zero);
  const fundsReceived = sum(["TOP_UP"]);
  const actualExpenses = sum(["MATERIAL_EXPENSE", "LABOUR_EXPENSE", "OTHER_EXPENSE"]);
  const refunds = sum(["REFUND"]);
  const pendingCommitments = commitments.reduce((total, c) => total.plus(c.amount).minus(c.fulfilledAmount), zero);
  const availableFunds = fundsReceived.minus(actualExpenses).minus(refunds);
  return {
    fundsReceived: fundsReceived.toFixed(2),
    actualExpenses: actualExpenses.toFixed(2),
    refunds: refunds.toFixed(2),
    availableFunds: availableFunds.toFixed(2),
    pendingCommitments: pendingCommitments.toFixed(2),
    projectedAfterCommitments: availableFunds.minus(pendingCommitments).toFixed(2)
  };
}
