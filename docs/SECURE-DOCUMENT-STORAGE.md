# Private project document storage

## Storage contract
The API uses an S3-compatible private object store. Cloudflare R2, AWS S3 and compatible providers can be used. Objects must remain private; do not enable public bucket access or publish object URLs.

Required environment variables:
- `S3_BUCKET`: private bucket name.
- `S3_REGION`: provider region (use the provider's documented value; R2 commonly uses `auto`).
- `S3_ENDPOINT`: provider endpoint for S3-compatible services (for example the account-specific R2 S3 endpoint). Omit for standard AWS S3.
- `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`: least-privilege service credentials. The service needs PutObject, HeadObject and GetObject only for the configured bucket/prefix.
- `S3_FORCE_PATH_STYLE`: set `true` for providers that require path-style addressing.

The API returns a five-minute presigned PUT URL. The browser must upload using the returned `Content-Type` header. The API then verifies object length, content type and server-generated metadata using HEAD before marking the document available. Downloads are returned as short-lived, three-minute presigned URLs and are audited.

## Bucket controls
- Keep public access blocked.
- Enable server-side encryption at rest.
- Configure bucket CORS for the exact customer/admin website origins, only PUT and HEAD as required, and only the headers `Content-Type` and `x-amz-meta-*`. Do not use wildcard origins in production.
- Add lifecycle cleanup for incomplete uploads (for example, pending objects older than 24 hours) after confirming the policy against business retention requirements.
- Keep bucket versioning and backups aligned with the approved document retention policy.
- Do not place access keys in frontend code, HTML, build arguments or browser storage.

## API workflow
1. Staff with UPDATE access calls `POST /api/projects/:id/documents/upload-url` with `fileName`, `contentType`, `sizeBytes`, `category`, and optional description.
2. Browser uploads bytes directly to the returned presigned URL.
3. The same staff user calls `POST /api/documents/:id/complete`. The API verifies the stored object metadata and size.
4. Documents are private to staff by default. An authorised project manager must review the document and deliberately enable customer visibility through `POST /api/documents/:id/customer-visibility`.
5. Customer portal lists only available documents marked customer-visible. A signed download link is generated only after project membership and visibility checks.

Supported file types: PDF, JPEG, PNG, WebP, DOC, DOCX and XLSX. Maximum file size: 15 MiB.

## Security limitations before production
- MIME and object metadata validation are not malware scanning; file extensions and client-supplied MIME types can be spoofed. Integrate an antivirus/content-scanning service and quarantine workflow before broad staff use or customer publication.
- Add server-side file signature inspection, archive/decompression limits, document retention/deletion policy, download rate controls and operational alerting.
- A presigned URL is a bearer credential until expiry. Do not log or forward it to third parties.
- Customer visibility is a separate explicit action. Internal invoices, agreements, worker data and payment evidence must remain hidden unless reviewed and approved for customer sharing.
- Use HTTPS for API and website traffic. For hardened production sessions, prefer same-origin HttpOnly, Secure, SameSite cookies over browser-readable bearer tokens.

This storage feature does not itself approve invoices, reconcile customer funds or make a document evidence of payment.
