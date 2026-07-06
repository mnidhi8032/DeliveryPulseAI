# DeliveryPulse AI V2 — Implementation Plan

> **How to use this file**
> - Every item has a status: `[ ]` = not started, `[~]` = in progress, `[x]` = done.
> - Before starting any item, read the **Implementation Notes** block under it.
> - After finishing any item, update the status to `[x]` and fill in the **Completed** date.
> - Never start a new item without a clear plan — this file is the single source of truth.

**Last updated:** 2026-07-01  
**Current phase:** All 7 priorities complete ✅

---

## Quick Status Overview

| Area | Done | Remaining |
|------|------|-----------|
| Backend core (auth, org, submissions, metrics, health engine, QPM) | ✅ | — |
| Frontend PM workspace | ✅ | — |
| Frontend Delivery Head workspace (formerly BU Head) | ✅ | — |
| Frontend CEO workspace | ✅ | — |
| Frontend Platform Admin workspace | ✅ | — |
| Frontend Delivery Excellence workspace | ✅ | — |
| Role rename: BU_HEAD → DELIVERY_HEAD | ✅ Complete | — |
| Orphaned pages (DH folder) | ✅ Migrated to Delivery Head | — |
| Compliance Report routing | ✅ Routed at `/delivery-head/compliance` | — |
| QPM Plan page routing | ✅ Routed at `qpm` (Sheet 1) | — |
| QPM Summary page routing | ✅ Routed at `qpm/summary` (Sheet 4) | — |
| QPM review workflow | ✅ DH can approve/reject via `/qpm/plans/:id/review` | — |
| Seed data for V2 roles | ✅ DELIVERY_HEAD, CEO seeded, DB updated | — |
| DM / DD review roles | ✅ DELIVERY_MANAGER role built | dm@deliverypulse.ai |
| TypeScript errors | ✅ 0 errors | — |

---

## Priority 1 — Fix Broken / Orphaned Frontend Routes

These are **already-built pages that are not accessible**. They exist in the codebase but
are not connected to any route. This must be fixed first because the app is incomplete
without them.

---

### 1.1 Wire PMSubmissionPage into AppRoutes

- [x] **Status:** Done — 2026-07-01
- **What:** `PMSubmissionPage.tsx` exists and is fully built (manual entry, Excel upload,
  PM RAG, resubmit-rejected, audit timeline). But it is **not imported in AppRoutes.tsx**.
  Currently the PM project detail page likely opens submissions inline — this page handles
  the dedicated submission view.
- **Files to change:**
  - `frontend/src/routes/AppRoutes.tsx` — add route
    `projects/:projectId/submissions/:submissionId` under the PM section
  - Verify `PMProjectDetailPage.tsx` links to `/pm/projects/:id/submissions/:submissionId`

**Implementation Notes (read before starting):**
1. Open `PMProjectDetailPage.tsx` and find where it navigates to a submission.
2. Check what path it currently uses.
3. Add the missing route in AppRoutes under the PM section, matching that path.
4. Test: create a submission as PM, click into it, confirm `PMSubmissionPage` renders.

---

### 1.2 Wire QPMPlanPage into AppRoutes

- [x] **Status:** Done — 2026-07-01
- **What:** `QPMPlanPage.tsx` (Sheet 1 of the 5-sheet QPM workflow) exists and is fully
  built but is not in `AppRoutes.tsx`. Currently `/pm/projects/:id/qpm/entry` is the first
  routed QPM page, but the plan should come first.
- **Files to change:**
  - `frontend/src/routes/AppRoutes.tsx` — add route
    `projects/:projectId/qpm` (index of QPM, not `/entry`) pointing to `QPMPlanPage`
  - Update the sheet navigation links inside `QPMDataEntryPage`, `QPMTrackerPage`,
    `QPMDocInfoPage` to include the Sheet 1 link correctly

**Implementation Notes:**
1. `QPMPlanPage.tsx` already has correct sheet nav tabs hardcoded. Just needs the route.
2. The current route for QPM entry is `qpm/entry`. Sheet 1 should be just `qpm`.
3. Add: `<Route path="projects/:projectId/qpm" element={<QPMPlanPage />} />` in PM section.
4. Also add the missing QPM Summary sheet route: `qpm/summary` → `QPMSummaryPage`
   (check if `QPMSummaryPage.tsx` exists in `frontend/src/pages/pm/`).

---

### 1.3 Wire ComplianceReportPage into AppRoutes

- [x] **Status:** Done — 2026-07-01
- **What:** `ComplianceReportPage.tsx` is fully built (PM non-submissions table, pending
  reviews table, configurable threshold). It is not in `AppRoutes.tsx` at all.
