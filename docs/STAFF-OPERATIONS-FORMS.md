# Staff operations forms

## Current project workspace actions
The responsive staff portal now exposes forms for the existing backend workflows:
- Create an indicative estimate with one BOQ line, assumptions and exclusions, then submit it for review.
- Review estimate versions and BOQ details; authorised Finance roles can approve submitted estimates.
- Create vendors/suppliers.
- Create a purchase order with one initial line and submit it for Finance approval.
- Submit a labour record with worker, date, work type, quantity, unit and rate.

## Controls
- Forms are role-gated in the portal for usability, but API authorization and project UPDATE membership remain authoritative.
- Estimate creation requires project UPDATE access.
- Purchase orders are created as DRAFT and then submitted; Finance approval remains separate.
- Labour records are submitted for review and do not immediately post an expense.
- Vendor, estimate, purchase-order and labour API actions retain their audit events.

## Current UI scope
This increment provides a single BOQ/PO line per form submission. The API supports multi-line estimates and purchase orders; a repeatable line-item editor, vendor catalogue import, customer account onboarding, project creation and full user administration remain follow-up work.
