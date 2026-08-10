# DeliveryPulse AI — Database Reference

**Version:** 1.0  
**Last Updated:** August 2026  
**Database:** PostgreSQL  
**Total Tables:** 34 (+ `alembic_version` for migrations)

This document explains every table in the database — what it stores, why it exists,
which frontend pages use it, and what the current row count means.

---

## Quick Reference Table

| Table | Rows | Category | Status |
|---|---|---|---|
| `users` | 15 | Core | ✅ Active |
| `roles` | 6 | Core | ✅ Active |
| `business_units` | 3 | Org Structure | ✅ Active |
| `accounts` | 6 | Org Structure | ✅ Active |
| `projects` | 30 | Org Structure | ✅ Active |
| `kpi_plans` | 30 | QPM | ✅ Active |
| `kpi_plan_metrics` | 460 | QPM | ✅ Active |
| `qpm_catalog_metrics` | 86 | QPM Catalog | ✅ Active |
| `kpi_measurements` | 246 | QPM Data | ✅ Active |
| `kpi_measure_entries` | 242 | QPM Data | ✅ Active |
| `project_period_measures` | 444 | QPM Data | ✅ Active |
| `action_items` | 16 | Workflow | ✅ Active |
| `dm_reviews` | 4 | Workflow | ✅ Active |
| `notifications` | 10 | Workflow | ✅ Active |
| `metric_approval_requests` | 2 | DE Workflow | ✅ Active |
| `metric_recommendations` | 16 | DE Workflow | ✅ Active |
| `engagement_model_items` | 56 | Engagement Model | ✅ Active |
| `engagement_model_metric_mappings` | 1584 | Engagement Model | ✅ Active |
| `engagement_model_presets` | 22 | Engagement Model | ✅ Active |
| `system_configurations` | 1 | Settings | ✅ Active |
| `submissions` | 0 | V1 Governance | 🟡 Built, no data |
| `submission_statuses` | 7 | V1 Governance | 🟡 Built, no data |
| `submission_lifecycle_audits` | 0 | V1 Governance | 🟡 Built, no data |
| `governance_periods` | 0 | V1 Governance | 🟡 Built, no data |
| `governance_reviews` | 0 | V1 Governance | 🟡 Built, no data |
| `dimension_scores` | 0 | Health Engine | 🟡 Built, no data |
| `health_scores` | 0 | Health Engine | 🟡 Built, no data |
| `metric_definitions` | 13 | V1 Metrics | 🟡 Legacy |
| `metric_values` | 0 | V1 Metrics | 🟡 Legacy |
| `kpi_doc_info` | 0 | QPM Sheet 5 | 🟡 Built, no data |
| `kpi_doc_version_history` | 0 | QPM Sheet 5 | 🟡 Built, no data |
| `excel_import_batches` | 0 | Excel Upload | 🟡 Built, no data |
| `excel_import_rows` | 0 | Excel Upload | 🟡 Built, no data |
| `project_phases` | 0 | Project Mgmt | 🟡 Built, no data |
| `audit_events` | 0 | System Audit | 🟡 Built, no data |

---

## GROUP 1 — Core Identity Tables

### `roles`
**What it stores:** The 6 roles in the system.  
**Rows:** 6 (PLATFORM_ADMIN, CEO, DELIVERY_HEAD, DELIVERY_MANAGER, PM, DELIVERY_EXCELLENCE)  
**Why it exists:** Every user has exactly one role. The role controls what pages they see, what data they can access, and what actions they can take.  
**Frontend:** Login → role_code determines which sidebar items appear and which routes are accessible (`/pm/*`, `/delivery-manager/*`, etc.)  
**Key column:** `code` — the string used in all permission checks (e.g. `RoleCode.PM`)

---

### `users`
**What it stores:** Every person who can log in.  
**Rows:** 15 (demo users across all roles)  
**Why it exists:** Authentication and identity. Every action in the system is tied to a user.  
**Frontend:** Login page uses email/password. Header shows user's name and initials. Sidebar shows role label.  
**Key columns:**
- `email` — login credential
- `password_hash` — bcrypt hashed password
- `role_id` → FK to `roles`
- `full_name` — displayed in UI and in notifications/action items

