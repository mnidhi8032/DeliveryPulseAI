# Spec 10 — API Endpoints

Base URL: `/api/v1`  
Authentication: Bearer JWT token (all endpoints except login)

---

## Auth

| Method | Path | Description | Roles |
|---|---|---|---|
| POST | `/auth/login` | Login with email + password, returns JWT + user | Public |
| GET | `/auth/me` | Get current authenticated user | All |

---

## Projects

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/projects` | List projects (scoped by role) | All |
| POST | `/projects/create-with-plan` | Create project + KPI plan + auto-add mandatory metrics | PM |
| GET | `/projects/{id}` | Get single project | All |
| PATCH | `/projects/{id}` | Update project | PM/Admin |
| GET | `/projects/{id}/health-history` | RAG history over time | All |
| GET | `/projects/{id}/submission-timeline` | Submission events | All |

---

## Business Units

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/business-units` | List BUs | All |
| POST | `/business-units` | Create BU | Platform Admin |
| PATCH | `/business-units/{id}` | Update BU (name, head, PM assignment) | Platform Admin |

---

## Accounts

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/accounts` | List accounts (scoped by role) | All |
| POST | `/accounts` | Create account | Platform Admin |
| PATCH | `/accounts/{id}` | Update account (name, DM assignment) | Platform Admin |

---

## QPM — KPI Plan

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/qpm/plans/by-project/{projectId}` | Get or create KPI plan | All |
| PATCH | `/qpm/plans/{planId}/config` | Update engagement model | PM |
| POST | `/qpm/plans/{planId}/metrics` | Add metric to plan | PM |
| PATCH | `/qpm/plan-metrics/{metricId}` | Update plan metric thresholds | PM |
| DELETE | `/qpm/plan-metrics/{metricId}` | Remove metric (non-mandatory) | PM |
| GET | `/qpm/plans/{planId}/tracker` | Get KPI tracker rows | All |
| GET | `/qpm/plans/{planId}/summary` | Get KPI summary with history | All |
| GET | `/qpm/plan-metrics/{metricId}/trend` | Get single metric trend history | All |

---

## QPM — Catalog

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/qpm/catalog` | List active catalog metrics (filterable) | All |
| GET | `/qpm/catalog/all` | List all catalog metrics including inactive | DE / Admin |
| POST | `/qpm/catalog` | Create catalog metric | DE / Admin |
| PATCH | `/qpm/catalog/{id}` | Update catalog metric | DE / Admin |
| GET | `/qpm/catalog/measures` | Get required input measures for a metric | All |

---

## QPM — Measure Entry

| Method | Path | Description | Roles |
|---|---|---|---|
| POST | `/qpm/measure-entries` | Add raw measure entry | PM |
| GET | `/qpm/measure-entries` | List entries for a plan metric | PM |
| POST | `/qpm/compute/{planMetricId}` | Compute KPI from measure entries | PM |
| PATCH | `/qpm/measurements/{id}` | Update measurement analysis fields | All |

---

## Period Measures (Unified Entry)

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/period-measures/projects/{id}` | Get all parameters + thresholds + history | PM |
| POST | `/period-measures/projects/{id}/save` | Save parameters + compute all metrics | PM |

---

## DM Reviews

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/dm-reviews/project-statuses` | Review status for all DM projects | DM |
| GET | `/dm-reviews/project/{projectId}` | List reviews for a project | DM / DH / Admin / CEO / DE |
| POST | `/dm-reviews` | Submit new DM review | DM |
| PATCH | `/dm-reviews/{reviewId}` | Update existing DM review | DM |

---

## Metric Approval Requests

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/metric-approvals` | List approval requests | PM / DE |
| POST | `/metric-approvals` | Submit custom metric request | PM |
| POST | `/metric-approvals/{id}/decide` | Approve or reject request | DE |

---

## Platform / Governance

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/platform/overview` | Org-wide counts + RAG percentages | Admin / DE |
| GET | `/platform/risk-summary` | Per-BU risk rows | Admin / DE |
| GET | `/platform/approval-latency` | Approval latency stats | Admin / DE |
| GET | `/platform/template-adoption` | Excel vs manual submission stats | Admin / DE |
| GET | `/platform/business-units/{buId}` | BU drill-down analysis | Admin / DE |

---

## Users (Platform Admin)

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/platform/users` | List all users | Platform Admin |
| POST | `/platform/users` | Create user account | Platform Admin |
| PATCH | `/platform/users/{id}` | Update user | Platform Admin |
| DELETE | `/platform/users/{id}` | Delete user | Platform Admin |

---

## Notifications

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/notifications` | List notifications for current user | All |
| GET | `/notifications/unread-count` | Unread count (polled every 30s) | All |
| POST | `/notifications/{id}/read` | Mark as read | All |

---

## Response Format

All endpoints return JSON. Error responses follow:
```json
{
  "detail": "Human-readable error message"
}
```

HTTP status codes used: 200, 201, 204, 400, 401, 403, 404, 422, 500.