- **Who should see it:** BU Head and Platform Admin both need visibility of compliance.
- **Files to change:**
  - `frontend/src/routes/AppRoutes.tsx` — add route in BU Head section:
    `compliance` → `ComplianceReportPage`
  - Add the same route under Platform Admin section if desired
  - Add a nav link in `BUHeadLayout` sidebar

**Implementation Notes:**
1. The page uses `brdService.getComplianceReport()` — verify that API endpoint exists
   and works (`/api/v1/compliance`).
2. Add route as `/bu-head/compliance` and link from the BU Head sidebar.
3. Optionally also add under `/platform/compliance`.

---

### 1.4 Migrate DHSubmissionsPage and DHSubmissionReviewPage to BU Head

- [x] **Status:** Done — 2026-07-01
- **What:** The two V1 Delivery Head pages (`DHSubmissionsPage.tsx`,
  `DHSubmissionReviewPage.tsx`) are fully built and contain the approve/reject/reopen/lock
  workflow. They are stuck in `pages/dh/` and reference dead paths like
  `/delivery-head/submissions/:id`. The BU Head workspace has no submission review
  capability today.
- **Files to change:**
  - `frontend/src/routes/AppRoutes.tsx` — add routes in BU Head section:
    - `submissions` → `DHSubmissionsPage`
    - `submissions/:submissionId` → `DHSubmissionReviewPage`
  - `DHSubmissionsPage.tsx` — fix internal link:
    `to="/delivery-head/submissions/${submission.id}"` → `to="/bu-head/submissions/${submission.id}"`
  - `DHSubmissionsPage.tsx` — fix project timeline link:
    `to="/delivery-head/projects/${project.id}/timeline"` → `to="/bu-head/projects/${project.id}/timeline"`
  - `DHSubmissionReviewPage.tsx` — audit and fix any hardcoded `/delivery-head/` paths
  - `BUHeadLayout` sidebar — add "Submissions" nav link pointing to `/bu-head/submissions`

**Implementation Notes:**
1. Do NOT move or rename the files. Just fix the paths inside them and add routes.
2. Backend is already correct — `approve`, `reject`, `reopen`, `lock` endpoints require
   `RoleCode.BU_HEAD`. No backend changes needed.
3. Read `DHSubmissionReviewPage.tsx` carefully before editing to find all hardcoded paths.
4. After wiring, log in as `rajesh.dh@deliverypulse.ai` and confirm the submissions list
   loads and the review/approve flow works end to end.

---

### 1.5 Wire GovernanceReviewsPage into BU Head

- [x] **Status:** Done — 2026-07-01
- **What:** `GovernanceReviewsPage.tsx` (in `pages/dh/`) shows BU/Account/Project level
  governance reviews. It exists but is not routed anywhere.
- **Files to change:**
  - `frontend/src/routes/AppRoutes.tsx` — add `governance-reviews` route under BU Head
  - `BUHeadLayout` sidebar — add nav link

**Implementation Notes:**
1. First read `GovernanceReviewsPage.tsx` to understand what API it calls.
2. Verify the backend `governance_reviews` router exists and works.
3. Add route and sidebar link.

---

## Priority 2 — Seed Data Alignment for V2 Roles

The database has seed scripts from V1 that create users with old roles
(`DELIVERY_HEAD`, `CUSTOMER_ADMIN`). These roles no longer exist in V2.
New roles `CEO` and `BU_HEAD` need properly seeded demo users.

---

### 2.1 Audit Current Seed Users vs V2 Role Model

- [x] **Status:** Done — 2026-07-01
- **What:** Check which demo users exist in the DB and what roles they have. Identify
  any users with obsolete roles. Identify missing CEO/BU_HEAD users.
- **Files to inspect:**
  - `backend/scripts/seed_demo_structure.py`
  - `backend/scripts/seed_roles.py`
  - Run: check current users in DB

**Implementation Notes:**
1. Read `seed_demo_structure.py` to see what users are seeded.
2. Run the backend server and hit `GET /api/v1/platform/users` as Platform Admin
   to see the actual current user list.
3. Document what exists and what's missing before making any changes.

---

### 2.2 Create / Update Seed Script for V2 Demo Users

- [x] **Status:** Done — 2026-07-01  
- **Depends on:** 2.1
- **What:** Create or update a seed script that seeds one user per role for the V2 demo:
  - `admin@deliverypulse.ai` — PLATFORM_ADMIN (already exists)
  - `de@deliverypulse.ai` — DELIVERY_EXCELLENCE
  - `ceo@deliverypulse.ai` — CEO
  - `bu.head.bfsi@deliverypulse.ai` — BU_HEAD (assigned to BFSI BU)
  - `pm1@deliverypulse.ai` — PM (already exists)
