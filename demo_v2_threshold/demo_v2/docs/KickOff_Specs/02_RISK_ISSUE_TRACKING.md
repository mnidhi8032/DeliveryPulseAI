# Kickoff Module — Spec 02: Risk & Issue Tracking

**Status:** Planned — Not Yet Implemented
**Priority:** High
**Covers deck sections:** Project Risks & Opportunities · Project Open
Issues, Dependencies, and Actions

---

## 1. Purpose

Unlike `01_PROJECT_CHARTER.md`, this content isn't "fill in once at
kickoff" — risks and issues get added, updated, and closed throughout a
project's life. This spec treats them as **live-tracked tables with
row-level CRUD**, not a form that gets filled in once.

This is explicitly **not** a replacement for a dedicated issue tracker
(Jira, etc.) the organization may already use — it's meant to be a
lightweight, always-visible record tied directly to the project, for
the risks/issues that matter enough to surface during governance
reviews and DM/DH conversations, not a full project-management suite.

---

## 2. Data Model

### 2.1 `project_risks`

```
id, project_id (FK)
description (text)
probability (int, 1-5)        -- 1=Very unlikely ... 5=Very likely
impact (int, 1-5)             -- 1=Negligible ... 5=Severe
risk_exposure_index           -- computed: probability * impact, NOT stored redundantly —
                               -- either a SQL generated column or computed at read time
mitigation_plan (text)
status ("OPEN" | "MITIGATED" | "CLOSED")
entered_by_user_id, created_at, updated_at
```

**Why not store `risk_exposure_index` as a plain column:** it's fully
derived from two other columns on the same row — storing it separately
risks it silently going stale if `probability` or `impact` is edited
without recalculating it. Either use a database-generated column
(`GENERATED ALWAYS AS (probability * impact) STORED` in Postgres) or
compute it in the service layer on every read. Don't let the frontend
compute it itself — that's how two different pages end up disagreeing
about the same risk's exposure index.

### 2.2 `project_issues`

Covers Issues, Dependencies, and Actions as one table with a type
column — the deck already treats them as one table with an "Item Type"
column, so no need to split into three tables:

```
id, project_id (FK)
item_type ("ISSUE" | "DEPENDENCY" | "ACTION")
description (text)
affected_area (string, nullable)
severity ("H" | "M" | "L")
owner (string)                -- free text name, not necessarily a User FK —
                               -- the deck's "Owner" column is often a customer-side
                               -- person who isn't a DeliveryPulse user
expected_resolution (text)
target_date (date, nullable)
status ("OPEN" | "RESOLVED")
entered_by_user_id, created_at, updated_at, resolved_at (nullable)
```

**Why `owner` is free text, not a `User` foreign key:** many
issues/dependencies are owned by someone on the customer side who has
no DeliveryPulse account. Forcing a `User` FK here would make it
impossible to record "Customer SPoC" as an owner. If assigning to an
actual internal `User` is wanted later for internal-only items, add an
optional `owner_user_id` alongside `owner` (text) rather than replacing
it — free text stays the fallback.

---

## 3. API Endpoints

Under `/api/v1/kickoff/projects/{project_id}/...`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/risks` | List all risks (default: open first, sorted by exposure index descending) |
| POST | `/risks` | Create a risk |
| PUT | `/risks/{id}` | Update a risk (including status changes) |
| DELETE | `/risks/{id}` | Remove a risk (soft-delete preferred — see below) |
| GET | `/issues` | List all issues/dependencies/actions (default: open first, filterable by `item_type`) |
| POST | `/issues` | Create an issue/dependency/action |
| PUT | `/issues/{id}` | Update (including marking resolved) |
| DELETE | `/issues/{id}` | Remove (soft-delete preferred) |

**On delete:** prefer a `status` change (e.g. an `"ARCHIVED"` status, or
reuse `"CLOSED"`/`"RESOLVED"`) over a hard `DELETE` for anything that's
ever been marked as genuinely open — a risk that was raised and later
deemed irrelevant is still useful history for a project retrospective.
Hard delete is fine for something created by mistake and removed the
same session, which the API can support, but the default UI action
should be "close/resolve," not "delete."

---

## 4. Frontend

New page or section: `frontend/src/pages/pm/KickoffRisksIssuesPage.tsx`,
with two clearly separated panels (not tabs that hide one while showing
the other — both risk and issue counts should be visible at a glance,
similar to how your dashboard stat cards work elsewhere in the app):

**Risks panel:**
- Table: Description | Probability | Impact | Exposure Index | Mitigation Plan | Status
- Default sort: highest exposure index first, open risks before closed
- Exposure index shown with a color cue (not a full RAG system, just a
  visual nudge — e.g. anything ≥ 16 out of 25 gets a warning tint) so a
  PM scanning the table can spot the risks that matter most without
  reading every row

**Issues/Dependencies/Actions panel:**
- Table: Type | Description | Affected Area | Severity | Owner |
  Expected Resolution | Target Date | Status
- Filter chips for item type (All / Issue / Dependency / Action) —
  same filter-chip pattern already used in the QPM data entry redesign
  earlier in this conversation
- Rows past their `target_date` and still `OPEN` get a visual flag
  (overdue), since a silently-missed target date is exactly the kind of
  thing this feature exists to surface

Both panels: inline "add row" affordance (not a separate modal/page —
these get added frequently enough during a project that a full page
navigation per entry would be friction), and a one-click "mark
resolved/closed" action per row.

---

## 5. Build Order

1. `project_risks` migration + model + CRUD service + API
2. `project_issues` migration + model + CRUD service + API
3. Frontend risks panel
4. Frontend issues/dependencies/actions panel
5. Overdue-flagging logic (compare `target_date` to today, server-side
   in the API response rather than computed client-side, so it's
   consistent regardless of the viewer's local clock/timezone)

---

## 6. What Does NOT Change

- No relationship to the existing `dm_reviews` / action-item model
  from the QPM module (`docs/specs/08_DM_REVIEW_CYCLE.md`) — that's a
  different kind of action item (tied to a specific metric breach
  during a reporting cycle), not the general project-level risk/issue
  register this spec covers. Keep them as two separate concepts; do
  not attempt to merge them.
- Nothing here writes to or reads from any QPM table
