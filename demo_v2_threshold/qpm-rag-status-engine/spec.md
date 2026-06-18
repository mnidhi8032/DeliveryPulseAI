# QPM RAG Status Engine — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The RAG Status Engine automatically computes Red / Amber / Green status for each KPI per measurement period. It applies directional rules (Higher is Better, Lower is Better, Within Range) against actual values and configured thresholds. RAG is computed and stored at the KPI level, dimension level, and overall project level, and the rules are configurable per KPI direction type.

---

## 2. Requirements

### R1 — RAG Computation Rules

**As a** Platform, **I want to** automatically derive RAG status for each KPI, **so that** project health is instantly visible without manual calculation.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | For a KPI with Direction = Higher_is_Better: Green if Actual ≥ Target; Amber if LSL ≤ Actual < Target; Red if Actual < LSL. |
| 1.2 | For a KPI with Direction = Lower_is_Better: Green if Actual ≤ Target; Amber if Target < Actual ≤ USL; Red if Actual > USL. |
| 1.3 | For a KPI with Direction = Within_Range: Green if LSL ≤ Actual ≤ USL and Actual meets Target; Amber if within LSL–USL but outside Target tolerance; Red if Actual < LSL or Actual > USL. |
| 1.4 | WHEN a metric value is computed by the Calculation Engine, the RAG Engine SHALL compute and persist the RAG status for that (project, KPI, period) immediately. |
| 1.5 | IF a metric value is null (computation error), the RAG status SHALL be recorded as Unknown rather than defaulting to a colour. |

### R2 — Multi-Level RAG Storage

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | RAG status SHALL be stored at the individual KPI level per period. |
| 2.2 | A dimension-level RAG SHALL be computed as the worst status across all KPIs in the same category for a period. |
| 2.3 | An overall project-level RAG SHALL be computed as the worst status across all KPI-level RAGs for a period. |
| 2.4 | WHEN any KPI-level RAG changes, the dimension and project-level RAGs SHALL be recomputed and updated. |

### R3 — Configurable RAG Rules

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | RAG boundary rules (Green/Amber/Red thresholds) SHALL be configurable per KPI direction type by a Platform Admin. |
| 3.2 | WHEN RAG rules are updated, the engine SHALL recompute RAG for all historical periods of affected KPIs. |
| 3.3 | WHEN rules are changed, the platform SHALL write an audit log entry. |

### R4 — Security & Performance

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | RAG status endpoints SHALL require a valid JWT and enforce RBAC. |
| 4.2 | RAG computation for a single project with 50 KPIs SHALL complete within 2 seconds. |
| 4.3 | Bulk recomputation for 500+ projects SHALL run as an async background task. |

---

## 3. Design

### Data Models

**`rag_statuses`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | → projects.id |
| kpi_id | UUID FK | → kpi_library.id NULLABLE (null = project/dimension level) |
| dimension | VARCHAR(100) | NULLABLE — KPI category for dimension-level RAG |
| level | ENUM | {kpi, dimension, project} |
| period_id | UUID FK | → governance_periods.id |
| status | ENUM | {green, amber, red, unknown} |
| actual_value | NUMERIC | NULLABLE |
| target_value | NUMERIC | NULLABLE |
| computed_at | TIMESTAMPTZ | DEFAULT NOW() |

Index: `(project_id, period_id, level)` for fast dashboard queries.

### RAG Engine Logic

```python
class RAGEngine:
    def compute_kpi_rag(kpi: ProjectKPI, actual: float) -> RAGStatus:
        if actual is None: return RAGStatus.UNKNOWN
        match kpi.direction:
            case HIGHER_IS_BETTER:
                if actual >= kpi.target: return GREEN
                elif actual >= kpi.lsl: return AMBER
                else: return RED
            case LOWER_IS_BETTER:
                if actual <= kpi.target: return GREEN
                elif actual <= kpi.usl: return AMBER
                else: return RED
            case WITHIN_RANGE:
                if actual < kpi.lsl or actual > kpi.usl: return RED
                elif actual == kpi.target: return GREEN
                else: return AMBER

    def compute_project_rag(kpi_rags: list[RAGStatus]) -> RAGStatus:
        # worst-case aggregation: RED > AMBER > GREEN > UNKNOWN
        if RED in kpi_rags: return RED
        if AMBER in kpi_rags: return AMBER
        return GREEN
```

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | For all valid (actual, target, lsl, usl, direction) inputs, RAG output matches the rule table exactly | Property-based |
| P2 | Null actual value always produces Unknown, never a colour | Property-based |
| P3 | Project-level RAG is always the worst KPI-level RAG for the same period | Property-based |
| P4 | Dimension-level RAG is always the worst KPI-level RAG within the same category | Property-based |
| P5 | RAG computation is pure (same inputs always produce the same output) | Property-based |

---

## 4. Implementation Tasks

- [ ] 1. Database Schema
  - [ ] 1.1 Create `rag_statuses` table with all columns, ENUMs, and indexes
  - [ ] 1.2 Add composite index on `(project_id, period_id, level)`

- [ ] 2. RAG Engine Core
  - [ ] 2.1 Implement `RAGEngine.compute_kpi_rag()` for all three direction types
  - [ ] 2.2 Implement null-actual → Unknown guard
  - [ ] 2.3 Implement `RAGEngine.compute_project_rag()` worst-case aggregation
  - [ ] 2.4 Implement `RAGEngine.compute_dimension_rag()` by KPI category
  - [ ] 2.5 Unit tests: all direction types × all boundary values (Green/Amber/Red transitions)
  - [ ] 2.6 Property test: RAG output matches rule table for all valid inputs (P1)
  - [ ] 2.7 Property test: null actual always → Unknown (P2)
  - [ ] 2.8 Property test: project RAG = worst KPI RAG (P3)
  - [ ] 2.9 Property test: dimension RAG = worst in category (P4)
  - [ ] 2.10 Property test: RAG computation is pure/deterministic (P5)

- [ ] 3. Service & Trigger Integration
  - [ ] 3.1 Implement `RAGService.compute_and_store()`: invoke engine, persist rag_status row, update dimension + project level
  - [ ] 3.2 Subscribe to metric value computed event from Calculation Engine
  - [ ] 3.3 Subscribe to threshold update event; trigger recomputation for affected KPI history
  - [ ] 3.4 Implement async background task for bulk recomputation across 500+ projects
  - [ ] 3.5 Integration tests: end-to-end metric → RAG pipeline

- [ ] 4. API Layer
  - [ ] 4.1 GET `/api/v1/projects/{id}/rag` — current project-level RAG
  - [ ] 4.2 GET `/api/v1/projects/{id}/rag/kpis` — per-KPI RAG for a period
  - [ ] 4.3 GET `/api/v1/projects/{id}/rag/dimensions` — dimension-level RAG summary
  - [ ] 4.4 PATCH `/api/v1/rag-rules/{direction}` — update RAG boundary rules (Admin)
  - [ ] 4.5 JWT auth and RBAC on all endpoints
  - [ ] 4.6 Integration tests: RAG retrieval, rule update triggering recomputation

- [ ] 5. Performance
  - [ ] 5.1 Verify RAG computation for 50 KPIs completes within 2 seconds
  - [ ] 5.2 Verify bulk recomputation runs asynchronously without blocking API
