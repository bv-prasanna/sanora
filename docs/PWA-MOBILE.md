# Sanora installable web app (PWA)

## What this delivers
The Sanora website and project portal can be installed as a Progressive Web App on supported browsers. The installed app opens the customer/staff portal in a standalone window. The responsive portal supports mobile browsers and phone GPS capture for site diary updates.

This is an installable web app, not a native Android APK or iOS App Store application. Native packaging, push notification integration, background sync and app-store release processes are not included in this increment.

## Installation
- Android/desktop Chromium browsers: open the Sanora site over HTTPS and use the browser's Install app prompt/button when offered.
- iPhone/iPad Safari: use Share → Add to Home Screen. The portal displays this guidance when it detects iOS Safari.
- A valid TLS certificate and root-scope hosting are required for service workers.

## Offline and privacy behaviour
- The service worker caches only the static app shell (HTML, CSS, JavaScript, manifest, icon and offline page).
- All `/api/` requests bypass the service worker cache.
- Signed document paths and cross-origin object-storage URLs are not cached.
- API responses include `Cache-Control: no-store, private`.
- Offline mode displays a clear connection-required message. It does not expose stale balances, private documents, project data or approval actions.

## Deployment requirements
- Serve the site from HTTPS at the root scope so `/service-worker.js` controls both the public site and portal.
- Ensure the host serves `manifest.webmanifest` as a web app manifest and the service worker as JavaScript.
- When static shell assets change, increment the cache name in `service-worker.js` so installed clients refresh the shell.
- Test install/update/offline behaviour on Android Chrome and iOS Safari after deploying to the production domain.

## Future native/mobile work
Native Android/iOS builds, secure device credential storage, push notifications, offline draft capture with safe synchronisation, background uploads, camera-specific capture, device integrity and app-store signing remain future work. The PWA should not be represented as a native app.