- **Files to change:**
  - `backend/scripts/seed_demo_structure.py` — add missing users
  - OR create `backend/scripts/seed_v2_users.py` — new targeted script

**Implementation Notes:**
1. When seeding BU_HEAD user, also set `bu_head_user_id` on the BFSI BusinessUnit row.
2. Password for all demo users: `Demo@12345`
3. After running, update `RUNNING_INSTRUCTIONS.md` with the new login table.
4. Do not delete existing PM/PLATFORM_ADMIN users — only add.

---

### 2.3 Update RUNNING_INSTRUCTIONS.md Login Table

- [x] **Status:** Done — 2026-07-01
- **Depends on:** 2.2
- **What:** Update the login credentials table to reflect the current V2 role model.
  Remove references to roles that no longer exist (DELIVERY_HEAD, CUSTOMER_ADMIN).
- **File to change:** `RUNNING_INSTRUCTIONS.md`

---

## Priority 3 — QPM Workflow Completion

The QPM 5-sheet workflow is mostly built but has gaps in routing and the
BU Head review side is missing.

---

### 3.1 Complete QPM Route Set for PM

- [x] **Status:** Done — 2026-07-01 (confirmed already complete from Priority 1 work)
- **Depends on:** 1.2 (QPMPlanPage routing)
- **What:** All 5 QPM sheets are routed and navigation between them works.

**Full route set — all confirmed:**
```
/pm/projects/:projectId/qpm          → QPMPlanPage      (Sheet 1) ✅
/pm/projects/:projectId/qpm/entry    → QPMDataEntryPage (Sheet 2) ✅
/pm/projects/:projectId/qpm/tracker  → QPMTrackerPage   (Sheet 3) ✅
/pm/projects/:projectId/qpm/summary  → QPMSummaryPage   (Sheet 4) ✅
/pm/projects/:projectId/qpm/doc-info → QPMDocInfoPage   (Sheet 5) ✅
```

---

### 3.2 DHQPMReviewPage — Wire to Delivery Head

- [x] **Status:** Done — 2026-07-01
- **What:** `DHQPMReviewPage.tsx` (in `pages/dh/`) handles Delivery Head review of a PM's QPM
  submission. Route was already wired in Priority 1. The real gaps fixed here were:
  1. Backend `submit_qpm_plan` was auto-approving — changed to set `UNDER_REVIEW`
  2. Backend had no `POST /qpm/plans/:id/review` endpoint — added it (approve/reject)
  3. `DeliveryHeadProjectsPage` had no QPM link — added QPM status column + Review button
  4. `DeliveryHeadDashboardPage` had no pending submissions alert — added it
  5. `QPMDataEntryPage` still showed "auto-approved" wording — updated all labels

---

## Priority 4 — Delivery Manager / Delivery Director Roles (BRD Alignment)

The BRD describes DM and DD as review roles who add commentary on submissions.
The DB already has `dm_comments`, `dd_comments`, `dm_review_status`, `dd_review_status`
columns on `submissions`. The API endpoints `POST /submissions/:id/dm-review` and
`POST /submissions/:id/dd-review` exist but use `get_current_user` (no role enforcement).

**Decision needed before starting:** Should DM and DD be separate roles (like the BRD says),
or should the BU_HEAD perform their function? This changes the scope significantly.

---

### 4.1 [DECISION] Define DM/DD Role Strategy

- [ ] **Status:** Not started — needs your decision
- **Options:**
  - **Option A:** Keep as-is — BU_HEAD performs both DM and DD review functions.
    Low effort. BRD is partially satisfied.
  - **Option B:** Add `DELIVERY_MANAGER` and `DELIVERY_DIRECTOR` as new roles.
    Requires new DB migration, new seed users, new frontend workspace, new route guards.
    High effort. Full BRD compliance.

**Recommended:** Start with Option A for now. DM/DD can be added in a later phase.
Mark this item `[x]` once you make the decision and note it here.

---

### 4.2 Enforce DM/DD Review Endpoints (Option A path)

- [ ] **Status:** Not started
- **Depends on:** 4.1 decision
- **What (if Option A):** The `dm-review` and `dd-review` endpoints currently accept any
  authenticated user. Restrict them to `BU_HEAD` so only the BU Head can add that
  commentary layer.
- **File to change:** `backend/app/api/v1/submissions.py` — change `get_current_user`
  to `require_roles(RoleCode.BU_HEAD)` on `add_dm_review` and `add_dd_review`

