# QPM Enabler Plan Module — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The Enabler Plan Module allows definition and scoring of sub-processes (Coding, Testing, Design, Requirements) across three dimensions: Contribution, Data Availability, and Control Feasibility. Based on the composite score, the platform recommends a control type (Statistical Process Control or Quantitative Project Management). Enabler plan data is versioned per governance period.

---

## 2. Requirements

### R1 — Sub-Process Definition & Scoring

**As a** Project Manager, **I want to** score each sub-process, **so that** the platform can recommend the appropriate control type.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | The platform SHALL allow a Project Manager to define sub-processes for a project with a name and the following scores: Contribution Score, Data Availability Score, Control Feasibility Score. |
| 1.2 | Each score SHALL be an integer in the range 1–5 inclusive. |
| 1.3 | IF any score is outside the range 1–5, the platform SHALL reject the submission with a range-validation error. |
| 1.4 | The platform SHALL support the following default sub-process categories: Coding, Testing, Design, Requirements. |
| 1.5 | Project Managers SHALL be able to add custom sub-process names beyond the defaults. |

### R2 — Control Type Recommendation

**As a** Project Manager, **I want the** platform to recommend a control type per sub-process, **so that** I apply the right measurement rigour.

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | WHEN scores are submitted, the platform SHALL compute a composite score = (Contribution × Data Availability × Control Feasibility) and recommend a control type based on the rules below. |
| 2.2 | IF composite score ≥ threshold_SPC, the platform SHALL recommend Statistical Process Control (SPC). |
| 2.3 | IF composite score < threshold_SPC, the platform SHALL recommend Quantitative Project Management (QPM) control. |
| 2.4 | The SPC threshold SHALL be configurable by Platform Admin (default: 27 — i.e., all scores = 3). |
| 2.5 | WHEN a recommendation is computed, the platform SHALL store it alongside the scores and display it in the UI. |

### R3 — Versioning Per Governance Period

**As a** Platform Admin, **I want** enabler plan data versioned per governance period, **so that** historical control decisions are traceable.

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | WHEN enabler plan data is submitted for a period, the platform SHALL create a new version record keyed by (project_id, governance_period_id). |
| 3.2 | Previously submitted versions SHALL be read-only and SHALL NOT be overwritten. |
| 3.3 | The platform SHALL provide a version history view listing all past enabler plan versions for a project. |

### R4 — Security & Audit

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | Enabler plan endpoints SHALL require a valid JWT and enforce RBAC. |
| 4.2 | WHEN an enabler plan version is created, the platform SHALL write an audit log entry. |
| 4.3 | Platform Admin SHALL be the only role able to change the SPC threshold. |

---

## 3. Design

### Data Models

**`enabler_plans`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | → projects.id |
| period_id | UUID FK | → governance_periods.id |
| version | INTEGER | Auto-incremented per project+period |
| spc_threshold | INTEGER | Snapshot of threshold at time of creation |
| created_by | UUID FK | → users.id |
| created_at | TIMESTAMPTZ | |

Unique constraint: `(project_id, period_id, version)`

**`enabler_plan_sub_processes`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| enabler_plan_id | UUID FK | → enabler_plans.id |
| name | VARCHAR(100) | Sub-process name |
| contribution_score | SMALLINT | 1–5 |
| data_availability_score | SMALLINT | 1–5 |
| control_feasibility_score | SMALLINT | 1–5 |
| composite_score | SMALLINT | Computed: product of the three scores |
| recommended_control | ENUM | {spc, qpm} |

### Control Type Logic

```python
def recommend_control(contribution, data_avail, control_feasibility, spc_threshold):
    composite = contribution * data_avail * control_feasibility
    return "spc" if composite >= spc_threshold else "qpm"
```

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/v1/projects/{id}/enabler-plans` | `enabler:submit` | Create new enabler plan version |
| GET | `/api/v1/projects/{id}/enabler-plans` | `enabler:read` | List all versions |
| GET | `/api/v1/projects/{id}/enabler-plans/{version}` | `enabler:read` | Retrieve specific version |
| PATCH | `/api/v1/spc-threshold` | `spc:configure` | Update SPC threshold (Admin) |

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | Composite score always equals Contribution × Data Availability × Control Feasibility | Property-based |
| P2 | Recommended control is SPC if and only if composite ≥ threshold | Property-based |
| P3 | Score outside range 1–5 is always rejected | Property-based |
| P4 | Previous versions are always read-only after creation | Property-based |

---

## 4. Implementation Tasks

- [ ] 1. Database Schema
  - [ ] 1.1 Create `enabler_plans` table with versioning and unique constraint
  - [ ] 1.2 Create `enabler_plan_sub_processes` table with score constraints (CHECK 1–5)
  - [ ] 1.3 Add `spc_threshold` config record to platform settings table (or dedicated config table)

- [ ] 2. Domain Models & Repository
  - [ ] 2.1 Define SQLAlchemy ORM models: `EnablerPlan`, `EnablerPlanSubProcess`
  - [ ] 2.2 Implement `EnablerPlanRepository`: find_by_project_period, list_versions, save
  - [ ] 2.3 Unit tests for repository methods

- [ ] 3. Service Layer
  - [ ] 3.1 Implement `EnablerPlanService.create()`: validate scores (1–5), compute composite, recommend control, create version, audit
  - [ ] 3.2 Implement `EnablerPlanService.list_versions()`: paginated version history
  - [ ] 3.3 Implement `SpcConfigService.update_threshold()`: Admin-only, audit
  - [ ] 3.4 Unit tests: valid creation, score out of range, SPC/QPM boundary
  - [ ] 3.5 Property test: composite = product of three scores (P1)
  - [ ] 3.6 Property test: recommended control matches threshold rule (P2)
  - [ ] 3.7 Property test: score outside 1–5 always rejected (P3)
  - [ ] 3.8 Property test: previous versions always read-only (P4)

- [ ] 4. API Layer
  - [ ] 4.1 POST/GET enabler plan endpoints
  - [ ] 4.2 PATCH SPC threshold endpoint (Admin only)
  - [ ] 4.3 JWT auth and RBAC on all endpoints
  - [ ] 4.4 Integration tests: happy path, score validation, versioning, threshold update

- [ ] 5. Frontend
  - [ ] 5.1 `EnablerPlanForm`: sub-process table with score inputs (1–5 sliders/inputs) and computed recommendation display
  - [ ] 5.2 `EnablerPlanVersionHistory`: list of past versions with read-only view
  - [ ] 5.3 Composite score and recommended control displayed inline after input
  - [ ] 5.4 Component tests: score validation, recommendation display, version history
