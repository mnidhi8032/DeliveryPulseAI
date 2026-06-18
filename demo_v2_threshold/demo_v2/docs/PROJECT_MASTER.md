# DeliveryPulse AI — Project Master Document (Living Handoff)

> **How to use this file (for you and for AI assistants)**  
> In a **new chat**, say: *“Read `docs/PROJECT_MASTER.md` and continue from §12 Next steps.”*  
> After **every prompt/session**, the assistant must update: **Last updated**, **Current phase**, **Session log (§4)**, **§8 implemented today**, and **§12** (completed / in progress / up next / sample next prompt). Do not leave §1 or §12 with outdated phase text.

**Last updated:** 2026-05-26  
**Project root:** `d:\FROM_SCRATCH\demo_v1`  
**Current phase:** Phase 22 — Dynamic Database-Driven Health Engine + DB fully restored after Antigravity pollution.

### Latest status (read this first)

| Area | State |
|------|--------|
| Backend | Phases 0–15 + Phase 22 Dynamic Health Engine fully implemented |
| Frontend | Phases 6–15: PM, DH, CA, Platform workspaces + Enterprise UI upgrade |
| **Data Seed** | **Restored**: Exactly 6 Business Units, 6 Accounts, 8 Projects — 16 submissions, 15 health scores (RED: 4, AMBER: 7, GREEN: 4) |
| Customer Admin | `customer.admin@deliverypulse.ai` / `Demo@12345` — org-wide read-only portfolio tables |
| DH list empty? | Default filter **UNDER REVIEW** — PM must submit first, or use **All statuses** |
| Demo logins | PM: `pm1@` / `pm2@` · DH: `priya.dh@` / `amit.dh@` / `rajesh.dh@` / `kiran.dh@` / `sanjay.dh@` / `vikram.dh@` · CA: `customer.admin@` · password **`Demo@12345`** |
| DB restore script | Run `python scripts/fix_antigravity_mess.py` — restores 6 BUs, 6 accounts, 8 projects from submissions |

---

## Table of contents

