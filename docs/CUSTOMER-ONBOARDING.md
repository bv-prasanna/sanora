# Customer onboarding and project creation

## Invitation flow
1. An authorised Sales/management user creates a customer invitation with name, email and optional phone.
2. Sanora creates or reuses an inactive CUSTOMER account and stores only a SHA-256 hash of a cryptographically random 256-bit invitation token.
3. Any older unaccepted invitations for that inactive account are revoked when a replacement invitation is created. The invitation expires after seven days. The raw activation token is returned once to the authenticated staff user as a shareable link; no email is sent automatically.
4. The customer opens `accept-invitation.html`, sets a password of at least 12 characters, and submits the token.
5. The server atomically claims the invitation, hashes the password with bcrypt, activates the customer account and records an audit event.
6. The customer can then sign in to `portal.html`.

## Security
- Inactive customer accounts cannot sign in.
- Invitation tokens are stored as hashes and are single-use, can be revoked by reissue, and expire after seven days.
- Activation is rate-limited and guarded against concurrent replay.
- The activation page removes the token from the browser address bar before submitting and sends a no-referrer policy.
- Service worker caching explicitly bypasses URLs containing an invitation token.
- Project creation accepts only an active CUSTOMER account.
- Customer directory and invitation/project creation endpoints are role restricted.

## Project creation
Staff can select an activated customer, enter project name/location/description and create the project. The API creates customer VIEW membership and creator MANAGE membership and writes an audit event.

## Deployment
- Set `PUBLIC_APP_URL` to the public website origin, e.g. `https://sanoraspaces.com`, so copied invitation links point to the correct site.
- If the API is hosted separately, configure the activation page's `api-base-url` meta value and allow the website origin in API CORS.
- No email provider is assumed. Staff must share the one-time invitation URL through an approved channel and should treat it as a credential.

## Follow-up
Automated invitation emails, resend/revoke controls, account recovery, MFA, customer consent/retention workflows, project conversion from leads and account audit dashboards remain future work.
