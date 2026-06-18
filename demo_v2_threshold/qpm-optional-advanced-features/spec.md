# QPM Optional / Advanced Features — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

This spec covers the five optional/advanced features of the QPM Platform: AI Trend Prediction, Risk Forecasting, JIRA Integration, ERP Integration, and Auto Reminders. These are non-blocking enhancements that augment the core platform and are designed to be independently deliverable.

---

## 2. Requirements

### F1 — AI Trend Prediction

**As a** Project Manager, **I want** the platform to forecast KPI trajectory, **so that** I can anticipate future performance issues.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | WHEN a project has at least 6 historical periods of metric data for a KPI, the platform SHALL compute a trend forecast for the next 1–3 periods. |
| 1.2 | The forecast SHALL be displayed as a dotted extension on the KPI trend line chart. |
| 1.3 | The platform SHALL display a confidence range (upper/lower bound) alongside the forecast. |
| 1.4 | IF fewer than 6 periods of data exist, the platform SHALL display "Insufficient data for forecast" rather than an empty or misleading chart. |
| 1.5 | Forecast computation SHALL NOT block the main API thread (async/background). |

### F2 — Risk Forecasting

**As a** Delivery Manager, **I want** the platform to identify KPIs at risk of turning Red, **so that** I can intervene before issues materialise.

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | WHEN a KPI's trend forecast indicates its value will breach LSL or USL within the next period, the platform SHALL flag it as At Risk. |
| 2.2 | At-Risk KPIs SHALL be surfaced on the project dashboard with a distinct visual indicator. |
| 2.3 | The platform SHALL generate an in-app notification when a KPI is newly flagged as At Risk. |
| 2.4 | Risk flags SHALL be recomputed after every metric recalculation cycle. |

### F3 — JIRA Integration

**As a** Project Manager, **I want** defect and story data fetched from JIRA automatically, **so that** I don't need to manually enter data that already exists in JIRA.

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | The platform SHALL allow a Project Manager to connect a QPM project to a JIRA project by providing a JIRA project key and credentials. |
| 3.2 | WHEN connected, the platform SHALL fetch defect counts (by priority/severity) and story point totals from JIRA on a configurable schedule (default: every hour). |
| 3.3 | Fetched JIRA data SHALL be mapped to the corresponding QPM data entry fields and stored as draft entries pending user review. |
| 3.4 | JIRA credentials SHALL be stored encrypted and SHALL never be returned in API responses. |
| 3.5 | IF the JIRA API is unreachable, the platform SHALL log the failure and retry on the next scheduled cycle without overwriting existing data. |

### F4 — ERP Integration

**As a** Project Manager, **I want** cost and revenue data fetched from ERP automatically, **so that** financial KPIs are populated without manual entry.

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | The platform SHALL allow configuration of an ERP connection (endpoint URL, auth token) per project. |
| 4.2 | WHEN connected, the platform SHALL fetch cost and revenue figures on a configurable schedule (default: daily). |
| 4.3 | Fetched ERP data SHALL be stored as draft data entries pending approval. |
| 4.4 | ERP credentials SHALL be stored encrypted and SHALL never be returned in API responses. |
| 4.5 | IF the ERP endpoint is unreachable, the platform SHALL log the failure and retry with exponential backoff (max 3 retries). |

### F5 — Auto Reminders

**As a** Project Manager, **I want** scheduled reminders for data entry deadlines, **so that** submission deadlines are not missed.

| # | Acceptance Criterion |
|---|----------------------|
| 5.1 | The platform SHALL send a reminder notification (in-app + email) to the data submitter N days before the end of each governance period (default N = 2, configurable per project). |
| 5.2 | WHEN a period closes without an Approved submission, the platform SHALL send a missed-deadline notification to the Project Manager and Delivery Manager. |
| 5.3 | Auto-reminder schedules SHALL be configurable per project by a Project Manager. |
| 5.4 | Reminders SHALL be dispatched via the existing Notifications module (no separate delivery path). |

---

## 3. Design

### AI Trend Prediction & Risk Forecasting

```
MetricValueRepository.get_time_series(project_id, kpi_id)
    │
ForecastEngine
  method: linear_regression | exponential_smoothing (configurable)
  min_periods: 6
  horizon: 3
    │
ForecastResult { point_estimates[], confidence_lower[], confidence_upper[] }
    │
RiskEvaluator
  flag if point_estimate[0] < kpi.lsl OR > kpi.usl
    │
RiskFlag stored in rag_statuses (level: kpi, risk_type: forecast)
```

**`kpi_forecasts`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | |
| kpi_id | UUID FK | |
| computed_at | TIMESTAMPTZ | |
| forecast_periods | INTEGER | Number of forward periods |
| point_estimates | NUMERIC[] | |
| confidence_lower | NUMERIC[] | |
| confidence_upper | NUMERIC[] | |
| at_risk | BOOLEAN | |

### JIRA & ERP Integration