---

## GROUP 2 — Organisation Structure Tables

### `business_units`
**What it stores:** The top-level organisational units (e.g. "Banking & Financial Services", "Digital Services", "Cloud Infrastructure").  
**Rows:** 3  
**Why it exists:** The org hierarchy starts here. Every account and project belongs to a BU chain. Delivery Heads are assigned at BU level.  
**Frontend:** Platform Admin → Settings → Org Setup. DH Dashboard groups everything by BU. Portfolio Dashboard filter bar has a BU filter.  
**Key columns:**
- `bu_head_user_id` → FK to `users` (the Delivery Head who oversees this BU)
- `pm_user_id` → FK to `users` (the PM assigned to this BU — controls which accounts PM can see when creating projects)

---

### `accounts`
**What it stores:** Client/customer organisations under each BU (e.g. "Apex Bank", "Acme Corp").  
**Rows:** 6  
**Why it exists:** Projects belong to accounts. Delivery Managers are assigned at account level — they see all projects under their accounts.  
**Frontend:** Platform Admin → Settings → Org Setup (Account DM Assignment table). PM sees only accounts in their BU when creating a project.  
**Key columns:**
- `business_unit_id` → FK to `business_units`
- `delivery_manager_user_id` → FK to `users` (DM responsible for this account)

---

### `projects`
**What it stores:** Every software delivery project.  
**Rows:** 30  
**Why it exists:** The central entity. Everything else — KPI plans, metrics, action items, reviews — attaches to a project.  
**Frontend:** PM → My Projects page. DM → Dashboard project cards. DH → Dashboard. CEO/Platform Admin → Portfolio Dashboard.  
**Key columns:**
- `account_id` → FK to `accounts`
- `project_manager_id` → FK to `users` (the PM who owns this project)
- `delivery_head_user_id` → FK to `users` (derived from BU head)
- `current_rag` — computed field: GREEN/AMBER/RED/null based on latest KPI measurements

---

## GROUP 3 — QPM Catalog Tables

### `qpm_catalog_metrics`
**What it stores:** The master library of 86 standard KPI metrics (e.g. "Velocity", "Gross Margin%", "Defect Detection Efficiency %").  
**Rows:** 86  
**Why it exists:** This is the source of truth for all metric definitions. When a PM sets up a KPI plan, they choose metrics from this catalog. DE manages this catalog.  
**Frontend:** DE Catalog page → Metric Catalog tab. PM → KPI Plan page → Metric Catalog tab.  
**Key columns:**
- `name` — the metric name (exact string, used for matching in presets)
- `category` — which dimension it belongs to (e.g. "Efficiency", "Internal Quality")
- `compliance` — M (Mandatory) / O (Optional) / C (Conditional) — catalog-level classification
- `project_type` — comma-separated list of applicable project types (used in ILIKE fallback)
- `delivery_model` — comma-separated applicable delivery models
- `formula` — how to calculate the metric
- `intent` — "Higher the better" / "Lower the better" / "Within Limits" / "Nominal the best"
- `default_target`, `default_lsl`, `default_usl` — default thresholds

---

## GROUP 4 — QPM Plan Tables

### `kpi_plans`
**What it stores:** One KPI plan per project. Stores the engagement model settings.  
**Rows:** 30 (one per project)  
**Why it exists:** The plan is the container for all metric selections for a project. It holds the engagement model (project type, delivery model, etc.) and the plan status.  
**Frontend:** PM → KPI Plan (Sheet 1). The plan's engagement model drives which metrics are suggested.  
**Key columns:**
- `project_id` → FK to `projects` (one-to-one)
- `project_type` — e.g. "Fresh Development", "AI-Development"
- `delivery_process_model` — e.g. "Agile-Scrum"
- `project_category` — e.g. "Fixed Price"
- `work_size_unit` — e.g. "Story Point-SP"
- `is_finalized` — once True, PM cannot add/remove metrics
- `qpm_status` — DRAFT / UNDER_REVIEW / APPROVED / REJECTED
- `pm_rag_comments` — PM's overall project health comment (visible to DM)

---

