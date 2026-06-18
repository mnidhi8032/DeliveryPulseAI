# DeliveryPulse AI — Product Specification

**Version:** 1.1  
**Status:** Draft  
**Last updated:** 2026-05-19 (v1.1)  

---

## Document control

| Field | Value |
|-------|-------|
| Product name | DeliveryPulse AI |
| Document type | Product specification (functional & metric design) |
| Intended stack | React (frontend), Python (backend), PostgreSQL (database) |
| Out of scope (v1) | Dashboards, UI implementation, API/code generation |

---

## 1. Project objective

### 1.1 Vision

DeliveryPulse AI is an **internal project governance system** that gives program and delivery leadership a single, consistent view of project health across five governance dimensions: Schedule, Quality, Scope, Finance, and People & Delivery.

### 1.2 Problem statement

Large delivery organizations struggle with:

- Fragmented status reporting across tools (Jira, finance systems, HR, incident trackers)
- Inconsistent definitions of “green / amber / red” across projects and regions
- Late discovery of risk because metrics are subjective or updated ad hoc
- No shared accountability model between PMs, Delivery Heads, and platform operators

### 1.3 Goals

| Goal | Description |
|------|-------------|
| **Standardize governance** | One metric catalog and health model for all in-scope projects |
| **Enable role-based accountability** | PM owns data entry and narrative; Delivery Head owns portfolio decisions; Platform Admin owns configuration and integrity |
| **Quantify health** | Derive dimension scores and an overall project health score from objective inputs |
| **Support auditability** | Every metric value is traceable (who entered it, when, source system if integrated) |
| **Prepare for automation** | Metric definitions include backend formulas so future integrations (timesheets, defect trackers, billing) can populate fields without changing the model |

### 1.4 Success criteria (v1 specification phase)

- All roles, workflows, and metrics are documented with validation and thresholds
- Health score composition is deterministic and documented per metric
- No dashboard or code is required to approve the model for build phase

### 1.5 Non-goals (v1)

- Executive or operational dashboards
- Predictive AI / anomaly detection (naming reserves future capability)
- Customer-facing portals
- Full ERP or HR system replacement

---

## 2. User roles

### 2.1 Role summary

| Role | Primary responsibility | Typical user |
|------|------------------------|--------------|
| **PM (Project Manager)** | Day-to-day project data stewardship, status updates, exception narratives | Project / program manager |
| **Delivery Head** | Portfolio oversight, BU project assignment, submission reviews | Regional delivery lead / BU Head |
| **Customer Admin** | Company-wide business setup (BUs, Accounts), assigned Delivery Heads | Head of Delivery / CDO / COO |
| **Platform Admin** | Global system configuration, master templates, access parameters | Internal platform / tooling team |
| **Executive (CEO/CFO)** | 100% Read-only high-level company and BU aggregations (Planned) | CEO / CFO / Board members |


### 2.2 PM (Project Manager)

**Purpose:** Owns the accuracy and timeliness of project-level governance data for assigned projects.

| Capability | Allowed |
|------------|---------|
| View assigned projects and all five dimension metrics | Yes |
| Create / update metric values for assigned projects | Yes |
| Submit period status (e.g., weekly / monthly governance cycle) | Yes |
| Add comments / justification on threshold breaches | Yes |
| Configure system-wide metric weights or thresholds | No |
| View projects outside assignment (unless delegated) | No |
| Manage users or roles | No |

**Accountability:** PM is accountable for data quality at project level; Delivery Head is accountable for acting on portfolio risk.

### 2.3 Delivery Head

**Purpose:** Consumes aggregated health across a portfolio; drives escalations and resource / scope decisions.

| Capability | Allowed |
|------------|---------|
| View all projects in assigned portfolio / org unit | Yes |
| Drill into project metrics and history | Yes |
| Acknowledge / escalate health exceptions | Yes |
| Override read-only locks on submitted periods (with audit reason) | Yes (audited) |
| Edit raw metric values on behalf of PM | No (default); optional delegated edit via policy flag |
| Change global thresholds or formulas | No |

