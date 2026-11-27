# Project quality and safety inspections

## Inspection workflow

1. An authorised project staff member creates an inspection and a checklist. The checklist must contain at least one required item.
2. The inspection may be scheduled with a target date or left as a draft.
3. A staff member starts the inspection. Each checklist item is marked Pending, Pass, Fail or Not Applicable, with optional notes.
4. A final result can be recorded only after every required check has a result.
5. A passed inspection cannot contain failed required checks.
6. A failed inspection must contain a result summary and corrective action. It can be rescheduled or restarted for reinspection.
7. Passed and cancelled inspections are locked against checklist changes.

## Customer visibility

- Inspections are internal by default.
- Only users with project MANAGE access can publish or unpublish an inspection.
- Customer API responses include only inspections marked customer-visible.
- Customer visibility is not a client-side filter; the API enforces it.
- Publishing an inspection does not imply that it is a statutory certificate or third-party approval.

## API

- `GET /api/projects/:id/inspections` — list inspections visible to the caller.
- `POST /api/projects/:id/inspections` — create a draft/scheduled inspection with ordered checklist items.
- `PATCH /api/inspections/:id` — update checklist results, status, result summary, corrective action and (for managers) customer visibility.

All routes require authentication. Project membership and access levels are enforced by the same project-access policy used by the rest of the portal. Mutations are audited.

## Operational limitations

This first increment provides a flexible checklist register, not a code-compliance engine. Inspection templates by work package, recurring schedules, checklist-level photo attachments, NCR owner/due-date tracking, independent sign-off, and external statutory approval integrations remain future increments. GPS/photo evidence from the existing site diary remains separate and should not be treated as an inspection pass without an authorised checklist result.
