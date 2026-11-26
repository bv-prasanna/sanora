# GPS site diary and photo evidence

## Site update visibility
Site diary entries are internal by default. Customers receive only entries explicitly published by a project manager. The customer API filters unpublished updates at query time; the portal does not rely on client-side hiding.

A project manager can publish or unpublish an update. Linked site photos follow the update's visibility decision, and the API also checks the parent update when issuing customer download URLs.

## Field workflow
1. Assigned project staff create a site update with category, title and description.
2. The field user can capture GPS coordinates from the phone browser after granting location permission, or enter coordinates manually.
3. Up to five JPG, PNG or WebP photos (15 MiB each maximum) can be attached to the site update.
4. Photos use the private S3-compatible upload URL and completion-verification flow.
5. Site update and photos remain internal unless a project manager publishes the update.
6. Publishing/unpublishing the update synchronises visibility for linked site photos and records an audit event.

## APIs
- `GET /api/projects/:id/updates`: customer users receive only published updates and customer-visible photos; assigned staff can view internal updates and available photos.
- `POST /api/projects/:id/updates`: create an internal update by default. Publishing at creation requires MANAGE access.
- `POST /api/projects/:id/documents/upload-url`: site-photo uploads must include a valid `projectUpdateId` from the same project.
- `POST /api/project-updates/:id/customer-visibility`: project manager publishes or unpublishes an update and synchronises linked photo visibility.
- `POST /api/documents/:id/download-url`: supports short-lived inline access for image previews after project and visibility checks.

## Mobile and production notes
- Browser geolocation requires HTTPS (except localhost) and explicit user permission.
- Configure object-storage CORS for the exact website origin and signed PUT headers.
- GPS is optional; do not block an update when location permission is denied.
- Device GPS accuracy varies. Coordinates are evidence of a device-reported location, not proof of work completion.
- Image MIME metadata is not a substitute for file-signature validation or malware scanning. Complete those controls before production use.
- Do not publish images containing private information, faces, vehicle registration numbers, worker identity details or sensitive documents without an approved disclosure process.