### 2.4 Platform Admin

**Purpose:** Operates the platform—tenants, integrations, reference data, and governance policy.

| Capability | Allowed |
|------------|---------|
| Manage users, roles, and project assignments | Yes |
| Configure governance calendar (reporting frequency, lock windows) | Yes |
| Maintain reference data (projects, portfolios, currencies, fiscal periods) | Yes |
| Configure integration connectors (future) | Yes |
| View audit logs and data lineage | Yes |
| Edit project metric values | No (except break-glass support mode, fully audited) |

### 2.5 Customer Admin

**Purpose:** Owns the company-wide business hierarchy, setup of Business Units (BUs), and portfolio accounts.

| Capability | Allowed |
|------------|---------|
| View all Business Units and Projects (customer-wide read-only visibility) | Yes |
| Create Business Units | Yes |
| Assign Delivery Heads to Business Units | Yes |
| Create Accounts under BUs | Yes |
| Override project thresholds or metric weights | No |
| Approve PM submissions | No |

### 2.6 Executive (CEO / CFO / Board Members) — Planned

**Purpose:** Consumes company-wide aggregates and financial metric summaries to oversee enterprise risk and alignment.

| Capability | Allowed |
|------------|---------|
| View customer-wide executive dashboards (aggregated health by BU) | Yes |
| Read-only drill-down into any BU, Account, Project, or Timeline | Yes |
| View aggregated financial metric summaries (highly useful for CFO) | Yes |
| Create BUs, Accounts, Projects, or edit any metric value | No |

### 2.7 Role hierarchy and segregation

```
Platform Admin (System Owner / IT Configurator)
   ↓
Customer Admin (Company Business Owner / Set up BUs & Accounts)
   ↓
Delivery Head (BU Portfolio Owner / Creates Projects & Assigns PMs)
   ↓
PM (Project data steward / Enters and submits metrics)
   ↓
Executive (100% Read-only high-level views / CEO & CFO) [Planned]
```

- **SoD rule:** Platform Admin cannot be the sole approver of their own break-glass metric edits; a second admin or Delivery Head acknowledgment is required when support mode is used.
- **Administrative segregation:** Customer Admins manage company setup (BUs, Accounts), while Delivery Heads operate the actual projects and assignments to avoid conflict of interest.

---

## 3. Workflow

### 3.1 Governance cycle overview

DeliveryPulse AI organizes work in **governance periods** (default: **monthly**, configurable by Platform Admin to weekly for critical programs).

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Period opens    │────▶│ PM captures /     │────▶│ PM submits      │
│ (auto or admin) │     │ updates metrics   │     │ period          │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌─────────────────────────────────┘
                        ▼
              ┌──────────────────┐     ┌──────────────────┐
              │ System computes  │────▶│ Delivery Head    │
              │ dimension &      │     │ reviews portfolio│
              │ health scores    │     │ exceptions       │
              └──────────────────┘     └────────┬─────────┘
                                                │
                        ┌───────────────────────┘
                        ▼
              ┌──────────────────┐     ┌──────────────────┐
              │ Escalations /    │     │ Period locked    │
              │ actions logged   │────▶│ (audit archive)  │
              └──────────────────┘     └──────────────────┘
```

### 3.2 Submission Lifecycle Status

Governance period submissions use the following statuses. Band classification (Green / Amber / Red) is derived separately from health sub-scores; see §4.1.

| Status | Definition |
|--------|------------|
| `DRAFT` | PM editing state; metrics editable |
| `SUBMITTED` | PM submitted; editing disabled; scores computed |
| `UNDER_REVIEW` | Delivery Head reviewing submission |
| `APPROVED` | Delivery Head accepted submission |
| `REJECTED` | Returned to PM for correction |
| `REOPENED` | Approved or locked submission reopened with audit reason |
| `LOCKED` | Historical snapshot; immutable |

**Primary workflow:**

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → LOCKED
```

