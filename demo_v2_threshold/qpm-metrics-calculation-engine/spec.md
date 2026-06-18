# QPM Metrics Calculation Engine — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The Metrics Calculation Engine automatically computes KPI metric values from raw data inputs using project-defined formulas. It supports simple ratios, weighted calculations (e.g. defect severity weighting), and time-based rolling averages. Results are stored as time-series data per project / KPI / period and are recalculated on new data entry or threshold updates.

---

## 2. Requirements

### R1 — Automatic Metric Computation

**As a** Platform, **I want to** automatically compute KPI values from raw inputs, **so that** users never have to manually calculate indicators.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | WHEN raw data is submitted for a period, the engine SHALL compute the KPI metric value using the KPI's defined formula. |
| 1.2 | The engine SHALL support the following formula types: Productivity (Size/Effort), Defect Density (Defects/Size), Defect Removal Efficiency (Defects Removed/Total Defects), Schedule Adherence (Planned Date/Actual Date). |
| 1.3 | IF the divisor in any ratio formula is zero, the engine SHALL produce a null result and log a computation error rather than throwing an unhandled exception. |
| 1.4 | Computed values SHALL be associated with the specific project, KPI, and measurement period. |

### R2 — Calculation Types

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | The engine SHALL support simple ratio calculations (e.g., Defects / Size). |
| 2.2 | The engine SHALL support weighted calculations where defect counts are multiplied by severity weights (Critical=3, Major=2, Minor=1) before aggregation. |
| 2.3 | The engine SHALL support time-based rolling average calculations over a configurable window (default: 3 periods). |
| 2.4 | Rolling average calculations SHALL use the N most recent completed periods and SHALL produce a null result if fewer than N periods have data. |

### R3 — Time-Series Storage

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | Every computed metric value SHALL be stored as a time-series record keyed by (project_id, kpi_id, period_id). |
| 3.2 | Historical computed values SHALL never be overwritten in place; recalculation SHALL insert a new version record. |
| 3.3 | The platform SHALL provide a query interface to retrieve the metric time series for a given project and KPI. |

### R4 — Recalculation Triggers

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | WHEN new raw data is submitted and approved for a period, the engine SHALL recalculate all affected KPI metrics for that period. |
| 4.2 | WHEN KPI thresholds (Target, LSL, USL) are updated, the engine SHALL recalculate RAG statuses for all historical periods of that KPI. |
| 4.3 | Recalculation SHALL complete within 5 seconds for a single project with up to 50 KPIs and 24 periods. |
| 4.4 | Recalculation failures SHALL be logged to the audit log and SHALL NOT silently corrupt previously stored values. |

### R5 — Security & Performance

| # | Acceptance Criterion |
|---|----------------------|
| 5.1 | Calculation endpoints SHALL require a valid JWT and enforce RBAC. |
| 5.2 | The engine SHALL process batch recalculation for 500+ projects without blocking the API request thread (async/background task). |

---

## 3. Design

### Architecture

```
Data Entry Module
    │  (data approved event)
    ▼
CalculationEngine
  resolve_formula(kpi)   →   FormulaRegistry
  execute(inputs)        →   RatioCalculator | WeightedCalculator | RollingCalculator
    │
MetricValueRepository
  insert_version(project_id, kpi_id, period_id, value, computed_at)
    │
PostgreSQL  metric_values (time-series table)
```

### Data Models

**`metric_values`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | → projects.id |
| kpi_id | UUID FK | → kpi_library.id |
| period_id | UUID FK | → governance_periods.id |
| raw_value | NUMERIC | Computed result |
| formula_type | ENUM | {ratio, weighted, rolling_average} |
| version | INTEGER | Increments on recalculation |
| computed_at | TIMESTAMPTZ | DEFAULT NOW() |
| is_latest | BOOLEAN | True for the current version |
| computation_error | TEXT | NULLABLE — error message if computation failed |

Index: `(project_id, kpi_id, period_id, is_latest)` for fast latest-value lookups.

### Formula Registry

