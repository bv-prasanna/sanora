# Project financial statement and export

## Purpose
The project statement gives the customer and authorised project staff a transparent view of the indicative approved estimate, verified funds received, posted expenses, refunds, available funds, open commitments and projected funds after commitments.

## Accounting definitions
- Approved estimate: sum of approved BOQ lines (quantity × unit rate). It is indicative and is not a fixed-price or guaranteed final cost.
- Funds received: posted TOP_UP ledger entries only. Customer-submitted payment references are not receipts.
- Actual expenses: posted material, labour and other expense entries.
- Refunds: posted refund entries, shown separately.
- Available funds: posted funds received less posted expenses and refunds.
- Pending commitments: open commitments less fulfilled amount; not posted expenses.
- Projected after commitments: available funds less pending commitments.
- Estimate variance: actual posted expenses less approved indicative estimate. It is a monitoring comparison, not a contract variation or customer liability.

## APIs
- `GET /api/projects/:id/statement`: role-scoped statement JSON.
- `GET /api/projects/:id/statement.csv`: audited CSV export of the statement, posted transactions and visible top-up submissions.

Customers can see only their own top-up submissions. Ledger transactions include posted entries only. Internal supplier/commitment detail is not exported to customer accounts. The CSV neutralises formula-leading cells to reduce spreadsheet formula injection risk.

## Important limitations
- The report is based on the currently recorded project ledger and commitment data; it is not a bank statement, tax invoice, statutory account or independently audited statement.
- Reversal accounting and bank reconciliation need finance policy and transaction-level tests before statutory use.
- Legal/accounting review is required for customer-fund custody, client money treatment, GST/TDS and invoice obligations.