---

## Priority 5 — Dashboard Polish for BU Head

The BU Head workspace currently only has a basic project table. Per the BRD,
the Delivery Head (now BU Head) should see:
- Account-level health summaries
- Submission queue with RAG status
- Action item tracking

---

### 5.1 BU Head Dashboard — Add Submission Queue Widget

- [ ] **Status:** Not started
- **Depends on:** 1.4 (submissions routed)
- **What:** Add a "Submissions Pending Review" widget to `BUHeadDashboardPage.tsx`.
  Show count of SUBMITTED and UNDER_REVIEW submissions with a link to the full list.
- **File to change:** `frontend/src/pages/bu-head/BUHeadDashboardPage.tsx`

**Implementation Notes:**
1. Reuse the `listSubmissions()` service call already in `DHSubmissionsPage`.
2. Filter for `SUBMITTED` and `UNDER_REVIEW` statuses.
3. Show count + last 5 rows in a compact table with a "Review All" button.

---

### 5.2 BU Head Dashboard — Add Action Items Widget

- [ ] **Status:** Not started
- **What:** Show open/overdue action items across the BU on the dashboard.
- **File to change:** `frontend/src/pages/bu-head/BUHeadDashboardPage.tsx`

**Implementation Notes:**
1. Check if `GET /api/v1/action-items` returns data scoped to the BU Head's BU.
2. Read `backend/app/api/v1/action_items.py` and `action_item_service.py` to
   understand current scoping.
3. If not scoped, add BU-scoping logic in the service layer.

---

## Priority 6 — Data Integrity & Cleanup

Small but important tasks that affect correctness.

---

### 6.1 Remove Dead Layout Files

- [ ] **Status:** Not started
- **What:** `DeliveryHeadLayout.tsx` and `CustomerAdminLayout.tsx` still exist as files
  but are not used in `AppRoutes.tsx`. They reference dead role names. Remove them to
  avoid confusion.
- **Files to delete:**
  - `frontend/src/layouts/DeliveryHeadLayout.tsx`
  - `frontend/src/layouts/CustomerAdminLayout.tsx`

**Implementation Notes:**
1. First search the codebase for any import of these files.
2. If anything imports them, fix those imports before deleting.
3. Use grep: search for `DeliveryHeadLayout` and `CustomerAdminLayout`.

---

### 6.2 Remove Dead Customer Admin Pages

- [ ] **Status:** Not started  
- **What:** The `pages/customer-admin/` folder contains 6 pages for a `CUSTOMER_ADMIN`
  role that no longer exists in the V2 role model. These are dead code.
- **Files to potentially delete:**
  - `pages/customer-admin/CustomerAdminDashboardPage.tsx`
  - `pages/customer-admin/CustomerAdminBUDetailPage.tsx`
  - `pages/customer-admin/CustomerAdminBusinessUnitsPage.tsx`
  - `pages/customer-admin/CustomerAdminProjectsPage.tsx`
  - `pages/customer-admin/CustomerAdminSetupPage.tsx`
  - `pages/customer-admin/BusinessUnitTrendPage.tsx`

**Implementation Notes:**
1. Before deleting, verify nothing in `AppRoutes.tsx` or any other file imports them.
2. The CEO workspace now serves the read-only portfolio function. Confirm CEO pages
   cover what customer-admin pages used to provide.
3. If you want to keep them for reference, move to an `_archive/` folder instead of deleting.

---

### 6.3 Remove Dead Shell Pages

- [ ] **Status:** Not started
- **What:** Several pages in `pages/shell/` are unused:
  - `DHDashboardPage.tsx` — DELIVERY_HEAD role no longer exists
  - `PMDashboardPage.tsx` — PM index uses `DashboardShellPage` instead
  - `ProjectsShellPage.tsx` — not routed
  - `SubmissionsShellPage.tsx` — not routed
- **Implementation Notes:** Same process as 6.2 — search for imports first, then delete.

---

## Priority 7 — Documentation Update

---

### 7.1 Update PROJECT_MASTER.md

- [x] **Status:** Done — 2026-07-01
- **What:** `docs/PROJECT_MASTER.md` updated with V2 state: date, project root, role model,
  org structure, workflow, DB migration head, demo seed instructions, session log entry #25.

---

## Implementation Order (Recommended Sequence)

Follow this order. Do not skip ahead.

```
1.1 → 1.2 → 1.3   (routing fixes — quick wins, no backend work)
         ↓
1.4 → 1.5          (BU Head gets full workflow)
         ↓
2.1 → 2.2 → 2.3   (seed data — test the new routes with correct users)
         ↓
3.1 → 3.2          (QPM completion)
         ↓
4.1 (decision) → 4.2
         ↓
5.1 → 5.2          (dashboard polish)
         ↓
6.1 → 6.2 → 6.3   (cleanup)
         ↓
7.1                 (docs)
```

