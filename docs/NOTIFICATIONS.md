# In-app notifications

## Delivery model
Sanora includes a recipient-scoped in-app inbox. Notifications are created in the same database transaction as the business event where supported, so an approval/top-up/task update cannot succeed while silently losing its notification record.

## Current event coverage
- Task assignment and reassignment.
- Customer top-up confirmation or rejection by Finance.
- Expense approval and posting.
- Labour record approval.
- Purchase order approval.
- Site diary update publication to the assigned customer.

## API
- `GET /api/notifications`: latest 50 notifications for the authenticated user and unread count.
- `POST /api/notifications/:id/read`: mark one notification as read; ownership is checked server-side.
- `POST /api/notifications/read-all`: mark all of the current user's unread notifications as read.

## Portal
The top-bar inbox displays unread count, notification title/message, project reference and date. A notification can open its related project. Users can mark individual notifications or the full inbox as read.

## Security and delivery boundary
- Notifications are private to their recipient; the API filters by authenticated recipient ID.
- Project references are returned as metadata only after the recipient has been assigned the notification.
- This is in-app delivery only. Email, SMS, push notifications, scheduled reminders, retry queues and delivery analytics are future integrations.
- Notifications are not used as the source of truth for approvals; business APIs and audit logs remain authoritative.
