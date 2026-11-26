# Sanora Spaces — Construction Funding & Cost Model

**Status:** Product and commercial model clarification for implementation. This document does not replace legal, tax or accounting advice.

## 1. Commercial principle
Sanora does not price construction as a fixed turnkey contract or a universal fixed cost per square foot. Project costs are determined by the approved plan, scope, quantities, specifications, material selections, labour requirements, site conditions, market rates and actual execution.

## 2. Estimate before execution
- Prepare an indicative estimate from the available plan and site information.
- Break the estimate into work packages, material categories, indicative quantities, units, rates, labour activities and assumptions.
- Identify exclusions, provisional quantities, taxes/fees where applicable, contingency assumptions and estimate validity date.
- Label it clearly as an estimate, not a guaranteed final amount or fixed-price commitment.
- Maintain version history. Changes to drawings, specifications, quantities, market rates or site conditions must produce a revised estimate with reasons and customer visibility.
- Capture customer acknowledgement of the estimate and scope before relevant work proceeds.

## 3. Project funding and top-ups
- Create a project-specific funds ledger for each authorised construction project.
- Record each customer top-up as a receipt with unique reference, date, amount, mode, payer, payment status and supporting evidence.
- Do not call the project ledger a bank account, interest-bearing wallet, deposit or investment product.
- Show funds received, refunds/reversals, actual posted expenses, approved commitments and available balance as distinct values.
- Alert the customer and finance/project team when available funds approach an approved threshold or when funding is required for upcoming work.
- Customer top-ups should be reconciled against actual bank/payment-gateway receipt before being marked confirmed.

## 4. Material expense capture
Every material purchase should capture, as applicable:
- Project, work package, purchase request and purchase order.
- Vendor, invoice/bill number, invoice date and payment status.
- Material/SKU description, grade/specification, quantity, unit, unit rate, tax, freight, discount and total.
- Delivery/GRN, received quantity, quality/inspection outcome, returns and wastage.
- Invoice image/PDF and payment proof.
- Approval and posting actor/time.

## 5. Labour expense capture
Every labour charge should capture, as applicable:
- Project, work package, contractor/crew/worker and work description.
- Attendance/days/hours or measured quantity, unit and agreed rate.
- Measurement evidence, supervisor verification and approval.
- Amount due, amount paid, payment mode/date and proof.
- Rework, deductions or adjustments with reason and approval.

## 6. Project account calculation
The customer view should make the following distinction explicit:
- **Confirmed funds received:** reconciled customer top-ups and advances.
- **Actual expenses:** approved, posted material and labour expenses (and any other separately approved project expense categories).
- **Pending commitments:** approved purchase orders or work commitments not yet posted as actual expenses.
- **Available funds:** confirmed funds received less posted expenses and applicable refunds/reversals. Pending commitments are shown separately and may also be reflected in a clearly labelled projected balance.
- **Estimate variance:** current estimate versus actual/committed costs, with reasons and revised forecast.

Never double-deduct commitments from actual expenses. An invoice/payment posting must reference and close or reduce the related commitment.

## 7. Customer approvals and safeguards
- Customer approval is required for defined scope/specification changes and configurable spending thresholds or categories.
- Do not represent a top-up request as a demand for a fixed contract instalment. Explain the next planned work, required materials/labour, expected cost range and supporting estimate/quotation.
- No unapproved expense should be represented as an approved posted expense.
- Prevent silent edits/deletions of posted ledger entries; correct them with linked reversals/adjustments.
- Keep customer money, Sanora operating funds and vendor/worker payments distinguishable in records and bank reconciliation. The actual custody and legal/accounting treatment of project funds must be approved by qualified advisers before production use.

## 8. Customer transparency
Customer portal should display:
- Estimate versions, assumptions, quantities and exclusions.
- Top-up receipts and reconciliation status.
- Material and labour expense line items with supporting bills/proofs as customer-shareable.
- Pending commitments separately from actual expenses.
- Available and projected balance with calculation explanation.
- Site progress, work packages, approved drawings, change requests and approval history.
- Notifications for receipts, expense postings, upcoming funding needs, estimate changes and milestone updates.

## 9. Product acceptance criteria
- No fixed per-square-foot price is assumed as the system default.
- An estimate can be created from plan-based BOQ quantities and revised with version history.
- A customer top-up is recorded as a receipt and does not itself count as revenue or project expense.
- Material and labour expenses are itemised and evidence-backed.
- Commitments are not confused with paid/posted actual expenses.
- Customer available balance reconciles to the project ledger.
- Every financial posting, approval, reversal and adjustment is auditable and idempotent.
- Customer can understand what funding is needed next and why.