**Exception paths:**

```
UNDER_REVIEW → REJECTED → DRAFT
APPROVED → REOPENED → DRAFT
```

| Transition | Actor | Notes |
|------------|-------|-------|
| `DRAFT` → `SUBMITTED` | PM | Validation must pass |
| `SUBMITTED` → `UNDER_REVIEW` | System | Automatic on successful submit |
| `UNDER_REVIEW` → `APPROVED` | Delivery Head | Sets `approval_date` |
| `UNDER_REVIEW` → `REJECTED` | Delivery Head | Requires rejection reason |
| `REJECTED` → `DRAFT` | System | PM may edit again |
| `APPROVED` → `LOCKED` | System | Per lock policy (`locked_at`) |
| `APPROVED` → `REOPENED` | Delivery Head | Audited reason required |
| `LOCKED` → `REOPENED` | Delivery Head | Audited reason required |
| `REOPENED` → `DRAFT` | System | PM resumes editing |

All state transitions must be **audit logged** (actor, timestamp UTC, prior status, new status, reason where applicable).

### 3.3 PM workflow (detailed)

1. **Notification:** PM receives notice when a new governance period opens.
2. **Data capture:** PM enters or confirms metric values for all five dimensions via manual form or Excel import (see Data Entry Modes).
3. **Validation:** System runs field-level and cross-field validation after parsing (Excel) and before submission (see per-metric rules).
4. **Variance review:** System highlights metrics in amber/red; PM adds mandatory comment for any red metric.
5. **Save Draft:** PM persists work in `DRAFT` without submitting.
6. **Submit:** PM submits period → `SUBMITTED` → `UNDER_REVIEW`; editing disabled until `REJECTED` or `REOPENED`.
7. **Correction:** On `REJECTED` or `REOPENED`, PM edits with change reason; audit trail retained; resubmit returns to `SUBMITTED`.

#### Data Entry Modes

DeliveryPulse AI supports two project update methods:

1. **Manual form entry** within the platform
2. **Excel download/upload** workflow

**Manual entry flow:**

```
PM → Open project → Enter metric values in form → Save Draft → Submit
```

**Excel flow:**

```
PM → Download standardized template → Fill template offline → Upload template
  → System parses uploaded file → Display editable preview screen
  → PM reviews and edits imported values → Save Draft → Submit
```

**Rules:**

| Rule | Behavior |
|------|----------|
| No direct finalization from Excel | Uploaded Excel data must never directly become final submission |
| PM edit before submit | PM must be allowed to edit imported values on the preview screen before submission |
| Validation timing | Validation rules run after parsing and again before submission |
| Shared data structure | Imported values and manually edited values use the same backend structure |
| Bulk readiness | Excel import must support future bulk project updates (multi-project template) |

**Note:** Both manual and imported workflows converge into a **single submission pipeline** (`Save Draft` → validate → `Submit` → lifecycle in §3.2).

### 3.4 Delivery Head workflow (detailed)

1. **Portfolio queue:** After submission, projects appear sorted by overall health score (ascending = worse health).
2. **Review:** Delivery Head reviews submissions in `UNDER_REVIEW`.
3. **Exception review:** Delivery Head reviews projects with any dimension in red or overall health below portfolio policy.
4. **Approve or reject:** `APPROVED` records acceptance and `approval_date`; `REJECTED` returns submission to PM with reason.
5. **Actions:** Log escalation type (scope, funding, staffing, schedule recovery, quality remediation).
6. **Sign-off:** Mark portfolio review complete for the period (org-level checkpoint).
7. **Escalation to leadership:** Export summary (future dashboard); v1 = structured exception record only.

### 3.5 Platform Admin workflow (detailed)

1. **Onboarding:** Create project, assign PM, map to portfolio and Delivery Head.
2. **Policy setup:** Set reporting frequency, lock offset (e.g., lock 5 business days after period end), currency.
3. **User lifecycle:** Provision / deactivate users; assign roles.
4. **Audit:** Investigate data disputes via metric history and actor log.
5. **Policy change:** Threshold or weight changes apply from **next** period forward unless flagged as retroactive (discouraged; requires admin reason).

