# QPM Data Entry Module — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The Data Entry Module allows project team members to submit raw metric values per governance period (Sprint / Monthly / Release). It enforces mandatory field validation, unit consistency, and a period-locking mechanism post-approval. It also supports bulk upload via Excel/CSV and aligns entry periods with the project's governance cadence.

---

## 2. Requirements

### R1 — Raw Data Entry

**As a** Team Member, **I want to** enter actual raw values per period, **so that** the platform can compute KPI metrics automatically.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | The platform SHALL accept raw data entry for the following field types: Effort (Planned vs Actual), Defects (by severity: Critical, Major, Minor), Size Delivered, Revenue, Cost. |
| 1.2 | WHEN a user submits raw data for a period, the platform SHALL validate that all mandatory fields for the project's active KPIs are present before accepting the submission. |
| 1.3 | IF any mandatory field is missing, the platform SHALL reject the submission and return a field-level error identifying each missing value. |
| 1.4 | The platform SHALL validate that submitted unit values match the KPI definition's measurement unit. |
| 1.5 | IF a unit mismatch is detected, the platform SHALL reject the submission and return a unit-consistency error. |
| 1.6 | Data entry periods SHALL align with the project's governance cadence (Sprint or Monthly). |

### R2 — Period Locking

**As a** Delivery Manager, **I want** submitted data to be locked after approval, **so that** there are no silent retroactive edits to approved data.

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | WHEN a data submission is approved, the platform SHALL set the period's data to a Locked state. |
| 2.2 | WHILE a period is Locked, the platform SHALL reject any edit attempt and return a period-locked error. |
| 2.3 | The platform SHALL provide a visible indicator of the lock status per period in the data entry UI. |
| 2.4 | Only a Platform Admin or Delivery Manager SHALL be able to unlock a period, and the unlock action SHALL create an audit log entry with actor, timestamp, and justification. |

### R3 — Bulk Upload

**As a** Project Manager, **I want to** upload metric data via Excel/CSV, **so that** I can populate multiple periods efficiently.

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | The platform SHALL accept bulk upload of metric data via a standardised Excel/CSV template. |
| 3.2 | WHEN a bulk file is uploaded, the platform SHALL validate every row before processing any of them; partial imports SHALL NOT be committed. |
| 3.3 | IF any row fails validation, the platform SHALL reject the entire upload and return a row-by-row error report. |
| 3.4 | WHEN a bulk upload is successfully processed, the platform SHALL create individual data entry records per row and trigger metric recalculation. |
| 3.5 | The platform SHALL provide a downloadable template file for the supported bulk upload format. |

### R4 — Submission Lifecycle

**As a** Project Manager, **I want** data submissions to follow a governed lifecycle, **so that** data quality is validated before metrics are computed.

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | Data submissions SHALL follow the lifecycle: Draft → Submitted → Approved / Rejected. |
| 4.2 | WHEN a submission is Rejected, the platform SHALL allow the submitter to edit and resubmit with a comment. |
| 4.3 | WHEN a submission transitions to Approved, the platform SHALL trigger the Metrics Calculation Engine for the affected period. |
| 4.4 | WHEN any submission state changes, the platform SHALL write an audit log entry. |

### R5 — Security & Performance

| # | Acceptance Criterion |
|---|----------------------|
| 5.1 | Data entry endpoints SHALL require a valid JWT and enforce RBAC (Team Members: entry only; Managers: approve). |
| 5.2 | Single-period data submission SHALL respond within 2 seconds. |
| 5.3 | Bulk upload for up to 500 rows SHALL complete processing within 10 seconds. |

---

## 3. Design

### Data Models

