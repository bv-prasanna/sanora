# Reception desk: email and WhatsApp introductions

## Staff experience
- A dedicated FRONT_DESK role sees the Reception / Customer Introduction Desk in the authenticated portal.
- Staff enter the customer's name (optional), email address and/or WhatsApp number, then choose Property Buy, Property Sell, Construction or General Introduction.
- The category copy is previewed before sending. Email and WhatsApp are separate actions and require the corresponding recipient.
- The last 100 communication attempts are visible to authorised reception/management users with channel, recipient, category, actor, timestamp and outcome.

## Delivery configuration
Email uses the Resend HTTP API:
- RESEND_API_KEY
- RESEND_FROM_EMAIL (a verified sender/domain in Resend)

WhatsApp uses the Meta WhatsApp Cloud API:
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_TEMPLATE_NAME (default: sanora_reception_message)
- WHATSAPP_TEMPLATE_LANGUAGE (default: en)

The configured WhatsApp template must be approved by Meta and contain one body text variable ({{1}}). Business-initiated WhatsApp messages require an approved template; an ordinary free-form text message is not used here. The recipient must be entered in international format, e.g. +919876543210.

## Delivery and privacy
- Provider acceptance is recorded as SENT; it is not a guarantee of inbox delivery or read status. The API response/provider webhook integration is needed for delivered/read receipts.
- Failed attempts are retained with a bounded provider error for troubleshooting.
- Access is restricted to FRONT_DESK, SUPER_ADMIN, DIRECTOR and CORPORATE_OPS.
- Message bodies contain customer contact context. Apply the organisation's privacy notice, retention policy and access review before production use.
- Do not place secrets in source control. Configure them as deployment environment secrets.
