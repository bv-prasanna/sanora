# Finance review queues

## Access
Only SUPER_ADMIN, DIRECTOR and FINANCE roles can access the project finance review queue API and portal actions. Project access is still checked for each selected project.

## Queues and actions
- Expense ledger: PENDING entries can be approved; APPROVED entries can be posted. Only posted entries affect actual project balances.
- Labour records: submitted labour can be approved. Approval creates a pending labour expense; Finance must separately approve and post that ledger entry.
- Purchase orders: submitted POs can be approved. Approval authorises procurement but does not itself post an expense or reduce the project balance.
- Customer top-ups are handled separately by the customer top-up reconciliation workflow. A confirmed top-up is posted only after Finance verifies the actual payment.

## Controls
The portal calls the existing server-side approval endpoints. Each action rechecks the authenticated role and project access, and the backend records audit events. The UI does not replace API authorization.

## Follow-up
Maker-checker separation between approver and poster, batch review, invoice/receipt matching, bank reconciliation, downloadable approval packs and exception reports remain future work and need explicit finance policy decisions.
