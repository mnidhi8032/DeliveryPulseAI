# Kickoff Module — Spec 01: Project Charter

**Status:** Planned — Not Yet Implemented
**Priority:** High
**Covers deck sections:** Customer and Project Overview · Project Scope
and Assumptions · Project Schedule, Deliverables & Acceptance Criteria ·
Project Organization Structure · Roles and Responsibilities · Current
Project Status · Document Information & Revision History

**Note on scope:** "Project Schedule, Deliverables & Acceptance
Criteria" was originally grouped with governance content in early
discussion, but belongs here instead — it's fill-once project setup
data, not an ongoing process definition. Governance *process*
(Execution Methodology, Gate Review Plan, etc.) stays in
`03_GOVERNANCE_PROCESS.md`.

---

## 1. Purpose

Give a PM one place to define a project's identity, scope, schedule,
and team — the fields currently scattered across 6 different slides of
a static deck, kept live and editable instead of filled in once and
forgotten.

---

## 2. Data Model

All tables key off the existing `projects.id` — nothing here duplicates
or competes with project creation itself (still handled by the existing
Platform Admin / Project model flow).

### 2.1 `project_charters` — one row per project

Core overview fields, mirroring the "Customer and Project Overview"
slide:

```
id, project_id (FK, unique — one charter per project)
project_description (text)
project_objectives (text)
billing_model (string: "Fixed Price" | "Time & Material" | "T&M with Cap" | "Outcome Based")
competencies (text — free text, e.g. "Dynamics F&O, Data & Analytics")
project_type (text)
technology (text)
customer_name (string)
location (string)
business_vertical (string)
customer_background_url (string, nullable)
project_start_date, project_end_date (date, nullable)
entered_by_user_id, created_at, updated_at
```

### 2.2 `project_charter_scope_items` — list, replaces the deck's bullet lists

```
id, project_id (FK)
item_type ("IN_SCOPE" | "OUT_OF_SCOPE")
description (text)
sort_order (int)
```

### 2.3 `project_charter_assumptions` — list

```
id, project_id (FK)
assumption_text (text)
sort_order (int)
```

### 2.4 `project_milestones` — list, from the Schedule slide

```
id, project_id (FK)
milestone_name (string)
start_date, end_date (date, nullable)
deliverables (text)
benefits_outcomes (text)
sort_order (int)
```

### 2.5 `project_deliverables` — list, also from the Schedule slide

```
id, project_id (FK)
deliverable_name (string)
acceptance_criteria (text)
remarks (text, nullable)
sort_order (int)
```

### 2.6 `project_org_members` — list, org chart

```
id, project_id (FK)
role_title (string)                 -- e.g. "Delivery Director", "BA"
person_name (string, nullable)      -- filled once staffed
side ("SONATA" | "CUSTOMER")
reports_to_id (FK to this same table, nullable) -- builds the tree
sort_order (int)
```

The `reports_to_id` self-reference is what lets the frontend render an
actual org chart rather than a flat list — same shape the kickoff
deck's org chart slide implies (Delivery Director → PM → BA/Test
Lead/Dev Lead → Testers/Developers).

### 2.7 `project_role_responsibilities` — list

```
id, project_id (FK)
role_title (string)
owner_type ("SONATA" | "CUSTOMER" | "OTHERS")
responsibilities (text)
sort_order (int)
```

Deliberately a separate table from `project_org_members` — the deck
treats "who's on the org chart" and "what's each role responsible for"
as two different slides, and a role can have defined responsibilities
before anyone's actually named to fill it.

### 2.8 `project_status_log` — append-only, from "Current Project Status"

```
id, project_id (FK)
activity (string)
status (string)
expected_completion_date (date, nullable)
responsibility (string)
entered_by_user_id, created_at
```

**Design choice:** this is a log (new row per update), not a single
editable snapshot — the deck's version implies a status "as of now,"
but an append-only table gives you status history for free, which the
static PPT never could. The frontend shows the latest entry per
`activity` by default, with older entries visible on request (same
"latest vs. full history" pattern already used elsewhere in your app
for KPI measurements).

