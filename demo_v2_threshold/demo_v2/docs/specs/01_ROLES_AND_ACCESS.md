# Spec 01 — Roles and Access Control

---

## Role Hierarchy

```
PLATFORM_ADMIN
    └── Creates BUs, accounts, users, manages system config

CEO / DELIVERY_EXCELLENCE
    └── Read-only across all BUs and projects (full portfolio view)

DELIVERY_HEAD
    └── Monitors projects in their assigned BU

DELIVERY_MANAGER
    └── Reviews KPI data for their assigned accounts

PM (Project Manager)
    └── Creates and manages their own projects, enters KPI data
```

---

## Role Definitions

### PLATFORM_ADMIN
- Creates and manages Business Units
- Creates and manages user accounts for all roles
- Assigns Delivery Head to each BU
- Assigns Delivery Manager to each Account
- Views full governance overview (all projects, all BUs)
- Manages system configuration (health thresholds, notification rules)

### CEO
- Read-only view across all projects and BUs
- Sees Portfolio Dashboard with all projects, RAG status, metrics
- Cannot create or modify any data

### DELIVERY_EXCELLENCE
- Manages the QPM metric catalog (add, edit, activate/deactivate metrics)
- Reviews and approves/rejects PM custom metric requests
- Sees Portfolio Dashboard with all projects (same view as CEO)
- Cannot modify project data or KPI measurements

### DELIVERY_HEAD
- Sees only projects in their assigned BU (via `bu_head_user_id` on BusinessUnit)
- Monitors project health and submission trends
- Can view KPI plans and measurements for their BU projects
- Cannot modify project data or KPI measurements

### DELIVERY_MANAGER
- Assigned to one or more Accounts (via `delivery_manager_user_id` on Account)
- Sees only projects belonging to their assigned accounts
- Reviews KPI data per project
- Adds commentary and action items via DM Review
- Cannot modify KPI measurements — read-only on metric data

### PM (Project Manager)
- Assigned to exactly one Business Unit (via `pm_user_id` on BusinessUnit)
- Sees only accounts in their assigned BU
- Creates projects under those accounts
- Sets up KPI Plan for each project
- Enters parameter values (measures) for all metrics
- Views KPI Summary and trend charts for their projects

---

## Data Scoping Rules

| Role | Projects visible | Accounts visible |
|---|---|---|
| PLATFORM_ADMIN | All | All |
| CEO | All | All |
| DELIVERY_EXCELLENCE | All | All |
| DELIVERY_HEAD | Projects in their BU | Accounts in their BU |
| DELIVERY_MANAGER | Projects in their assigned accounts | Their assigned accounts |
| PM | Only projects where `project_manager_id = user.id` | Only accounts in their assigned BU |

---

## Authentication

- JWT token-based authentication
- Token stored in `localStorage` under key `deliverypulse_access_token`
- Token expiry: 60 minutes
- Login endpoint: `POST /api/v1/auth/login`
- Current user endpoint: `GET /api/v1/auth/me`
- On role mismatch: redirect to `/unauthorized`
- On expired/missing token: redirect to `/login`

---

## Role-to-Route Mapping

| Role | Home Path | Key Routes |
|---|---|---|
| PLATFORM_ADMIN | `/platform` | Dashboard, Business Units, Reports, Settings |
| CEO | `/ceo` | Dashboard (Portfolio), Business Units, Projects |
| DELIVERY_EXCELLENCE | `/delivery-excellence` | Dashboard (Portfolio), Metric Catalog |
| DELIVERY_HEAD | `/delivery-head` | Dashboard, My BU, Projects, Compliance |
| DELIVERY_MANAGER | `/delivery-manager` | Dashboard, Action Items |
| PM | `/pm` | Dashboard, My Projects, Summary |
