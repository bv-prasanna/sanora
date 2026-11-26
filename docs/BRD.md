# SANORA SPACES — Business Requirements Document (BRD)

**Version:** 1.2  
**Status:** Requirements baseline for product discovery and implementation  
**Company:** Sanora Spaces  
**Tagline:** Smart Spaces, Better Life.

---

## 1. Product vision

Build a premium corporate website and an integrated operations platform for Sanora Spaces, a real-estate and construction company. The platform must support property offerings and configurable savings/payment schemes, transparent end-to-end construction project accounting, distributed locality branches with partner profit sharing, independent referral programmes, and auditable monthly financial reconciliation.

The system is not a conventional construction contractor ledger. Sanora's construction model is based on transparent, project-specific material and labour costs, with supporting documents and customer visibility into every posted transaction.

## 2. Business lines and operating models

1. **Property sales and property schemes** — villas, residential plots, agricultural/farm land, flats, sites, land parcels and other property inventory.
2. **Construction services** — PEB and factory sheds, warehouses, residential/farm villas, commercial and other construction projects, including design, drawings, approvals, documentation, procurement, labour and end-to-end project support.
3. **Locality branch / business partner network** — Sanora may operate through branches in multiple localities and cities. Branch partners do not pay a franchise deposit or operating-model joining deposit to Sanora under this proposed model. A branch is attributed business and receives a configured share from eligible business/projects attributed to it.
4. **Referral programmes** — separate property referral and construction referral programmes, independent from branch profit-share entitlements.

The platform must not assume that a branch partner is a franchisee who pays a franchise fee or deposit. Use neutral terms such as **Branch**, **Branch Partner**, and **Branch Partner Agreement** unless the final legal structure specifies otherwise.

## 3. Roles and access

- **Super Admin / Directors:** company-wide configuration, branches, partners, schemes, project approvals, finance, referral rules, settlements and reports.
- **Corporate Admin / Operations:** customer onboarding, property inventory, scheme setup, project lifecycle, document review and operational coordination.
- **Branch Manager:** local leads, customer coordination, property/project attribution, branch pipeline and branch-level reporting.
- **Branch Partner:** permitted branch performance, attributed projects, statements, calculated entitlements and settlement history; no access to unrelated branches or customer-sensitive information.
- **Sales / Relationship Executive:** leads, site visits, customer follow-ups, bookings and referrals within assigned scope.
- **Site Engineer:** site updates, measurements, material receipt/consumption, labour records, progress photos, quality and safety checklists.
- **Procurement / Operations Executive:** purchase requests, vendor quotations, purchase orders, delivery notes, invoices and supporting documents.
- **Finance Executive:** receipts, project-account postings, expense verification, branch share accruals, referral bonuses, reconciliations and payment batches.
- **Customer / Client:** own property/scheme details, construction project, documents, approvals, account statement, expenses, top-ups, milestones and notifications.
- **Auditor / Read-only:** controlled access to approved records, statements, audit trail and reconciliation reports.

Use role-based and branch-scoped access, with explicit project/customer permissions and maker-checker approvals for sensitive financial actions.

## 4. Property catalogue and scheme management

### 4.1 Property inventory

Admin can create and maintain property listings including:
- Property category: villa, plot/site, flat/apartment, agricultural land/farm land, layout, independent house, commercial property, land parcel or configurable category.
- Project / layout / scheme name, description, location, map coordinates, survey/site identifiers where appropriate.
- Plot/unit number, dimensions, area and measurement unit, facing, road width, floor/unit details, built-up area and other category-specific attributes.
- Asking price, price per sq. ft./sq. yd./acre, taxes/charges, availability status, booking status and inventory history.
- Photos, plans, approvals, title/ownership and other due-diligence documents with access controls.
- Lead, enquiry, site visit, reservation, booking, sale and cancellation status.
- Property inventory must support individual units and bulk inventory import.

### 4.2 Scheme builder

