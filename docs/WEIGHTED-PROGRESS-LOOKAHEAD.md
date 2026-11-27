# Weighted project progress and look-ahead planning

## Task weight

Each project task has a positive relative effort weight (default 1). It is a planning weight, not a currency amount, labour-hour claim or cost allocation. Project managers should use a consistent basis within a project (for example, relative BOQ effort or planned work effort) and record changes through the task audit trail.

## Progress calculation

The project progress indicator is the weighted average of active task progress:

`sum(task progress % × task weight) / sum(active task weights)`

Cancelled tasks are excluded. Task progress is bounded to 0–100. Customer progress is calculated only from tasks already visible to that customer, so internal tasks do not leak into the customer dashboard. This is a task-weighted planning indicator, not a certified quantity survey or independently measured physical completion percentage.

## Fourteen-day look-ahead

The work-plan API returns active, incomplete tasks with a start date or due date in the next 14 days. It also reports overdue active tasks separately. The portal displays assignee, planned start/due dates and relative weight where available.

## API changes

- Task creation accepts optional `weight` (0.1–1000; defaults to 1).
- Task updates accept optional `weight` using the same range.
- `GET /api/projects/:id/work-plan` returns weighted progress, total active weight, overdue task count and the next-14-day task list.

The existing project access rules and task audit events remain authoritative.

## Operational guidance

Do not compare raw progress percentages between projects unless the teams use a comparable weighting basis. For certified physical progress, later work should add measured quantities against BOQ items, approved inspection evidence and independent sign-off. Gantt/calendar views, resource levelling, labour timesheets and automated look-ahead reminders remain future increments.