**`integrations`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | |
| integration_type | ENUM | {jira, erp} |
| config | JSONB | Encrypted connection config |
| schedule_interval_minutes | INTEGER | |
| last_sync_at | TIMESTAMPTZ | NULLABLE |
| last_sync_status | ENUM | {success, failed, pending} |
| is_active | BOOLEAN | DEFAULT TRUE |

Credentials in `config` JSONB SHALL be encrypted at application level before storage.

### Auto Reminders

Implemented as a scheduled Celery/ARQ periodic task:
1. Query all active governance periods ending within the next N days
2. For each: send reminder via `NotificationService.dispatch(deadline_warning, ...)`
3. On period close: check for missing Approved submissions, send missed-deadline notifications

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/projects/{id}/kpis/{kpi_id}/forecast` | `dashboard:read` | KPI trend forecast |
| GET | `/api/v1/projects/{id}/risk` | `dashboard:read` | At-risk KPI list |
| POST | `/api/v1/projects/{id}/integrations` | `integrations:configure` | Configure JIRA/ERP integration |
| GET | `/api/v1/projects/{id}/integrations` | `integrations:read` | List integrations and sync status |
| PATCH | `/api/v1/projects/{id}/integrations/{id}` | `integrations:configure` | Update schedule or credentials |
| DELETE | `/api/v1/projects/{id}/integrations/{id}` | `integrations:configure` | Remove integration |
| GET/PATCH | `/api/v1/projects/{id}/reminder-config` | `project:update` | Get/update auto-reminder settings |

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | Forecast is only computed when ≥ 6 periods of data exist | Property-based |
| P2 | At-Risk flag is set if and only if the forecast breaches LSL or USL | Property-based |
| P3 | Integration credentials are never returned in API responses | Property-based |
| P4 | Reminder is dispatched exactly once per period per configured reminder schedule | Property-based |

---

## 4. Implementation Tasks

- [ ] 1. AI Trend Prediction
  - [ ] 1.1 Implement `ForecastEngine` with linear regression and exponential smoothing methods
  - [ ] 1.2 Guard: return null forecast if fewer than 6 periods of data
  - [ ] 1.3 Create `kpi_forecasts` table and repository
  - [ ] 1.4 Implement async background task: recompute forecasts after each metric recalculation cycle
  - [ ] 1.5 GET `/api/v1/projects/{id}/kpis/{kpi_id}/forecast` endpoint
  - [ ] 1.6 Property test: forecast only computed with ≥ 6 periods (P1)
  - [ ] 1.7 Frontend: dotted trend extension on TrendLineChart with confidence band

- [ ] 2. Risk Forecasting
  - [ ] 2.1 Implement `RiskEvaluator.evaluate(forecast, kpi_thresholds)` — flag if forecast[0] breaches bounds
  - [ ] 2.2 Store risk flag in `rag_statuses` with `level: kpi, risk_type: forecast`
  - [ ] 2.3 Dispatch At-Risk notification via NotificationService when newly flagged
  - [ ] 2.4 GET `/api/v1/projects/{id}/risk` endpoint
  - [ ] 2.5 Property test: at-risk flag set iff forecast breaches bounds (P2)
  - [ ] 2.6 Frontend: At-Risk indicator on KPI summary card and tracker table

- [ ] 3. JIRA Integration
  - [ ] 3.1 Create `integrations` table; encrypt config JSONB at application layer
  - [ ] 3.2 Implement `JIRAConnector`: fetch defects (by severity) and story points using JIRA REST API
  - [ ] 3.3 Implement field mapping: JIRA priority → QPM defect severity; story points → size delivered
  - [ ] 3.4 Implement periodic sync task (default: hourly); store as draft data entries
  - [ ] 3.5 Implement retry logic on JIRA API failure (no overwrite of existing data)
  - [ ] 3.6 Integration CRUD endpoints with credential encryption/masking
  - [ ] 3.7 Property test: credentials never returned in API response (P3)
  - [ ] 3.8 Frontend: JIRA integration configuration panel with sync status

- [ ] 4. ERP Integration
  - [ ] 4.1 Implement `ERPConnector`: fetch cost/revenue from configurable ERP endpoint
  - [ ] 4.2 Implement periodic sync task (default: daily); store as draft data entries
  - [ ] 4.3 Implement exponential backoff retry (max 3) on ERP unreachable
  - [ ] 4.4 Integration CRUD endpoints with credential encryption/masking
  - [ ] 4.5 Frontend: ERP integration configuration panel with last-sync status

- [ ] 5. Auto Reminders
  - [ ] 5.1 Implement scheduled task: query periods ending within N days; dispatch deadline_warning notifications
  - [ ] 5.2 Implement missed-deadline check: run at period close; notify PM and DM if no Approved submission
  - [ ] 5.3 GET/PATCH `/api/v1/projects/{id}/reminder-config` endpoint
  - [ ] 5.4 Property test: reminder dispatched exactly once per configured schedule per period (P4)
  - [ ] 5.5 Frontend: `ReminderConfigPanel` per project (days-before selector, enable/disable toggle)
