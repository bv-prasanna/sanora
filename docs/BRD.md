# SANORA SPACES — Business Requirements Document (BRD)

**Version:** 1.4  
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

### 8.6 Branch-level physical project files and mandatory portal uploads

Every branch that executes construction work must maintain a separate, organised physical project file for **each individual construction project**. Maintaining a physical file does not replace the digital record: the branch must also upload all relevant project documents to the Sanora portal. The portal is the central, authoritative repository for company oversight, customer visibility (where permitted), audit and continuity.

**Project file creation and ownership**
- On project activation, the system generates a unique project code and a standard project-file index/cover sheet.
- The executing branch manager is accountable for opening and maintaining the physical file; a designated project coordinator/document controller is responsible for completeness and timely portal uploads.
- The physical file must be clearly labelled with project code, customer/project name, site location, originating branch, executing branch, project manager/site engineer and project start date.
- The portal must provide a matching digital folder/document register using the same project code and document categories.
- If more than one branch is involved, identify the lead/executing branch and record each supporting branch's responsibility. Do not create disconnected duplicate project records.

**Minimum project document register (configurable by project type and stage)**
1. Customer and site: customer onboarding/KYC records as permitted, ownership/title documents supplied by customer, survey/site details, site photographs, site handover and possession records.
2. Commercial: enquiry/brief, site visit report, estimate, BOQ, scope of work, quotations, approved proposal, agreement, annexures, change orders, variations and customer approvals.
3. Design and engineering: survey measurements, soil/geotechnical reports where applicable, architectural plans, structural drawings, MEP drawings, design calculations, revisions, consultant approvals and as-built drawings.
4. Statutory and permissions: applications, permits, sanctions, NOCs, inspection records, receipts and final completion/occupancy documents as applicable to the project and jurisdiction.
5. Project planning: baseline schedule, milestone plan, work orders, method statements, risk register, meeting minutes and site instructions.
6. Procurement and materials: purchase requests, comparative quotations, vendor approvals, purchase orders, delivery challans, goods-received notes, material test certificates, quality reports, stock/consumption records, invoices, debit/credit notes and payment proofs.
7. Labour and subcontractors: work orders, subcontract agreements, attendance, measurements, wage sheets, bills, safety induction and payment proofs.
8. Execution and site records: daily site reports, progress photographs/videos, geo-tagged updates where available, inspection checklists, test reports, quality observations, non-conformance reports, corrective actions, safety/toolbox records and incident reports.
9. Finance and customer communication: advance/top-up receipts, project expense vouchers, customer statements, approvals, notices, correspondence, meeting records and dispute/resolution trail.
10. Completion and handover: snag/punch lists, rectification evidence, testing and commissioning reports, completion certificates, handover checklist, warranties, manuals, keys/access handover and final account statement.

**Document upload and control requirements**
- Upload documents against the correct project, category, stage, transaction or milestone; bulk upload from mobile/web must be supported.
- Capture document title/type, reference number, issue date, received/uploaded date, issuing party, uploader, branch, project stage, review status, confidentiality classification and applicable expiry/renewal date.
- Support PDF, office documents and image formats, configurable file-size limits, secure previews and downloads, malware scanning and access-controlled storage.
- Support versioning and revision history for drawings, agreements and approvals. A new revision must not silently overwrite an approved version; retain prior versions and identify the current approved revision.
- Workflow: Required → Pending Upload → Uploaded → Under Review → Approved / Rejected / Correction Required → Superseded / Archived.
- Reviewer comments and resubmission history must be retained. Record who reviewed, when, and the reason for rejection/approval.
- Configure mandatory document checklists by project type, jurisdiction and lifecycle stage. Prevent progression through designated stage gates or financial approvals when critical documents are missing, unless an authorised exception with reason is recorded.
- Link invoices and payment proofs directly to their corresponding expense, purchase order, goods receipt or labour payment. Link approvals and drawings to the work/milestone they authorise.
- Portal must show a project document completeness dashboard: required, uploaded, approved, rejected, expired and outstanding documents.
- Branch users may upload and view documents only for projects within their authorised scope. Corporate admin/document controllers can review across branches. Customers see only approved customer-shareable documents. Partners see only documents necessary for their authorised branch/project role.
- Maintain an immutable audit trail for upload, view/download where appropriate, replacement, approval, rejection, sharing and archival.
- Physical file index must be printable/downloadable from the portal and include document checklist, revision, upload status and physical-file location. Periodic branch audits must compare physical-file completeness with the portal register.
- On project closure or branch reassignment, the complete physical file must be handed over to the designated Sanora custodian; digital access and ownership must be reassigned without loss of history.
- Define retention, archival, legal hold and secure disposal policies with legal/accounting advisers. Do not allow branch users to permanently delete official project records.