Admin first creates or selects a property offering and then creates one or more schemes for it. A scheme is configurable and must not be hard-coded to a single monthly instalment model.

Scheme configuration includes:
- Scheme name, linked property/project/inventory, eligibility and customer-facing description.
- Defined tenure (e.g. 12, 24, 36, 48 months) or flexible/open-ended plan where permitted.
- Start/end dates, enrolment window, grace period, due dates, late fee/waiver policy and cancellation/refund rules.
- Initial booking/enrolment amount, recurring contributions, milestone collections, final/balance payment and optional lump-sum collections.
- Payment frequencies: one-time, weekly, monthly, bi-monthly, quarterly, half-yearly, yearly, milestone-based, custom date/interval and ad-hoc top-up.
- Mixed schedules within one scheme. Example: ₹10,000 every month plus ₹50,000 every quarter, or a separately configured lump sum every six months.
- Fixed amount, percentage-based amount, area-linked amount or individually customised schedule, with effective dates and versioning.
- Payment methods, receipts, reminders, grace handling, allocation rules and reconciliation.
- Customer-specific schedule overrides only through authorised approval and with full audit history.
- Scheme terms, disclosures and customer acceptance captured as versioned documents.

The system generates a customer-specific payment calendar and statement from the configured rules. It must detect overlapping/duplicate schedule rules and show the customer the exact due date and amount before enrolment.

**Important compliance gate:** Do not describe a property contribution plan as an investment, assured-return, deposit, chit, pooled scheme or ownership entitlement unless the structure has been reviewed and approved by qualified legal, tax and regulatory advisers. The platform must support configurable disclosures, agreements, receipts and approval gates; product launch requires legal validation of the actual scheme structure and applicable Indian laws.

### 4.3 Scheme lifecycle

Draft → Internal Review → Approved → Published → Enrolment Open → Active → Completed / Cancelled / Suspended.

Customer lifecycle: Enquiry → KYC / document collection as required → Scheme terms acceptance → Enrolment approval → Schedule generated → Collections → Reconciliation → Completion / cancellation / refund handling.

## 5. Independent referral programmes

Create two separate programmes with independent configuration, eligibility, referral attribution, reward calculation, approval, ledgers, statements and settlement:

### 5.1 Property referral programme
- Referral source/referrer, referred lead/customer, property listing, branch and responsible sales person.
- Eligible events: qualified lead, site visit, booking, agreement, collection milestone or completed sale, configurable per campaign.
- Reward model: fixed amount, percentage of eligible base, per-unit/per-area rate, tiered rate or campaign-specific custom rule.
- Rules for split referrals, multiple referrers, self-referrals, duplicate leads, attribution window, cancellations, refunds and clawbacks.
- Reward becomes payable only on configured verified business milestones and after required approvals.

### 5.2 Construction referral programme
- Referral source, referred client, construction project, branch attribution and assigned sales/operations team.
- Reward basis can be fixed, percentage of an explicitly defined base, per sq. ft. rate, milestone-based or custom.
- Eligibility, cap, attribution period, split referrals, exclusions, cancellations and clawback rules.
- Construction referral rewards must remain separate from branch partner profit-share entitlements.

Referral rules must be versioned. Each earned reward records the exact rule version and calculation inputs used.

## 6. Locality branch and branch-partner profit-share model

### 6.1 Branch network

Sanora can create multiple branches across localities and cities, for example Bengaluru (multiple locality branches), Mysuru, Shivamogga, Davanagere and other locations.

Each branch record includes:
- Branch code/name, city, locality, address, service territory, contact details and operational status.
- Branch manager, one or more branch partners and their effective-dated participation agreements.
- Partner identity/KYC and bank/payment details held securely.
- Branch start/end dates, partner onboarding/offboarding, ownership/participation changes and approval history.
- Territory rules and lead/project attribution policy.

**No branch deposit or franchise joining deposit is collected in this model.** Any future change to this policy requires explicit business and legal approval and must not be silently introduced as a mandatory onboarding charge.

