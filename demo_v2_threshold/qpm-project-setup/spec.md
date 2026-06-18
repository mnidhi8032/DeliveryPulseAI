# QPM Project Setup Module — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The Project Setup Module is the entry point of the QPM Platform. It enables users to create and configure QPM projects with all mandatory metadata — classification, delivery methodology, engagement model, and work-sizing — before any KPI tracking begins. It integrates with the existing Business Unit → Account → Project hierarchy, enforces RBAC, and triggers automatic KPI suggestion on creation.

---

## 2. Requirements

### R1 — Project Creation

**As a** Project Manager, **I want to** create a new QPM project with all required metadata, **so that** it is correctly classified and ready for KPI assignment.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | The platform SHALL provide a project creation form accepting: name, description, start date, end date, Project Type, Delivery Model, Engagement Model, Work Size Unit. |
| 1.2 | WHEN all mandatory fields are submitted, the platform SHALL create the project and respond within 2 seconds. |
| 1.3 | IF any mandatory field is missing, the platform SHALL reject and return field-level validation errors. |
| 1.4 | WHEN a duplicate project name within the same Account is submitted, the platform SHALL reject with a uniqueness error. |
| 1.5 | IF end date ≤ start date, the platform SHALL reject with a date-range error. |
| 1.6 | Project Type SHALL be one of: `{Agile, Waterfall, Hybrid}`. |
| 1.7 | Delivery Model SHALL be one of: `{Scrum, Kanban, SAFe, XP, DSDM, Lean, Waterfall_Classic, Other}`. |
| 1.8 | Engagement Model SHALL be one of: `{Fixed_Price, Time_and_Materials, Retainer, Milestone_Based, Other}`. |
| 1.9 | Work Size Unit SHALL be one of: `{Story_Points, Function_Points, Lines_of_Code}`. |

### R2 — Organisational Hierarchy

**As a** Project Manager, **I want** projects linked to a BU and Account, **so that** they are visible to the right stakeholders.

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | WHEN creating a project, the platform SHALL require a valid BU ID and Account ID belonging to that BU. |
| 2.2 | IF the Account does not belong to the BU, the platform SHALL reject with a hierarchy mismatch error. |
| 2.3 | A successfully created project SHALL be stored linked to exactly one Account and one BU. |
| 2.4 | Project creation SHALL be restricted to users with `project:create` RBAC permission on the target BU. |

### R3 — Default KPI Auto-Suggestion

**As a** Project Manager, **I want** the platform to suggest KPIs on project creation, **so that** I don't start from scratch.

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | WHEN a project is created, the platform SHALL return a suggested KPI set for the Project Type × Delivery Model. |
| 3.2 | The suggestion response SHALL include KPI name, category, default target, and frequency. |
| 3.3 | IF no mapping exists, the platform SHALL return an empty set and log a warning to the audit log. |
| 3.4 | Suggestions SHALL require explicit acceptance before any KPI is activated. |

### R4 — KPI Activation Pre-conditions

**As a** Platform Admin, **I want** KPIs to meet completeness rules before activation, **so that** all tracked KPIs produce reliable measurements.

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | WHEN activating a KPI, the platform SHALL verify Target, Frequency, Data Source, and Direction are defined. |
| 4.2 | IF any required field is missing, the platform SHALL reject and identify each missing attribute. |
| 4.3 | The platform SHALL prevent metric data collection against any KPI that is not activated. |

### R5 — Project Retrieval & Listing

**As a** Delivery Manager, **I want to** list and retrieve projects in my BU, **so that** I can manage my portfolio.

| # | Acceptance Criterion |
|---|----------------------|
| 5.1 | The platform SHALL provide paginated project list with filters: BU, Account, Type, Model, Active status. |
| 5.2 | List results SHALL be scoped to the requesting user's RBAC BU access. |
| 5.3 | Single project retrieval SHALL respond within 1 second. |
| 5.4 | Non-existent or inaccessible project IDs SHALL return 404 without revealing existence. |

### R6 — Project Update

**As a** Project Manager, **I want to** update project metadata, **so that** I can correct details as the engagement evolves.

| # | Acceptance Criterion |
|---|----------------------|
| 6.1 | Updatable fields: name, description, end date, Engagement Model, Work Size Unit. |
| 6.2 | Project Type and Delivery Model SHALL be locked once any KPI is activated. |
| 6.3 | IF reclassification is attempted on a project with active KPIs, the platform SHALL reject with an explanatory error. |
| 6.4 | WHEN a project is updated, the platform SHALL write an audit log entry with actor, timestamp, field, old value, new value. |

### R7 — Security & Audit

| # | Acceptance Criterion |
|---|----------------------|
| 7.1 | Every project API request SHALL require a valid JWT; unauthenticated requests return HTTP 401. |
| 7.2 | RBAC SHALL be enforced on all operations; unauthorised requests return HTTP 403. |
| 7.3 | All mutations SHALL write an immutable audit log entry within the same DB transaction. |
| 7.4 | All project data SHALL be stored at rest with encrypted storage. |

### R8 — Performance & Scalability

