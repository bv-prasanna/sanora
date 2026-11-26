# Customer response to indicative estimates

## Separate approval stages
1. Staff create and submit a versioned BOQ/plan-based estimate.
2. Authorised Finance roles approve the submitted estimate.
3. The customer is notified and can acknowledge the indicative estimate or request changes with a note.
4. Customer response is recorded separately from Finance approval and is immutable for that estimate version.
5. A revised estimate is created as a new version and follows the same submission/approval/response flow.

## API
- `POST /api/estimates/:id/approve`: Finance-only approval; notifies the assigned customer.
- `POST /api/estimates/:id/customer-response`: customer-only `ACCEPTED` or `DECLINED` response. Customer ownership is verified against the project's customer ID.
- Customer response is accepted only while the estimate is Finance-approved and has no prior customer decision.
- Declining requires a note describing requested changes.

## Commercial meaning
Customer acknowledgement confirms receipt and agreement to use the displayed indicative BOQ/scope as the current planning basis for discussion. It is not a fixed-price contract, guaranteed final cost, construction commencement authorization or waiver of future scope/rate changes. Actual material and labour charges remain based on verified project-specific costs and approved work.

## Audit and notifications
Finance approval and customer response are audit logged. The customer is notified when Finance approves an estimate; project staff are notified when the customer accepts or declines. The response is stored with the estimate version and is not overwritten by later versions.