### 6.2 Project and transaction attribution

Every eligible business opportunity, property transaction and construction project must have a recorded originating/servicing branch, with an attribution source and audit trail.

Examples:
- A 30 × 40 duplex construction project sourced and serviced by the Davanagere branch is tagged to Davanagere. Eligible Davanagere branch partners receive the configured share for that project.
- A Shimoga branch-originated farmland sale/investment transaction for land in Madugiri is attributed to Shimoga if the approved attribution policy says the originating branch owns the business credit, even though the property is geographically elsewhere.

Support:
- Lead-originating branch, customer relationship branch, project execution/site branch and property-location branch as separate fields. Do not collapse these into one ambiguous branch field.
- A primary credited branch and, if authorised, multiple split-credit branches with defined percentages.
- Attribution lock at a defined milestone (e.g. qualified lead, booking, agreement or project approval), controlled reassignment with reason and maker-checker approval.
- Rules for cross-branch referrals, transferred leads, joint selling, central corporate leads, repeat customers and projects executed in a different city.
- Branch attribution must be visible in the project/property record and every related share calculation.

### 6.3 Configurable branch-share rules

The system must support company-wide default rules, branch-specific rules, partner-specific rules, business-line rules and project-specific overrides.

Supported calculation methods:
1. **Percentage:** configured percentage of a clearly defined base.
2. **Per-area rate:** e.g. ₹50 per sq. ft. of eligible constructed area.
3. **Fixed amount:** fixed amount per project, property unit, transaction or milestone.
4. **Tiered / slab-based:** rate varies by volume, value, area or performance.
5. **Custom formula / milestone split:** approved rule with explicitly defined inputs, caps, floors and rounding.
6. **Combination:** a base amount plus a percentage or per-area component, where approved.

A rule must explicitly specify:
- Applicable business line: construction, property sale, property scheme or another configured category.
- Calculation base: contract value, eligible collected amount, net revenue, gross margin/profit, eligible construction area, saleable area, fixed amount or another named base.
- Whether taxes, discounts, refunds, pass-through expenses, material/labour costs, finance charges and referral rewards are included or excluded.
- Rate, caps/floors, rounding precision, effective dates and eligible milestones.
- Whether the share is earned, accrued, payable or paid at each stage.
- Partner allocation method when a branch has multiple partners: equal split, fixed percentage weights, role-based weights or custom effective-dated shares.
- Treatment of cancellations, customer defaults, refunds, cost revisions, negative adjustments and reversals.
- Approval requirements and rule version.

**Illustrative examples only (not approved commercial terms):**
- Davanagere duplex construction: 2% of a specifically selected eligible base, or ₹50 per sq. ft. of approved eligible built-up area, or a project-specific negotiated share.
- Shimoga-originated Madugiri farmland transaction: fixed amount per sq. ft./acre, fixed amount per completed sale, percentage of a defined sale base or project-specific share.

The phrase “2% of cost” is not sufficient for implementation. Admin must choose and label the exact calculation base (for example, eligible project cost, collected contract amount or net project margin). The UI must show a worked calculation preview before a rule is approved.

### 6.4 Partner profit-share ledger

Maintain a separate, immutable branch-partner entitlement ledger:
- Project/property transaction reference and credited branch.
- Partner and effective participation percentage/weight.
- Rule ID/version and calculation base.
- Gross eligible base, exclusions/deductions, rate, calculated share and adjustments.
- Earned date, accrual month, approval status, payable date, payment batch and settlement reference.
- Supporting project milestone, invoice/collection and approval evidence.
- Reversal/clawback entries linked to original entry; never silently edit or delete a posted entitlement.

Show each branch and partner a statement of attributed business, earned share, pending approval, accrued amount, payable amount, paid amount and adjustments.

## 7. Monthly financial close and reconciliation

The platform must provide a monthly close process covering **branch profit shares and both referral programmes**, in addition to property and construction financial reconciliations.

