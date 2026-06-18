# QPM KPI Tracker / Dashboard Module — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The KPI Tracker / Dashboard Module provides users with a real-time view of KPI performance across periods. It supports drill-down from Project → Release → Sprint, filtering by period / category / RAG status, and a rich set of visualisations including trend charts, RAG summary cards, comparison bar charts, and Agile-specific burn-down and cumulative flow charts.

---

## 2. Requirements

### R1 — KPI Tracker View

**As a** Project Manager, **I want to** see a KPI tracker per period, **so that** I can monitor project health at a glance.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | The platform SHALL display per KPI per period: KPI name, actual value, target value, and RAG status. |
| 1.2 | The tracker SHALL show a trend sparkline for each KPI across the most recent periods (default: last 6). |
| 1.3 | RAG status indicators SHALL be visible without requiring drill-down. |
| 1.4 | The tracker SHALL load within 3 seconds for a project with 100+ KPIs and 24 periods. |

### R2 — Drill-Down Navigation

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | The dashboard SHALL support drill-down from Project level → Release level → Sprint level. |
| 2.2 | WHEN a user selects a Release, the tracker SHALL filter to show KPI values for Sprints within that Release. |
| 2.3 | WHEN a user selects a Sprint, the tracker SHALL show KPI values for that specific Sprint period. |

### R3 — Filtering

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | The platform SHALL support filtering the tracker by: time period, KPI category, project, and RAG status. |
| 3.2 | Filters SHALL be combinable (AND logic). |
| 3.3 | WHEN filters are applied, the tracker SHALL update within 2 seconds. |

### R4 — Visualisations

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | The dashboard SHALL include trend line charts showing Actual vs Target over time for each KPI. |
| 4.2 | The dashboard SHALL include KPI summary cards with RAG colour indicators and current values. |
| 4.3 | The dashboard SHALL include bar charts for KPI value comparison across multiple projects. |
| 4.4 | For Agile projects, the dashboard SHALL include Burn-down and Cumulative Flow charts. |
| 4.5 | All charts SHALL be accessible (WCAG 2.1 AA colour contrast; chart data available in tabular fallback). |

### R5 — Security & Performance

| # | Acceptance Criterion |
|---|----------------------|
| 5.1 | Dashboard endpoints SHALL require a valid JWT and enforce RBAC (users see only their authorised projects). |
| 5.2 | Dashboard SHALL be mobile-responsive. |
| 5.3 | All dashboard data SHALL be served via server-side pagination / aggregation; no full dataset downloads to client. |

---

