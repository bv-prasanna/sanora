# Customer project top-up reconciliation

## Business rule
A customer payment notification is not a confirmed receipt. It must not increase available project funds until an authorised Finance user reconciles the payment against the actual bank/payment-provider receipt.

## Customer flow
- The assigned customer selects their project and submits amount, payment mode, transaction reference/UTR and optional notes.
- A duplicate reference for the same project is rejected and protected by a database uniqueness constraint.
- The request is stored as `SUBMITTED`; the customer sees that it is awaiting verification.
- The customer portal continues to show the existing posted balance. No ledger entry is created at submission time.

## Finance flow
- Finance opens the relevant project in the portal and reviews the submitted amount, payment mode and transaction reference against bank/gateway records.
- Finance confirms or rejects the request. A rejection requires a reason.
- Confirmation atomically marks the request `CONFIRMED`, creates a posted `TOP_UP` ledger entry with a unique idempotency key, links the ledger entry to the request, and writes an audit event.
- Rejection marks the request `REJECTED` and records the reason. It creates no ledger entry.
- Repeated or concurrent reconciliation attempts cannot post a second receipt; the request must still be `SUBMITTED`.
- Direct creation of `TOP_UP` ledger entries through the generic ledger API is rejected. Only this reconciliation workflow creates a confirmed top-up ledger entry.

## API
- `GET /api/projects/:id/top-ups`: list requests visible to the current project user. Customers see only their own submissions; authorised project staff can view project requests.
- `POST /api/projects/:id/top-ups`: customer-only submission. Amount is decimal-safe, payment mode is enumerated, and reference is mandatory.
- `POST /api/top-ups/:id/reconcile`: Finance-only decision with `{ "decision": "CONFIRM" }` or `{ "decision": "REJECT", "reason": "..." }`.

## Accounting safeguards
- Customer submissions and unverified references are not cash receipts.
- Only Finance-confirmed top-ups become posted ledger receipts and affect available funds.
- Posted ledger entries remain immutable through this workflow; corrections should use the existing reversal/adjustment controls.
- Payment gateway webhooks, bank statement import, automated UTR verification, customer proof uploads and reconciliation exception reports remain future integrations.
- The project ledger is not represented as a bank account or deposit product. Customer-fund custody and accounting treatment require qualified legal/accounting approval before launch.