### 3.6 Cross-cutting workflow rules

| Rule | Behavior |
|------|----------|
| **Single source of truth** | Latest submitted period is the official record for portfolio health |
| **Historical immutability** | Locked periods cannot be edited without `REOPENED` workflow |
| **Mandatory dimensions** | All metrics required for submit unless marked optional in spec (none optional in v1) |
| **Computed fields** | Health scores and derived percentages are system-calculated; PM cannot override |
| **Idempotency** | Re-submit of same period version replaces draft snapshot only before lock |
| **Excel import** | Parsed data lands in draft/preview only; PM confirmation required before `SUBMITTED` |

### 3.7 System Date Fields

All governance records expose the following system date/time fields:

| Field | Definition |
|-------|------------|
| `created_at` | Record creation timestamp |
| `updated_at` | Latest update timestamp |
| `submission_date` | PM submission timestamp (transition to `SUBMITTED`) |
| `approval_date` | Delivery Head approval timestamp (transition to `APPROVED`) |
| `rag_start_date` | Date the current RAG (Green / Amber / Red) status became effective |
| `period_start` | Governance period start date |
| `period_end` | Governance period end date |
| `locked_at` | Historical lock timestamp (transition to `LOCKED`) |

**Rules:**

| Rule | Behavior |
|------|----------|
| Storage | Store all timestamps in **UTC** |
| Display | Frontend converts to user timezone for display |
| Aging | Dates drive aging calculations (e.g., days in current RAG, overdue review) |
| Trends | Dates drive trend charts (future dashboards) |
| RAG history | Dates drive RAG status change history (`rag_start_date` per band change) |
| Audit & reopen | Dates support audit trails and reopening workflows (`submission_date`, `approval_date`, `locked_at`) |

---

## 4. Governance dimensions and metrics

### 4.1 Dimension model

Each project has five **dimension scores** (0–100) and one **overall health score** (0–100), derived from normalized metric sub-scores and dimension weights.

**Default dimension weights (overall health):**

| Dimension | Weight |
|-----------|--------|
| Schedule | 25% |
| Quality | 20% |
| Scope | 15% |
| Finance | 20% |
| People & Delivery | 20% |

Platform Admin may adjust weights per portfolio; sum must equal 100%.

**Risk band mapping (per metric sub-score and dimension score):**

All band assignments are derived **only** from numeric sub-score or dimension score. No intermediate color labels are permitted.

| Band | Score range | Label |
|------|-------------|-------|
| Green | 80–100 | On track |
| Amber | 50–79 | At risk |
| Red | 0–49 | Critical |

```
band(score) =
    if score >= 80: GREEN
    if score >= 50: AMBER
    else: RED
```

---

### 4.2 Schedule dimension

**Dimension purpose:** Measure timeline adherence, execution progress, and dependency-driven delays.

**Dimension score formula:**

```
schedule_dimension_score = (
    0.40 * subscore(planned_vs_actual_progress) +
    0.35 * subscore(schedule_variance) +
    0.25 * subscore(dependency_delay_count)
)
```

Where `schedule_variance` is derived from `actual_progress_percent - planned_progress_percent` (see metrics below).

---

#### 4.2.1 `planned_progress_percent`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Baseline expectation of work completed by the reporting date per the approved plan (milestones or work breakdown). |
| **Datatype** | `DECIMAL(5,2)` — stored value 0.00–100.00; unit: percent |
| **Validation** | Required; `0 <= value <= 100`; must not decrease vs prior locked period unless PM provides `plan_rebaseline_reason` (audited); max 2 decimal places |
| **Risk thresholds** | Used comparatively with actual (see 4.2.2). Standalone: N/A |
| **Backend formula** | **Input metric** (v1 manual). Optional future: `(completed_planned_work_units / total_planned_work_units) * 100` from plan tool. |
| **Impact on health score** | Indirect via schedule variance sub-score (40% of Schedule dimension). |