**`data_entries`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | → projects.id |
| period_id | UUID FK | → governance_periods.id |
| kpi_id | UUID FK | → kpi_library.id |
| field_type | ENUM | {effort_planned, effort_actual, defect_critical, defect_major, defect_minor, size_delivered, revenue, cost} |
| value | NUMERIC | NOT NULL |
| unit | VARCHAR(50) | NOT NULL |
| submitted_by | UUID FK | → users.id |
| status | ENUM | {draft, submitted, approved, rejected} DEFAULT draft |
| rejection_comment | TEXT | NULLABLE |
| is_locked | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**`bulk_upload_jobs`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | |
| uploaded_by | UUID FK | → users.id |
| file_name | VARCHAR(255) | |
| status | ENUM | {processing, completed, failed} |
| row_count | INTEGER | |
| error_report | JSONB | Row-by-row error details on failure |
| created_at | TIMESTAMPTZ | |

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/v1/projects/{id}/data-entries` | `data:submit` | Submit raw data for a period |
| GET | `/api/v1/projects/{id}/data-entries` | `data:read` | List data entries with period filter |
| PATCH | `/api/v1/projects/{id}/data-entries/{entry_id}` | `data:submit` | Edit draft/rejected entry |
| POST | `/api/v1/projects/{id}/data-entries/{entry_id}/submit` | `data:submit` | Transition Draft → Submitted |
| POST | `/api/v1/projects/{id}/data-entries/{entry_id}/approve` | `data:approve` | Approve submission |
| POST | `/api/v1/projects/{id}/data-entries/{entry_id}/reject` | `data:approve` | Reject with comment |
| POST | `/api/v1/projects/{id}/bulk-upload` | `data:submit` | Upload Excel/CSV file |
| GET | `/api/v1/bulk-upload-template` | `data:read` | Download blank template |

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | Locked period data entry is always rejected, never accepted | Property-based |
| P2 | Bulk upload with any invalid row never partially commits | Property-based |
| P3 | Unit mismatch is always rejected before persisting | Property-based |
| P4 | Submission approval always triggers metric recalculation | Property-based |
| P5 | Submission lifecycle always follows Draft → Submitted → Approved/Rejected order | Property-based |

---

## 4. Implementation Tasks

- [ ] 1. Database Schema
  - [ ] 1.1 Create `data_entries` table with all columns, ENUMs, and status constraint
  - [ ] 1.2 Create `bulk_upload_jobs` table
  - [ ] 1.3 Add indexes: `data_entries(project_id, period_id)`, `data_entries(status)`

- [ ] 2. Domain Models & Repository
  - [ ] 2.1 Define SQLAlchemy ORM models: `DataEntry`, `BulkUploadJob`
  - [ ] 2.2 Implement `DataEntryRepository`: find_by_period, find_by_status, save, update, lock_period
  - [ ] 2.3 Unit tests for all repository methods
  - [ ] 2.4 Property test: locked period rejects all write operations (P1)

- [ ] 3. Service Layer
  - [ ] 3.1 Implement `DataEntryService.submit()`: mandatory field validation, unit consistency check, persist
  - [ ] 3.2 Implement `DataEntryService.approve()`: transition to Approved, lock period, trigger recalculation event
  - [ ] 3.3 Implement `DataEntryService.reject()`: transition to Rejected with comment
  - [ ] 3.4 Implement `BulkUploadService.process()`: parse file, validate all rows, atomic commit or full rejection
  - [ ] 3.5 Unit tests: submit, approve, reject — valid and error paths
  - [ ] 3.6 Property test: bulk upload with any invalid row never partially commits (P2)
  - [ ] 3.7 Property test: unit mismatch always rejected (P3)
  - [ ] 3.8 Property test: approval always fires recalculation event (P4)
  - [ ] 3.9 Property test: lifecycle state transitions always valid (P5)

- [ ] 4. API Layer
  - [ ] 4.1 POST/GET `/api/v1/projects/{id}/data-entries` endpoints
  - [ ] 4.2 PATCH, submit, approve, reject action endpoints
  - [ ] 4.3 POST `/api/v1/projects/{id}/bulk-upload` with file parsing and job creation
  - [ ] 4.4 GET `/api/v1/bulk-upload-template` returning downloadable template
  - [ ] 4.5 JWT auth and RBAC on all endpoints
  - [ ] 4.6 Integration tests: happy path, locked period, unit mismatch, bulk partial failure, 401, 403

- [ ] 5. Frontend — Data Entry Form
  - [ ] 5.1 `DataEntryForm` component: period selector, field inputs per KPI, unit display
  - [ ] 5.2 Mandatory field validation with inline error messages
  - [ ] 5.3 Lock status indicator per period (locked badge, disabled inputs)
  - [ ] 5.4 Submission lifecycle status badge (Draft / Submitted / Approved / Rejected)
  - [ ] 5.5 Rejection comment display with re-submit option

- [ ] 6. Frontend — Bulk Upload
  - [ ] 6.1 `BulkUploadPanel`: file picker, template download link, upload button
  - [ ] 6.2 Upload progress indicator and job status polling
  - [ ] 6.3 Row-by-row error report display on failed upload
  - [ ] 6.4 Component tests: file selection, error report rendering, success state

- [ ] 7. Performance
  - [ ] 7.1 Verify single-period submission responds within 2 seconds under load
  - [ ] 7.2 Verify bulk upload of 500 rows processes within 10 seconds
  - [ ] 7.3 Confirm all mutations write audit log entries atomically
