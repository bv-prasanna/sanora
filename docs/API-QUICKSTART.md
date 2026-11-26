# Sanora API — local quick start

## Requirements
- Node.js 20+
- PostgreSQL 14+

## Setup
1. Copy `.env.example` to `.env` and configure a PostgreSQL database, a unique JWT secret of at least 32 characters, CORS origin and bootstrap admin credentials.
2. Install dependencies with `npm install`.
3. Generate Prisma client: `npm run db:generate`.
4. Apply the schema to the development database: `npm run db:push`.
5. Create the first admin: `npm run db:seed`.
6. Start locally: `npm run dev`.
7. Health check: `GET http://localhost:4000/health`.

For production, use reviewed SQL migrations (not `db:push`), managed PostgreSQL backups, TLS, secret management and a controlled admin bootstrap process.

## Implemented endpoints
- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`
- `POST /api/projects/:id/estimates`, `POST /api/estimates/:id/submit`, `POST /api/estimates/:id/approve`
- `POST /api/projects/:id/ledger`, `POST /api/ledger/:id/approve`, `POST /api/ledger/:id/post`, `GET /api/projects/:id/ledger`
- `POST /api/projects/:id/commitments`

## Ledger workflow
New top-ups and expenses enter as pending entries. Finance approves and posts them. Only posted entries affect the actual project balance. A unique `Idempotency-Key` header is required when submitting a ledger entry. Customers can submit top-up receipts and read only projects to which they are assigned. Customers cannot create or approve expenses.

## Estimate model
Estimate lines carry category, description, optional specification, quantity, unit and rate. The API calculates an indicative total from BOQ lines. Estimate approval is versioned; approving a new version supersedes the previous approved version. Estimates are indicative, not fixed-price commitments.

## Security and known gaps before production
This is the first API implementation slice, not a production launch approval. Before production, add automated unit/integration tests, login lockout and password reset, MFA, refresh/revocation strategy, object-level permission tests for every staff role, document upload malware scanning and private storage, payment-gateway webhook verification, top-up bank reconciliation, expense reversal workflows, commitment fulfilment linkage, notification delivery, structured observability, migration review, backups/restore drills and independent security review. Restrict customer project data by project membership in every future route. Keep secrets out of Git.
