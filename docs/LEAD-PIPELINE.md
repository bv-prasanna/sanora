# Website enquiry and lead pipeline

## Public intake
- The website enquiry form submits directly to `POST /api/public/enquiries`.
- Required fields: name, phone and interest. Email and project description are optional.
- Public intake is rate-limited to five requests per IP per 15 minutes and includes a honeypot field for basic bot filtering.
- The API creates a `Lead` record with source WEBSITE and status NEW.
- Active corporate owners and Sales users receive an in-app notification. Customer personal details are not broadcast in the notification.

## Staff lead workflow
- `GET /api/leads` lists the latest 100 leads for authorised Sales and management roles.
- Corporate roles can view the complete lead list. Branch managers, partners and Sales users see unassigned leads and leads assigned to themselves.
- `PATCH /api/leads/:id` updates status, assignment and internal notes.
- Sales users can assign a lead to themselves; corporate owners can assign to an active Sales/management user.
- Lead statuses: NEW, CONTACTED, QUALIFIED, SITE_VISIT, PROPOSAL, CONVERTED, LOST.
- Lead updates are audit logged; new assignments generate recipient-scoped in-app notifications.

## Website configuration
The public website reads the API base from `window.SANORA_API_BASE_URL`, then the `api-base-url` meta tag, then same-origin `/api`. If website and API are deployed separately, set the meta value to the API origin/path and configure API CORS to allow the exact website origin.

## Boundaries and follow-up
- The current pipeline stores enquiries and supports basic assignment/status updates. It does not yet create customer accounts/projects from a lead.
- Automated email acknowledgements, CRM integrations, spam scoring/CAPTCHA, consent/retention policy, call logs, reminders, conversion analytics and lead-to-project conversion remain follow-up work.
- Public enquiry storage contains personal contact data. Define retention, access review and privacy notice/consent with the business before production use.