```python
class FormulaRegistry:
    FORMULAS = {
        "productivity":   lambda d: d["size"] / d["effort"],
        "defect_density": lambda d: d["defects"] / d["size"],
        "dre":            lambda d: d["defects_removed"] / d["total_defects"],
        "schedule_adherence": lambda d: d["planned_date"] / d["actual_date"],
        # weighted:
        "weighted_defects": lambda d: (
            d["critical"] * 3 + d["major"] * 2 + d["minor"] * 1
        ),
        # rolling average: handled by RollingCalculator
    }

class CalculationEngine:
    def compute(project_id, kpi_id, period_id, raw_inputs):
        # 1. Resolve formula from KPI definition
        # 2. Guard: check for zero divisor
        # 3. Execute calculation
        # 4. Persist metric_value version
        # 5. Update is_latest flag

    def recalculate_all(project_id, kpi_id):
        # Iterate all periods with approved data; recompute; insert new versions
```

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | For any non-zero input, formula output = expected mathematical result | Property-based |
| P2 | Zero divisor never causes exception; always produces null + error log | Property-based |
| P3 | After N recalculations, `metric_values` contains N+1 version rows for the same (project, kpi, period) | Property-based |
| P4 | Rolling average over window W always uses exactly the W most recent periods | Property-based |
| P5 | `is_latest = TRUE` holds for exactly one row per (project_id, kpi_id, period_id) | DB constraint + property test |

---

## 4. Implementation Tasks

- [ ] 1. Database Schema
  - [ ] 1.1 Create `metric_values` table with all columns, ENUMs, and version tracking
  - [ ] 1.2 Add composite index on `(project_id, kpi_id, period_id, is_latest)`
  - [ ] 1.3 Add partial unique constraint: only one `is_latest = TRUE` per `(project_id, kpi_id, period_id)`

- [ ] 2. Formula Engine
  - [ ] 2.1 Implement `FormulaRegistry` with all standard formula lambdas
  - [ ] 2.2 Implement `RatioCalculator` with zero-divisor guard (returns null + logs error)
  - [ ] 2.3 Implement `WeightedCalculator` with configurable severity weights
  - [ ] 2.4 Implement `RollingCalculator` with configurable window (default 3); null on insufficient periods
  - [ ] 2.5 Unit tests: each formula type with valid inputs and edge cases (zero divisor, insufficient data)
  - [ ] 2.6 Property test: formula output equals expected result for any valid non-zero input (P1)
  - [ ] 2.7 Property test: zero divisor always returns null and logs error, never throws (P2)

- [ ] 3. Calculation Engine Service
  - [ ] 3.1 Implement `CalculationEngine.compute()`: resolve formula, guard, execute, persist version, update is_latest
  - [ ] 3.2 Implement `CalculationEngine.recalculate_all()`: iterate periods, recompute, insert versions
  - [ ] 3.3 Implement background task trigger on data approval event
  - [ ] 3.4 Implement background task trigger on threshold update event
  - [ ] 3.5 Unit tests: compute() — valid, zero divisor, missing inputs
  - [ ] 3.6 Property test: version count after N recalculations = N+1 (P3)
  - [ ] 3.7 Property test: rolling average uses exactly W most recent periods (P4)
  - [ ] 3.8 Property test: is_latest = TRUE for exactly one row per (project, kpi, period) (P5)

- [ ] 4. Metric Value Repository
  - [ ] 4.1 Implement `MetricValueRepository.insert_version()`: write new version, set is_latest, unset previous
  - [ ] 4.2 Implement `MetricValueRepository.get_latest(project_id, kpi_id, period_id)`
  - [ ] 4.3 Implement `MetricValueRepository.get_time_series(project_id, kpi_id)`: all latest values ordered by period
  - [ ] 4.4 Unit tests for all repository methods

- [ ] 5. API Layer
  - [ ] 5.1 GET `/api/v1/projects/{id}/kpis/{kpi_id}/metrics` — time-series values for a KPI
  - [ ] 5.2 POST `/api/v1/projects/{id}/kpis/{kpi_id}/recalculate` — manual recalculation trigger (Admin)
  - [ ] 5.3 JWT auth and RBAC on all endpoints
  - [ ] 5.4 Integration tests: time-series retrieval, recalculation trigger, error states

- [ ] 6. Performance
  - [ ] 6.1 Verify recalculation for 50 KPIs × 24 periods completes within 5 seconds
  - [ ] 6.2 Implement async background task runner for batch recalculations (500+ projects)
  - [ ] 6.3 Load test: concurrent recalculation requests do not corrupt is_latest flags
