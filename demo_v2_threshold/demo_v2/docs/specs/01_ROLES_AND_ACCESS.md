# Spec 01 — Roles and Access Control

**Version:** 2.1  
**Last Updated:** July 2026

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
    └── Reviews KPI data for their assigned accounts, creates action items

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
- Assigns PM to each BU (via `pm_user_id` on BusinessUnit)
- Views full governance overview (all projects, all BUs) via Portfolio Dashboard
- Manages system configuration (health thresholds, notification rules)

### CEO
- Read-only view across all projects and BUs
- Sees Portfolio Dashboard with stat cards, BU health chart, RAG donut, filter bar, and project table
- Can click any stat card to see a filtered project list modal → navigate to project KPI summary
- Cannot create or modify any data

### DELIVERY_EXCELLENCE
- Manages the QPM metric catalog (add, edit, activate/deactivate metrics)
- Reviews and approves/rejects PM custom metric requests
- Sees Portfolio Dashboard (identical to CEO and Platform Admin view)
- Can click any stat card to see a filtered project list modal → navigate to project KPI summary
- Cannot modify project data or KPI measurements

### DELIVERY_HEAD
- Sees only projects in their assigned BU (via `delivery_head_user_id` on BusinessUnit)
- Monitors project health with stat cards (Total, Needs Attention, Green Health, At Risk)
- Can click stat cards to see filtered project modals → navigate to project summary
- Bar chart and review donut on dashboard
- Cannot modify project data or KPI measurements

### DELIVERY_MANAGER
- Assigned to one or more Accounts (via `delivery_manager_user_id` on Account)
- Sees only projects belonging to their assigned accounts
- Dashboard has stat cards (Total, Needs Review, Green Health, At Risk) — all clickable
- Clicking a stat card shows a filtered project modal with "Review KPIs" button per project
- Reviews KPI data per project — adds commentary via DM Review page
- Creates and manages Action Items on a dedicated Actions page (separate from review)
- Action items trigger PM notifications automatically
- Cannot modify KPI measurements — read-only on metric data

### PM (Project Manager)
- Assigned to exactly one Business Unit (via `pm_user_id` on BusinessUnit)
- Sees only accounts in their assigned BU when creating projects
- Can create projects from both the My Projects page and the Dashboard
- Dashboard has stat cards (Total, Green Health, Needs Attention, Awaiting Score) — all clickable
- Clicking a stat card shows a filtered project modal with "Summary" and "Data Entry" buttons
- Sets up KPI Plan for each project
- Enters parameter values (measures) for all metrics
- Views KPI Summary and trend charts for their projects
- Receives in-app notifications when DM creates action items on their projects

---

## Data Scoping Rules

| Role | Projects visible | Accounts visible | Can modify data |
|---|---|---|---|
| PLATFORM_ADMIN | All | All | Yes (org setup only) |
| CEO | All | All | No |
| DELIVERY_EXCELLENCE | All | All | Catalog only |
| DELIVERY_HEAD | Projects in their BU | Accounts in their BU | No |
| DELIVERY_MANAGER | Projects in their assigned accounts | Their assigned accounts | Action Items only |
| PM | Only projects where `project_manager_id = user.id` | Only accounts in their assigned BU | Full KPI data entry |

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
| PLATFORM_ADMIN | `/platform` | Dashboard (Portfolio), Business Units, Reports, Settings |
| CEO | `/ceo` | Dashboard (Portfolio), Business Units, Projects, Reports |
| DELIVERY_EXCELLENCE | `/delivery-excellence` | Dashboard (Portfolio), Metric Catalog |
| DELIVERY_HEAD | `/delivery-head` | Dashboard, Projects, Project Summary |
| DELIVERY_MANAGER | `/delivery-manager` | Dashboard, Project Review, Action Items |
| PM | `/pm` | Dashboard, My Projects, KPI Summary, Actions |

---

## Demo User Accounts

All accounts use password `Demo@12345` except Platform Admin (`Admin@123`).

**Email naming pattern:** `role.context@deliverypulse.ai` — reading the email tells you exactly which BU or account you're logging into.

### Global Roles
| Display Name | Email | Role |
|---|---|---|
| Platform Admin | admin@deliverypulse.ai | PLATFORM_ADMIN |
| CEO | ceo@deliverypulse.ai | CEO |
| Delivery Excellence | de@deliverypulse.ai | DELIVERY_EXCELLENCE |

### Delivery Heads  (`dh.<bu>@deliverypulse.ai`)
| Display Name | Email | Business Unit |
|---|---|---|
| DH - Banking & Financial Services | dh.bfsi@deliverypulse.ai | Banking & Financial Services |
| DH - Cloud Infrastructure | dh.cloud@deliverypulse.ai | Cloud Infrastructure |
| DH - Digital Services | dh.digital@deliverypulse.ai | Digital Services |

### Project Managers  (`pm.<bu>@deliverypulse.ai`)
| Display Name | Email | Business Unit |
|---|---|---|
| PM - Banking & Financial Services | pm.bfsi@deliverypulse.ai | Banking & Financial Services |
| PM - Cloud Infrastructure | pm.cloud@deliverypulse.ai | Cloud Infrastructure |
| PM - Digital Services | pm.digital@deliverypulse.ai | Digital Services |

### Delivery Managers  (`dm.<account>@deliverypulse.ai`)
| Display Name | Email | Assigned Account |
|---|---|---|
| DM - Acme Corp | dm.acme@deliverypulse.ai | Acme Corp |
| DM - Tech Nova | dm.technova@deliverypulse.ai | Tech Nova |
| DM - Globex | dm.globex@deliverypulse.ai | Globex |
| DM - Nexus Cloud | dm.nexus@deliverypulse.ai | Nexus Cloud |
| DM - Apex Bank | dm.apex@deliverypulse.ai | Apex Bank |
| DM - Sterling Finance | dm.sterling@deliverypulse.ai | Sterling Finance |

---

## Shared Dashboard Component (Portfolio)

Platform Admin, CEO, and Delivery Excellence all use the **same** `PortfolioDashboardPage` component routed at their respective home paths. Navigation from the portfolio project list to the KPI summary uses a role-aware base path:

| Role | Base Path | Project Summary Route |
|---|---|---|
| PLATFORM_ADMIN | `/platform` | `/platform/projects/:id/summary` |
| CEO | `/ceo` | `/ceo/projects/:id/summary` |
| DELIVERY_EXCELLENCE | `/delivery-excellence` | `/delivery-excellence/projects/:id/summary` |

The `ProjectSummaryReadOnlyPage` is a shared read-only component rendered at all three paths.