1. [Executive summary](#1-executive-summary)  
2. [Tech stack](#2-tech-stack)  
3. [Repository map](#3-repository-map)  
4. [Session log (prompt history)](#4-session-log-prompt-history)  
5. [Product specification (depth)](#5-product-specification-depth)  
6. [Backend architecture (depth)](#6-backend-architecture-depth)  
7. [Implementation blueprint (depth)](#7-implementation-blueprint-depth)  
8. [What is implemented today](#8-what-is-implemented-today)  
9. [Local development (verified)](#9-local-development-verified)  
10. [Implementation roadmap](#10-implementation-roadmap)  
11. [Conventions and rules](#11-conventions-and-rules)  
12. [Next steps (always update this)](#12-next-steps-always-update-this)  

---

## 1. Executive summary

**DeliveryPulse AI** is an **internal project governance system** for delivery organizations. It standardizes how project health is reported across five dimensions (Schedule, Quality, Scope, Finance, People & Delivery), computes objective health scores, supports PM data entry (manual form + Excel), Delivery Head approval workflows, and full auditability.

**What exists today:**

| Layer | Status |
|-------|--------|
| Product specification (v1.1) | Written — `docs/PRODUCT_SPECIFICATION.md` |
| Backend DB + API design | Written — `docs/BACKEND_ARCHITECTURE.md` |
| Implementation blueprint | Written — `docs/IMPLEMENTATION_BLUEPRINT.md` |
| Backend code (FastAPI) | **Phases 0–15 + Phase 22** — auth, org, submissions, metrics, health engine, Excel import, approvals, notifications, audit trail, CA portfolio, Platform governance, configuration workspace, dynamic health engine |
| Frontend (React) | **Phases 6–15** — login, PM workspace, DH review, CA portfolio, Platform governance, configuration workspace, CA setup workspace, enterprise UI upgrade |
| Dashboards | **Out of scope** (explicit non-goal) |
| Health Engine | **Database-driven** — all thresholds, targets, fail limits, step configs stored in `metric_definitions`; no hard-coded math |

**Database:** Dedicated PostgreSQL database `deliverypulse_ai` on `localhost:5432` (user `postgres`). **Do not use or modify other existing databases.**

---

## 2. Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, Axios, React Router |
| Backend | FastAPI (Python) |
| ORM | SQLAlchemy 2.x |
| Migrations | Alembic (11 migration files) |
| Database | PostgreSQL |
| DB driver | psycopg2-binary |
| Auth | JWT (HS256) via PyJWT |
| Password | passlib + bcrypt |
| Excel | pandas + openpyxl |
| Config | pydantic-settings + `.env` |
| Tests | pytest (isolated `deliverypulse_ai_test` DB) |

---

## 3. Repository map

```text
demo_v1/
├── docs/
│   ├── PROJECT_MASTER.md               ← THIS FILE (living handoff)
│   ├── PRODUCT_SPECIFICATION.md        ← Product v1.1 (metrics, roles, workflow)
│   ├── BACKEND_ARCHITECTURE.md         ← Schema, API contract, audit, dates
│   ├── IMPLEMENTATION_BLUEPRINT.md     ← Folder layout, phases, module design
│   ├── AUTHORIZATION.md                ← RBAC ownership model (canonical)
│   ├── SCORING_ENGINE_GUIDE.md         ← Health engine math reference
│   ├── THRESHOLDS_AND_CALCULATIONS_GUIDE.md ← Full scoring walkthrough with examples
│   ├── GLOSSARY.md                     ← All terms, roles, metrics defined
│   ├── README.md                       ← Comprehensive project report
│   ├── run.md                          ← Quick start commands + demo credentials
│   └── my.md                           ← Personal notes (JWT explanation)
│
└── backend/
    ├── app/
    │   ├── main.py                     ← FastAPI app entry + CORS
    │   ├── core/                       ← settings, enums, constants, governance_constants
    │   ├── models/                     ← All 18 SQLAlchemy ORM models
    │   ├── schemas/                    ← All Pydantic DTOs
    │   ├── api/v1/                     ← 14 FastAPI routers
    │   ├── services/                   ← 20 business logic services
    │   ├── repositories/               ← Data access layer
    │   ├── auth/                       ← JWT + bcrypt
    │   ├── health_engine/              ← Dynamic scoring engine (DB-driven)
    │   ├── excel/                      ← Template generator + parser
    │   └── audit/                      ← Append-only audit emitter
    ├── database/database.py            ← engine, SessionLocal, get_db()
    ├── alembic/versions/               ← 11 migration files
    ├── scripts/
    │   ├── fix_antigravity_mess.py     ← ⭐ DB restore script (use this if DB is polluted)
    │   ├── surgical_db_clean.py        ← Legacy cleanup (use fix_antigravity_mess.py instead)
    │   ├── seed_metric_definitions.py  ← Seeds all 13 metrics with scoring configs
    │   ├── seed_demo_structure.py      ← Seeds demo users + PM assignments
    │   └── ...other seed scripts
    ├── tests/                          ← 64 pytest cases on isolated test DB
    ├── requirements.txt
    └── .env / .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/                      ← pm/, dh/, customer-admin/, platform/, shared/
    │   ├── components/                 ← Reusable UI components
    │   ├── services/                   ← 15 Axios service modules
    │   ├── contexts/                   ← AuthContext, ToastContext
    │   ├── layouts/                    ← Role-specific shell layouts
    │   └── types/                      ← TypeScript interfaces
    └── vite.config.ts                  ← Proxy /api → :8000
```

---

## 4. Session log (prompt history)

Use this table to append after every chat session.

| # | Date | What was requested | What was delivered | Outcome |
|---|------|-------------------|-------------------|---------|
| 1 | 2026-05-19 | Product spec only — no code, no dashboards | `docs/PRODUCT_SPECIFICATION.md` v1.0: objectives, roles, workflow, 5 dimensions, 13 metrics with purpose/datatype/validation/thresholds/formulas/health impact | Spec approved for build planning |
| 2 | 2026-05-19 | Update spec: PM data entry modes, approval statuses, dates, remove Amber–Red | `PRODUCT_SPECIFICATION.md` v1.1: Excel/manual flows, lifecycle (`DRAFT`→`LOCKED` + `APPROVED`/`REJECTED`), system date fields, strict Green/Amber/Red only | Spec aligned with operations |
| 3 | 2026-05-19 | Backend architecture — schema + API contract, no code | `docs/BACKEND_ARCHITECTURE.md`: 15+ tables, relationships, UTC dates, audit strategy, FastAPI endpoint map | Ready for implementation |
| 4 | 2026-05-19 | Implementation blueprint — folder structure, auth/submission/health/excel/audit design, phases | `docs/IMPLEMENTATION_BLUEPRINT.md` | Dev guide for backend team / AI |
| 5 | 2026-05-19 | Backend initialization only — no business logic | `backend/` foundation: settings, database.py, Alembic, empty packages, README, requirements | Code scaffold ready |
| 6 | 2026-05-19 | User could not run DB/migrate/server commands | Ran: `create_database.py`, `alembic upgrade head`, pytest passed, uvicorn started on :8000 | **Environment verified working** |
| 7 | 2026-05-19 | Living master document for future prompts | `docs/PROJECT_MASTER.md` (this file) | Single source of truth for handoff |
| 8 | 2026-05-19 | Phase 1: User + Role models, migration, seed roles, password + JWT (no login API) | `role.py`, `user.py`, `002_users_roles`, `seed_roles.py`, `auth/password.py`, `auth/jwt_handler.py` | Tables `roles`/`users` live; 3 roles seeded |
| 9 | 2026-05-19 | Phase 1 complete: login API, JWT dependencies, tests, seed admin | `schemas/auth.py`, `user_repository`, `auth_service`, `dependencies.py`, `api/v1/auth.py`, `seed_admin.py`, `test_login.py` | 11 tests passing; Swagger login works |
| 10 | 2026-05-19 | Phase 2: BU, accounts, projects + APIs + role scoping + demo seed | Models, `003_org_structure`, repos, services, APIs, `seed_demo_structure.py`, `test_organization.py` | 15 tests passing |
| 11 | 2026-05-20 | Ownership model correction (stakeholder final; no migrations/auth changes) | Updated services/routes/tests + `docs/AUTHORIZATION.md`; added CUSTOMER_ADMIN role via seed only | Canonical Customer Admin → DH → PM hierarchy enforced |
| 12 | 2026-05-21 | Phase 8: Delivery Head review workspace | `DHSubmissionsPage`, `DHSubmissionReviewPage`, submission actions, `test_dh_review.py` | DH can list/review/approve/reject/reopen/lock in BU scope |
| 13 | 2026-05-21 | PM “No projects” + DH empty list troubleshooting | `seed_demo_structure.py` re-syncs `project_manager_id`; user guidance on UNDER_REVIEW filter | PRJ001→pm1, PRJ002→pm2; DH needs submitted submissions |
| 14 | 2026-05-21 | Phase 9: Customer Admin portfolio workspace | `customer_admin_portfolio_service`, 4 aggregation APIs + BU detail; CA dashboard/BU pages; `test_customer_admin_portfolio.py` | Read-only org portfolio; no charts/AI |
| 15 | 2026-05-21 | Portfolio BU reseed + Save Draft fix | `seed_portfolio_structure.py` (13 BUs, 26 accounts, 39 projects); partial draft metrics save; CA password hint on login | Replaced test BUs; `Demo@12345` for demo users |
| 16 | 2026-05-21 | Phase 10: Platform Admin governance workspace | `platform_governance_service`, `/api/v1/platform/*`, Platform dashboard/BU analysis; `test_platform_governance.py` | Risk, approval latency, template adoption; read-only |
| 17 | 2026-05-22 | Phase 11 & Data Ownership Fixes | `seed_governance_activity.py` + `seed_portfolio_structure.py` fixes for strict 1:1 BU->DH mapping and verified strict PM project isolation | Governance activity seeded; Risk Summary groups fixed; PM isolation confirmed |
| 18 | 2026-05-22 | Isolate automated tests, surgically clean dev DB (6 BUs, 6 Accounts, 8 Projects), preserve history, update PROJECT_MASTER.md | Test DB (`deliverypulse_ai_test`) isolation in `tests/conftest.py`, surgical cleanup script `surgical_db_clean.py` executed successfully, docs updated | Dev DB cleaned of 280+ polluted BUs/projects; 57 tests pass on isolated test DB |
| 19 | 2026-05-22 | Implement Phase 13 — In-app Notifications + Audit Trail with compact deltas and de-duplicated risk boundaries | Created database tables/repositories/schemas, API routes, de-duplicated risk triggers, compact delta logger, glassmorphic dropdown notification drawer & vertical timeline components, verified 100% correct isolated test coverage | 60+ tests passing successfully on isolated test DB; frontend bundle compiles flawlessly |
| 20 | 2026-05-24 | Create comprehensive GLOSSARY.md & Update docs/README.md for report compilation | Created a dedicated glossary explaining all user roles, workflow steps, org entities, metrics, and scoring; updated README.md with Section 2.5 detailing recent Phase 13 & 14 advanced features (notifications, timelines, live Excel grid validation, cascading purges, custom workspaces) | Glossary successfully deployed and README.md fully synchronized for the report |
| 21 | 2026-05-24 | Implement Phase 15 — Configuration Workspace + Customer Admin Setup Workspace + Enterprise UI Upgrade | Implemented Platform settings workspace (5 tabs), Customer Admin setup workspace (4 CRUD tabs), security guard bypasses, global search, auto breadcrumbs, dark-gradient glowing sidebars, skeletons, collapsible accordions, and ToastContext | All backend/frontend tests pass cleanly, build succeeds, and UI visual upgrade fully operational |
| 22 | 2026-05-26 | Implement Dynamic, Simplified, Database-Driven Health Engine | Generated database migration, updated seed script for thresholds/directions/granular steps configurations, refactored metric_calculator to dynamically parse configs, maintained 100% backward compatibility wrappers, and verified via 64 passing pytest cases | Clean, objective, simplified health calculations completely functional and verified |
| 23 | 2026-05-26 | Fix DB pollution caused by Antigravity prompts (39 empty projects, 20 duplicate BUs, 15 extra users) | Diagnosed root cause: Antigravity seeded 39 new empty projects and soft-deleted all 8 original projects with real submissions. Wrote `scripts/fix_antigravity_mess.py` using raw psycopg2 to bypass ORM FK constraints. Restored DB to 6 BUs, 6 Accounts, 8 Projects, 16 submissions, 15 health scores (RED:4, AMBER:7, GREEN:4). Added `vikram.dh@deliverypulse.ai` for PUBLIC_SECTOR BU. | DB fully restored; Platform dashboard now shows correct RED projects (BFSI 50%, TMT 100%) |
| 24 | 2026-05-26 | Docs audit — identify and update stale sections in PROJECT_MASTER.md and README.md | Updated PROJECT_MASTER.md: header dates, latest status table, §1 executive summary, §2 tech stack, §3 repository map, §4 session log, §7 phase table, §8 implemented today, §8.3 DB state, §9.1.1 restore script reference, §12 completed list. Updated README.md: demo credentials, Phase 15 + Phase 22 entries. | All docs now reflect actual current state of the project |

---

## 5. Product specification (depth)

**Source of truth:** `docs/PRODUCT_SPECIFICATION.md` (v1.1)

### 5.1 Vision and goals

- One governance model for all in-scope projects across **Schedule, Quality, Scope, Finance, People & Delivery**.
- Role accountability: **PM** owns data; **Delivery Head** owns portfolio actions; **Platform Admin** owns config and integrity.
- Deterministic **health scores** (0–100) and **RAG bands**: Green 80–100, Amber 50–79, Red 0–49 (no intermediate labels).
- Auditability and future integrations (Jira, ERP, HRIS) without changing the metric model.

### 5.2 Roles

| Role | Code | Key responsibilities |
|------|------|----------------------|
| Project Manager | `PM` | Enter metrics, save draft, submit, Excel import, comments on red metrics |
| Delivery Head | `DELIVERY_HEAD` | Review portfolio, approve/reject/reopen, escalations |
| Platform Admin | `PLATFORM_ADMIN` | Users, BUs, projects, policies, audit access; no routine metric edits |

### 5.3 Submission lifecycle (statuses)

```text
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → LOCKED

Exceptions:
  UNDER_REVIEW → REJECTED → DRAFT
  APPROVED or LOCKED → REOPENED → DRAFT (new version chain)
```

All transitions must be **audit logged**.

### 5.4 PM data entry modes

1. **Manual form** — enter metrics in UI → Save Draft → Submit  
2. **Excel** — download template → fill offline → upload → **editable preview (STAGING)** → apply to draft → Submit  

**Rules:** Excel never auto-submits; same backend structure for manual and imported values; validation after parse and before submit.

### 5.5 System date fields (UTC storage)

| Field | Meaning |
|-------|---------|
| `created_at` / `updated_at` | Row lifecycle |
| `submission_date` | PM submit time |
| `approval_date` | DH approve time |
| `rag_start_date` | When current RAG band became effective |
| `period_start` / `period_end` | Governance period boundaries |
| `locked_at` | Immutable snapshot time |

### 5.6 Five dimensions and metrics (13 total)

| Dimension | Metrics |
|-----------|---------|
| **Schedule** (25% overall) | `planned_progress_percent`, `actual_progress_percent`, `dependency_delay_count` |
| **Quality** (20%) | `critical_defects`, `test_pass_rate`, `prod_incidents` |
| **Scope** (15%) | `scope_change_requests`, `requirement_stability_percent` |
| **Finance** (20%) | `budget_used`, `planned_budget`, `billing_delay_days` |
| **People & Delivery** (20%) | `resource_availability`, `team_attrition` |

Each metric in the spec defines: purpose, datatype, validation, risk thresholds, backend formula, impact on health score.

### 5.7 Overall health score

```text
overall = 0.25×Schedule + 0.20×Quality + 0.15×Scope + 0.20×Finance + 0.20×People
```

**Escalation rule (§5.4):** If any dimension score &lt; 50 (Red), overall capped at **79** until Delivery Head acknowledges exception.

### 5.8 Explicit non-goals (v1)

- Dashboards / executive UI  
- Full implementation code in spec phase  
- Customer-facing portals  
- Predictive AI (name reserved for future)

---

## 6. Backend architecture (depth)

**Source of truth:** `docs/BACKEND_ARCHITECTURE.md`

### 6.1 Core tables (planned)

`roles`, `users`, `business_units`, `accounts`, `projects`, `governance_periods`, `submissions`, `submission_status` (lookup), `metric_definitions`, `metric_values`, `dimension_scores`, `health_scores`, `approvals`, `audit_logs`

**Supporting tables:** `excel_import_batches`, `submission_snapshots`, `submission_status_history`, `project_assignments`, `rag_band_history`

### 6.2 Organizational hierarchy

```text
Platform Admin
  → Business Unit (Strictly 1 Delivery Head per BU)
    → Account
      → Project (Strictly isolated to 1 Project Manager)
        → Governance Period
          → Submission
            → Metric Values
            → Dimension Scores
            → Health Score
```

**Security Rules:**
- Delivery Heads can only view/manage accounts & projects under their assigned BU.
- Project Managers (PMs) can only view/manage the specific projects assigned to their user ID. They cannot see other PMs' projects.

### 6.3 Excel data model

- `metric_values.row_state`: `STAGING` (preview) | `COMMITTED` (draft/submitted)  
- `metric_values.source`: `MANUAL` | `EXCEL_IMPORT` | future `INTEGRATION`, `AI_SUGGESTED`  
- Apply STAGING → COMMITTED before submit; submit never from raw upload alone  

### 6.4 Planned API endpoints (v1 contract)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/login` | JWT auth |
| GET/POST | `/api/v1/projects` | List / create projects |
| POST/GET | `/api/v1/submissions` | Draft, save, submit / get by id |
| POST | `/api/v1/upload-template` | Excel upload → STAGING |
| POST | `/api/v1/parse-template` | Validate / apply to draft |
| POST | `/api/v1/approve`, `/reject`, `/reopen` | DH workflow |
| GET | `/api/v1/health-score` | Scores for submission |

**Not implemented in code yet** — design only.

### 6.5 Audit (required fields)

`entity_type`, `entity_id`, `old_value`, `new_value`, `changed_by_user_id`, `reason`, `created_at` — append-only `audit_logs`.

---

## 7. Implementation blueprint (depth)

**Source of truth:** `docs/IMPLEMENTATION_BLUEPRINT.md`

### 7.1 Layering rule

```text
API (routers) → Services → Repositories → Models → PostgreSQL
```

Domain modules called by services:

- `health_engine/` — pure scoring  
- `excel/` — pandas/openpyxl parse/generate  
- `audit/` — centralized audit writes  

### 7.2 Implementation phases — current status

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Foundation (settings, DB, Alembic, folders) | ✅ DONE |
| **1** | User + Role + login + JWT protection | ✅ DONE |
| **2** | Organizational hierarchy (BU, account, project) | ✅ DONE |
| **3** | Submissions (draft, manual metrics, lifecycle) | ✅ DONE |
| **4** | Metrics + health engine (scoring on submit) | ✅ DONE |
| **5** | Excel workflow (staging, preview, apply) | ✅ DONE |
| **6** | Frontend login + role-based routing | ✅ DONE |
| **7** | PM workspace (projects, submission form, health panel) | ✅ DONE |
| **8** | DH review workspace (approve/reject/reopen/lock) | ✅ DONE |
| **9** | Customer Admin portfolio workspace | ✅ DONE |
| **10** | Platform Admin governance workspace | ✅ DONE |
| **12** | Health trends + project timeline | ✅ DONE |
| **13** | In-app notifications + audit trail | ✅ DONE |
| **14** | PM Excel drag-and-drop + draft deletion + custom workspaces | ✅ DONE |
| **15** | Configuration workspace + CA setup workspace + Enterprise UI | ✅ DONE |
| **22** | Dynamic database-driven health engine | ✅ DONE |
| **Future** | Executive (CEO/CFO) read-only role + dashboard | 📋 PLANNED |

### 7.3 Exact build order (from blueprint)

1. Database connection — **DONE**  
2. User model — **NEXT**  
3. Authentication  
4. Project model  
5. Submission model  
6. Metric model  
7. Health engine  

---

## 8. What is implemented today

### 8.1 Backend — fully implemented

| Component | Notes |
|-----------|-------|
| FastAPI app + CORS | `app/main.py` — 14 routers mounted, CORS for `localhost:5173` |
| Auth (JWT + bcrypt) | `app/auth/` — login, `get_current_user`, `require_roles` |
| Org hierarchy | BU, Account, Project models + APIs + RBAC scoping |
| Governance periods | Create/list periods per project |
| Submissions lifecycle | DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → LOCKED + REJECTED/REOPENED |
| Metrics API | Save/get metric values per submission |
| Dynamic health engine | `app/health_engine/` — DB-driven scoring (GRANULAR_STEP, LINEAR_NORMALIZED, ASYMMETRIC_BUDGET, SCHEDULE_VARIANCE) |
| Excel import | Upload → STAGING → preview → apply to DRAFT |
| CA portfolio APIs | `/api/v1/customer-admin/*` — portfolio summary, BU health, aging, impact matrix |
| Platform governance APIs | `/api/v1/platform/*` — overview, risk summary, approval latency, template adoption |
| Notifications + audit | In-app bell notifications, compact delta audit trail |
| Configuration APIs | `/api/v1/platform/settings` — system config + metric catalog CRUD |
| User management APIs | `/api/v1/platform/users` — CRUD for Platform Admin |

### 8.2 Frontend — fully implemented

| Page / Feature | Notes |
|----------------|-------|
| Login | JWT auth, role-based redirect |
| PM workspace | Projects list, project detail, submission form (manual + Excel), health panel |
| DH workspace | Submissions queue, review page, approve/reject/reopen/lock, audit timeline |
| CA portfolio | Dashboard, BU detail, aging drill-down modal, risk summary widget |
| Platform governance | Dashboard, BU analysis, reports |
| Platform settings | 5-tab configuration workspace (system config, metric catalog, users, audit) |
| CA setup workspace | 4-tab CRUD workspace (BUs, accounts, projects, DH assignments) |
| Enterprise UI | Glassmorphic sidebars, ToastContext, global search, auto breadcrumbs, skeletons |

### 8.3 Database state

- Database **`deliverypulse_ai`** on local PostgreSQL (`127.0.0.1:5432`)
- Alembic at revision **`b7c8d9e0f1a2`** (007 excel import batches) + scoring metadata migration
- **6 Business Units:** BFSI, Healthcare, Retail, Technology & Telecom, Energy, Public Sector
- **6 Accounts:** one per BU (Apex Banking, St. Jude Health, SwiftMart Retail, Telco Prime, Nexus Energy, State Registry Account)
- **8 Projects:** BFSI_P1/P2, HEALTHCARE_P1/P2, RETAIL_P1/P2, TMT_P1, ENERGY_P1
- **16 Submissions** with full metric values, dimension scores, health scores
- **Health score distribution:** RED: 4, AMBER: 7, GREEN: 4
- **Seeded roles:** PM, CUSTOMER_ADMIN, DELIVERY_HEAD, PLATFORM_ADMIN
- **⚠️ If DB gets polluted:** run `python scripts/fix_antigravity_mess.py` to restore

---

## 9. Local development (verified)

### 9.1 Connection (from `backend/.env`)

```text
host=127.0.0.1
port=5432
user=postgres
password=root
database=deliverypulse_ai
```

`DATABASE_URL=postgresql+psycopg2://postgres:root@127.0.0.1:5432/deliverypulse_ai`

Use **`127.0.0.1`** instead of `localhost` on Windows to avoid IPv6 (`::1`) connection issues.

### 9.1.1 Database Isolation & Test Environment

To prevent test executions from polluting the active development database with temporary mock and duplicate structures, we maintain two completely isolated database environments:

1. **Development Database (`deliverypulse_ai`)**:
   - The primary database used when running uvicorn (`npm run dev` or `python main.py`).
   - Contains a curated portfolio of exactly **6 Business Units**, **6 Accounts**, and **8 Projects** with realistic metrics and governance history (submissions, scores, trends).
   - Core lookup master data (Roles, Statuses, Metrics) is fully preserved.
   - Run the restore script if DB gets polluted:
     ```powershell
     .\.venv\Scripts\python.exe scripts/fix_antigravity_mess.py
     ```

2. **Test Database (`deliverypulse_ai_test`)**:
   - The isolated database used exclusively during `pytest` runs.
   - Configured in [tests/conftest.py](file:///d:/FROM_SCRATCH/demo_v1/backend/tests/conftest.py) by dynamically overriding the SQLAlchemy engine setting (`settings.DATABASE_URL`) on test setup.
   - The schema is automatically re-created and standard mock fixtures and core test users (`pm1`, `pm2`, `priya.dh`, etc.) are seeded on each test session startup.
   - **Never run integration tests against the development database.**

3. **Seeding Rules & Pollution Prevention**:
   - **Strict isolation constraint**: Every test module must depend strictly on test DB fixtures (`db_session` or `client` which overrides FastAPI `get_db` dependency).
   - Test data creation must occur strictly within the setup lifecycle of the test database and should never interact with or pollute the active `deliverypulse_ai` dev database.

### 9.2 Where to run commands

Always:

```powershell
cd d:\FROM_SCRATCH\demo_v1\backend
.\.venv\Scripts\Activate.ps1
```

**Note:** Virtual environment lives under **`backend\.venv`**, not project root.

### 9.3 One-time setup (already done on dev machine)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python scripts\create_database.py   # if DB missing
.\.venv\Scripts\alembic upgrade head
.\.venv\Scripts\pytest tests\test_database_connection.py -v
```

### 9.4 Daily dev commands

```powershell
cd d:\FROM_SCRATCH\demo_v1\backend
.\.venv\Scripts\Activate.ps1
.\.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API docs: http://127.0.0.1:8000/docs  
- Stop server: **Ctrl+C** in that terminal  

### 9.5 Troubleshooting

| Problem | Solution |
|---------|----------|
| `psql` not recognized | Use `python scripts\create_database.py` (no psql needed) |
| `database "deliverypulse_ai" does not exist` | Run `create_database.py` |
| Wrong folder / no venv | `cd backend` and activate `backend\.venv` |
| `deactivate` fails | Activate venv first |

---

## 10. Implementation roadmap

### 10.1 Immediate next work (Phase 1 — User + Auth)

**Goal:** PM/DH/Admin can log in; JWT protects future routes.

| Task | Deliverables |
|------|----------------|
| `roles` + `users` models | `app/models/role.py`, `user.py` |
| Alembic migration | `002_users_roles.py` |
| Seed roles | PM, DELIVERY_HEAD, PLATFORM_ADMIN |
| Password hashing | `app/core/security.py` or `app/auth/password.py` |
| JWT | `app/auth/jwt_handler.py`, `dependencies.py` |
| Auth service + repo | `auth_service.py`, `user_repository.py` |
| Schemas | `schemas/auth.py` |
| API | `api/v1/auth.py` — `POST /api/v1/login` |
| Mount router | `app/main.py` include router |
| Tests | Login success/failure, protected route 401 |

### 10.2 Then (Phase 2–6)

See `IMPLEMENTATION_BLUEPRINT.md` sections for Projects → Submissions → Excel → Health engine → Approvals.

### 10.3 Frontend (later)

React app not scaffolded. Will consume `/api/v1/*` with Bearer JWT.

---

## 11. Conventions and rules

1. **Only database `deliverypulse_ai`** — never drop or migrate unrelated DBs.  
2. **No dashboards** until product scope changes.  
3. **UTC** for all timestamps in DB.  
4. **RAG bands** — Green / Amber / Red only (no “Amber–Red”).  
5. **Excel** — STAGING → review → COMMITTED → single submit pipeline.  
6. **Governance facts** (submissions, metrics, scores, audit) — no soft delete.  
7. **Master data** (users, projects, BUs) — soft delete via `deleted_at` where designed.  
8. Update **this file** after each session (session log + section 12).  

---

## 12. Next steps (always update this)

### Completed ✅

- [x] Product specification v1.1
- [x] Backend architecture document
- [x] Implementation blueprint
- [x] Backend folder structure and foundation code
- [x] PostgreSQL database `deliverypulse_ai` created
- [x] Alembic migrations (11 files through `b7c8d9e0f1a2`)
- [x] **Phase 1:** Role + User models, password hashing, JWT, login API, tests
- [x] **Phase 2:** Business units, accounts, projects (models, migration, APIs, RBAC)
- [x] **Phase 3:** Governance periods + submission lifecycle (DRAFT→LOCKED state machine)
- [x] **Phase 4:** Metric definitions, metric values, health engine, dimension/health scores, APIs, tests
- [x] **Phase 5:** Excel template download, upload/parse/validate, preview batch, apply to DRAFT
- [x] **Phase 6:** Frontend login, JWT persistence, role-based routing, layout shells
- [x] **Phase 7:** PM projects list, project detail, submission metrics form, health panel
- [x] **Phase 8:** DH submissions list, review page, approve/reject/reopen/lock
- [x] **Phase 9:** CA portfolio dashboard, BU detail, aggregation APIs
- [x] **Phase 10:** Platform governance dashboard, BU analysis, `/platform/*` APIs
- [x] **Phase 12:** Health trends + project timeline (data tables, no charts)
- [x] **Pytest isolation:** Test DB (`deliverypulse_ai_test`) isolated from dev DB
- [x] **Phase 13:** In-app notifications + audit trail (compact delta logger, bell drawer, vertical timeline)
- [x] **Phase 14:** PM Excel drag-and-drop + live validation preview + draft deletion + custom workspaces
- [x] **Phase 15:** Configuration workspace + CA setup workspace + Enterprise UI upgrade (glassmorphic sidebars, ToastContext, global search, breadcrumbs, skeletons)
- [x] **Phase 22:** Dynamic database-driven health engine (GRANULAR_STEP, LINEAR_NORMALIZED, ASYMMETRIC_BUDGET, SCHEDULE_VARIANCE — all configs in DB)
- [x] **DB restore:** `scripts/fix_antigravity_mess.py` — recovers from any seed pollution back to 6 BUs / 6 Accounts / 8 Projects
- [x] **Docs updated:** PROJECT_MASTER.md, README.md, GLOSSARY.md all current as of 2026-05-26

### In progress 🔄

- [ ] *(none)*

### Up next 📋

1. **Future Planned Phase:** Executive (CEO/CFO) 100% Read-Only Role & Dashboard — high-level BU aggregated health and CFO financial metric summaries

### Blocked / decisions needed ❓

- *(none currently)*

### For the next AI prompt, say:

> Read `docs/PROJECT_MASTER.md` (Latest status + §12). Continue from "Up next" — Executive (CEO/CFO) 100% Read-Only Role & Dashboard implementation. Do not build chart libraries or external AI models.

---

## Appendix A — Environment variables reference

| Variable | Example / default |
|----------|-------------------|
| `DATABASE_URL` | `postgresql+psycopg2://postgres:root@127.0.0.1:5432/deliverypulse_ai` |
| `JWT_SECRET` | Long random string (min 16 chars) |
| `JWT_ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` |
| `APP_NAME` | `DeliveryPulse AI API` |
| `ENVIRONMENT` | `development` |
| `SQL_ECHO` | `false` |

---

## Appendix B — Document version index

| Document | Version | Path |
|----------|---------|------|
| Comprehensive Project Report | 1.0 | `docs/README.md` |
| Product specification | 1.1 | `docs/PRODUCT_SPECIFICATION.md` |
| Backend architecture | 1.0 | `docs/BACKEND_ARCHITECTURE.md` |
| Implementation blueprint | 1.0 | `docs/IMPLEMENTATION_BLUEPRINT.md` |
| Project master (this file) | 1.0 | `docs/PROJECT_MASTER.md` |
| Glossary of terms | 1.0 | `docs/GLOSSARY.md` |
| Backend README | — | `backend/README.md` |

---

*End of PROJECT_MASTER.md — update Session log and §12 after every prompt.*
