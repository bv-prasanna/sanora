# Project planning, milestones and delivery tracking

## Data model
- Project milestones carry a title, description, target date, forecast date, sequence, status and explicit customer-visibility flag.
- Project tasks carry a work package, priority, assignee, start/due dates, status, progress percentage, blocker reason and explicit customer-visibility flag.
- Task dependencies are stored as predecessor/successor links. Tasks can be created with up to 20 prerequisites from the same project.
- Tasks and milestones are scoped to their project. Assignees must be active staff members assigned to that project or the project creator.

## Workflow controls
- Task transitions use the shared App Skeleton workflow engine: TODO → IN_PROGRESS → IN_REVIEW → COMPLETED, with BLOCKED/CANCELLED paths and controlled rework.
- Milestones use a separate workflow. A milestone cannot be completed while any linked task is unfinished.
- A task cannot start, enter review or complete while a prerequisite task remains incomplete.
- BLOCKED tasks require a reason.
- Completing a task sets progress to 100%; returning it to TODO resets progress to 0%.
- Customer visibility is a deliberate project-manager action. Internal tasks, dependencies and blocker reasons are not exposed to customers.
- Every milestone/task create or update is audited.

## API
- `GET /api/projects/:id/work-plan`: role-scoped milestones, tasks and calculated progress summary.
- `GET /api/projects/:id/members`: active assigned project staff for task assignment; restricted to planning roles.
- `POST /api/projects/:id/milestones` and `PATCH /api/milestones/:id`: milestone lifecycle.
- `POST /api/projects/:id/tasks` and `PATCH /api/tasks/:id`: task creation, assignment and lifecycle.
- Project members need UPDATE access to edit the work plan; MANAGE access is required to publish customer-visible milestones or tasks.

## Progress calculation
The displayed project progress is the arithmetic mean of progress percentages for non-cancelled tasks visible to the current viewer. Completed tasks count as 100%. Customer progress is calculated only from customer-visible tasks, so hidden internal work does not leak through the progress denominator. This is an initial transparent basis; weighted progress by BOQ/work-package value can be added once the business defines and approves the weighting rules.

## Operational boundaries
This release provides milestone/task planning and basic status actions. Gantt/calendar scheduling, resource capacity planning, timesheets, automated reminders/escalations, inspection checklists, photo attachments, critical-path calculations and weighted physical progress remain subsequent increments.
