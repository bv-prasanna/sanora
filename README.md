# Sanora Spaces

**Smart Spaces, Better Life.**

Premium public website and project operations platform for Sanora Spaces.

## Current experience
- `index.html`: responsive public website for PEB/factory sheds, warehouses, farm villas, plots, property listings and construction support.
- `portal.html`: authenticated customer project workspace with live project, ledger, procurement, labour, site diary and customer-shareable document data.
- `src/server.ts`: Express API for authentication, project access, estimates, ledger, procurement, labour, GPS site diary, private document operations and customer top-up reconciliation and milestone/task planning and GPS site diary photo evidence and staff operations overview and installable PWA shell and project financial statements and in-app notifications and website lead pipeline and staff operations forms and customer onboarding.
- `prisma/schema.prisma`: PostgreSQL data model.
- `vendor/app-skeleton`: pinned shared platform foundation for common authorization, workflow, audit, billing and related contracts.

## Run locally
- Node.js 20+
- PostgreSQL
- Configure environment variables as described in `docs/SECURE-DOCUMENT-STORAGE.md` and the deployment notes.
- Install dependencies with `npm install`.
- Generate Prisma client with `npm run db:generate`.
- Validate schema with `npx prisma validate`.
- Apply schema to a development database with `npm run db:push`.
- Start API using `npm run dev`.
- Serve the static website from a local web server; the customer portal expects the API under same-origin `/api` by default. Set the `api-base-url` meta tag for a separate API host.

## Construction commercial model
Sanora's construction execution model is based on actual project-specific material and labour costs, not a fixed turnkey price or fixed per-square-foot package. The initial plan-based estimate is indicative and must identify assumptions, quantities and rates. Customer top-ups are receipts, actual approved material and labour expenses are posted separately, and pending commitments remain distinct from available funds. See `docs/CONSTRUCTION-FUNDING-MODEL.md`, `docs/TOP-UP-RECONCILIATION.md`, `docs/PROJECT-PLANNING.md` and `docs/SITE-DIARY.md` and `docs/OPERATIONS-DASHBOARD.md` and `docs/PWA-MOBILE.md` and `docs/PROJECT-STATEMENTS.md` and `docs/NOTIFICATIONS.md` and `docs/LEAD-PIPELINE.md` and `docs/STAFF-OPERATIONS-FORMS.md` and `docs/CUSTOMER-ONBOARDING.md`.

## Delivery status
Implemented foundations include authentication and role permissions, project-scoped access, estimate and project ledger workflows, vendor/purchase orders/material receipts, labour records, GPS site diary, customer portal live-data integration and private object-storage upload/download URL workflows.

Production launch still requires configured private storage, bucket CORS and access policies, malware scanning/operational document review, deployment secrets, payment gateway reconciliation, secure session hardening, automated end-to-end tests, backup/restore verification and business/legal/accounting sign-off for handling project funds.

## Contact
Sanora Spaces · Bengaluru, Karnataka · +91 82960 22107 · info@sanoraspaces.com
