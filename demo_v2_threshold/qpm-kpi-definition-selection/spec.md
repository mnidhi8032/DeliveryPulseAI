# QPM KPI Definition & Selection Module — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The KPI Definition & Selection Module is the measurement backbone of the QPM Platform. It governs the KPI Library of predefined indicators, enables Project Managers to select and assign KPIs to projects, supports per-project threshold overrides within a controlled approval workflow, and allows creation of custom KPIs. All KPIs must satisfy completeness and directional rules before activation.

---

## 2. Requirements

### R1 — KPI Library Maintenance

**As a** Platform Admin, **I want to** maintain a master KPI library, **so that** Project Managers have a consistent, governed catalogue to draw from.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | Each KPI in the library SHALL store: name, category, formula description, Direction, default Target, LSL, USL, measurement unit, and Frequency. |
| 1.2 | WHEN a new KPI is submitted with all required attributes, the platform SHALL persist it within 2 seconds. |
| 1.3 | IF a KPI name already exists in the library, the platform SHALL reject with a duplicate-name error. |
| 1.4 | IF Direction is not defined, the platform SHALL reject with a direction-undefined error. |
| 1.5 | Direction SHALL be one of: `{Higher_is_Better, Lower_is_Better, Within_Range}`. |
| 1.6 | Frequency SHALL be one of: `{Sprint, Monthly, Release}`. |
| 1.7 | WHEN a library KPI is updated, the platform SHALL write an audit log entry with actor, timestamp, field, old value, new value. |
| 1.8 | The platform SHALL provide a paginated, searchable KPI library list filterable by category, Direction, Frequency, and mandatory status. |

### R2 — KPI Selection & Project Assignment

**As a** Project Manager, **I want to** select KPIs from the library and assign them to my project, **so that** I have a measurement framework without defining every KPI from scratch.

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | WHEN viewing the KPI selection screen, the platform SHALL present the full library with name, category, formula, Direction, default Target, and default Frequency. |
| 2.2 | WHEN a PM selects KPIs, the platform SHALL create Project_KPI records inheriting library defaults for Target, LSL, USL, Direction, and Frequency. |
| 2.3 | The creation response SHALL include KPI name, category, inherited defaults, and mandatory status. |
| 2.4 | IF a KPI is already assigned to the project, the platform SHALL reject with a duplicate-assignment error. |
| 2.5 | KPI assignment SHALL require `project:kpi:assign` RBAC permission. |
| 2.6 | WHEN KPIs are assigned, the platform SHALL write an audit log entry with actor, timestamp, project ID, and list of KPI IDs. |

### R3 — Per-Project KPI Override

**As a** Project Manager, **I want to** override Target, LSL, USL, and Frequency per KPI, **so that** thresholds reflect my project's context.

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | The platform SHALL accept updates to any combination of Target, LSL, USL, and Frequency on a Project_KPI. |
| 3.2 | Overrides SHALL only modify the Project_KPI record; the library's defaults SHALL remain unchanged. |
| 3.3 | WHERE Direction is Within_Range, the platform SHALL enforce LSL < Target < USL. |
| 3.4 | IF the LSL < Target < USL constraint is violated, the platform SHALL reject with a threshold-ordering error. |
| 3.5 | WHEN an override is saved, the platform SHALL write an audit log entry with actor, timestamp, field, old value, new value. |
| 3.6 | Overrides require `project:kpi:configure` RBAC permission. |

### R4 — Mandatory KPI Protection

**As a** Platform Admin, **I want** mandatory KPIs protected from removal without my approval, **so that** platform-wide measurement standards are enforced.

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | Non-mandatory Project_KPIs SHALL be removable immediately by the PM. |
| 4.2 | WHEN a PM attempts to remove a mandatory KPI, the platform SHALL create an Approval_Workflow removal request (status: Pending) instead of removing it. |
| 4.3 | WHEN a removal request is created, the Platform Admin SHALL receive an in-app notification. |
| 4.4 | WHILE a removal request is Pending, the mandatory KPI SHALL remain active and continue to require data entry. |
| 4.5 | WHEN an Admin approves removal, the KPI SHALL be removed and an audit log entry written with approval actor, timestamp, and justification. |
| 4.6 | WHEN an Admin rejects removal, the KPI SHALL remain and the requesting PM SHALL be notified. |

### R5 — Custom KPI Creation