Monthly workflow:
1. Define accounting period and cut-off date.
2. Collect all eligible property transactions, customer collections, construction milestones, approved expenses and project/branch attribution changes for the period.
3. Validate missing documents, duplicate entries, unapproved overrides, unresolved refunds and incomplete milestones.
4. Calculate branch-partner shares using the effective rule version for each eligible event.
5. Calculate property referral rewards and construction referral rewards independently.
6. Apply approved reversals, cancellations, refunds, clawbacks and prior-period adjustments.
7. Generate branch-wise, partner-wise and referrer-wise draft statements.
8. Finance maker review → authorised checker approval → period lock.
9. Create payment batches with bank/payment references and payment proof.
10. Reconcile actual payments against approved payable ledgers; mark paid only after confirmation.
11. Publish statements and notify partners/referrers through in-app, email and WhatsApp where configured.
12. Reopen a locked period only with privileged approval, reason and complete audit trail; post corrections as adjustment entries.

Reports:
- Branch-wise eligible business and project pipeline.
- Project-wise and property-transaction-wise branch share.
- Partner-wise earned/accrued/payable/paid balances.
- Property referral and construction referral reward registers separately.
- Monthly accrual vs payment vs outstanding.
- Cross-branch attribution and split-credit report.
- Adjustments, clawbacks, reversals and exceptions.
- Finance reconciliation and audit export.

## 8. Construction project management and transparent customer account

### 8.1 Customer and project onboarding
- Register customer first if not already present.
- Capture customer identity/contact details and required KYC/documentation.
- Create project only after agreement/authorised initiation; assign unique project code and customer.
- Capture project type, site address/location, dimensions, built-up area, scope, BOQ/estimate, timeline, milestones and assigned branch.
- Record agreement, scope, commercial terms, advance requirement and approvals.
- Customer pays configured advance and uploads required land/title, identity, tax, approval and other documents.
- Corporate documentation team reviews, requests corrections and tracks each document status/version.

### 8.2 Project lifecycle
Lead → Site Visit → Feasibility → Estimate / BOQ → Proposal → Agreement → Advance → Document Collection → Approvals → Design & Drawings → Planning → Groundbreaking / Pooja → Procurement → Construction → Quality & Safety → Handover → Closure / Warranty Support.

Stages, dependencies, responsible role, target dates, checklists and customer-visible status are configurable.

### 8.3 Project wallet / customer-funded project account
- Each construction project has a dedicated customer account ledger.
- Record advance and subsequent top-ups as customer receipts.
- Every expense must be linked to project, category, vendor/worker, date, amount, approval, payment mode and supporting invoice/receipt/payment proof.
- Categories include materials, transport, equipment, subcontracted labour, daily labour, permits/fees and other approved project expenses.
- Deduct posted and approved expenses from available funds; separately show committed/pending purchase orders so available cash is not confused with committed cost.
- Configure minimum balance threshold and notify customer and finance/operations when reached.
- Customer may top up at any time; system generates receipt and updated statement.
- Negative balance, overspend and unapproved spend require configurable controls and approval.
- Do not treat the project account as a bank deposit or interest-bearing wallet; it is an auditable project-funds ledger subject to approved legal/accounting treatment.

### 8.4 Procurement and labour transparency
- Purchase requisition, quote comparison, vendor selection, purchase order, delivery/GRN, invoice, quality check and payment record.
- Material quantity, unit, rate, taxes, freight, wastage/returns and stock/site consumption.
- Labour attendance, worker/crew, work description, measured quantity, rate, approval, payment and proof.
- Daily site diary, work progress, geo-tagged photos where available, blockers, safety and quality checks.
- Customer-visible expense record with invoice/document attachments and a clear status.
- Corrections through reversal/adjustment entries, not deletion of posted expenses.

