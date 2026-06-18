# DeliveryPulse AI - Comprehensive Project Report

**Version:** 1.0 (Master Compilation)
**Status:** Live Document
**Stack:** React, FastAPI, Python, PostgreSQL, SQLAlchemy, Vite, Tailwind CSS
**Purpose:** This document serves as the master overview of the DeliveryPulse AI project, combining product specifications, architectural choices, user roles, database schema details, and implementation blueprints into one central, in-depth reference, optimized for reporting and technical handover.

---

## 1. Executive Summary & Project Vision

### 1.1 Vision
DeliveryPulse AI is an **internal project governance system** that gives program and delivery leadership a single, consistent view of project health across five governance dimensions: Schedule, Quality, Scope, Finance, and People & Delivery.

### 1.2 Problem Statement
Large delivery organizations struggle with:
- Fragmented status reporting across tools (Jira, finance systems, HR, incident trackers).
- Inconsistent definitions of “green / amber / red” across projects and regions.
- Late discovery of risk because metrics are subjective or updated ad hoc.
- No shared accountability model between Project Managers, Delivery Heads, and platform operators.

### 1.3 Goals
- **Standardize governance:** One metric catalog and health model for all in-scope projects.
- **Enable role-based accountability:** PM owns data entry and narrative; Delivery Head owns portfolio decisions; Platform Admin owns configuration and integrity.
- **Quantify health:** Derive dimension scores and an overall project health score from objective inputs.
- **Support auditability:** Every metric value is traceable (who entered it, when, source system if integrated).
- **Prepare for automation:** Metric definitions include backend formulas so future integrations (timesheets, defect trackers, billing) can populate fields without changing the model.

---

## 2. Product Specification

### 2.1 User Roles

| Role | Primary responsibility | Typical user |
|------|------------------------|--------------|
| **PM (Project Manager)** | Day-to-day project data stewardship, status updates, exception narratives | Project / program manager |
| **Delivery Head (DH)** | Portfolio oversight, escalation, cross-project prioritization | Regional or practice delivery lead |
| **Customer Admin (CA)** | Org-wide read-only portfolio tables | Org stakeholder |
| **Platform Admin** | System configuration, master data, access control, metric policy | Internal platform / tooling team |

**Segregation of Duties:**
- Platform Admins configure portfolios and projects.
- Delivery Heads oversee their assigned portfolio of projects.
- PMs operate single or multiple assigned projects.
- A Platform Admin cannot arbitrarily modify metric data; all break-glass edits are audited.

### 2.2 Governance Workflow and Lifecycle

DeliveryPulse AI organizes work in **governance periods** (typically monthly, or weekly for critical programs).

**Status Flow:**
`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` → `LOCKED`

**Exception Paths:**
- `UNDER_REVIEW` → `REJECTED` → `DRAFT` (Requires PM to correct and resubmit)
- `APPROVED` / `LOCKED` → `REOPENED` → `DRAFT` (Creates a new audited version chain)

**Workflow Steps:**
1. **DRAFT:** PM enters metric values either via manual form or Excel upload template. The PM saves drafts, reviews validation alerts, and comments on red metrics.
2. **SUBMITTED:** The PM finalizes the governance period. The system locks editing for the PM.
3. **UNDER_REVIEW:** The system computes the health scores, and the submission enters the Delivery Head's portfolio queue.
4. **APPROVED / REJECTED:** The Delivery Head reviews. Rejection mandates a reason.
5. **LOCKED:** Submissions lock based on policy offsets (e.g., 5 days after approval), freezing the historical snapshot permanently.

### 2.3 The 5 Governance Dimensions and 13 Metrics

The system enforces objective measurement through a fixed catalog of metrics. Each dimension generates a sub-score (0-100), combining to form the overall Health Score.

#### 1. Schedule Dimension (25% Weight)
- **`planned_progress_percent`**: Baseline expectation of work completed. (40% sub-weight)
- **`actual_progress_percent`**: Observed completion against the baseline. (40% sub-weight)
- **`dependency_delay_count`**: Number of external dependencies that are late. (25% sub-weight)

#### 2. Quality Dimension (20% Weight)
- **`critical_defects`**: Number of open P1/blocker defects. (40% sub-weight)
- **`test_pass_rate`**: Percentage of test cases passed in the latest cycle. (35% sub-weight)
- **`prod_incidents`**: Count of production incidents attributed to the project. (25% sub-weight)