### 2.9 Document Information & Revision History — simplified, not ported literally

The deck's "Document Information" slide (Document Title, Type, Process
Owner Group, Document ID, Issue ID, Issue Date, Classification) exists
because it's a **static document** that needs versioning metadata. Once
this becomes live database rows, most of those fields stop making
sense — there's no "Document ID" for a database record, and
`updated_at`/`entered_by_user_id` on `project_charters` already gives
you "who changed this last, and when" for free.

**Recommendation:** don't build a literal `project_charter_revisions`
table matching the deck's Issue ID/Prepared By/Reviewed By columns.
Instead:
- Rely on `updated_at` + `entered_by_user_id` (already present) for
  basic change tracking
- Add one lightweight field to `project_charters`:
  `last_reviewed_by_user_id`, `last_reviewed_at` (nullable) — captures
  the one thing from Revision History that's genuinely still useful
  (someone signed off on this being current), without recreating a
  whole manual versioning system for data that's now live and editable.

If a full audit trail (every historical change, not just the latest)
is wanted later, that's a separate, general-purpose feature (an audit
log table covering all of Kickoff, not just the charter) — flag as a
future enhancement, not part of this spec.

---

## 3. API Endpoints

All under `/api/v1/kickoff/projects/{project_id}/...`, PM/Delivery role
access (same access-control pattern as existing project endpoints):

| Method | Path | Purpose |
|---|---|---|
| GET | `/charter` | Fetch the charter + all related lists in one response |
| PUT | `/charter` | Update core overview fields |
| POST/PUT/DELETE | `/charter/scope-items` | Manage in/out-of-scope bullets |
| POST/PUT/DELETE | `/charter/assumptions` | Manage assumptions list |
| POST/PUT/DELETE | `/charter/milestones` | Manage milestones |
| POST/PUT/DELETE | `/charter/deliverables` | Manage deliverables |
| POST/PUT/DELETE | `/charter/org-members` | Manage org chart nodes |
| POST/PUT/DELETE | `/charter/responsibilities` | Manage roles & responsibilities |
| POST | `/charter/status-log` | Add a new status entry |
| GET | `/charter/status-log` | Fetch status history (latest + full log) |

The GET `/charter` response should return everything needed to render
the whole page in one call — same "unified fetch" pattern already used
by `getAllMeasures` in the QPM module — rather than 8 separate round
trips on page load.

---

## 4. Frontend

New page: `frontend/src/pages/pm/KickoffCharterPage.tsx`, reachable from
a project's detail view (a "Kickoff" tab or link alongside the existing
"Data Entry" / "Manage Metrics" actions on `MyProjectsPage`).

Sections on the page, in this order:
1. **Overview** — the core fields, simple form
2. **Scope & Assumptions** — two bullet-list editors (in-scope /
   out-of-scope) plus an assumptions table
3. **Schedule** — milestones table + deliverables table
4. **Org Structure** — rendered as an actual tree/org chart (using
   `reports_to_id`), with an "add member" action per node
5. **Roles & Responsibilities** — simple table, add/edit/delete rows
6. **Current Status** — shows latest status per activity, with a "view
   history" expansion per row (same pattern as the QPM measurement
   history we designed earlier in this conversation)

Keep each section visually modular (collapsible cards), since not
every PM fills in every section at once — a half-empty charter should
look like a form in progress, not a broken page.

---

## 5. Build Order

1. `project_charters` migration + model + core overview CRUD (Section 2.1)
2. List tables one at a time: scope items → assumptions → milestones →
   deliverables → org members → responsibilities → status log
3. The unified GET endpoint, once all list tables exist
4. Frontend page, section by section, matching the backend build order

---

## 6. What Does NOT Change

- Project creation itself (existing `Project` model, Platform Admin flow)
- Anything in `docs/specs/` (QPM module)
- No relationship yet to `docs/kickoff/04_METRICS_PLAN_INTEGRATION.md` —
  that file is deliberately separate and depends on a decision not yet made
