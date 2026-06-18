# QPM Governance & Audit Module — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The Governance & Audit Module enforces a formal submission lifecycle (Draft → Submitted → Approved / Rejected) for all KPI data submissions. It maintains an immutable, comprehensive audit log of all changes to KPI definitions, thresholds, and submissions. Rejected submissions can be resubmitted with a comment.

---

## 2. Requirements

### R1 — Submission Lifecycle

**As a** Platform Admin, **I want** all KPI submissions to follow a governed lifecycle, **so that** data quality is validated before influencing metrics and reporting.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | All KPI data submissions SHALL follow the lifecycle: Draft → Submitted → Approved / Rejected. |
| 1.2 | WHEN a submission transitions to Submitted, the platform SHALL notify the approving role (Delivery Manager or Platform Admin). |
| 1.3 | WHEN a submission is Approved, the platform SHALL trigger metric recalculation and lock the period. |
| 1.4 | WHEN a submission is Rejected, the platform SHALL record the rejection reason and notify the submitter. |
| 1.5 | WHEN a submission is Rejected, the submitter SHALL be allowed to edit and resubmit with a mandatory comment. |
| 1.6 | WHEN a submission is resubmitted, the platform SHALL create a new version record referencing the original. |
| 1.7 | Invalid lifecycle transitions (e.g., Approved → Draft) SHALL be rejected with a lifecycle-violation error. |

### R2 — Audit Log

**As a** Platform Admin, **I want** an immutable audit log of all platform changes, **so that** every action is traceable and non-repudiable.

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | The platform SHALL write an audit log entry for every create, update, delete, and approve/reject operation on: KPI definitions, thresholds, data submissions, project records, user accounts, and role assignments. |
| 2.2 | Each audit log entry SHALL include: actor (user ID), action type, entity type, entity ID, timestamp, and a JSON delta recording old and new values. |
| 2.3 | Audit log entries SHALL be immutable; no update or delete operation on audit records SHALL be permitted. |
| 2.4 | The platform SHALL provide a searchable, paginated audit log query endpoint accessible to Platform Admins. |
| 2.5 | Audit log entries SHALL be retained for a minimum of 2 years. |

### R3 — Security & Performance

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | Audit log query endpoint SHALL require Platform Admin RBAC. |
| 3.2 | Audit log writes SHALL occur within the same DB transaction as the triggering operation (atomic). |
| 3.3 | Audit log query for up to 1000 records SHALL respond within 2 seconds. |
| 3.4 | All governance endpoints SHALL require a valid JWT. |

---

## 3. Design

### Data Models

**`audit_events`** (existing table — governed by this module)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| entity_type | VARCHAR(64) | e.g., project, kpi, submission, user |
| entity_id | UUID | |
| operation | VARCHAR(32) | CREATE / UPDATE / DELETE / APPROVE / REJECT / ACTIVATE |
| actor_id | UUID FK | → users.id |
| delta | JSONB | `{field: {from, to}}` |
| occurred_at | TIMESTAMPTZ | DEFAULT NOW() |

No UPDATE or DELETE permitted on this table. Enforced via DB-level trigger + application-layer restriction.

**`kpi_submissions`** (extended from data_entries)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | |
| period_id | UUID FK | |
| status | ENUM | {draft, submitted, approved, rejected} |
| submitted_by | UUID FK | |
| approved_by | UUID FK | NULLABLE |
| rejection_reason | TEXT | NULLABLE |
| resubmission_comment | TEXT | NULLABLE |
| parent_submission_id | UUID FK | NULLABLE → self (for resubmissions) |
| version | INTEGER | DEFAULT 1 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/v1/submissions/{id}/submit` | `data:submit` | Transition Draft → Submitted |
| POST | `/api/v1/submissions/{id}/approve` | `data:approve` | Approve submission |
| POST | `/api/v1/submissions/{id}/reject` | `data:approve` | Reject with reason |
| POST | `/api/v1/submissions/{id}/resubmit` | `data:submit` | Resubmit with comment (creates new version) |
| GET | `/api/v1/audit-log` | `audit:read` (Admin) | Paginated, searchable audit log |
| GET | `/api/v1/audit-log/{entity_type}/{entity_id}` | `audit:read` | Audit history for a specific entity |

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | Submission lifecycle always follows valid transitions | Property-based |
| P2 | Approved submission always triggers metric recalculation | Property-based |
| P3 | Audit log is never modified after initial write | DB constraint + property test |
| P4 | Every submission state change writes an audit entry | Property-based |
| P5 | Rejected submission always has a rejection reason | Property-based |

---

## 4. Implementation Tasks

- [ ] 1. Database Schema
  - [ ] 1.1 Add DB-level trigger to block UPDATE/DELETE on `audit_events` table
  - [ ] 1.2 Extend `kpi_submissions` table with resubmission and version columns
  - [ ] 1.3 Add index on `audit_events(entity_type, entity_id, occurred_at)` for fast history queries
  - [ ] 1.4 Add index on `kpi_submissions(status, project_id)`

- [ ] 2. Domain Models & Repository
  - [ ] 2.1 Define/extend SQLAlchemy ORM models: `AuditEvent`, `KPISubmission`
  - [ ] 2.2 Implement `AuditRepository`: insert_only (no update/delete), find_by_entity, paginated search
  - [ ] 2.3 Implement `SubmissionRepository`: find_by_id, find_by_project_period, save, update_status
  - [ ] 2.4 Unit tests for repositories; confirm audit repo raises error on update/delete attempt

- [ ] 3. Governance Service
  - [ ] 3.1 Implement `SubmissionService.submit()`: validate Draft → Submitted transition, notify approver, write audit
  - [ ] 3.2 Implement `SubmissionService.approve()`: validate transition, trigger recalculation, lock period, write audit
  - [ ] 3.3 Implement `SubmissionService.reject()`: validate transition, store reason, notify submitter, write audit
  - [ ] 3.4 Implement `SubmissionService.resubmit()`: validate Rejected state, create new version with comment, write audit
  - [ ] 3.5 Unit tests: all transitions — valid and invalid paths
  - [ ] 3.6 Property test: lifecycle always follows valid transitions (P1)
  - [ ] 3.7 Property test: approval always triggers recalculation event (P2)
  - [ ] 3.8 Property test: every state change writes audit (P4)
  - [ ] 3.9 Property test: rejected submission always has rejection reason (P5)

- [ ] 4. Audit Service
  - [ ] 4.1 Implement `AuditService.log()`: insert-only, write within caller's transaction
  - [ ] 4.2 Verify all service layer mutation operations call `AuditService.log()` in the same transaction
  - [ ] 4.3 Property test: audit records cannot be modified after creation (P3)
  - [ ] 4.4 Integration test: audit log rollback when parent transaction fails

- [ ] 5. API Layer
  - [ ] 5.1 Submission lifecycle action endpoints (submit, approve, reject, resubmit)
  - [ ] 5.2 Audit log query endpoint with pagination and entity filters
  - [ ] 5.3 JWT auth and RBAC on all endpoints
  - [ ] 5.4 Integration tests: full lifecycle flow, resubmission versioning, audit log query

- [ ] 6. Frontend
  - [ ] 6.1 Submission status badge and action buttons in Data Entry view (Submit / Approve / Reject)
  - [ ] 6.2 Rejection reason input modal and resubmission comment form
  - [ ] 6.3 `AuditLogViewer`: paginated, searchable table for Platform Admin (entity type filter, date range)
  - [ ] 6.4 Entity-level audit history panel (e.g., changes to a specific KPI)
  - [ ] 6.5 Component tests: lifecycle controls, rejection/resubmission flow, audit log table