**Operational controls and notifications**
- Notify the branch manager and document controller when a required document is due, missing, rejected, expiring or overdue.
- Escalate unresolved critical document gaps to corporate operations.
- Monthly branch compliance reports must show project-wise physical-file checklist status, portal upload completeness, pending reviews and overdue items.
- Site engineers must be able to capture/upload documents and photographs from mobile at the project site, including offline queueing with clear sync status where technically feasible.

## 8.7 Standardised construction delivery methodology (Agile-inspired)

Sanora construction projects must be executed through a repeatable, measurable and auditable delivery framework. Borrow the useful management practices of software Agile—work breakdown, prioritised backlogs, short planning cycles, Kanban flow, daily updates, reviews, dashboards and retrospectives—while retaining construction-specific engineering controls, statutory approvals, site safety and quality inspections. This is an adaptive project-delivery framework, not permission to bypass approved drawings, engineering sign-offs, statutory requirements or stage-gate approvals.

**Project delivery setup**
- At project kickoff, create a project charter containing scope, exclusions, customer expectations, approved estimate/BOQ, baseline schedule, target completion date, key stakeholders, assigned branch, project manager, site engineer and escalation contacts.
- Break the approved scope into a Work Breakdown Structure (WBS): phases → work packages → activities/tasks → measurable deliverables.
- Define dependencies, predecessor tasks, estimated duration, planned start/finish, resource/crew, material requirements, responsible person, reviewer and customer visibility for each task.
- Establish baseline milestones, critical path and a project calendar. Changes to approved scope, dates or cost must use a change request with impact analysis and authorised approval.
- Use reusable project templates by type (residential villa, duplex, farmhouse, PEB shed, warehouse, renovation, etc.) while allowing authorised project-specific tailoring.

**Kanban and work management**
- Provide project-level and branch-level Kanban boards. Configurable columns should include Backlog / Planned → Ready → In Progress → Blocked / On Hold → Quality / Internal Review → Customer Approval (where applicable) → Done. A task may be cancelled only with a reason and audit record.
- Cards must show task ID/title, phase, owner/crew, priority, planned dates, due date, status, progress, dependencies, branch, site, material readiness, linked documents, photos/evidence, blockers and approval state.
- Support drag-and-drop only where the user's permissions and workflow rules allow it. Moving a card must validate dependencies, required documents, resource readiness and stage-gate conditions.
- Provide list, Kanban, calendar, Gantt/timeline and milestone views from the same underlying task records; avoid separate inconsistent status stores.
- Support task assignment, comments, @mentions, checklists, attachments, recurring inspections, subtasks, predecessor/successor links, WIP limits, labels and saved filters.
- A blocked task must capture blocker category, description, owner responsible for resolution, date raised, expected resolution and escalation status.
- Track planned vs actual dates, task duration, overdue age, rework, completion evidence and reason for schedule variance.

**Sprint / look-ahead planning adapted for construction**
- The project manager and site engineer maintain a rolling short-term work plan (for example, weekly or fortnightly), selected according to project complexity and site conditions.
- Planning meeting confirms work packages, measurable commitments, labour/crew availability, materials, equipment, drawings, permits, predecessor completion and site readiness.
- Daily site updates record completed quantities, labour attendance, material received/consumed, photographs, safety/quality observations, blockers and next-day plan.
- Weekly review compares planned vs completed work, resolves blockers, updates forecasts and communicates customer-relevant changes.
- At the end of each planning cycle, review completed deliverables, inspect quality, record accepted/rejected work, capture lessons and reprioritise the remaining backlog.
- Construction activities must not be marked Done solely because a task card was moved. Require quantity/evidence and relevant engineer/quality approval; require customer approval only for explicitly defined customer decision points.