**Schedule variance sub-score** (used in dimension formula):

```
variance = actual_progress_percent - planned_progress_percent
subscore_schedule_variance =
    if variance >= 0:  min(100, 80 + variance * 2)
    if variance >= -5: 50 + (variance + 5) * 6
    if variance >= -15: 20 + (variance + 15) * 3
    else: max(0, 20 + (variance + 15) * 2)
```

| Variance (actual − planned) | Band |
|----------------------------|------|
| ≥ 0% | Green |
| −5% to −1% | Amber |
| < −5% | Red |

---

#### 4.2.2 `actual_progress_percent`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Observed completion of deliverables against the same baseline used for planned progress. |
| **Datatype** | `DECIMAL(5,2)` — 0.00–100.00 |
| **Validation** | Required; `0 <= value <= 100`; if `actual > planned + 25`, require comment (possible plan staleness) |
| **Risk thresholds** | See variance table in 4.2.1 |
| **Backend formula** | **Input metric** (v1). Optional future: `(completed_actual_work_units / total_planned_work_units) * 100`. |
| **Impact on health score** | Drives 40% of Schedule dimension via variance sub-score. |

---

#### 4.2.3 `dependency_delay_count`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Count of external or cross-team dependencies that are late and blocking critical-path work in the period. |
| **Datatype** | `INTEGER` — `>= 0` |
| **Validation** | Required; integer only; must reconcile with optional dependency register (future) |
| **Risk thresholds** | Sub-score bands below |
| **Backend formula** | **Input metric** (v1). Optional future: `COUNT(dependencies WHERE status = 'DELAYED' AND is_critical_path = true AND delay_days > 0)`. |
| **Impact on health score** | 25% weight within Schedule dimension. |

**Sub-score mapping:**

| Count | Sub-score | Band |
|-------|-----------|------|
| 0 | 100 | Green |
| 1–2 | 70 | Amber |
| 3–5 | 40 | Red |
| ≥ 6 | 10 | Red |

```
subscore_dependency_delay =
    CASE
        WHEN count = 0 THEN 100
        WHEN count <= 2 THEN 70
        WHEN count <= 5 THEN 40
        ELSE 10
    END
```

---

### 4.3 Quality dimension

**Dimension purpose:** Capture defect burden, test effectiveness, and production stability.

**Dimension score formula:**

```
quality_dimension_score = (
    0.40 * subscore(critical_defects) +
    0.35 * subscore(test_pass_rate) +
    0.25 * subscore(prod_incidents)
)
```

---

#### 4.3.1 `critical_defects`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Number of open defects at highest severity (e.g., P1/blocker) affecting release or production readiness. |
| **Datatype** | `INTEGER` — `>= 0` |
| **Validation** | Required; non-negative integer; cannot decrease from prior period without `defect_resolution_note` if prior period had red status |
| **Risk thresholds** | See sub-score table |
| **Backend formula** | **Input metric** (v1). Optional future: `COUNT(defects WHERE severity IN ('P1','Critical') AND status NOT IN ('Closed','Rejected'))`. |
| **Impact on health score** | 40% of Quality dimension. |

| Open critical defects | Sub-score | Band |
|----------------------|-----------|------|
| 0 | 100 | Green |
| 1–2 | 75 | Amber |
| 3–5 | 45 | Red |
| ≥ 6 | 15 | Red |

---

#### 4.3.2 `test_pass_rate`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Percentage of test cases passed in the latest completed test cycle for the release train or sprint. |
| **Datatype** | `DECIMAL(5,2)` — 0.00–100.00 |
| **Validation** | Required; `0 <= value <= 100`; if total tests = 0 in integrated mode, block submit (v1: PM must enter 0 only with `no_tests_executed_reason`) |
| **Risk thresholds** | See sub-score table |
| **Backend formula** | **Input metric** (v1). Integrated: `(passed_tests / executed_tests) * 100`, executed_tests > 0. |
| **Impact on health score** | 35% of Quality dimension. |

