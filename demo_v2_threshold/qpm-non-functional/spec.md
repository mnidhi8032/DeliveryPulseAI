# QPM Non-Functional Requirements — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

This spec captures the cross-cutting non-functional requirements that apply to the entire QPM Platform: performance, scalability, security, usability, data integrity, and availability. Each requirement has defined acceptance criteria, design decisions, and implementation tasks to validate compliance.

---

## 2. Requirements

### R1 — Performance

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | The dashboard SHALL load within 3 seconds for a portfolio of 100 or more projects. |
| 1.2 | Single-entity API responses (project, KPI, submission) SHALL respond within 1 second. |
| 1.3 | List/paginated endpoints SHALL respond within 2 seconds for up to 500 items with active filters. |
| 1.4 | Metric recalculation for a single project with 50 KPIs × 24 periods SHALL complete within 5 seconds. |

### R2 — Scalability

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | The platform SHALL support 1000+ concurrent authenticated users without exceeding performance thresholds. |
| 2.2 | The platform SHALL support 500+ active projects concurrently with independent data and KPI configurations. |
| 2.3 | Database connection pooling SHALL prevent connection exhaustion under peak load. |
| 2.4 | Background tasks (recalculation, notifications) SHALL run asynchronously without blocking API threads. |

### R3 — Security

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | All endpoints SHALL require JWT authentication; unauthenticated requests return HTTP 401. |
| 3.2 | RBAC SHALL be enforced on every protected operation; unauthorised requests return HTTP 403. |
| 3.3 | All sensitive data SHALL be stored at rest with encryption. |
| 3.4 | All DB connections SHALL use TLS in transit. |
| 3.5 | All API inputs SHALL be validated and sanitised via Pydantic schemas before processing. |
| 3.6 | The platform SHALL maintain a full, immutable audit trail for all mutations. |

### R4 — Usability

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | RAG status indicators SHALL be visible on the dashboard without requiring drill-down. |
| 4.2 | The platform SHALL be mobile-responsive (CSS Grid/Flexbox; tested at 375px, 768px, 1280px viewports). |
| 4.3 | All charts and RAG indicators SHALL meet WCAG 2.1 AA colour contrast requirements. |
| 4.4 | Chart data SHALL be available in a tabular fallback for screen readers. |

### R5 — Data Integrity

| # | Acceptance Criterion |
|---|----------------------|
| 5.1 | No metric value SHALL be accepted without a defined unit and measurement period. |
| 5.2 | No KPI SHALL be activated without Target, Frequency, Data Source, and Direction defined. |
| 5.3 | All multi-step operations (data entry + audit write, submission approval + period lock + recalculation trigger) SHALL be atomic — either fully committed or fully rolled back. |
| 5.4 | Foreign key constraints SHALL be enforced at the database level for all entity relationships. |

### R6 — Availability

| # | Acceptance Criterion |
|---|----------------------|
| 6.1 | The platform SHALL maintain a 99.5% uptime SLA for all API endpoints. |
| 6.2 | The platform SHALL respond with HTTP 503 (not unhandled exceptions) when load exceeds capacity. |
| 6.3 | A health-check endpoint (`/healthz`) SHALL be available for load-balancer probing. |
| 6.4 | Database read replicas SHALL be used for read-heavy dashboard queries to avoid write-path contention. |

---

## 3. Design

### Architecture Decisions

| Requirement | Design Decision |
|-------------|----------------|
| 3-second dashboard load | Server-side pagination + composite DB indexes; no full-dataset client downloads |
| 1000+ concurrent users | FastAPI async handlers; PgBouncer connection pooling; no blocking I/O in request path |
| 99.5% uptime | Load balancer + `/healthz` endpoint; DB read replicas for dashboard queries |
| Mobile-responsive | React CSS Grid/Flexbox; breakpoints at 375px, 768px, 1280px |
| WCAG 2.1 AA | Recharts with accessible colour palettes; tabular data fallbacks for all charts |
| Data integrity | DB-level FK constraints + CHECK constraints + Pydantic validation + transactional audit writes |
| Async background work | Celery or ARQ task queue for recalculation and notification dispatch |
| Security | Pydantic input validation; JWT with configurable expiry; RBAC middleware; PostgreSQL at-rest encryption |

### Key Infrastructure Components

```
Load Balancer
    │
FastAPI App Servers (multiple instances, async)
    │        │
PgBouncer    Task Queue (Celery/ARQ)
    │              │
PostgreSQL    Worker Processes
 (primary)        (recalc, notifications)
    │
PostgreSQL Read Replica
 (dashboard queries)
```

---

## 4. Implementation Tasks

- [ ] 1. Performance Baseline & Indexes
  - [ ] 1.1 Add composite indexes on all high-frequency query paths (projects, rag_statuses, metric_values, audit_events)
  - [ ] 1.2 Implement server-side pagination on all list endpoints (max 100 rows/page)
  - [ ] 1.3 Configure dashboard API endpoints to use read replica connection string
  - [ ] 1.4 Load test dashboard: 100+ projects, assert ≤3s response at 1000 concurrent users

- [ ] 2. Scalability Infrastructure
  - [ ] 2.1 Configure PgBouncer connection pooling (pool size tuned for 1000 concurrent users)
  - [ ] 2.2 Implement Celery or ARQ task queue for all background jobs (recalculation, notifications)
  - [ ] 2.3 Load test: 1000 concurrent users, 500 concurrent projects — assert no connection exhaustion
  - [ ] 2.4 Verify all background tasks are non-blocking and do not starve API threads

- [ ] 3. Security Hardening
  - [ ] 3.1 Audit all endpoints — confirm 401 on missing/expired JWT
  - [ ] 3.2 Audit all endpoints — confirm 403 on insufficient RBAC
  - [ ] 3.3 Verify PostgreSQL at-rest encryption is enabled on all QPM tables
  - [ ] 3.4 Verify all DB connections use TLS
  - [ ] 3.5 Run Pydantic fuzz test across all API endpoints — confirm no unhandled exceptions escape to HTTP layer
  - [ ] 3.6 Confirm audit log writes are transactionally atomic with all mutations

- [ ] 4. Availability
  - [ ] 4.1 Implement `/healthz` endpoint returning `{status: "ok", db: "ok"}`
  - [ ] 4.2 Implement HTTP 503 graceful degradation handler for overload scenarios
  - [ ] 4.3 Configure load balancer health-check probe against `/healthz`
  - [ ] 4.4 Set up DB read replica and route dashboard read queries to it

- [ ] 5. Usability & Accessibility
  - [ ] 5.1 Verify RAG indicators are visible on dashboard without drill-down at all breakpoints
  - [ ] 5.2 Run WCAG 2.1 AA colour contrast check on all RAG colours and chart palettes
  - [ ] 5.3 Add tabular data fallback for each chart component
  - [ ] 5.4 Test mobile layout at 375px, 768px, 1280px viewports

- [ ] 6. Data Integrity
  - [ ] 6.1 Verify FK constraints are enforced at DB level for all entity relationships
  - [ ] 6.2 Verify CHECK constraints for date ranges, score ranges (1–5), and enum values
  - [ ] 6.3 Integration test: confirm atomicity for data entry + audit write and approval + recalculation trigger
  - [ ] 6.4 Verify no metric value can be saved without unit and period_id