### `kpi_plan_metrics`
**What it stores:** The specific metrics selected for each project's KPI plan.  
**Rows:** 460 (average ~15 per project)  
**Why it exists:** When a PM creates a project, metrics from the catalog are copied into this table as plan-specific rows. The PM can customise thresholds (target/lsl/usl) for their project.  
**Frontend:** PM → KPI Plan → Selected Metrics tab. Shows metric name, category, frequency, priority badge (Mandatory/Optional).  
**Key columns:**
- `kpi_plan_id` → FK to `kpi_plans`
- `catalog_metric_id` → FK to `qpm_catalog_metrics` (null for custom metrics)
- `metric_name` — copied from catalog (or custom name)
- `priority` — M/O/C per this specific plan (can differ from catalog compliance)
- `target`, `lsl`, `usl` — PM's project-specific thresholds
- `is_custom` — True if PM submitted a custom metric approved by DE
- `required_measures` — JSON array of input parameter names (e.g. ["Actual Effort", "Planned Effort"])

---

## GROUP 5 — QPM Data Entry Tables

### `project_period_measures`
**What it stores:** The raw parameter values PM enters (e.g. "Actual Effort = 120 person-hours for July 2026").  
**Rows:** 444  
**Why it exists:** This is the "shared parameter" concept — one value entered once, used by multiple metrics. For example, "Delivered and Accepted Size" is entered once but feeds 6+ metrics. This table stores one row per (project, period, parameter_name).  
**Frontend:** PM → Data Entry (Sheet 2) — the input cards. Each card = one row in this table.  
**Key columns:**
- `project_id`, `kpi_plan_id`
- `period_label` — e.g. "July 2026"
- `measure_name` — e.g. "Delivered and Accepted Size"
- `actual_value` — the number PM typed

---

### `kpi_measure_entries`
**What it stores:** Raw measure entries per plan metric (legacy/backward-compatibility store).  
**Rows:** 242  
**Why it exists:** Kept in sync with `project_period_measures` during save. Used by the computation engine to retrieve values for a specific metric's calculation. Think of it as the per-metric view of the same data.  
**Frontend:** Not directly visible — used internally by the save/compute flow.

---

### `kpi_measurements`
**What it stores:** Computed KPI results — one row per metric per save operation.  
**Rows:** 246  
**Why it exists:** Every time PM clicks Save on the data entry page, the system computes each metric and inserts a new row here. Multiple saves for the same period create multiple rows (full history). This is the source for all charts and summaries.  
**Frontend:** PM → KPI Summary (Sheet 4) — charts and metric cards. PM → KPI Tracker (Sheet 3) — full table. DM → Review KPIs page.  
**Key columns:**
- `plan_metric_id` → FK to `kpi_plan_metrics`
- `frequency_name` — the period label (e.g. "July 2026")
- `actual_value` — the computed KPI result
- `target`, `lsl`, `usl` — thresholds at time of computation (snapshot)
- `rag_status` — GREEN / AMBER / RED (computed from value vs thresholds)
- `measure1_name` through `measure4_name` and `measure1_value` through `measure4_value` — snapshot of the input parameters used

---

## GROUP 6 — Engagement Model Tables

### `engagement_model_items`
**What it stores:** The dropdown values for all 5 engagement model fields — Project Types (14+), Delivery Models (12+), Project Categories (6+), Work Size Units (7+), and Dimensions (11+).  
**Rows:** 56  
**Why it exists:** Replaces hardcoded frontend arrays. DE and Platform Admin can add new types/models here without code changes.  
**Frontend:** DE Catalog → Engagement Model tab. Platform Admin → Settings → Engagement Model tab. Also populates the dropdowns on the Create Project form.  
**Key columns:**
- `item_type` — PROJECT_TYPE / DELIVERY_MODEL / PROJECT_CATEGORY / WORK_SIZE_UNIT / DIMENSION
- `value` — the actual dropdown option (e.g. "AI-Development", "Agile-AI")
- `is_active` — inactive items don't appear in dropdowns
- `min_mandatory_count` — for DIMENSION rows only: minimum metrics required from this category at plan finalization (Spec 18.3)

---