| Pass rate (%) | Sub-score | Band |
|---------------|-----------|------|
| ≥ 95 | 100 | Green |
| 85–94.99 | 70 | Amber |
| 70–84.99 | 45 | Red |
| < 70 | 15 | Red |

```
subscore_test_pass_rate = piecewise_linear(pass_rate, breakpoints above)
```

---

#### 4.3.3 `prod_incidents`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Count of production incidents attributed to the project in the governance period (severity per org ITSM policy). |
| **Datatype** | `INTEGER` — `>= 0` |
| **Validation** | Required; non-negative integer; major incidents (Sev-1) require linked incident IDs when integration enabled |
| **Risk thresholds** | See sub-score table |
| **Backend formula** | **Input metric** (v1). Optional future: `COUNT(incidents WHERE project_id = X AND period = Y AND environment = 'PROD')`. |
| **Impact on health score** | 25% of Quality dimension. |

| Incidents in period | Sub-score | Band |
|---------------------|-----------|------|
| 0 | 100 | Green |
| 1 | 75 | Amber |
| 2–3 | 45 | Red |
| ≥ 4 | 10 | Red |

---

### 4.4 Scope dimension

**Dimension purpose:** Measure scope churn and stability of agreed requirements.

**Dimension score formula:**

```
scope_dimension_score = (
    0.50 * subscore(scope_change_requests) +
    0.50 * subscore(requirement_stability_percent)
)
```

---

#### 4.4.1 `scope_change_requests`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Number of formal change requests (CRs) raised and accepted or pending in the period. |
| **Datatype** | `INTEGER` — `>= 0` |
| **Validation** | Required; integer; CRs marked “emergency” count double in sub-score calculation (policy flag) |
| **Risk thresholds** | See sub-score table |
| **Backend formula** | **Input metric** (v1). Optional future: `COUNT(change_requests WHERE period = Y AND status IN ('Approved','Pending'))`. |
| **Impact on health score** | 50% of Scope dimension. |

**Effective count** (when emergency double-count enabled):

```
effective_scr = scope_change_requests + emergency_cr_count
```

| Effective SCR | Sub-score | Band |
|---------------|-----------|------|
| 0–1 | 100 | Green |
| 2–3 | 70 | Amber |
| 4–6 | 40 | Red |
| ≥ 7 | 15 | Red |

---

#### 4.4.2 `requirement_stability_percent`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Share of baselined requirements that remain unchanged at period end (inverse of churn). |
| **Datatype** | `DECIMAL(5,2)` — 0.00–100.00 |
| **Validation** | Required; `0 <= value <= 100` |
| **Risk thresholds** | See sub-score table |
| **Backend formula** | **Computed (preferred):** `((total_baselined_requirements - changed_requirements) / total_baselined_requirements) * 100`. If `total_baselined_requirements = 0`, reject or require baseline establishment. **v1 manual input** allowed with same validation. |
| **Impact on health score** | 50% of Scope dimension. |

| Stability (%) | Sub-score | Band |
|---------------|-----------|------|
| ≥ 90 | 100 | Green |
| 80–89.99 | 75 | Amber |
| 70–79.99 | 45 | Red |
| < 70 | 20 | Red |

---

### 4.5 Finance dimension

**Dimension purpose:** Track budget consumption and billing timeliness.

**Dimension score formula:**

```
finance_dimension_score = (
    0.50 * subscore(budget_utilization) +
    0.50 * subscore(billing_delay_days)
)
```

Where `budget_utilization` is derived from `budget_used` and `planned_budget`.

---

#### 4.5.1 `budget_used`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Cumulative actual spend recognized for the project through the reporting date (labor, vendor, allocated overhead per finance policy). |
| **Datatype** | `DECIMAL(18,2)` — currency amount, non-negative |
| **Validation** | Required; `>= 0`; currency must match project `currency_code`; precision 2 dp |
| **Risk thresholds** | Evaluated via utilization ratio with `planned_budget` |
| **Backend formula** | **Input metric** (v1). Optional future: sum of approved cost transactions from ERP. |
| **Impact on health score** | Combined with planned_budget for 50% of Finance dimension. |

