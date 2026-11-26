# App Skeleton reuse in Sanora Spaces

Sanora integrates selected reusable modules from the Varada Techworks App Skeleton repository instead of maintaining parallel copies of common platform policies.

- Source repository: https://github.com/varadatechworks/app-skeleton
- Source branch: `main`
- Pinned source commit: `cde57d07f5aa361d04ba9b702fd6a49392646547`
- Source package version: `0.2.0`
- Vendored location: `vendor/app-skeleton/`
- License/ownership: internal Varada Techworks reusable asset; verify internal ownership and licensing before external redistribution.

## Reused modules and adapters

- Identity contracts and user lifecycle: `modules/identity`
- Simple and scoped RBAC: `modules/authorization`
- Tenant guardrails: `modules/tenant`
- GPS/location evidence and geography: `modules/geo`
- Maker-checker approvals: `modules/approvals`
- Redacted append-only audit event contracts: `modules/audit`
- Integer minor-unit billing and quote arithmetic: `modules/billing`
- Guarded state transitions: `modules/workflow`
- Allowlisted aggregate reporting and CSV safety: `modules/reporting`
- Notification templates, consent and outbox envelope: `modules/notifications`
- Checkout signatures, refunds and reconciliation: `modules/payments`
- PostgreSQL idempotency and durable outbox adapters: `adapters/postgres`
- HTTP, notification and Razorpay provider adapters: `adapters/providers`

The first API integration imports the skeleton authorization, workflow, audit-redaction and billing policies through `src/skeleton/policies.mjs`. Sanora's project BOQ and actual-cost ledger remain domain-specific and use these shared policy contracts.

## Integration boundaries

The skeleton repository explicitly describes itself as an opt-in module library, not a deployed application. It does not provision authentication, databases, provider credentials or production services. Sanora therefore keeps its own Prisma persistence and API routes, and must continue to supply trusted authentication, tenant-bound repositories, durable audit persistence, provider configuration and transaction handling.

The vendored PostgreSQL idempotency/outbox and Razorpay adapters are reference code and are not yet wired to live Sanora project funding. Do not enable customer-facing online top-ups until signed webhook verification, provider fetch/reconciliation, durable idempotency, finance approval and bank reconciliation are connected and tested. Do not use the client redirect as payment proof.

## Upgrade procedure

1. Review App Skeleton changes and security/quality gates.
2. Select a tested source commit; do not copy from a moving branch.
3. Compare selected module diffs and dependencies.
4. Update vendored files and this manifest together.
5. Run Sanora unit, type, integration, permission-negative, database and provider sandbox tests.
6. Document any local modifications; avoid editing vendored modules directly where a Sanora adapter can wrap them.
