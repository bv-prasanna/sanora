# Project team and access management

## Access levels
- VIEW: read project details and customer-visible project information where applicable.
- UPDATE: create/update operational records such as site updates, labour, estimates and procurement records where the API role also permits the action.
- MANAGE: assign/remove project staff and publish customer-visible project information.

Corporate-wide roles retain their platform-level permissions. Branch/project staff require explicit project membership. The project creator receives MANAGE access; the customer receives VIEW access.

## APIs
- `GET /api/staff`: active non-customer staff directory for project managers.
- `GET /api/projects/:id/members`: current project staff assignments and access levels.
- `POST /api/projects/:id/members`: add or update a staff assignment with VIEW/UPDATE/MANAGE access.
- `DELETE /api/projects/:id/members/:userId`: revoke staff membership. Project creator and customer memberships are protected.

## Portal
Project managers can assign staff, change access level and remove staff from the project workspace. New assignments or access changes create an in-app notification. API authorization remains authoritative; hidden controls are not a security boundary.

## Scope boundary
The current staff directory is organisation-wide because branch/office hierarchy and employee-to-branch ownership are not yet represented in the data model. Branch-specific directory filtering, bulk assignment, temporary access expiry, approval delegation and access review reports remain follow-up work.