---

#### 4.5.2 `planned_budget`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Approved budget envelope for the same scope and time horizon as `budget_used`. |
| **Datatype** | `DECIMAL(18,2)` — currency amount, `> 0` |
| **Validation** | Required; must be `> 0`; changes vs locked period require `budget_rebaseline_reason` |
| **Risk thresholds** | Used in utilization ratio |
| **Backend formula** | **Input metric** (v1). Optional future: sync from financial planning tool. |
| **Impact on health score** | Denominator for budget utilization sub-score (50% of Finance dimension). |

**Budget utilization sub-score:**

```
utilization_percent = (budget_used / planned_budget) * 100

subscore_budget_utilization =
    if utilization <= 85:  100
    if utilization <= 95:  85 - (utilization - 85) * 1.5
    if utilization <= 105: 70 - (utilization - 95) * 2.5
    if utilization <= 115: 45 - (utilization - 105) * 3
    else: max(10, 15 - (utilization - 115) * 0.5)
```

| Utilization % | Band |
|---------------|------|
| ≤ 85% | Green (under-spend may trigger separate alert, not health penalty in v1) |
| 86–100% | Green |
| 101–105% | Amber |
| 106–115% | Red |
| > 115% | Red |

---

#### 4.5.3 `billing_delay_days`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Average or maximum days between milestone completion (or timesheet approval) and customer invoice issuance—cash-flow and revenue recognition risk. |
| **Datatype** | `INTEGER` — `>= 0` (days) |
| **Validation** | Required; non-negative integer; if multiple milestones, PM enters **maximum** delay in period unless integration computes weighted average |
| **Risk thresholds** | See sub-score table |
| **Backend formula** | **Input metric** (v1). Optional future: `MAX(invoice_date - milestone_acceptance_date)` in days for billable milestones in period. |
| **Impact on health score** | 50% of Finance dimension. |

| Delay (days) | Sub-score | Band |
|--------------|-----------|------|
| 0–7 | 100 | Green |
| 8–15 | 75 | Amber |
| 16–30 | 45 | Red |
| > 30 | 15 | Red |

---

### 4.6 People & Delivery dimension

**Dimension purpose:** Reflect staffing capacity and retention risk on delivery continuity.

**Dimension score formula:**

```
people_dimension_score = (
    0.55 * subscore(resource_availability) +
    0.45 * subscore(team_attrition)
)
```

---

#### 4.6.1 `resource_availability`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Percentage of planned FTE / role capacity available for project work in the period (after leave, bench, and competing allocations). |
| **Datatype** | `DECIMAL(5,2)` — 0.00–100.00 |
| **Validation** | Required; `0 <= value <= 100` |
| **Risk thresholds** | See sub-score table |
| **Backend formula** | **Input metric** (v1). Optional future: `(available_capacity_hours / planned_capacity_hours) * 100`. |
| **Impact on health score** | 55% of People & Delivery dimension. |

| Availability (%) | Sub-score | Band |
|------------------|-----------|------|
| ≥ 90 | 100 | Green |
| 80–89.99 | 75 | Amber |
| 70–79.99 | 45 | Red |
| < 70 | 20 | Red |

---

#### 4.6.2 `team_attrition`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Count of voluntary or involuntary departures from the core delivery team in the rolling 12 months (or period-normalized rate). |
| **Datatype** | `INTEGER` — `>= 0` (headcount left in rolling window) |
| **Validation** | Required; non-negative; if team size < 3, attrition of 1+ triggers mandatory Delivery Head review flag |
| **Risk thresholds** | See sub-score table |
| **Backend formula** | **Input metric** (v1). Optional future: `COUNT(hr_terminations WHERE team = project_team AND date >= rolling_12m_start)`. |
| **Impact on health score** | 45% of People & Delivery dimension. |

