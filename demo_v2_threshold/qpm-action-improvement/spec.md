# QPM Action & Improvement Module — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The Action & Improvement Module allows users to log corrective action items when a KPI turns Red or Amber. Each action item has a root cause, corrective action description, assigned owner, and target closure date. Actions follow a lifecycle (Open → In Progress → Closed) and overdue items are flagged and surfaced on the dashboard.

---

## 2. Requirements

### R1 — Action Item Logging

**As a** Project Manager, **I want to** log an action item for any Red or Amber KPI, **so that** corrective measures are tracked and accountable.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | WHEN a KPI has a Red or Amber RAG status, the platform SHALL allow a user to log an action item. |
| 1.2 | An action item SHALL include: root cause, corrective action description, owner (assigned user), and target closure date. |
| 1.3 | IF any of root cause, corrective action description, owner, or target closure date is missing, the platform SHALL reject with field-level errors. |
| 1.4 | WHEN an action item is created, the platform SHALL link it to the triggering KPI and project. |
| 1.5 | WHEN an action item is created, the platform SHALL write an audit log entry. |

### R2 — Action Item Lifecycle

**As a** Project Manager, **I want** action items to follow a status lifecycle, **so that** progress is clearly tracked.

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | Action items SHALL follow the lifecycle: Open → In Progress → Closed. |
| 2.2 | WHEN an action item transitions to a new status, the platform SHALL write an audit log entry. |
| 2.3 | IF a status transition is invalid (e.g., Closed → Open), the platform SHALL reject with a lifecycle-violation error. |
| 2.4 | Only the action item owner or a Project Manager or above SHALL be able to update the status. |

### R3 — Overdue Flagging

**As a** Delivery Manager, **I want** overdue action items flagged, **so that** I can escalate stalled corrective actions.

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | WHEN an action item's target closure date has passed and the status is not Closed, the platform SHALL mark it as Overdue. |
| 3.2 | Overdue action items SHALL be surfaced on the project dashboard with a visual indicator. |
| 3.3 | The platform SHALL check overdue status on every data load and at a scheduled daily interval. |

### R4 — Security & Performance

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | Action item endpoints SHALL require a valid JWT and enforce RBAC. |
| 4.2 | Action item list for a project SHALL respond within 1 second. |
| 4.3 | All mutations SHALL write audit log entries atomically. |

---

## 3. Design

### Data Models

**`action_items`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | → projects.id |
| kpi_id | UUID FK | → kpi_library.id |
| rag_status_id | UUID FK | → rag_statuses.id (triggering RAG) |
| root_cause | TEXT | NOT NULL |
| corrective_action | TEXT | NOT NULL |
| owner_id | UUID FK | → users.id NOT NULL |
| target_closure_date | DATE | NOT NULL |
| status | ENUM | {open, in_progress, closed} DEFAULT open |
| is_overdue | BOOLEAN | DEFAULT FALSE (computed) |
| created_by | UUID FK | → users.id |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Valid status transitions: `open → in_progress`, `in_progress → closed`, `open → closed`.

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/v1/projects/{id}/action-items` | `actions:create` | Log a new action item |
| GET | `/api/v1/projects/{id}/action-items` | `actions:read` | List action items with filters |
| PATCH | `/api/v1/projects/{id}/action-items/{item_id}` | `actions:update` | Update status or fields |
| GET | `/api/v1/projects/{id}/action-items/overdue` | `actions:read` | List overdue items |

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | Action item status can only follow valid lifecycle transitions | Property-based |
| P2 | An item with target_closure_date < today and status != closed is always flagged overdue | Property-based |
| P3 | Closed items are never flagged as overdue | Property-based |
| P4 | Every status transition writes an audit log entry | Property-based |

---

## 4. Implementation Tasks

- [ ] 1. Database Schema
  - [ ] 1.1 Create `action_items` table with status ENUM and valid transition constraint
  - [ ] 1.2 Add index on `action_items(project_id, status)` and `action_items(is_overdue)`

- [ ] 2. Domain Models & Repository
  - [ ] 2.1 Define SQLAlchemy ORM model: `ActionItem`
  - [ ] 2.2 Implement `ActionItemRepository`: find_by_project, find_overdue, save, update_status
  - [ ] 2.3 Unit tests for repository methods

- [ ] 3. Service Layer
  - [ ] 3.1 Implement `ActionItemService.create()`: validate required fields, link to KPI/project, write audit
  - [ ] 3.2 Implement `ActionItemService.update_status()`: validate transition, update, write audit
  - [ ] 3.3 Implement `ActionItemService.check_overdue()`: compare target date vs today, set is_overdue flag
  - [ ] 3.4 Schedule daily overdue check job
  - [ ] 3.5 Unit tests: create, transition, overdue check — valid and error paths
  - [ ] 3.6 Property test: only valid lifecycle transitions accepted (P1)
  - [ ] 3.7 Property test: past-due non-closed items always flagged overdue (P2)
  - [ ] 3.8 Property test: closed items never flagged overdue (P3)
  - [ ] 3.9 Property test: every status transition writes audit (P4)

- [ ] 4. API Layer
  - [ ] 4.1 POST `/api/v1/projects/{id}/action-items`
  - [ ] 4.2 GET `/api/v1/projects/{id}/action-items` with filters (status, owner, kpi_id)
  - [ ] 4.3 PATCH `/api/v1/projects/{id}/action-items/{item_id}` (status update + field edit)
  - [ ] 4.4 GET `/api/v1/projects/{id}/action-items/overdue`
  - [ ] 4.5 JWT auth and RBAC on all endpoints
  - [ ] 4.6 Integration tests: create, lifecycle transitions, overdue query, 401, 403

- [ ] 5. Frontend
  - [ ] 5.1 `ActionItemList`: table with status badges, overdue indicator, and owner
  - [ ] 5.2 `ActionItemForm`: create/edit form with all required fields and date picker
  - [ ] 5.3 Status transition controls (contextual buttons based on current status)
  - [ ] 5.4 Overdue items surfaced with red indicator on project dashboard
  - [ ] 5.5 Component tests: form validation, lifecycle controls, overdue display