### `engagement_model_metric_mappings`
**What it stores:** Which catalog metrics belong to each engagement model item, and whether each is mandatory.  
**Rows:** 1,584  
**Why it exists:** When admin creates a new Project Type (e.g. "AI-Development") and maps 15 metrics to it, those mappings live here. On project creation, Path 2 of the metric selection logic queries this table.  
**Frontend:** DE Catalog → Engagement Model → select any item → "Metrics →" → right panel shows Mapped/Add from Catalog sub-tabs.  
**Key columns:**
- `engagement_item_id` → FK to `engagement_model_items`
- `catalog_metric_id` → FK to `qpm_catalog_metrics`
- `is_mandatory` — True = metric auto-selects as Mandatory for projects with this engagement item

---

### `engagement_model_presets`
**What it stores:** Evidence-based exact metric lists for specific (project_type, delivery_model) combinations, derived from real client projects.  
**Rows:** 22 (3 presets × their metric counts)  
**Why it exists:** More precise than the broad ILIKE fallback. When a PM creates a project with a known engagement combo, they get exactly the right metrics, not a broad approximation.  
**Frontend:** Implicitly used — when PM creates a project, the preset auto-selects metrics. No direct UI to manage presets (admin manages via seed script or directly in DB).  
**Seeded presets:**
- Testing / Agile-Scrum → 7 metrics (from JNJ AM R5.0)
- Maintenance / ITIL based Service Delivery → 6 metrics (from JNJ Platform Support)
- Fresh Development / Agile-Scrum → 9 metrics (from JNJ JJCC Hybris)

---

## GROUP 7 — Workflow Tables

### `action_items`
**What it stores:** Corrective action items raised against a project when KPIs are underperforming.  
**Rows:** 16  
**Why it exists:** DMs and PMs raise action items when a metric is RED/AMBER or for the overall project. Each action item has a root cause, corrective action, owner, due date, and status (OPEN/IN_PROGRESS/CLOSED).  
**Frontend:**
- DM → Action Items page (`/delivery-manager/actions`)
- DM → Review KPIs page (inline raise)
- PM → Actions page (`/pm/actions`) — consolidated view with type filter (Project-Level vs Metric-Level)
- PM → KPI Summary page — "Raise Project Action" card below metrics
**Key columns:**
- `project_id` → FK to `projects`
- `metric_name` — null for project-level actions, metric name for metric-specific
- `rag_status_at_creation` — RAG colour when action was raised
- `action_status` — OPEN / IN_PROGRESS / CLOSED
- `created_by_user_id` → FK to `users` (who raised it — DM or PM)

---

### `dm_reviews`
**What it stores:** Delivery Manager commentary for each project per reporting period.  
**Rows:** 4  
**Why it exists:** DM adds text commentary about project KPI performance. Creates an audit trail of delivery oversight. Multiple reviews per project are allowed (each period creates a new row).  
**Frontend:** DM → Project Review page → Submit Your Review form and Review History section.  
**Key columns:**
- `project_id`, `kpi_plan_id`
- `period_label` — e.g. "July 2026"
- `dm_comments` — the DM's review text
- `reviewed_by_user_id` → FK to `users`
- `reviewed_at` — timestamp

---

### `notifications`
**What it stores:** In-app bell notifications for users.  
**Rows:** 10  
**Why it exists:** Automatic notifications are created when DM raises an action item (PM gets notified), or when KPI submissions are reviewed. PM clicks notification → deep-link to relevant page.  
**Frontend:** Header bell icon. Unread count badge. Dropdown list. Click → mark as read and navigate.  
**Key columns:**
- `user_id` → FK to `users` (recipient)
- `type` — ACTION_ITEM_CREATED / SUBMISSION_DRAFT_CREATED / etc.
- `is_read` — False until user clicks
- `related_project_id` → FK to `projects` (for deep-link navigation)

---

## GROUP 8 — Delivery Excellence Tables

### `metric_approval_requests`
**What it stores:** PM requests to add a custom metric not in the catalog.  
**Rows:** 2  
**Why it exists:** PMs cannot directly add custom metrics to the catalog. They submit a request; DE approves or rejects it. Approved requests become catalog entries.  
**Frontend:** PM → KPI Plan → Request Custom Metric tab. DE → Catalog page → Pending Requests tab.  
**Key columns:**
- `kpi_plan_id` → FK to `kpi_plans` (which project plan needs this metric)
- `metric_name`, `formula`, `uom`, `intent`, `justification`
- `status` — PENDING / APPROVED / REJECTED
- `review_comments` — DE's reason for approval/rejection