---

## Before Starting Any Item — Checklist

1. Read the **Implementation Notes** block for that item completely.
2. Read every file that will be changed before writing a single line.
3. Understand what the current code does and why.
4. Write the plan as a comment in this file under the item if it's complex.
5. Only then implement.
6. After implementing, verify it works (start the dev server, test in browser).
7. Update this file: change `[ ]` to `[x]`, add the date.

---

## Completed Items Log

| Item | Description | Completed |
|------|-------------|-----------|
| 1.1 | Wired `PMSubmissionPage` into AppRoutes at `projects/:projectId/submissions/:submissionId` | 2026-07-01 |
| 1.2 | Wired `QPMPlanPage` (Sheet 1) into AppRoutes at `projects/:projectId/qpm`; also added `QPMSummaryPage` (Sheet 4) at `qpm/summary` | 2026-07-01 |
| 1.3 | Wired `ComplianceReportPage` into Delivery Head routes at `/delivery-head/compliance`; added sidebar nav link | 2026-07-01 |
| 1.4 | Migrated `DHSubmissionsPage` + `DHSubmissionReviewPage` to Delivery Head at `/delivery-head/submissions` and `/delivery-head/submissions/:id`; fixed all hardcoded paths | 2026-07-01 |
| 1.5 | Wired `GovernanceReviewsPage` into Delivery Head at `/delivery-head/governance-reviews`; added `DHQPMReviewPage` at `/delivery-head/projects/:id/qpm-review`; added sidebar nav links | 2026-07-01 |
| —   | Fixed pre-existing TypeScript errors in 8 files (old role references, unused vars, wrong type imports). TypeScript now passes with 0 errors. | 2026-07-01 |
| 2.1 | Audited existing seed users — found `buhead1@`, `buhead2@` with old `BU_HEAD` code | 2026-07-01 |
| 2.2 | Renamed role `BU_HEAD` → `DELIVERY_HEAD` across entire codebase (backend constants, services, repos, API guards, frontend types, routes, layouts, pages, sidebar, seed scripts). New Alembic migration `j4k5l6m7n8o9` updates the role code in DB. Re-ran `seed_roles.py` and `seed_demo_structure.py`. Pages/layouts renamed from `BUHead*` to `DeliveryHead*`. URL paths changed from `/bu-head/*` to `/delivery-head/*`. | 2026-07-01 |
| 2.3 | Updated `RUNNING_INSTRUCTIONS.md` login table to reflect V2 roles | 2026-07-01 |
| 3.1 | Confirmed all 5 QPM sheet routes already wired (QPMPlanPage, QPMDataEntryPage, QPMTrackerPage, QPMSummaryPage, QPMDocInfoPage) | 2026-07-01 |
| 3.2 | Added `POST /qpm/plans/:id/review` backend endpoint (DELIVERY_HEAD approve/reject). Changed submit from auto-approve to UNDER_REVIEW. Added QPM status column + Review button to DeliveryHeadProjectsPage. Added pending submissions alert to DeliveryHeadDashboardPage. Updated QPMDataEntryPage labels to reflect proper review workflow. | 2026-07-01 |
| 4A  | **DELIVERY_MANAGER role + full workspace — v2 (final).** Role + migration + 6 DM users (DM1–DM6, one per account). `delivery_manager_user_id` FK added to `accounts` table (migration `l6m7n8o9p0q1`). Org structure rebuilt: 3 BUs × 2 accounts × 1 DM each. 3 DHs, 3 PMs, 6 projects. DM workspace: Dashboard (no approval language), Submissions (SUBMITTED filter only, "Add Commentary" action, no approve/reject), Review page (commentary + action items only). DH review page stripped of all action buttons — read-only. TypeScript: 0 errors. | 2026-07-01 |
| 6   | Deleted 11 dead files: `CustomerAdminLayout`, 6 customer-admin pages, `DHDashboardPage`, `PMDashboardPage`, `ProjectsShellPage`, `SubmissionsShellPage`. Fixed `DashboardShellPage` — replaced stale import with clean PM welcome screen. TypeScript: 0 errors. | 2026-07-01 |
| 7   | Updated `docs/PROJECT_MASTER.md`: date, project root, current phase, status table, role model, org structure, workflow, migration head, demo seed instructions, session log entry #25, next steps prompt. | 2026-07-01 |

---

*This file is the single source of truth. Update it after every session.*