### 8.5 Customer transparency
Customer portal/app shows:
- Project status, timeline, milestone completion and pending customer actions.
- Agreements, approvals, drawings and document versions.
- Total funds received, top-ups, approved expenses, commitments, current available balance and statement export.
- Itemised material and labour details with supporting documents, subject to privacy controls.
- Notifications for each receipt, expense posting, approval, low balance, schedule change and milestone update.
- Query/dispute workflow with comments and resolution trail.

## 9. Website and applications

### 9.1 Public corporate website
Premium, responsive Sanora Spaces website with company profile, services, PEB/factory sheds/warehouses, residential and farm villas, property offerings, portfolio, project enquiry, contact, branch locations and scheme information. Admin-managed CMS and lead capture.

### 9.2 Role-based applications / portals
A common platform with role-based navigation and permissions:
- Customer app/portal.
- Branch partner portal.
- Branch manager portal.
- Admin/corporate operations portal.
- Site engineer/mobile field interface.
- Procurement and finance workspaces.

Mobile-first responsive web/PWA can be the first release; native Android/iOS can follow if required. Avoid maintaining separate business logic across multiple apps.

## 10. Notifications and communication

Events include scheme due reminders, receipts, missed/late payments, project document requests, approvals, purchase/expense postings, top-up and low-balance alerts, project milestones, branch-share accruals, monthly statements, referral rewards and settlements.

Channels: in-app, email and WhatsApp (via approved provider). Store delivery status, retry/error information and message templates. Do not expose confidential documents or bank details in notification text.

## 11. Core data model (logical entities)

- User, Role, Permission, Customer, Partner, Employee, Vendor, Worker/Crew.
- Branch, BranchTerritory, BranchPartnerAgreement, BranchPartnerAllocation.
- PropertyProject, PropertyUnit, PropertyInventory, PropertyDocument.
- Scheme, SchemeVersion, SchemeScheduleRule, SchemeEnrolment, CustomerPaymentSchedule, SchemeCollection, SchemeReceipt.
- Lead, Referral, ReferralProgramme, ReferralRuleVersion, ReferralEntitlement, ReferralSettlement.
- ConstructionProject, ProjectAgreement, ProjectStage, ProjectMilestone, Drawing, Approval, ProjectDocument.
- Estimate, BOQ, PurchaseRequest, VendorQuote, PurchaseOrder, GoodsReceipt, Material, StockMovement, LabourAttendance, LabourMeasurement.
- ProjectFundLedger, ProjectExpense, ProjectTopUp, ProjectCommitment, CustomerStatement.
- BranchShareRule, BranchShareRuleVersion, BranchAttribution, BranchShareAccrual, PartnerEntitlementLedger, PartnerSettlement, SettlementBatch.
- MonthlyClose, Reconciliation, Adjustment, Approval, AuditEvent, Notification, MessageDelivery.

All money movements and entitlements must have unique IDs, timestamps, actor, source reference, status and audit history. Use decimal-safe currency arithmetic and immutable posted ledgers.

## 12. Security, controls and non-functional requirements

- Role-based, branch-scoped and project-scoped access; least privilege by default.
- MFA for privileged roles; secure authentication/session handling.
- Encryption in transit and at rest; secure file storage with signed/authorised access.
- Audit trail for logins, approvals, document access/download where appropriate, financial postings, rule changes and attribution changes.
- Maker-checker for scheme publication, financial postings, branch-share/referral rules, partner changes, payouts and period reopening.
- Idempotent payment webhooks and transaction posting; duplicate payment protection.
- No hard delete for posted financial records; use reversals and adjustments.
- Backups, restore testing, monitoring, error logging and exportable audit reports.
- Responsive and accessible UX, clear human-readable errors and status messages.
- Configurable timezone (default Asia/Kolkata), INR currency and Indian date/number formats.
- Performance, availability, retention and disaster-recovery targets to be agreed in technical design.

## 13. Key business rules and safeguards