**Construction stage gates and quality controls**
- Configure mandatory gates for design freeze, statutory approvals, site handover, foundation inspection, structural checks, concealed MEP inspection, waterproofing, finishing, testing/commissioning and handover as applicable.
- Each gate defines prerequisites, checklist, required document versions, responsible inspector, evidence, result (Pass / Fail / Conditional), corrective actions and sign-off.
- A failed inspection creates a corrective/rework task linked to the original task and blocks dependent work where safety or quality requires it.
- Approved drawings and revisions must be linked to relevant tasks and work orders. Work against superseded drawings must be prevented or explicitly exception-approved and audited.
- Track non-conformance reports, safety incidents, corrective/preventive actions and closure verification.
- The project manager may request a stage transition, but only designated approvers can approve controlled gates.

**Progress measurement and forecasting**
- Define objective progress measures per activity: quantity completed / total quantity, checklist completion, accepted deliverables or approved milestone weighting.
- Do not use arbitrary manual percentages as the sole source of project progress. Show the calculation basis and allow authorised corrections with reason and audit history.
- Distinguish physical progress, task completion, financial progress (spent/committed/funds received) and schedule progress; do not combine these into one misleading percentage.
- Dashboard forecasts should include baseline vs forecast finish, milestone slippage, critical blockers, planned vs actual quantities, cost variance and remaining work.
- Support approved baseline re-planning with version history; preserve the original baseline for variance reporting.

## 8.8 Client live tracking, status and document access

The customer app/portal must provide continuous, self-service visibility into the customer's own project. A customer should not need to call the branch for routine status checks.

**Client project home**
- Show current lifecycle stage, current work package, overall project status, next milestone, planned vs forecast dates, last updated timestamp and the person/team responsible for the next action.
- Show project progress with a clearly explained calculation basis and separate indicators for physical progress, milestone completion, schedule health and financial position.
- Provide a customer-friendly timeline/activity feed showing completed milestones, upcoming work, approved changes, inspection outcomes and customer actions pending.
- Show project health as On Track / At Risk / Delayed / On Hold / Completed with reason, impact and recovery plan where relevant. Do not hide delays or present stale status as live.
- Display latest site diary updates, approved photographs/videos, progress summaries and next planned activities. Geo-tag/time metadata may be shown where appropriate and safe.
- Provide customer questions, clarification requests, issue/dispute reporting and change-request submission with a traceable response and resolution history.

**Document centre**
- Customers can browse, preview and download documents explicitly marked Approved and Customer-Shareable, including agreements, approved drawings, statutory approvals, receipts, expense invoices/proofs and handover documents as permitted.
- Show document category, title, revision/version, approval status, date, and whether it is current or superseded. Clearly identify the current approved drawing/document.
- Notify customers when a new shareable document is approved, a revision supersedes an earlier version, an approval/action is required, or a requested correction is available.
- Customer access must never expose internal comments, confidential vendor pricing, employee personal data, other customers' records, unapproved drafts or restricted partner/branch documents.
- Record customer document views/downloads where appropriate for audit and dispute resolution.

**Customer approvals and communication**
- Provide approval requests for defined decisions such as design selections, drawing sign-off, material/finish choices, scope changes and milestone acceptance.
- Each request includes context, relevant approved document/version, cost/time impact where applicable, due date and Accept / Reject / Request Clarification actions.
- Capture the acting customer user, timestamp, response, comments and version accepted. Approval must not be inferred from opening or downloading a document.
- Notify customers about meaningful events: stage changes, milestone completion, delay or recovery plan, site update, document approval, expense posting, receipt/top-up, low project-fund balance, inspection result and pending decision.
- Notifications are supplemental; the portal remains the source of truth and shows delivery status where available.

**Status freshness and service expectations**
- Show the last successful update time and clearly flag projects/tasks whose site update is overdue.
- Site teams must submit updates at a configurable cadence (for example, daily on active workdays); missed updates trigger reminders and escalation to the project manager/branch manager.
- Customer-facing status is derived from approved task/milestone events and authorised updates, not directly from unreviewed internal task edits.
- Provide mobile-responsive access and accessible document preview/download. Support offline field capture and later sync where technically feasible, with conflict handling and sync status.

## 8.9 Project dashboards and operational reviews

Provide role-specific dashboards using the same source records, with filters for company, branch, project, project type, site engineer, project manager, phase, status and date range.