---

### `metric_recommendations`
**What it stores:** Recommended corrective actions for specific metric breach types.  
**Rows:** 16  
**Why it exists:** When a metric goes RED or AMBER, the system shows "Why is this red?" with an AI-style explanation. The recommendation text for each metric+breach type combo is stored here.  
**Frontend:** PM → KPI Summary page → click any RED/AMBER metric card → "Why is this red?" panel. DE/Platform Admin → Settings → Recommendations tab.  
**Key columns:**
- `metric_name` — matches `qpm_catalog_metrics.name`
- `breach_type` — e.g. "under_lsl" (Below LSL for Higher-better), "over_usl" (Above USL for Lower-better)
- `recommendation_text` — the advice shown to PM/DM

---

## GROUP 9 — System Tables

### `system_configurations`
**What it stores:** Global system settings (one row).  
**Rows:** 1  
**Why it exists:** Platform Admin can adjust governance settings like reporting frequency, approval SLA, health thresholds, and notification rules without code changes.  
**Frontend:** Platform Admin → Settings → General / Health Thresholds / Notifications tabs.  
**Key columns:**
- `reporting_frequency` — MONTHLY / WEEKLY
- `approval_sla_days` — days allowed for DH review
- `green_threshold_min`, `amber_threshold_min`, `red_threshold_min` — RAG band boundaries
- `escalation_rules_enabled`, `project_red_alerts_enabled`, `bu_risk_alerts_enabled`

---

## GROUP 10 — V1 Governance Tables (Built, Minimal Data)

These tables are part of the V1 governance submission lifecycle. The QPM module (V2) largely replaces the need for manual submissions, but this infrastructure still exists and is used by some pages.

### `submissions`
**What it stores:** Formal governance submissions (DRAFT → SUBMITTED → APPROVED etc.).  
**Why it exists:** In V1, PMs created formal submissions that DH approved/rejected. In V2, QPM plans replaced this for metric tracking, but the submission lifecycle still exists for governance workflow.  
**Frontend:** PM → Submission page. DH → Submission Review page.  
**Status:** Built and functional, but most projects use the QPM flow instead.

### `submission_statuses`
**What it stores:** The 7 status codes for the submission lifecycle (DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, REOPENED, LOCKED).  
**Rows:** 7  
**Why it exists:** Static lookup table for submission status codes and display labels.

### `submission_lifecycle_audits`
**What it stores:** Audit trail of every status change on a submission.  
**Why it exists:** Full audit history — who changed what when on each submission.

### `governance_periods`
**What it stores:** Reporting periods (e.g. "Monthly June 2026") created by Platform Admin.  
**Why it exists:** PMs select a governance period when creating a submission. Without active periods, PMs cannot submit.  
**Frontend:** Platform Admin → Settings → Gov. Periods tab. PM → Create Submission → period selector.

### `governance_reviews`
**What it stores:** DH/DM review records for governance submissions.  
**Why it exists:** Separate from `dm_reviews` (which is for QPM KPI commentary) — this is for formal submission approvals.

---

## GROUP 11 — Health Engine Tables (Built, No Data Yet)

### `health_scores`
**What it stores:** Overall project health scores computed from the V1 governance engine.  
**Why it exists:** The V1 health engine computed numeric scores (GREEN=90, AMBER=65, RED=40) per submission. V2 uses QPM measurements and `current_rag` on projects instead.  
**Status:** Built, no data. The `current_rag` field on `projects` serves the same purpose in V2.

### `dimension_scores`
**What it stores:** Per-dimension health scores (Schedule, Quality, Scope, Finance, People) for each submission.  
**Why it exists:** V1 governance split project health into 5 dimensions. V2 uses `category_rag` in the QPM summary response instead.  
**Status:** Built, referenced in code, no data currently.

---

## GROUP 12 — V1 Metric Tables (Legacy)