**As a** Project Manager, **I want to** create custom KPIs, **so that** I can track project-specific measures not in the library.

| # | Acceptance Criterion |
|---|----------------------|
| 5.1 | WHEN a custom KPI is submitted with name, formula, Direction, Target, LSL, USL, Frequency, and unit, the platform SHALL create a Custom_KPI record scoped to the project. |
| 5.2 | IF name, formula, Direction, Target, or Frequency is missing, the platform SHALL reject with field-level errors. |
| 5.3 | IF the custom KPI name conflicts with any existing KPI (library or custom) on the same project, the platform SHALL reject. |
| 5.4 | WHERE Direction is Within_Range, the platform SHALL enforce LSL < Target < USL. |
| 5.5 | WHEN a custom KPI is created, the platform SHALL write an audit log entry. |
| 5.6 | Custom KPI creation requires `project:kpi:create-custom` RBAC permission. |

### R6 — Mandatory KPI Threshold Change Approval

**As a** Platform Admin, **I want** threshold changes on mandatory KPIs to require my approval, **so that** governed thresholds are controlled and auditable.

| # | Acceptance Criterion |
|---|----------------------|
| 6.1 | WHEN a PM changes Target, LSL, or USL on a mandatory KPI, the platform SHALL NOT apply the change immediately; it SHALL create a threshold-change request (status: Pending). |
| 6.2 | WHEN a request is created, the Platform Admin SHALL receive an in-app notification with proposed values. |
| 6.3 | WHILE Pending, the platform SHALL continue enforcing the existing threshold values. |
| 6.4 | WHEN an Admin approves, the new thresholds SHALL be applied and an audit log entry written. |
| 6.5 | WHEN an Admin rejects, the original thresholds SHALL remain and the PM SHALL be notified with the rejection reason. |
| 6.6 | IF a second request is submitted while one is Pending for the same KPI, the platform SHALL reject with a pending-request-in-progress error. |
| 6.7 | The platform SHALL maintain a full history of all threshold-change requests per Project_KPI. |

### R7 — KPI Activation Pre-conditions

| # | Acceptance Criterion |
|---|----------------------|
| 7.1 | WHEN activating a KPI, the platform SHALL verify Target, Frequency, Data Source, and Direction are all defined. |
| 7.2 | IF any required field is missing, the platform SHALL reject and identify each missing attribute. |
| 7.3 | IF a Pending threshold-change request exists for the KPI, the platform SHALL reject activation with a pending-approval-blocks-activation error. |
| 7.4 | The platform SHALL prevent metric data collection against any non-activated KPI. |
| 7.5 | WHEN activated, the platform SHALL write an audit log entry with actor and timestamp. |

### R8 — Security, Audit & Performance

| # | Acceptance Criterion |
|---|----------------------|
| 8.1 | Every KPI API request SHALL require a valid JWT; missing/expired tokens return HTTP 401. |
| 8.2 | RBAC SHALL be enforced on all operations; unauthorised requests return HTTP 403. |
| 8.3 | All mutations SHALL write an immutable audit log entry within the same DB transaction. |
| 8.4 | KPI library list for 500+ KPIs SHALL respond within 2 seconds. |
| 8.5 | Project_KPI list for a single project SHALL respond within 1 second. |
| 8.6 | Platform SHALL support 1000+ concurrent users and 500+ concurrent projects. |

---

## 3. Design

### Data Models

**`kpi_library`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | UNIQUE NOT NULL |
| category | VARCHAR(100) | NOT NULL |
| formula_description | TEXT | NOT NULL |
| direction | ENUM | {higher_is_better, lower_is_better, within_range} NOT NULL |
| default_target | NUMERIC | NOT NULL |
| lsl | NUMERIC | NULLABLE |
| usl | NUMERIC | NULLABLE |
| measurement_unit | VARCHAR(50) | NOT NULL |
| frequency | ENUM | {sprint, monthly, release} NOT NULL |
| is_mandatory | BOOLEAN | DEFAULT FALSE |
| created_by | UUID FK | → users.id |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**`project_kpis`** (shared with Project Setup module)

Extended with override columns: `target`, `lsl`, `usl`, `frequency`, `data_source`, `direction`, `is_active`, `is_mandatory`