1. Property schemes, construction project funds, branch partner shares and referral rewards are four separate ledgers.
2. Branch partners do not pay a deposit under the stated business model.
3. Branch share is not automatically the same as referral commission. A person may qualify for both only if separate approved rules explicitly allow it; show both calculations separately and prevent accidental double counting.
4. One transaction may have distinct originating, servicing, execution and property-location branches. Attribution policy decides which branch receives credit.
5. Every calculation must be reproducible from the stored rule version and input data.
6. Partner shares and referral rewards are not payable merely because a lead exists; eligibility milestone and approval must be met.
7. Monthly reconciliation must include accruals, payables, payments, reversals and prior-period adjustments.
8. Any property scheme structure, customer-fund handling, referral payout, branch partner arrangement, tax treatment and agreement must undergo qualified legal/accounting review before launch.
9. Never advertise assured appreciation, guaranteed returns or fixed investment returns unless legally reviewed and explicitly approved.
10. Admin changes to rates apply prospectively by default. Retroactive changes require exceptional approval and a documented recalculation/adjustment process.

## 14. Reports and dashboards

- Executive dashboard: property inventory, scheme collections, active construction projects, project balances, branch performance and monthly payable exposure.
- Property dashboard: inventory, enquiries, bookings, scheme enrolments, due collections and overdue schedules.
- Construction dashboard: stage-wise projects, site progress, budget/estimate vs actual, material/labour costs, project funds and low-balance alerts.
- Branch dashboard: leads, bookings, project value, attributed business, branch-share accrual and partner settlement status.
- Referral dashboard: separate property and construction referral funnel, earned rewards, pending approval and payouts.
- Finance dashboard: daily receipts/payments, project ledger, branch-share ledger, referral ledgers and month-end close exceptions.

## 15. Acceptance criteria (high-level)

- Admin can create multiple property types and multiple schemes per property.
- Admin can configure fixed tenure or flexible tenure and mixed payment frequencies in one schedule.
- Customer sees a generated payment calendar and accurate receipts/statements.
- Property and construction referral programmes calculate and settle independently.
- Admin can create branches and associate multiple partners without collecting a branch deposit.
- Eligible projects/transactions can be attributed to a branch with an auditable change history.
- Branch share supports percentage, per-area, fixed, tiered and approved custom rules with explicit calculation bases.
- A project can have a project-specific share override and partner split weights.
- Monthly close produces separate partner-share, property-referral and construction-referral statements and payment batches.
- Finance can reconcile actual payments and carry forward outstanding/adjustment balances.
- Construction customer can view every posted project receipt and expense with supporting documents.
- Low project balance triggers configurable notifications.
- Privileged changes, approvals, reversals and period reopenings are fully auditable.

## 16. Open decisions for business/legal sign-off

These are configuration/policy decisions, not assumptions to hard-code:
- Exact legal structure and agreement format for branch partners; whether they are profit participants, commission partners, LLP/company partners, agents or another legally reviewed category.
- Definition of “profit” and the approved calculation base for each business line.
- Whether branch share is calculated on contract value, collections, net revenue, gross margin, project profit, built-up area or a combination.
- Branch attribution policy for corporate leads, cross-city property sales, joint branches and execution by another branch.
- Partner split rules when there are multiple partners or partner changes during an active project.
- Accrual trigger, monthly cut-off, payout date, reserves/holdbacks and treatment of customer defaults/refunds.
- Whether branch share and referral rewards may be earned on the same transaction, and any combined cap.
- Property scheme legal structure, collection custody, refund/exit rules, applicable registrations/disclosures and permitted marketing claims.
- Applicable GST, TDS, accounting, invoicing and other statutory treatment as confirmed by professional advisers.
- Payment gateway, WhatsApp provider, email provider, accounting integration and bank reconciliation approach.

---

**Document control:** Version 1.2 incorporates the configurable property scheme model, independent property/construction referral programmes, and the locality branch partner profit-sharing and monthly reconciliation model requested by Sanora Spaces. This BRD is a business requirements baseline; detailed UX, API contracts, database schema, accounting policy and legal agreements are subsequent design deliverables.