## 3. Design

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/projects/{id}/dashboard/summary` | `dashboard:read` | Project RAG + KPI summary cards |
| GET | `/api/v1/projects/{id}/dashboard/tracker` | `dashboard:read` | Full KPI tracker with sparklines |
| GET | `/api/v1/projects/{id}/dashboard/trends` | `dashboard:read` | Trend data for Actual vs Target charts |
| GET | `/api/v1/projects/{id}/dashboard/burndown` | `dashboard:read` | Burn-down chart data (Agile only) |
| GET | `/api/v1/projects/{id}/dashboard/cfd` | `dashboard:read` | Cumulative Flow Diagram data (Agile only) |
| GET | `/api/v1/dashboard/comparison` | `dashboard:read` | Cross-project KPI bar chart data |

**Common query parameters:** `period_id`, `level` (project/release/sprint), `kpi_category`, `rag_status`, `page`, `page_size`

### Frontend Components

| Component | Description |
|-----------|-------------|
| `DashboardSummary` | Project-level RAG card + top-level KPI summary cards |
| `KPITrackerTable` | Tabular KPI tracker with sparklines and RAG badges |
| `TrendLineChart` | Recharts/Chart.js line chart: Actual vs Target over time |
| `RAGSummaryCard` | KPI card with colour indicator and current/target values |
| `ProjectComparisonBar` | Bar chart comparing a KPI metric across projects |
| `BurndownChart` | Sprint burn-down chart (Agile projects only) |
| `CumulativeFlowChart` | CFD chart (Agile projects only) |
| `DashboardFilterBar` | Period / Category / Project / RAG status filters |
| `DrilldownNavigator` | Project → Release → Sprint breadcrumb navigation |

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | Dashboard summary RAG always matches the stored project-level RAG for the same period | Property-based |
| P2 | Tracker table shows exactly the KPIs matching the applied filters | Property-based |
| P3 | Trend chart data for N periods contains exactly N data points per KPI | Property-based |
| P4 | Cross-project comparison only includes projects the requesting user is authorised to view | Property-based |

---

## 4. Implementation Tasks

- [ ] 1. Backend — Dashboard API
  - [ ] 1.1 Implement `GET /api/v1/projects/{id}/dashboard/summary`: aggregate RAG + latest KPI values
  - [ ] 1.2 Implement `GET /api/v1/projects/{id}/dashboard/tracker`: paginated KPI list with sparkline data
  - [ ] 1.3 Implement `GET /api/v1/projects/{id}/dashboard/trends`: time-series actual vs target for selected KPIs
  - [ ] 1.4 Implement drill-down filtering by project / release / sprint level
  - [ ] 1.5 Implement combined filter logic (period, category, rag_status)
  - [ ] 1.6 Implement `GET /api/v1/projects/{id}/dashboard/burndown` (guard: Agile projects only)
  - [ ] 1.7 Implement `GET /api/v1/projects/{id}/dashboard/cfd` (guard: Agile projects only)
  - [ ] 1.8 Implement `GET /api/v1/dashboard/comparison` with RBAC project scope
  - [ ] 1.9 JWT auth and RBAC on all endpoints
  - [ ] 1.10 Integration tests: summary, tracker, trends, drill-down, filters, comparison

- [ ] 2. Performance Optimisation
  - [ ] 2.1 Add DB indexes on `rag_statuses(project_id, period_id)` and `metric_values(project_id, kpi_id, is_latest)`
  - [ ] 2.2 Implement server-side aggregation for summary and comparison endpoints (no full dataset to client)
  - [ ] 2.3 Load test tracker endpoint with 100+ KPIs × 24 periods; confirm ≤3s response
  - [ ] 2.4 Load test filter endpoint; confirm ≤2s response

- [ ] 3. Frontend — Core Dashboard
  - [ ] 3.1 `DashboardSummary` component: project RAG card + top KPI summary cards
  - [ ] 3.2 `KPITrackerTable` component: paginated table with sparkline per KPI and RAG badge
  - [ ] 3.3 `DashboardFilterBar` component: period, category, project, RAG filters with combined AND logic
  - [ ] 3.4 `DrilldownNavigator` component: Project → Release → Sprint breadcrumb
  - [ ] 3.5 Wire all components to dashboard API endpoints

- [ ] 4. Frontend — Charts
  - [ ] 4.1 `TrendLineChart`: Actual vs Target line chart using Recharts or Chart.js
  - [ ] 4.2 `RAGSummaryCard`: coloured card with current value, target, and RAG indicator
  - [ ] 4.3 `ProjectComparisonBar`: bar chart for cross-project KPI comparison
  - [ ] 4.4 `BurndownChart`: sprint burn-down (Agile projects only)
  - [ ] 4.5 `CumulativeFlowChart`: CFD chart (Agile projects only)
  - [ ] 4.6 All charts: WCAG 2.1 AA colour contrast + tabular data fallback for accessibility

- [ ] 5. Component Tests
  - [ ] 5.1 Property test: tracker table shows exactly filters-matched KPIs (P2)
  - [ ] 5.2 Property test: trend chart has exactly N points for N periods (P3)
  - [ ] 5.3 Property test: comparison chart only includes RBAC-authorised projects (P4)
  - [ ] 5.4 Component tests: RAG card colours, filter interaction, drill-down navigation, mobile layout

- [ ] 6. Accessibility & Mobile
  - [ ] 6.1 Verify RAG colour indicators meet WCAG 2.1 AA contrast ratios
  - [ ] 6.2 Add tabular fallback for each chart component
  - [ ] 6.3 Verify dashboard is mobile-responsive (CSS Grid/Flexbox breakpoints)