**`kpi_approval_requests`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_kpi_id | UUID FK | → project_kpis.id |
| request_type | ENUM | {removal, threshold_change} |
| status | ENUM | {pending, approved, rejected} |
| proposed_values | JSONB | New threshold values |
| requested_by | UUID FK | → users.id |
| reviewed_by | UUID FK | → users.id NULLABLE |
| justification | TEXT | NULLABLE |
| created_at | TIMESTAMPTZ | |
| reviewed_at | TIMESTAMPTZ | NULLABLE |

Constraint: Only one `pending` request per `project_kpi_id` allowed at a time.

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/kpi-library` | `kpi:read` | Paginated, filtered KPI library list |
| POST | `/api/v1/kpi-library` | `kpi:create` | Create new library KPI (Admin only) |
| PATCH | `/api/v1/kpi-library/{id}` | `kpi:update` | Update library KPI |
| POST | `/api/v1/projects/{id}/kpis` | `project:kpi:assign` | Assign KPIs from library to project |
| GET | `/api/v1/projects/{id}/kpis` | `project:kpi:read` | List all Project_KPIs |
| PATCH | `/api/v1/projects/{id}/kpis/{kpi_id}` | `project:kpi:configure` | Override thresholds |
| DELETE | `/api/v1/projects/{id}/kpis/{kpi_id}` | `project:kpi:remove` | Remove KPI (triggers approval if mandatory) |
| POST | `/api/v1/projects/{id}/kpis/{kpi_id}/activate` | `project:kpi:activate` | Activate KPI |
| POST | `/api/v1/projects/{id}/kpis/custom` | `project:kpi:create-custom` | Create custom KPI |
| GET | `/api/v1/kpi-approval-requests` | `kpi:approvals:read` | List pending approval requests (Admin) |
| PATCH | `/api/v1/kpi-approval-requests/{id}` | `kpi:approvals:decide` | Approve or reject a request |

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | Library KPI round-trip: all fields preserved after create → retrieve | Property-based |
| P2 | Within_Range invariant: `LSL < Target < USL` always holds for activated KPIs | Property-based |
| P3 | Mandatory KPI removal never succeeds without an approved approval request | Property-based |
| P4 | Threshold-change request is always in Pending before being applied | Property-based |
| P5 | Only one Pending request exists per Project_KPI at any time | DB constraint + property test |
| P6 | Audit log entry count equals number of KPI mutations | Property-based |
| P7 | KPI activation never succeeds with any missing required field | Property-based |

---

## 4. Implementation Tasks

- [ ] 1. Database Schema & Migrations
  - [ ] 1.1 Create `kpi_library` table migration with all columns, ENUMs, and unique name constraint
  - [ ] 1.2 Add override and mandatory columns to `project_kpis` (if not already present from Project Setup module)
  - [ ] 1.3 Create `kpi_approval_requests` table with status ENUM and single-pending constraint
  - [ ] 1.4 Add indexes: `kpi_library(category)`, `kpi_library(direction)`, `kpi_approval_requests(project_kpi_id, status)`
  - [ ] 1.5 Seed `kpi_library` with initial predefined KPIs per QPM standard

- [ ] 2. Domain Models & Repository Layer
  - [ ] 2.1 Define SQLAlchemy ORM models: `KPILibrary`, `KPIApprovalRequest`
  - [ ] 2.2 Implement `KPILibraryRepository`: find_by_id, find_all (filters + pagination), exists_by_name, save, update
  - [ ] 2.3 Implement `KPIApprovalRepository`: find_pending_by_project_kpi, find_all (Admin view), save, update_status
  - [ ] 2.4 Unit tests for all repository methods
  - [ ] 2.5 Property test: library round-trip preserves all fields (P1)
  - [ ] 2.6 Property test: only one pending request per project_kpi_id at a time (P5)

- [ ] 3. Service Layer
  - [ ] 3.1 Implement `KPILibraryService.create_kpi()`: validate required fields, direction check, uniqueness, persist, audit
  - [ ] 3.2 Implement `KPILibraryService.update_kpi()`: partial update, audit delta
  - [ ] 3.3 Implement `KPILibraryService.list_kpis()`: filtered + paginated
  - [ ] 3.4 Implement `ProjectKPIService.assign_kpis()`: bulk assign from library, inherit defaults, audit
  - [ ] 3.5 Implement `ProjectKPIService.override_thresholds()`: validate Within_Range constraint, check mandatory approval flow, audit
  - [ ] 3.6 Implement `ProjectKPIService.remove_kpi()`: direct remove for non-mandatory; create approval request for mandatory
  - [ ] 3.7 Implement `ProjectKPIService.activate_kpi()`: required-field check, pending-request check, activate, audit
  - [ ] 3.8 Implement `ProjectKPIService.create_custom_kpi()`: validate, Within_Range check, uniqueness within project, audit
  - [ ] 3.9 Implement `KPIApprovalService.decide()`: apply or reject change, notify PM, audit
  - [ ] 3.10 Unit tests: all service methods — valid paths and error conditions
  - [ ] 3.11 Property test: Within_Range constraint always enforced (P2)
  - [ ] 3.12 Property test: mandatory KPI removal never succeeds without approval (P3)
  - [ ] 3.13 Property test: threshold change always goes through Pending before applying (P4)
  - [ ] 3.14 Property test: activation rejected with any missing required field (P7)
  - [ ] 3.15 Property test: audit count equals mutation count (P6)

- [ ] 4. API Layer
  - [ ] 4.1 GET/POST `/api/v1/kpi-library` endpoints with Pydantic schemas
  - [ ] 4.2 PATCH `/api/v1/kpi-library/{id}` endpoint
  - [ ] 4.3 POST `/api/v1/projects/{id}/kpis` bulk assign endpoint
  - [ ] 4.4 GET `/api/v1/projects/{id}/kpis` list endpoint
  - [ ] 4.5 PATCH `/api/v1/projects/{id}/kpis/{kpi_id}` threshold override endpoint
  - [ ] 4.6 DELETE `/api/v1/projects/{id}/kpis/{kpi_id}` removal endpoint
  - [ ] 4.7 POST `/api/v1/projects/{id}/kpis/{kpi_id}/activate` endpoint
  - [ ] 4.8 POST `/api/v1/projects/{id}/kpis/custom` custom KPI endpoint
  - [ ] 4.9 GET/PATCH `/api/v1/kpi-approval-requests` Admin approval endpoints
  - [ ] 4.10 JWT auth and RBAC permission dependencies on all routes
  - [ ] 4.11 Integration tests: happy path, 400, 401, 403, 404, 409 for all endpoints

- [ ] 5. Approval Workflow & Notifications
  - [ ] 5.1 On mandatory KPI removal request: create approval record + send in-app notification to Platform Admin
  - [ ] 5.2 On threshold-change request: create approval record + send in-app notification to Platform Admin
  - [ ] 5.3 On Admin approval/rejection: apply or revert change + notify requesting PM
  - [ ] 5.4 Integration tests: full approval lifecycle for removal and threshold-change workflows

- [ ] 6. Frontend — KPI Library View
  - [ ] 6.1 `KPILibraryView` paginated table with search and filters (category, direction, frequency, mandatory)
  - [ ] 6.2 `KPICreateForm` modal for Platform Admin: all required fields with direction selector
  - [ ] 6.3 `KPIEditForm` modal with audit-aware partial updates
  - [ ] 6.4 Component tests: render, filter, search, form validation

- [ ] 7. Frontend — Project KPI Assignment & Configuration
  - [ ] 7.1 `KPISelectionPanel`: browse library, select KPIs, assign to project
  - [ ] 7.2 `ProjectKPIList`: display all assigned KPIs with override values and activation status
  - [ ] 7.3 `KPIOverrideForm`: inline or modal form for Target/LSL/USL/Frequency overrides with Within_Range validation
  - [ ] 7.4 `CustomKPIForm`: create custom KPI scoped to project
  - [ ] 7.5 Mandatory KPI removal: show "Request Removal" instead of direct delete button
  - [ ] 7.6 Approval request status indicators on mandatory KPIs with pending requests
  - [ ] 7.7 Component tests: assignment, override, custom KPI, removal request, activation flows

- [ ] 8. Performance & Security
  - [ ] 8.1 Add indexes on `kpi_library(category)`, `kpi_library(direction)`, `kpi_approval_requests(status)`
  - [ ] 8.2 Load test KPI library list with 500+ KPIs; confirm ≤2s response
  - [ ] 8.3 Load test Project_KPI list; confirm ≤1s response
  - [ ] 8.4 Confirm HTTP 401/403 on all KPI endpoints
  - [ ] 8.5 Verify audit writes are transactionally atomic with all mutations