| # | Acceptance Criterion |
|---|----------------------|
| 8.1 | Project list for 100+ projects SHALL load within 3 seconds. |
| 8.2 | Platform SHALL support 1000+ concurrent users without degradation. |
| 8.3 | Platform SHALL support 500+ active projects concurrently. |

---

## 3. Design

### Architecture

```
React SPA
  ProjectSetupWizard (3-step form)
  ProjectListView (paginated table)
       │ REST/JSON
       ▼
FastAPI
  JWT Middleware → RBAC Permission Check
  ProjectRouter /api/v1/projects
       │
  ProjectService
    create_project()  list_projects()  get_project()  update_project()  activate_kpi()
       │                    │
  ProjectRepository    KPISuggestionEngine
  (SQLAlchemy)         (KPIMappingRepository)
       │
  AuditService  log_event(actor, entity, operation, delta)
       │
PostgreSQL
  business_units · accounts · projects
  kpi_library · kpi_type_delivery_mappings · project_kpis · audit_events
```

### Data Models

**`projects`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| start_date | DATE | NOT NULL |
| end_date | DATE | NOT NULL, CHECK end_date > start_date |
| project_type | ENUM | {agile, waterfall, hybrid} |
| delivery_model | ENUM | {scrum, kanban, safe, xp, dsdm, lean, waterfall_classic, other} |
| engagement_model | ENUM | {fixed_price, time_and_materials, retainer, milestone_based, other} |
| work_size_unit | ENUM | {story_points, function_points, lines_of_code} |
| business_unit_id | UUID FK | → business_units.id |
| account_id | UUID FK | → accounts.id |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_by | UUID FK | → users.id |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

Indexes: `UNIQUE(name, account_id)`, `INDEX(business_unit_id)`, `INDEX(account_id)`

**`kpi_type_delivery_mappings`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_type | ENUM | |
| delivery_model | ENUM | |
| kpi_id | UUID FK | → kpi_library.id |
| is_mandatory | BOOLEAN | |

Unique constraint: `(project_type, delivery_model, kpi_id)`

**`project_kpis`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | → projects.id |
| kpi_id | UUID FK | → kpi_library.id |
| target | NUMERIC | NULLABLE until activation |
| frequency | ENUM | {sprint, monthly, release} |
| data_source | VARCHAR(255) | NULLABLE until activation |
| direction | ENUM | {higher_is_better, lower_is_better, within_range} |
| is_active | BOOLEAN | DEFAULT FALSE |
| lsl | NUMERIC | NULLABLE |
| usl | NUMERIC | NULLABLE |

Unique constraint: `(project_id, kpi_id)`

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/v1/projects` | `project:create` | Create project + return KPI suggestions |
| GET | `/api/v1/projects` | `project:read` | Paginated, filtered project list |
| GET | `/api/v1/projects/{id}` | `project:read` | Single project detail |
| PATCH | `/api/v1/projects/{id}` | `project:update` | Update metadata |
| POST | `/api/v1/projects/{id}/kpis/{kpi_id}/activate` | `project:kpi:activate` | Activate a KPI |

### Key Service Logic

```python
class ProjectService:
    def create_project(actor, payload):
        # validate → hierarchy check → RBAC → uniqueness → persist → audit → suggest KPIs

    def update_project(actor, project_id, payload):
        # fetch → RBAC → check locked fields (no active KPIs) → apply delta → audit

    def activate_kpi(actor, project_id, kpi_id):
        # fetch → validate required fields → set active → audit

class KPISuggestionEngine:
    def suggest(project_type, delivery_model):
        # query kpi_type_delivery_mappings JOIN kpi_library → return list; log warning if empty
