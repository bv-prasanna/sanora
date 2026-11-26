# Sanora operations overview

## Access
The portfolio overview is available to authorised staff and auditors. Customers cannot access the aggregate operations endpoint. Project lists and counts are limited to projects visible to the signed-in role: corporate-wide roles see the portfolio, while branch/project staff see projects they created or are assigned to.

## Metrics
- Active projects: projects not completed or cancelled.
- Pending top-ups: customer payment notifications awaiting Finance reconciliation.
- Expense reviews: pending or approved ledger expenses awaiting final posting/review.
- PO approvals: purchase orders submitted and awaiting approval.
- Labour approvals: submitted labour records awaiting supervisor/Finance action.
- Blocked tasks: project tasks currently marked BLOCKED.
- Overdue tasks: non-completed/non-cancelled tasks with a due date earlier than the current server time.
- Total projects: all projects visible to the current staff role.

The dashboard shows counts and a short recent-project list. It does not aggregate money or imply that pending transactions are posted expenses or confirmed receipts.

## API
`GET /api/operations/summary` returns the role-scoped counts and six most recently updated visible projects. Access is denied to customer accounts.

## Follow-up
Dedicated drill-down queues, CSV exports, scheduled reports, branch performance metrics, configurable low-balance thresholds and notification/escalation rules remain separate implementation increments.