### `metric_definitions`
**What it stores:** The 13 original V1 governance metrics (Planned Progress %, Test Pass Rate, Budget Used, etc.).  
**Rows:** 13  
**Why it exists:** The V1 health engine used these 13 specific metrics with fixed weights. V2 replaced them with the 86-metric QPM catalog, but the V1 metrics still exist for backward compatibility.  
**Status:** Used by the DM Submission Review page which shows V1-style metrics.

### `metric_values`
**What it stores:** Actual values entered for V1 governance metrics.  
**Why it exists:** Paired with `metric_definitions` — PM entered values for the 13 V1 metrics in their governance submissions.  
**Status:** Built, no data (all projects use QPM now).

---

## GROUP 13 — QPM Sheet 5 Tables

### `kpi_doc_info`
**What it stores:** Document metadata for each project's KPI plan document (Project ID, Customer Name, Document Title, Issue No., PM name, dates).  
**Why it exists:** Replicates the "Document Information" sheet (Sheet 5) from the QPM Plan Excel workbook.  
**Frontend:** PM → QPM → Doc Info (Sheet 5).

### `kpi_doc_version_history`
**What it stores:** Version history entries for the KPI plan document (Issue ID, dates, preparer, reviewer, description).  
**Why it exists:** Each revision of the KPI plan document gets a version history entry, matching the Excel version history table.  
**Frontend:** PM → QPM → Doc Info → Version History table.

---

## GROUP 14 — Excel Upload Tables

### `excel_import_batches`
**What it stores:** Metadata for each Excel file uploaded by PM (filename, upload date, status, validation results).  
**Why it exists:** PMs can upload metric values via Excel instead of typing them manually. Each upload is one batch.  
**Frontend:** PM → Submission page → Excel Upload Workflow tab.

### `excel_import_rows`
**What it stores:** Individual rows parsed from an uploaded Excel file (metric code, value, validation status).  
**Why it exists:** PM reviews the parsed Excel data before applying it to the submission. Each row shows whether the value is valid.  
**Frontend:** PM → Submission page → Excel Preview Table.

---

## GROUP 15 — Project Management Tables

### `project_phases`
**What it stores:** Sprints, Releases, and Milestones for each project.  
**Why it exists:** PMs can define project phases (e.g. Sprint 1, Release 2, Milestone: Go-Live) with planned and actual dates.  
**Frontend:** PM → Projects → any project → Phases button → Project Phases page.

---

## GROUP 16 — System Audit

### `audit_events`
**What it stores:** System-level change audit log (who changed what, when, old value, new value).  
**Why it exists:** Platform Admin can view a complete audit trail of all significant changes in the system.  
**Frontend:** Platform Admin → Settings → System Audits tab.

---

## How Tables Connect (Key Relationships)

```
roles ←─── users ──────────────────────────────────────────────┐
              │                                                   │
              ▼                                                   │
        business_units ──── accounts ──── projects ─────────────┘
                                              │
                              ┌───────────────┼───────────────────┐
                              │               │                   │
                              ▼               ▼                   ▼
                         kpi_plans      action_items        submissions
                              │
                   ┌──────────┼──────────────────┐
                   │          │                  │
                   ▼          ▼                  ▼
           kpi_plan_metrics  kpi_doc_info   project_period_measures
                   │
                   ▼
           kpi_measurements (computed from kpi_measure_entries)


qpm_catalog_metrics ──────────────────────────────────────────────────┐
        │                                                              │
        ├──── engagement_model_metric_mappings ──── engagement_model_items
        │
        └──── engagement_model_presets (name match, not FK)
```

---

## The 3-Path Metric Auto-Selection (Summary)

When PM creates a project:

```
1. Check engagement_model_presets
   (project_type + delivery_model exact match)
   → Found: use those N metrics (all Mandatory)

2. Check engagement_model_metric_mappings
   (only if project_type OR delivery_model is a CUSTOM value)
   → Found: use mapped metrics (mandatory flag per mapping)

3. ILIKE fallback on qpm_catalog_metrics
   (for standard type/model combos not in presets)
   → compliance='M' + project_type ILIKE + delivery_model ILIKE
```

---

*This file is automatically kept up to date when database changes occur.*
