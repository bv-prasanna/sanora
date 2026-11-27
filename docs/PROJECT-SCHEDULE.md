# Project schedule and Gantt view

The project workspace includes a rolling four-week schedule view sourced from the project task API. It is a visualisation of planned start/due dates, not a CPM engine or a baseline-controlled contractual schedule.

## Task dates

- Project staff may set an optional planned start date and due date when creating a task.
- The API rejects a due date earlier than the start date.
- Tasks with at least one planned date appear on the timeline when they overlap the current four-week horizon.
- Tasks outside the horizon are still available in the task register and look-ahead list.

## Timeline behaviour

- The view uses a rolling 28-day window beginning at the current local day in the browser.
- Task bars are positioned from their planned dates and show current task progress.
- Cancelled/completed/blocked task states have distinct visual treatment.
- Overdue tasks remain visible in the separate overdue count; past-only tasks are not drawn as future schedule bars.
- Customer work-plan APIs already filter internal tasks, so the customer timeline inherits the same visibility boundary.

## Limitations

This is a lightweight Gantt-style schedule. It does not yet calculate critical path, float, resource conflicts, calendar working days, holiday calendars, approved baseline variance, or automatic dependency-driven rescheduling. Dependencies continue to be enforced by the existing task workflow. Use a dedicated scheduling review before treating dates as contractual commitments.