#### 3. Scope Dimension (15% Weight)
- **`scope_change_requests`**: Number of formal change requests in the period. (50% sub-weight)
- **`requirement_stability_percent`**: Share of baselined requirements remaining unchanged. (50% sub-weight)

#### 4. Finance Dimension (20% Weight)
- **`budget_used`**: Cumulative actual spend recognized. (50% combined sub-weight with planned)
- **`planned_budget`**: Approved budget envelope. (50% combined sub-weight with actual)
- **`billing_delay_days`**: Days between milestone completion and invoicing. (50% sub-weight)

#### 5. People & Delivery Dimension (20% Weight)
- **`resource_availability`**: Percentage of planned FTE capacity available for project work. (55% sub-weight)
- **`team_attrition`**: Count of voluntary/involuntary departures in a rolling window. (45% sub-weight)

### 2.4 Overall Health Score and RAG Bands

**Health Score Formula:**
```
overall_health = (0.25 * Schedule) + (0.20 * Quality) + (0.15 * Scope) + (0.20 * Finance) + (0.20 * People)
```

**RAG Bands:**
- **Green (80–100):** On track, standard governance.
- **Amber (50–79):** At risk, Delivery Head review required within 5 days.
- **Red (0–49):** Critical, mandatory escalation record.

**Escalation Cap Rule:** If *any* individual dimension scores in the Red band (< 50), the overall health score cannot exceed 79 (Amber), regardless of other dimensions. This prevents masking critical flaws.

### 2.5 Advanced Features & Interactive Workflows (Phases 13 & 14)

DeliveryPulse AI is enhanced with premium enterprise-grade governance controls, real-time feedback loops, and streamlined batch upload workflows:

#### 1. In-App Notifications & Alert Routing (Phase 13)
* **Real-time Alert Bell:** A glassmorphic dropdown notification drawer in the main header displays alerts for major governance actions (e.g., when a project's overall health turns **RED** or when a Business Unit experiences a performance drop).
* **Pre-flight Safety Routing:** Clicks on notifications gracefully intercept missing references (e.g., if a draft submission was subsequently deleted), clearing the notification rather than throwing a 404 error.

#### 2. Compact Auditing & Vertical Timeline (Phase 13)
* **Polymorphic Change Audit:** The system tracks every change between saved drafts, submissions, re-openings, and locks.
* **Compact Delta Logger:** Instead of redundant snapshot duplicates, the audit trail extracts and records only the specific fields that changed (e.g., `planned_progress_percent: 65 -> 80`).
* **Vertical Audit Timeline:** Displays this history in a premium chronological visual timeline inside the review screens.

#### 3. PM Excel Drag-and-Drop & Inline Live Validation (Phase 14)
* **Drag-and-Drop Zone:** An interactive file dropzone allows PMs to upload filled Excel sheets with animated loaders.
* **Inline Live-Validation Preview Grid:** After uploading, an interactive table displays parsed data rows before committing them.
* **Real-time Re-calculation:** Modifying or correcting cells directly in this preview grid immediately recalculates validation rules and highlights failures (e.g. flagging a percentage entered as `809` as `Value must be <= 100`).
* **Blank Cell Support (Partial Draft Saves):** Empty fields in the grid are automatically stripped out before sending, allowing partial drafts to be saved without database Decimal parsing exceptions.

#### 4. PM Draft Deletion with Cascading Cleanup (Phase 14)
* **Authoritative Deletion:** Project Managers can delete their active `DRAFT` submissions.
* **Cascading Purge:** Triggers a database transaction to safely clean up all linked child tables, including `metric_values`, `dimension_scores`, `health_scores`, and lifecycle audits.

#### 5. Specialized Workspace Dashboards (Phase 14)
* **Dynamic Landing Panels:** Automatically loads tailored homepages depending on the authenticated role:
  * **PM Workspace:** Displays a clean list of active assigned projects, quick-action draft links, and submission statuses.
  * **Delivery Head Workspace:** Highlights a portfolio statistics summary and an actionable review queue list.
* **Submissions History Directory:** A centralized, filterable archive of past governance period reports.
* **BU Projects & Contacts Roster:** Delivery Heads can view all projects inside their Business Unit along with dynamic, clickable `mailto:` mail links to contact the assigned Project Managers.
* **Customer Admin Risk Summary:** High-level dashboard displays a live calculations widget highlighting the overall percentage of **RED** projects and mounting prominent risk badges.

#### 6. Configuration Workspace + Customer Admin Setup Workspace (Phase 15)
* **Platform Settings (5 tabs):** System configuration persistence, metric catalog toggle and weight parameters, user management CRUD, and global audit log viewer.
* **Customer Admin Setup (4 tabs):** Full CRUD for Business Units, Accounts, Projects, and DH assignments — all with local search, inline validation, and toast notifications.
* **Enterprise UI Upgrade:** Dark-gradient glowing sidebars, collapsible accordions, skeleton loaders, auto breadcrumbs, and global search across all role workspaces.

#### 7. Dynamic Database-Driven Health Engine (Phase 22)
* **No hard-coded math:** All scoring thresholds, target values, fail limits, calculation models, and granular step configurations are stored directly in the `metric_definitions` database table.
* **Three scoring models:** `GRANULAR_STEP` (integer counts with JSON step tiers), `LINEAR_NORMALIZED` (smooth linear decay for percentages/days), and asymmetric curves (`ASYMMETRIC_BUDGET` with ×4 overrun penalty, `SCHEDULE_VARIANCE` with ×4 slippage penalty).
* **Real-time tuning:** Platform Admins can adjust thresholds via the Configuration Workspace UI without any code changes.
* **64 passing pytest cases** verify all scoring scenarios end-to-end.

---

## 3. Backend Architecture Design

The backend is built in **Python with FastAPI**, backed by **PostgreSQL** and orchestrated using **SQLAlchemy** (ORM) and **Alembic** (migrations).

### 3.1 Architecture Overview

```text
┌──────────────┐     ┌─────────────────────────────────────────────────────────┐
│   React UI   │────▶│ FastAPI (DeliveryPulse API)                              │
│  (external)  │     │  Auth · Projects · Submissions · Excel · Approvals · Health │
└──────────────┘     └────────────┬────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              PostgreSQL    Object store    (future)
              (normalized   (Excel files,   AI / integration
               schema)       import blobs)   workers
```

### 3.2 Design Principles
- **Normalization:** Master data, metrics, scores, and audit tables are separated.
- **Immutability:** LOCKED submissions trigger snapshots. Governance facts are never soft-deleted.
- **Single Submission Pipeline:** Manual form entries and Excel uploads both map to the `metric_values` table via `STAGING` and `COMMITTED` states.
- **UTC Time:** All dates use `TIMESTAMPTZ` set to UTC.

### 3.3 Core Database Schema Modules

#### Authentication & Organization Hierarchy
- **`roles`**: System roles (PM, DELIVERY_HEAD, PLATFORM_ADMIN).
- **`users`**: Managed via Bcrypt hashed passwords and JWTs.
- **`business_units`**: Top-level organizational node for Delivery Head scope.
- **`accounts`**: Client entities owned by Business Units.
- **`projects`**: The core execution unit containing PM assignments and default reporting frequencies.

#### Governance Storage
- **`governance_periods`**: Immutable snapshots detailing `period_start` and `period_end`.
- **`submissions`**: Central node linking a period to metric values, versioning, status changes (`current_status_id`), and PM exception comments.
- **`metric_definitions`**: The dictionary dictating validation rules, data types, dimensions, and weights for all 13 metrics.
- **`metric_values`**: Holds PM entries. Includes a `row_state` column to distinguish between `STAGING` (preview from Excel upload) and `COMMITTED`.

#### Scoring Engine & Audit
- **`dimension_scores`**: Persists computed sub-scores for the 5 dimensions.
- **`health_scores`**: Stores the raw score, the capped score, and RAG bands.
- **`approvals`**: Tracks DH accept/reject/reopen decisions.
- **`audit_logs`**: Strictly append-only polymorphic tables that track all transitions.

---

## 4. Implementation Blueprint

The system strictly adheres to layered architecture rules to prevent domain pollution.

### 4.1 Dependency Layers
1. **HTTP Layer (`app/api/`)**: FastAPI routers, Pydantic DTOs for request/response validation. Contains NO business logic.
2. **Services (`app/services/`)**: Orchestrates logic, manages transactions (`session.begin()`), handles RBAC, and glues domains.
3. **Domain Modules**:
   - `app/health_engine/`: Pure functions that take typed metric inputs and return dimension/health scores.
   - `app/excel/`: Uses `pandas` to parse uploads and `openpyxl` to generate templates.
   - `app/audit/`: Emits JSON payloads into append-only tracking logs.
4. **Repositories (`app/repositories/`)**: Pure SQLAlchemy query construction. No JWT or logic awareness.
5. **Models (`app/models/`)**: Declarative base representations of PostgreSQL schemas.

### 4.2 Submit Pipeline Deep-Dive

When a PM clicks "Submit", the following complex transaction occurs:
1. **Auth & Scope Check**: The `submission_service` invokes the `access_control_service` to confirm the user has PM rights over the project.
2. **Validation**: The `metric_service` ensures all required `COMMITTED` metrics are present and satisfy the `metric_definitions` bounds (e.g., ensuring planned progress is between 0 and 100).
3. **Health Engine**: The metrics dictionary is passed to `health_engine.engine.compute()`, which runs the 13 scorers, aggregates dimensions, and applies the Red-cap escalation rule.
4. **Persistence**: The resulting scores are persisted via `score_repository`.
5. **State Transition**: The submission transitions from `DRAFT` to `SUBMITTED`, and immediately to `UNDER_REVIEW`. The `rag_start_date` is updated if the RAG band changed.
6. **Audit**: `audit.auditor.log_submit()` writes the full lifecycle transaction.

### 4.3 Excel Upload Workflow
1. The PM calls `GET /templates/governance.xlsx`. The server generates an empty template mapping to active metrics.
2. The PM fills the spreadsheet and submits via `POST /upload-template`.
3. `pandas` parses the file. Values are inserted into `metric_values` with `row_state=STAGING` and `source=EXCEL_IMPORT`.
4. The PM reviews the staging preview on the frontend.
5. The PM confirms, triggering `metric_service.apply_staging_to_committed`, overwriting the draft.
6. The PM submits the draft into the main pipeline.

---

## 5. Technology Stack Summary

### Frontend (React & Vite)
- **React 18**: Component-based UI.
- **TypeScript**: Ensuring type safety for API contracts.
- **Tailwind CSS**: Rapid utility-first styling.
- **Axios**: HTTP requests with automatic Vite proxy mapping to bypass CORS restrictions during development.
- **React Router**: Protecting routes based on JWT `role_code` claims.

### Backend (FastAPI)
- **FastAPI**: Asynchronous web framework offering auto-generated Swagger UI.
- **SQLAlchemy 2.0**: The industry standard Python ORM.
- **Alembic**: Handling sequential schema upgrades.
- **PostgreSQL**: Robust relational persistence.
- **Pytest**: Used for comprehensive unit and integration testing across the services layer.
- **Passlib & Bcrypt**: Hashing and salting user passwords.
- **PyJWT**: Generating and decoding HS256 JWT access tokens.

---

## 6. Local Setup and Deployment Guide

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL server running locally on port 5432 (default user `postgres`, password `root`).

### Backend Environment Configuration
Navigate to the `backend/` directory:
1. **Virtual Environment**:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
2. **Environment Variables**:
   Copy `.env.example` to `.env`. Ensure `DATABASE_URL` is set to:
   `postgresql+psycopg2://postgres:root@127.0.0.1:5432/deliverypulse_ai`
3. **Database Initialization**:
   ```powershell
   python scripts\create_database.py
   alembic upgrade head
   python scripts\seed_roles.py
   python scripts\seed_admin.py
   python scripts\seed_portfolio_structure.py
   ```
4. **Run Server**:
   ```powershell
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

### Frontend Environment Configuration
Navigate to the `frontend/` directory:
1. **Dependencies**:
   ```powershell
   npm install
   ```
2. **Run Development Server**:
   ```powershell
   npm run dev
   ```

The frontend will be accessible at `http://127.0.0.1:5173` and automatically proxies `/api/v1` traffic to the local FastAPI server.

### Available Demo Credentials
*(All passwords are `Demo@12345` unless otherwise specified)*
- **Platform Admin:** `admin@deliverypulse.ai` (Password: `Admin@123`)
- **Customer Admin:** `customer.admin@deliverypulse.ai`
- **Delivery Heads:** `priya.dh@deliverypulse.ai` (BFSI), `amit.dh@deliverypulse.ai` (Healthcare), `rajesh.dh@deliverypulse.ai` (Retail), `kiran.dh@deliverypulse.ai` (TMT), `sanjay.dh@deliverypulse.ai` (Energy), `vikram.dh@deliverypulse.ai` (Public Sector)
- **Project Managers:** `pm1@deliverypulse.ai` (Sarah), `pm2@deliverypulse.ai` (John)

---
*End of DeliveryPulse AI Report Document*