| Attrition (12m count, team 5–15) | Sub-score | Band |
|----------------------------------|-----------|------|
| 0 | 100 | Green |
| 1 | 80 | Amber |
| 2 | 50 | Amber |
| ≥ 3 | 20 | Red |

*Note:* For teams smaller than 5, reduce red threshold to ≥ 2 departures. Platform Admin configures team size tier rules.

---

## 5. Overall health score

### 5.1 Composition

```
overall_health_score = round(
    0.25 * schedule_dimension_score +
    0.20 * quality_dimension_score +
    0.15 * scope_dimension_score +
    0.20 * finance_dimension_score +
    0.20 * people_dimension_score
, 2)
```

### 5.2 Overall risk bands

| Overall score | Band | Recommended action |
|---------------|------|--------------------|
| 80–100 | Green | Standard governance |
| 50–79 | Amber | Delivery Head review within 5 business days |
| 0–49 | Red | Mandatory escalation record; portfolio checkpoint |

### 5.3 Metric-level impact summary

| Metric | Dimension weight in overall | Metric weight in dimension |
|--------|----------------------------|----------------------------|
| planned_progress_percent | 25% × 40% (via variance) | 40% (paired with actual) |
| actual_progress_percent | 25% × 40% (via variance) | 40% (paired with planned) |
| dependency_delay_count | 25% × 25% = 6.25% | 25% |
| critical_defects | 20% × 40% = 8% | 40% |
| test_pass_rate | 20% × 35% = 7% | 35% |
| prod_incidents | 20% × 25% = 5% | 25% |
| scope_change_requests | 15% × 50% = 7.5% | 50% |
| requirement_stability_percent | 15% × 50% = 7.5% | 50% |
| budget_used + planned_budget | 20% × 50% = 10% | 50% (combined) |
| billing_delay_days | 20% × 50% = 10% | 50% |
| resource_availability | 20% × 55% = 11% | 55% |
| team_attrition | 20% × 45% = 9% | 45% |

### 5.4 Worst-case escalation rule

If **any** dimension score < 50 (red), overall health cannot exceed **79** (amber cap) until Delivery Head acknowledges exception—prevents masking a critical dimension with strong others.

```
if any(dimension_score < 50):
    overall_health_score = min(overall_health_score, 79)
```

---

## 6. Data model concepts (specification only)

Entities referenced for implementation planning (no schema DDL in v1):

| Entity | Description |
|--------|-------------|
| `Project` | Governed delivery unit |
| `Portfolio` | Grouping for Delivery Head line of sight |
| `GovernancePeriod` | Time window for metric snapshot (`period_start`, `period_end`) |
| `Submission` | Period submission with lifecycle status (§3.2) and date fields (§3.7) |
| `MetricValue` | Typed value per metric per period |
| `DimensionScore` | Computed dimension result |
| `HealthScore` | Computed overall result |
| `AuditEvent` | Actor, timestamp, old/new value, reason |

---

## 7. Assumptions and open items

| ID | Assumption / open item | Default |
|----|------------------------|---------|
| A1 | Reporting period is monthly | Monthly |
| A2 | Progress % uses same WBS baseline for planned and actual | Yes |
| A3 | Currency is single per project | Yes |
| A4 | Emergency CR double-count is enabled | Configurable, default off |
| O1 | Integration sources for v2 | Jira, ITSM, ERP, HRIS |
| O2 | Dashboards deferred | Per product scope |

---

## 8. Glossary

| Term | Definition |
|------|------------|
| **Governance period** | Fixed interval for official metric snapshot |
| **Sub-score** | Normalized 0–100 score for a single metric |
| **Dimension score** | Weighted combination of metric sub-scores |
| **Health score** | Weighted combination of dimension scores |
| **CR** | Scope change request per change control process |

---

## 9. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product owner | | | |
| Delivery Head (representative) | | | |
| Platform Admin (representative) | | | |

---

*End of specification — DeliveryPulse AI v1.1*