- **Executive dashboard:** portfolio count/value, stage distribution, on-track/at-risk/delayed projects, forecast completions, milestone slippage, cost variance, funds exposure, quality/safety exceptions and branch comparison.
- **Project manager dashboard:** Kanban WIP, overdue/blocked tasks, critical path, next 7/14/30-day look-ahead, approvals pending, change requests, inspections, procurement readiness and action owners.
- **Site engineer dashboard:** today's planned tasks, site diary, labour/crew, material requirements/receipts, inspections due, safety checklist, blockers and upload queue.
- **Branch manager dashboard:** branch project pipeline, physical and digital file compliance, progress freshness, delayed projects, resource constraints, customer issues and escalation queue.
- **Procurement dashboard:** material requests, quotation comparison, purchase approvals, orders due, delivery/GRN status, shortages and vendor performance.
- **Finance dashboard:** project receipts/top-ups, approved expenses, commitments, available funds, forecast cost, threshold alerts and reconciliation exceptions.
- **Customer dashboard:** own-project status, timeline, upcoming milestones, recent site updates, approved documents, pending decisions, funds statement and support requests.
- Provide trend charts and downloadable reports for planned vs actual progress, schedule variance, cost variance, task ageing, rework, quality, safety, document completeness and customer response times.
- Schedule daily/weekly operational review reports and preserve review decisions/action items with owners and due dates.

## 8.10 Project governance, change and audit trail

- Every project has a named accountable Project Manager and designated Site Engineer; responsibilities may be combined only through an authorised role assignment.
- Define a RACI matrix for each project template covering customer, branch manager, project manager, site engineer, procurement, finance, quality/safety, document controller and corporate approvers.
- Maintain a decision log, risk register, issue register, change-request register and lessons-learned record.
- Scope, design, BOQ, cost, milestone and schedule changes require impact assessment and approval before implementation, except documented emergency/safety actions followed by review.
- Maintain immutable status history for tasks, milestones, stage gates, approvals, dates, progress calculations, assignments, blockers and customer-visible updates.
- Escalate overdue tasks, unresolved blockers, missed site updates, failed inspections, delayed procurement, low funds and pending customer decisions using configurable thresholds.
- Dashboards must distinguish operational estimates from approved commitments and actual posted financial ledger entries.

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
- ConstructionProject, ProjectAgreement, ProjectStage, ProjectMilestone, Drawing, Approval, ProjectDocument, ProjectDocumentCategory, ProjectDocumentVersion, ProjectDocumentReview, ProjectPhysicalFileRegister, ProjectDocumentChecklist, DocumentHandover.
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
- Each executing branch maintains a separate physical file for every construction project and uploads all relevant records to the matching portal project folder.
- Portal document register tracks required/uploaded/approved/rejected/expired documents, versions, reviewer comments and audit history.
- Physical-file index can be printed and reconciled against the portal register during branch audits.
- Construction customer can view every posted project receipt and expense with supporting documents.
- Low project balance triggers configurable notifications.
- Privileged changes, approvals, reversals and period reopenings are fully auditable.\n- Construction projects use reusable WBS/templates, task ownership, dependencies, short-term look-ahead planning, Kanban boards, daily site updates, periodic reviews and measurable deliverables.\n- Task and milestone transitions enforce configured document, dependency, inspection and approval gates.\n- Customers can track their own project's current status, milestones, progress basis, planned/forecast dates, recent site updates and pending actions from the app/portal.\n- Customers can securely preview/download approved customer-shareable documents and see current revisions without access to internal or confidential records.\n- Project dashboards expose role-appropriate schedule, progress, blockers, cost, quality, safety, document and financial indicators.\n- Delays, blocked work, failed inspections, stale updates and scope/schedule/cost changes have owners, escalation paths and audit history.

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

**Document control:** Version 1.4 adds an Agile-inspired construction delivery framework with WBS, Kanban, short-term planning/reviews, stage gates, progress measurement, role-based dashboards and continuous customer project tracking/document access. It retains the v1.3 physical/digital project-file controls, configurable property scheme model, independent property/construction referral programmes, and locality branch partner profit-sharing and monthly reconciliation requirements. This BRD is a business requirements baseline; detailed UX, API contracts, database schema, accounting policy and legal agreements are subsequent design deliverables.
