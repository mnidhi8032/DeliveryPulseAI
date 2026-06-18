# DeliveryPulse AI — Project README

**Version:** 2.0 (V2 Governance Engine + QPM Module)  
**Stack:** FastAPI + PostgreSQL + React 19 + TailwindCSS  
**Last Updated:** June 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Getting Started](#4-getting-started)
5. [Running the Application](#5-running-the-application)
6. [Default Login Credentials](#6-default-login-credentials)
7. [Core Features](#7-core-features)
8. [QPM Module — Excel Replica](#8-qpm-module--excel-replica)
9. [Health Score Engine](#9-health-score-engine)
10. [UI Improvements & Navigation](#10-ui-improvements--navigation)
11. [Database Migrations](#11-database-migrations)
12. [Seed Scripts](#12-seed-scripts)
13. [API Reference](#13-api-reference)
14. [Project Structure](#14-project-structure)
15. [Changelog](#15-changelog)

---

## 1. Project Overview

DeliveryPulse AI is a project governance platform that allows organisations to:

- Submit and track weekly/monthly project health reports
- Automatically compute RAG (Red/Amber/Green/Critical) status from metric thresholds
- Manage org hierarchy: Business Units → Accounts → Projects
- Run a full QPM (Quarterly Project Metrics) plan — a digital replica of the QPM Plan Excel workbook
- Review, approve, and audit all governance submissions
- Project Managers can create and manage their own projects

---

## 2. Architecture

```
demo_v2/
├── backend/                FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── api/v1/         API routes (15 route modules)
│   │   ├── models/         SQLAlchemy ORM models
│   │   ├── schemas/        Pydantic request/response schemas
│   │   ├── services/       Business logic
│   │   ├── health_engine/  V2 governance RAG engine
│   │   └── core/           Constants, enums, settings
│   ├── alembic/            Database migrations (16 revisions)
│   └── scripts/            Seed and utility scripts
│
└── frontend/               React 19 + TypeScript + Vite + TailwindCSS
    └── src/
        ├── components/     Shared UI components (Sidebar, Header, RagBadge)
        ├── layouts/        Role-based layouts (PM, DH, Customer Admin, Platform)
        ├── pages/          Role-based page components
        ├── services/       API client functions
        ├── types/          TypeScript interfaces
        └── routes/         React Router configuration
```

---

## 3. User Roles & Permissions

| Role | Code | Can Create Projects | Responsibilities |
|---|---|---|---|
| Platform Admin | `PLATFORM_ADMIN` | No | System config, user management, governance periods, reports |
| Customer Admin | `CUSTOMER_ADMIN` | Yes | Org setup (BUs, Accounts, Projects), portfolio oversight |
| Delivery Head | `DELIVERY_HEAD` | Yes (own BU only) | Review/approve submissions, manage BU portfolio |
| Project Manager | `PM` | **Yes** | Create & manage own projects, submit metrics, QPM plan |

### PM Project Creation Rules
- PM selects any active account
- PM is **automatically assigned** as the Project Manager
- Delivery Head is **auto-derived** from the account's Business Unit
- PM can edit their own project (name, description, dates)

---

## 4. Getting Started

### Prerequisites

- Python 3.14
- Node.js 18+
- PostgreSQL 13 or 18 (both supported)

### Database Setup

```cmd
REM Create the database
"C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h 127.0.0.1 -U postgres deliverypulse_ai_v2

REM Run all migrations from backend/ directory
python -m alembic upgrade head
```

### Seed the Database (run in this order)

```cmd
cd backend

python scripts/seed_roles.py
python scripts/seed_admin.py
python scripts/seed_demo_structure.py
python scripts/seed_metric_definitions.py
python scripts/seed_v2_thresholds.py
python scripts/seed_submission_statuses.py
python scripts/seed_governance_periods.py
python scripts/seed_qpm_catalog.py
```

---

## 5. Running the Application

### Backend

```cmd
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```cmd
cd frontend
npm run dev
```

### Access

| Service | URL |
|---|---|
| Frontend App | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

---

## 6. Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Platform Admin | admin@deliverypulse.ai | Admin@123 |
| Customer Admin | customer.admin@deliverypulse.ai | Demo@12345 |
| Delivery Head (BU 1) | rajesh.dh@deliverypulse.ai | Demo@12345 |
| Delivery Head (BU 2) | priya.dh@deliverypulse.ai | Demo@12345 |
| Project Manager 1 | pm1@deliverypulse.ai | Demo@12345 |
| Project Manager 2 | pm2@deliverypulse.ai | Demo@12345 |

---

## 7. Core Features

### Submission Lifecycle

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → LOCKED
                                 ↘ REJECTED → REOPENED → DRAFT
```

- PM creates a draft, fills 13 metrics, submits
- Delivery Head reviews, approves or rejects with comments
- Approved submissions can be locked (immutable)
- DH can reopen approved submissions for PM correction
- Full audit trail for every action with timestamps

### Organisational Hierarchy

```
Business Unit  (owned by Delivery Head)
  └── Account  (Client organisation)
        └── Project  (owned by PM + DH)
              └── Submission  (per governance period)
                    └── Metric Values (13 metrics → health score)
```

### Governance Periods

Created by Platform Admin under **Settings → Governance Periods**.  
Types: WEEKLY, MONTHLY, QUARTERLY.  
PMs select a period when creating a new submission.  
Without an active period, PMs see a warning and cannot create submissions.

### Notifications (real-time bell)

| Trigger | Recipients |
|---|---|
| Project escalates to RED/CRITICAL | All Customer Admins |
| BU crosses >20% RED projects | All Platform Admins |
| Submission submitted | Delivery Head of the project |
| Submission approved | PM who created it |
| Submission rejected | PM who created it |
| Submission reopened | PM who created it |

### 13 Governance Metrics

| Dimension | Metrics |
|---|---|
| Schedule | Planned Progress %, Actual Progress %, Dependency Delay Count |
| Quality | Critical Defects, Test Pass Rate, Prod Incidents |
| Scope | Scope Change Requests, Requirement Stability % |
| Finance | Budget Used, Planned Budget, Billing Delay Days |
| People & Delivery | Resource Availability %, Team Attrition |

---

## 8. QPM Module — Excel Replica

The QPM module is a full digital replica of the QPM Plan Excel workbook (OM-DEV-TM-71_QPM_Plan.xlsm).

### Navigation

Login as PM → My Projects → [Project] → **KPI Plan (QPM)** button  
OR from the projects table → **KPI Plan** button on any row

### Sheet 1 — KPI Plan

Set engagement model header:
- Project Type, Delivery Process Model, Project Category, Work Size Unit

Browse and select from **83 standard metrics** across 11 categories.  
Click **★ Auto-add All Mandatory (M) Metrics** to add compulsory metrics in one click.  
Add tailored/custom metrics in the **Add Custom Metric** tab (for client mandates, formula changes, etc.).  
Finalize the plan when ready to lock metric selection.

### Sheet 2 — KPI Measures Data Entry

Select a metric from the left panel.  
The form dynamically shows the **exact component measures** required for that metric (from MetricToMeasureMapping).

**Examples:**
- `Effort Variance` → 3 inputs: Actual Effort, Remaining Effort, Planned Effort
- `Delivered Defect Density` → 2 inputs: Total Weighted Defects, Delivered Size
- `Customer Satisfaction Index` → 1 input: CSAT Score

The **KPI value is automatically computed** from the inputs using the correct formula.  
RAG status is assigned automatically based on the metric's intent and thresholds.

### Sheet 3 — KPI Tracker

Full table matching the Excel Sheet 3:

| Column | Description |
|---|---|
| Metric | KPI name |
| Frequency / Period | Reporting cycle |
| Actual Value | Computed KPI result |
| UOM | Unit of measure |
| Target / LSL / USL | Governance thresholds |
| Measure 1–4 | Component measure values |
| From / To Date | Measurement period |
| Submitted By / Date | Who submitted |
| RAG | Auto-computed colour status |
| Analysis / Comments | Root cause notes |
| Action Taken | Corrective actions |
| Responsibility | Accountable person |
| Action Status | Open / In-Progress / Closed |

Click **Edit** on any row to update analysis, actions, and status.

### Sheet 4 — KPI Summary Dashboard

- RAG donut chart (Green / Amber / Red / No Data)
- Per-category stacked bar charts
- Metric cards with latest value, RAG badge, trend arrow (↑ Improving / ↓ Declining / → Stable)
- Filters by category and RAG status

### Sheet 5 — Document Information

Project document metadata matching the Excel Doc Info sheet:
- Project Name, Project ID, Customer Name
- Document Title, Issue No, Template Version
- Project Manager, Issue Date
- Prepared By / Preparation Date
- Reviewed By / Review Date
- **Document Version History table** with Issue ID, dates, preparer, reviewer, description

### Metric Categories (11 total, 83 metrics)

| Category | Count | Type |
|---|---|---|
| Time & Speed | 23 | Schedule, velocity, lead time |
| Efficiency | 20 | Productivity, delivery rates, variance |
| Internal Quality | 14 | Defect density, review coverage, test pass |
| Scope | 9 | Change requests, commitment, test automation |
| Delivered Quality | 6 | Customer-facing defects, leakage |
| Financial | 3 | Gross margin, revenue per employee, cost |
| Non-functional-Maintainability | 2 | Technical debt, cyclomatic complexity |
| Non-functional-Performance | 2 | Response time, throughput |
| Non-functional-Security | 2 | OWASP compliance, access control |
| Stakeholder Perception | 1 | CSAT index |
| Non-functional-Usability | 1 | Usability score |

---

## 9. Health Score Engine

### V2 Governance-Based Engine

No numeric weighted scores — pure threshold comparison producing one of 4 statuses:

```
GREEN | AMBER | RED | CRITICAL
```

### RAG Logic Types (from QPM Excel RAG-Calculation-Logic sheet)

| Intent | GREEN | AMBER | RED |
|---|---|---|---|
| Higher the better | >= Target | > LSL & < Target | <= LSL |
| Lower the better | <= Target | > Target & < USL | >= USL |
| Nominal the best | == Target (±5%) | Inside LSL/USL, off-target | Outside LSL or USL |
| Within the Limits | Inside LSL & USL | — | Outside LSL or USL |

**Special pre-processing:**
- `actual_progress_percent` → computed as `actual − planned` (Schedule Variance), then evaluated as More Is Better
- `budget_used` → converted to utilization `%` = `(budget_used / planned_budget) × 100` before threshold comparison

### Dimension Decision Matrix

Applied to each of 5 dimensions:

```
ANY metric CRITICAL  → Dimension = CRITICAL
RED count >= 2       → Dimension = RED
RED count == 1       → Dimension = AMBER
AMBER count >= 1     → Dimension = AMBER
All GREEN            → Dimension = GREEN
```

### Project Health

Same matrix applied to the 5 dimension statuses → overall project governance status.

Sentinel numeric scores stored for DB backward-compatibility:

```
GREEN = 90.0  |  AMBER = 65.0  |  RED = 40.0  |  CRITICAL = 25.0
```

---

## 10. UI Improvements & Navigation

### Sidebar (role-aware)

All 4 roles have a unified sidebar with:
- Role-specific navigation items with SVG icons
- User avatar with initials + full name + email
- Single-click sign-out button

| Role | Nav Items |
|---|---|
| PM | Dashboard, My Projects, Submissions |
| Delivery Head | Dashboard, BU Projects, Submissions |
| Customer Admin | Dashboard, Business Units, Projects, Setup Workspace |
| Platform Admin | Dashboard, Business Units, Reports, Settings |

### PM Projects Page

- Shows all assigned projects with current RAG health badge
- **+ Create Project** button — PM creates projects directly (auto-assigned as PM)
- **KPI Plan** quick button per project row

### Platform Reports Page

Live data from backend:
- Summary stats (total projects, submissions, green %, at-risk %)
- BU Risk Summary table with escalation flags and risk % bars
- Approval Latency by BU (avg / min / max days)
- Template Adoption by BU (Excel vs manual %)

### Status Badges

All status codes have correct colour badges:
- Draft (slate), Submitted (blue), Under Review (amber), Approved (green), Rejected (rose), Reopened (violet), Locked (purple), On Hold (orange), Completed (teal), Closed (slate)

### RAG Badge

Supports all 4 statuses: GREEN, AMBER, RED, CRITICAL  
Optional `showDot` prop for inline dot indicator

---

## 11. Database Migrations

All migrations in `backend/alembic/versions/`.

```cmd
REM Apply all pending migrations
python -m alembic upgrade head

REM Check current applied revision
python -m alembic current

REM Rollback one migration
python -m alembic downgrade -1
```

### Migration History (16 revisions)

| Revision | Description |
|---|---|
| 001 | Initial empty schema |
| 002 | Users and roles tables |
| 003 | Business units, accounts, projects |
| ea80 | Governance periods and submission lifecycle |
| f1a2 | Submission lifecycle audit (REOPENED events) |
| a6b7 | Metric definitions, values, dimension/health scores |
| b7c8 | Excel import batches and rows |
| 8f0d | Notifications and audit events |
| 63f0 | System configurations |
| 6eaa | Scoring metadata columns (target, fail, direction, step) |
| 7942 | Ownership restructure — DH moved from Account to BU level |
| c1d2 | V2 governance threshold columns (green/amber/red/critical) |
| d1e2 | QPM tables — catalog, kpi_plans, plan_metrics, measurements |
| e2f3 | QPM measure entries, doc info, version history; tracker columns |
| f3a4 | required_measures column on kpi_plan_metrics |

---

## 12. Seed Scripts

Run from `backend/` directory. Run in the order listed.

| Script | Purpose |
|---|---|
| `seed_roles.py` | Creates 4 system roles (PM, DH, Customer Admin, Platform Admin) |
| `seed_admin.py` | Creates Platform Admin user (admin@deliverypulse.ai) |
| `seed_demo_structure.py` | Creates demo BUs, Accounts, Projects, DHs, PMs |
| `seed_metric_definitions.py` | Seeds 13 governance metric definitions with validation rules |
| `seed_v2_thresholds.py` | Seeds V2 RAG thresholds for governance metrics |
| `seed_submission_statuses.py` | Seeds 7 submission lifecycle statuses |
| `seed_governance_periods.py` | Seeds current week and month governance periods |
| `seed_qpm_catalog.py` | Seeds all 83 QPM catalog metrics from Excel |
| `extract_metrics.py` | Utility — re-extracts metrics from Excel to JSON if needed |

---

## 13. API Reference

Base URL: `http://localhost:8000/api/v1`  
Interactive docs: `http://localhost:8000/docs`

### Endpoint Groups

| Prefix | Allowed Roles | Description |
|---|---|---|
| `POST /auth/login` | All | JWT login |
| `GET /auth/me` | All | Current user info |
| `GET/POST /projects` | All / PM+DH+CA | List projects; PM can create |
| `PATCH /projects/{id}` | PM (own) / DH / CA | Update project |
| `POST /submissions` | PM | Create draft submission |
| `POST /submissions/{id}/submit` | PM | Submit for review |
| `POST /submissions/{id}/approve` | DH | Approve submission |
| `POST /submissions/{id}/reject` | DH | Reject with comments |
| `POST /submissions/{id}/reopen` | DH | Reopen approved submission |
| `POST /metrics` | PM | Upsert metric values (batch) |
| `GET /metric-definitions` | All | List 13 governance metric catalog |
| `GET/POST /governance-periods` | All / Any | List or create periods |
| `GET /qpm/catalog` | All | List all 83 QPM metrics |
| `GET /qpm/catalog/measures/{name}` | All | Get required measures for a metric |
| `GET /qpm/plans/by-project/{id}` | All | Get or create KPI plan |
| `PATCH /qpm/plans/{id}/config` | All | Update engagement model |
| `POST /qpm/plans/{id}/metrics` | All | Add metric to plan |
| `POST /qpm/measure-entries` | All | Enter raw component measure (Sheet 2) |
| `POST /qpm/compute/{plan_metric_id}` | All | Compute KPI from measures |
| `GET /qpm/plans/{id}/tracker` | All | Full KPI tracker (Sheet 3) |
| `GET /qpm/plans/{id}/summary` | All | KPI summary dashboard (Sheet 4) |
| `GET/POST /qpm/projects/{id}/doc-info` | All | Document info (Sheet 5) |
| `GET /business-units` | DH/CA/Admin | List business units |
| `GET /accounts` | All (PM reads) | List accounts |
| `GET /customer-admin/*` | CA | Portfolio analytics, aging, impact matrix |
| `GET /platform/*` | Platform Admin | Governance overview, risk, latency, adoption, settings |
| `GET /notifications` | All | User notifications list |
| `POST /notifications/read-all` | All | Mark all notifications read |

---

## 14. Project Structure

```
backend/
├── app/
│   ├── api/v1/
│   │   ├── auth.py
│   │   ├── projects.py           ← PM can now create projects
│   │   ├── submissions.py
│   │   ├── metrics.py
│   │   ├── qpm.py                ← All 5 QPM sheet APIs
│   │   ├── governance_periods.py
│   │   ├── platform.py
│   │   ├── customer_admin.py
│   │   └── ...
│   ├── models/
│   │   ├── project.py
│   │   ├── submission.py
│   │   ├── metric_definition.py
│   │   ├── kpi_plan.py           ← KpiPlan, KpiPlanMetric, KpiDocInfo, KpiDocVersionHistory
│   │   ├── kpi_measurement.py    ← KpiMeasurement (tracker), KpiMeasureEntry (data entry)
│   │   ├── qpm_catalog_metric.py ← 83-metric catalog
│   │   └── ...
│   ├── health_engine/
│   │   ├── metric_calculator.py    ← 4 RAG logic types from QPM Excel
│   │   ├── dimension_calculator.py ← Governance decision matrix
│   │   ├── health_calculator.py    ← Project-level health
│   │   └── rag_engine.py
│   └── services/
│       ├── project_service.py      ← PM create project support
│       ├── access_control_service.py ← PM permissions updated
│       ├── submission_service.py
│       ├── health_service.py
│       ├── qpm_service.py          ← QPM logic + KPI computation engine
│       └── ...
│
frontend/src/
├── components/
│   ├── Sidebar.tsx               ← Unified role-aware sidebar with icons
│   ├── Header.tsx                ← Breadcrumbs, search, notifications bell, user profile
│   ├── RagBadge.tsx              ← GREEN/AMBER/RED/CRITICAL badges
│   └── ...
├── layouts/
│   ├── RoleShellLayout.tsx       ← Single layout for all 4 roles
│   ├── PMLayout.tsx
│   ├── DeliveryHeadLayout.tsx
│   ├── CustomerAdminLayout.tsx
│   └── PlatformLayout.tsx
├── pages/
│   ├── pm/
│   │   ├── PMProjectsPage.tsx    ← PM can create projects here
│   │   ├── PMProjectDetailPage.tsx
│   │   ├── PMSubmissionPage.tsx
│   │   ├── QPMPlanPage.tsx       ← Sheet 1: KPI Plan
│   │   ├── QPMDataEntryPage.tsx  ← Sheet 2: Measure data entry
│   │   ├── QPMTrackerPage.tsx    ← Sheet 3: KPI Tracker
│   │   ├── QPMSummaryPage.tsx    ← Sheet 4: Visual summary
│   │   └── QPMDocInfoPage.tsx    ← Sheet 5: Document info
│   ├── dh/
│   │   ├── DHDashboardPage.tsx
│   │   ├── DHSubmissionsPage.tsx
│   │   └── DHSubmissionReviewPage.tsx
│   ├── customer-admin/
│   │   ├── CustomerAdminDashboardPage.tsx
│   │   ├── CustomerAdminSetupPage.tsx   ← BU/Account/Project setup
│   │   └── ...
│   ├── platform/
│   │   ├── PlatformAdminDashboardPage.tsx
│   │   ├── PlatformAdminSettingsPage.tsx ← Governance periods, users, metric catalog
│   │   ├── PlatformAdminReportsPage.tsx  ← Live reports (risk, latency, adoption)
│   │   └── ...
│   └── shared/
│       └── ProjectHealthTimelinePage.tsx ← Health trend chart + submission history
├── services/
│   ├── qpmService.ts
│   ├── submissionService.ts
│   ├── projectService.ts
│   └── ...
└── types/
    ├── qpm.ts
    ├── project.ts
    └── ...
```

---

## 15. Changelog

### v2.0 — June 2026

**New Features:**
- QPM Module — full digital replica of QPM Plan Excel (5 sheets, 83 metrics, KPI computation engine)
- PM can now create their own projects directly from the Projects page
- Governance Periods management UI in Platform Admin Settings
- Metric Catalog tab restored in Platform Admin Settings
- Health trend chart on Project Timeline page (SVG sparkline with RAG bands)
- Platform Reports page — live risk summary, approval latency, template adoption

**Improvements:**
- Unified role-aware Sidebar with SVG icons for all 4 roles
- RagBadge now supports CRITICAL status
- Status formatters completed — REOPENED, ON_HOLD, COMPLETED, CLOSED all properly labeled and color-coded
- Skeleton loaders on all dashboards (no more plain "Loading…" text)
- PM Projects page shows RAG health badge per project
- Welcome banners fixed (removed literal `**bold**` markdown)
- PM can edit their own projects

**Bug Fixes:**
- QPMTrackerPage category column was always showing "—" — now correctly mapped
- PM could not list accounts (403) — fixed, PMs can now read all accounts
- `delivery_head_user_id` missing from Project TypeScript type — added
- `pm_email` property reference on DHProjectItem — fixed to `project_manager_email`

---

*DeliveryPulse AI — Built with FastAPI, React, and PostgreSQL*