```

### Frontend

**ProjectSetupWizard** — 3-step form:
- Step 1: Name, Description, Start/End Date
- Step 2: Project Type, Delivery Model (filtered by Type), Engagement Model, Work Size Unit
- Step 3: Business Unit, Account (filtered by BU), review & submit

Post-creation: KPI Suggestion Panel with "Accept All / Customise / Skip"

**ProjectListView** — Paginated table with BU / Account / Type / Status filters

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | Create → retrieve round-trip preserves all fields | Property-based |
| P2 | Audit log entry count equals mutation count | Property-based |
| P3 | `account.business_unit_id == project.business_unit_id` always holds | Property-based |
| P4 | KPI activation with any missing required field always rejected | Property-based |
| P5 | `end_date > start_date` holds for all persisted records | Property-based |
| P6 | RBAC permission check is idempotent | Unit/property |
| P7 | No two projects share name within the same account | Property-based + DB constraint |

---

## 4. Implementation Tasks

- [ ] 1. Database Schema & Migrations
  - [ ] 1.1 Create `projects` table migration (columns, ENUMs, CHECK constraint, indexes)
  - [ ] 1.2 Create `kpi_type_delivery_mappings` table migration with composite unique constraint
  - [ ] 1.3 Create `project_kpis` table migration with FK and unique constraints
  - [ ] 1.4 Verify `audit_events` supports `project` / `project_kpi` entity types; migrate if needed
  - [ ] 1.5 Seed `kpi_type_delivery_mappings` for all valid Project Type × Delivery Model combinations

- [ ] 2. Domain Models & Repository Layer
  - [ ] 2.1 Define SQLAlchemy ORM models: `Project`, `ProjectKPI`, `KPITypeDeliveryMapping`
  - [ ] 2.2 Implement `ProjectRepository`: find_by_id, find_all (filters + pagination), exists_with_name_in_account, has_active_kpis, save, update
  - [ ] 2.3 Implement `KPIMappingRepository`: find_suggestions(project_type, delivery_model)
  - [ ] 2.4 Unit tests for repository methods using test database
  - [ ] 2.5 Property test: round-trip create → retrieve preserves all fields (P1)
  - [ ] 2.6 Property test: name uniqueness never violated (P7)
  - [ ] 2.7 Property test: date range constraint always holds (P5)

- [ ] 3. Service Layer
  - [ ] 3.1 Implement `ProjectService.create_project()`: validation, hierarchy, RBAC, uniqueness, persist, audit, suggest
  - [ ] 3.2 Implement `ProjectService.list_projects()`: RBAC-scoped filtering + pagination
  - [ ] 3.3 Implement `ProjectService.get_project()`: single fetch with BU scope check
  - [ ] 3.4 Implement `ProjectService.update_project()`: partial update, locked-field guard, audit delta
  - [ ] 3.5 Implement `ProjectService.activate_kpi()`: required-field validation, state transition, audit
  - [ ] 3.6 Implement `KPISuggestionEngine.suggest()`: mapping lookup + warning log on empty
  - [ ] 3.7 Unit tests: create_project — valid, missing fields, bad date, duplicate name, hierarchy mismatch, RBAC fail
  - [ ] 3.8 Unit tests: update_project — valid update, locked field rejection, audit delta
  - [ ] 3.9 Unit tests: activate_kpi — all subsets of missing required fields (P4)
  - [ ] 3.10 Property test: audit log count equals mutation count (P2)
  - [ ] 3.11 Property test: hierarchy constraint holds for all created projects (P3)
  - [ ] 3.12 Property test: RBAC check is idempotent (P6)

- [ ] 4. API Layer
  - [ ] 4.1 POST `/api/v1/projects` with Pydantic schemas
  - [ ] 4.2 GET `/api/v1/projects` with query-param filters and pagination
  - [ ] 4.3 GET `/api/v1/projects/{id}`
  - [ ] 4.4 PATCH `/api/v1/projects/{id}` with partial-update schema
  - [ ] 4.5 POST `/api/v1/projects/{id}/kpis/{kpi_id}/activate`
  - [ ] 4.6 JWT auth middleware on all routes
  - [ ] 4.7 RBAC permission dependencies on all routes
  - [ ] 4.8 Integration tests: happy path, 400, 401, 403, 404, 409 for all endpoints

- [ ] 5. Audit Integration
  - [ ] 5.1 Ensure AuditService.log_event() runs within the same DB transaction for all mutations
  - [ ] 5.2 Verify delta format `{field: {from, to}}` for updates
  - [ ] 5.3 Integration test: audit rows rolled back when parent transaction fails

- [ ] 6. Frontend — Project Setup Wizard
  - [ ] 6.1 `ProjectSetupWizard` React component with 3-step layout
  - [ ] 6.2 Step 1: Name, Description, Start/End Date with client-side validation
  - [ ] 6.3 Step 2: Project Type, Delivery Model (dynamic filter), Engagement Model, Work Size Unit
  - [ ] 6.4 Step 3: BU (searchable), Account (filtered by BU), review summary
  - [ ] 6.5 Wire to POST endpoint; surface field-level 400/409/422 errors
  - [ ] 6.6 KPI Suggestion Panel: mandatory lock icon, Accept All / Customise / Skip
  - [ ] 6.7 Component tests: validation, step navigation, error display, suggestion rendering

- [ ] 7. Frontend — Project List View
  - [ ] 7.1 `ProjectListView` paginated table with columns: Name, Type, Model, Account, BU, Status, Created
  - [ ] 7.2 Filter bar: BU, Account, Type, Status
  - [ ] 7.3 Wire to GET endpoint with pagination controls
  - [ ] 7.4 Row-click navigation to project detail/edit
  - [ ] 7.5 Component tests: renders data, filter interaction, pagination, empty state, loading state

- [ ] 8. Performance & Security
  - [ ] 8.1 Composite DB indexes on business_unit_id and account_id; verify query plans
  - [ ] 8.2 Load test GET /api/v1/projects (100+ projects, concurrent load); confirm ≤3s
  - [ ] 8.3 Configure PgBouncer connection pooling
  - [ ] 8.4 Add `/healthz` health-check endpoint
  - [ ] 8.5 Confirm HTTP 401 on missing/expired JWT across all endpoints
  - [ ] 8.6 Confirm HTTP 403 on insufficient RBAC across all endpoints
  - [ ] 8.7 Verify PostgreSQL TLS + at-rest encryption on projects tablespace
