# Customer portal integration

## Current behaviour

The customer portal is an authenticated, live-data view. It no longer renders demonstration customer names, made-up balances, sample transactions, or pretend document previews.

- Sign-in uses the existing `POST /api/auth/login` endpoint.
- Session revalidation uses `GET /api/auth/me`.
- Project selection uses `GET /api/projects`.
- The selected project is loaded from `GET /api/projects/:id`.
- Financial figures and posted transactions come from `GET /api/projects/:id/ledger`.
- Procurement activity comes from `GET /api/projects/:id/purchase-orders`.
- Labour records come from `GET /api/projects/:id/labour`.

Only posted ledger entries are presented as transactions. The balance summary distinguishes verified funds, posted expenses, available funds and open commitments. Pending items are not represented as settled funds or actual expenses.

## API URL configuration

The portal reads the API base URL from, in order:

1. `window.SANORA_API_BASE_URL` (set before `portal.js` is loaded);
2. the `<meta name="api-base-url">` value;
3. same-origin `/api` as a development default.

For a separate static website and API deployment, set the meta value to the full API base URL including `/api`, for example `https://api.example.com/api`. Configure the API's `CORS_ORIGIN` to the exact website origin(s).

## Session and security notes

- The bearer token is held in `sessionStorage`, not long-lived local storage, and is cleared on sign-out or an unauthorised response.
- The portal uses text nodes for server-provided labels and values rather than injecting server strings as HTML.
- API authorization remains authoritative. Hiding a project in the UI is not a security boundary.
- Production should use HTTPS, a strong JWT secret, narrow CORS origins, rate limiting and monitored backups.
- A same-origin reverse proxy with an HttpOnly, Secure, SameSite cookie is preferred for a hardened production session design. The current bearer-token flow is a functional integration step, not a substitute for that deployment hardening.

## Not yet exposed in the portal

Secure document upload/download and previews, site-photo/GPS updates, milestone timelines, customer top-up submission and payment-provider reconciliation need dedicated APIs and document storage before being displayed as live features. The portal intentionally shows a clear unavailable state instead of fake records for these items.
