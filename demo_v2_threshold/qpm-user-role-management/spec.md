# QPM User & Role Management Module — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The User & Role Management Module extends the existing platform RBAC to support four QPM-specific roles: Platform Admin, Delivery Manager, Project Manager, and Team Member. Each role has a defined permission set governing module visibility and edit access. All user and role changes are logged to the audit trail.

---

## 2. Requirements

### R1 — Role Definitions

**As a** Platform Admin, **I want** well-defined roles with specific permissions, **so that** access to sensitive operations is controlled.

| Role | Core Permissions |
|------|-----------------|
| Platform Admin | Full system access; manage KPI library; approve threshold changes and mandatory KPI removals; manage all users |
| Delivery Manager | View all projects under their BU; approve data submissions |
| Project Manager | Create/configure projects; assign and configure KPIs; enter/approve KPI data |
| Team Member | Data entry only |

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | The platform SHALL enforce role-based permission checks on every protected endpoint. |
| 1.2 | A user SHALL be assignable to exactly one role per project scope. |
| 1.3 | Platform Admin role SHALL be assignable only by another Platform Admin. |

### R2 — Module Visibility & Edit Restrictions

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | Team Members SHALL only have access to the Data Entry module; all other modules SHALL be hidden. |
| 2.2 | Project Managers SHALL have access to: Project Setup, KPI Configuration, Data Entry, Dashboard. |
| 2.3 | Delivery Managers SHALL have access to: Dashboard, Data Submission Approval, Action Items (read). |
| 2.4 | Platform Admins SHALL have access to all modules including KPI Library management and Approval Workflows. |
| 2.5 | WHEN a user attempts to access a module outside their role's permission set, the platform SHALL return HTTP 403. |

### R3 — User Management

**As a** Platform Admin, **I want to** manage user accounts, **so that** access is provisioned and deprovisioned accurately.

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | Platform Admins SHALL be able to create, update, deactivate, and delete user accounts. |
| 3.2 | WHEN a user is deactivated, the platform SHALL revoke all active JWT sessions for that user. |
| 3.3 | WHEN a user account is created, updated, or deactivated, the platform SHALL write an audit log entry. |
| 3.4 | Deactivated users SHALL NOT be able to authenticate or access any platform endpoint. |

### R4 — Security & Audit

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | All authentication SHALL use JWT with configurable expiry. |
| 4.2 | All role assignment changes SHALL be written to the audit log with actor, timestamp, user ID, old role, and new role. |
| 4.3 | The platform SHALL support token refresh without requiring re-login within the session window. |
| 4.4 | All user and role management endpoints SHALL require a valid JWT and Platform Admin RBAC permission. |

---

## 3. Design

### Data Models

**`users`** (existing table — extended)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR(255) | UNIQUE NOT NULL |
| hashed_password | VARCHAR | NOT NULL |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**`user_roles`** (new/extended table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | → users.id |
| role | ENUM | {platform_admin, delivery_manager, project_manager, team_member} |
| business_unit_id | UUID FK | → business_units.id NULLABLE (null = global) |
| assigned_by | UUID FK | → users.id |
| assigned_at | TIMESTAMPTZ | |

**`revoked_tokens`** (new table — for deactivation)

| Column | Type | Notes |
|--------|------|-------|
| jti | UUID PK | JWT ID |
| user_id | UUID FK | |
| revoked_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | Purge after expiry |

### Permission Map

```python
PERMISSIONS = {
    "platform_admin":    ["*"],  # all permissions
    "delivery_manager":  ["project:read", "dashboard:read", "data:approve", "actions:read"],
    "project_manager":   ["project:create", "project:update", "project:read",
                          "project:kpi:assign", "project:kpi:configure", "project:kpi:activate",
                          "project:kpi:create-custom", "data:submit", "data:read",
                          "dashboard:read", "actions:create", "actions:update"],
    "team_member":       ["data:submit", "data:read"],
}
```

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/users` | `users:read` | List users (Admin) |
| POST | `/api/v1/users` | `users:create` | Create user (Admin) |
| PATCH | `/api/v1/users/{id}` | `users:update` | Update user (Admin) |
| POST | `/api/v1/users/{id}/deactivate` | `users:update` | Deactivate user + revoke sessions |
| GET/PATCH | `/api/v1/users/{id}/roles` | `users:roles` | Get/assign roles |
| POST | `/api/v1/auth/token` | public | Login → JWT |
| POST | `/api/v1/auth/refresh` | authenticated | Refresh token |

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | Deactivated users cannot authenticate under any circumstances | Property-based |
| P2 | Users can only access endpoints matching their role's permission set | Property-based |
| P3 | Every role assignment change is reflected in the audit log | Property-based |
| P4 | RBAC check is idempotent: same actor/permission/resource always returns the same result | Property-based |

---

## 4. Implementation Tasks

- [ ] 1. Database Schema
  - [ ] 1.1 Extend `users` table with `is_active` flag if not present
  - [ ] 1.2 Create/extend `user_roles` table with QPM role ENUM and BU scope
  - [ ] 1.3 Create `revoked_tokens` table for session revocation
  - [ ] 1.4 Add index on `user_roles(user_id, role)` and `revoked_tokens(jti)`

- [ ] 2. RBAC & Auth Layer
  - [ ] 2.1 Define `PERMISSIONS` map for all four QPM roles
  - [ ] 2.2 Implement `RBACMiddleware.check_permission(actor, permission, resource)`
  - [ ] 2.3 Implement JWT issuance (login) and token refresh endpoints
  - [ ] 2.4 Implement token revocation check on every request (consult `revoked_tokens` table)
  - [ ] 2.5 Unit tests: permission check for all role × permission combinations
  - [ ] 2.6 Property test: deactivated users rejected on all endpoints (P1)
  - [ ] 2.7 Property test: RBAC check is idempotent (P4)

- [ ] 3. User Management Service
  - [ ] 3.1 Implement `UserService.create()`: hash password, set defaults, write audit
  - [ ] 3.2 Implement `UserService.update()`: partial update, write audit
  - [ ] 3.3 Implement `UserService.deactivate()`: set is_active=False, revoke all active tokens, write audit
  - [ ] 3.4 Implement `RoleAssignmentService.assign()`: validate Admin-only for Admin role, write audit
  - [ ] 3.5 Unit tests: create, update, deactivate, role assignment
  - [ ] 3.6 Property test: only RBAC-authorised users access each module (P2)
  - [ ] 3.7 Property test: every role change writes audit (P3)

- [ ] 4. API Layer
  - [ ] 4.1 User CRUD and deactivation endpoints
  - [ ] 4.2 Role assignment GET/PATCH
  - [ ] 4.3 Auth login and refresh endpoints
  - [ ] 4.4 JWT auth and Platform Admin RBAC on management endpoints
  - [ ] 4.5 Integration tests: login, refresh, deactivation, role assignment, 401, 403

- [ ] 5. Frontend
  - [ ] 5.1 `UserManagementTable`: list users with role, status, and action buttons (Admin view)
  - [ ] 5.2 `UserCreateForm` and `UserEditForm`: Admin-only forms
  - [ ] 5.3 `RoleAssignmentPanel`: assign role per BU scope
  - [ ] 5.4 Module visibility: conditionally render nav items based on current user's role
  - [ ] 5.5 Component tests: user list, create/edit, role assignment, visibility gating
