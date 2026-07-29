# Kickoff Module — Spec 04: Metrics Plan Integration

**Status:** Planned — Decision Required Before Implementation
**Priority:** High
**Covers deck section:** Metrics Plan (QPM Plan)

---

## 1. Purpose

The kickoff deck's Metrics Plan slide is the one section that isn't
really new territory — it's asking for almost exactly the same
information your QPM module already collects when a PM builds a KPI
Plan. This spec exists to make that overlap an explicit, considered
decision rather than something that gets silently duplicated or
silently merged without anyone weighing the tradeoff.

**This file does not pick a direction for you.** Read Section 3, pick
Option A or B, then Section 4 tells you exactly what to build for
whichever you choose.

---

## 2. The Overlap

Kickoff deck's Metrics Plan table columns, mapped against the existing
`KpiPlanMetric` model (used throughout `docs/specs/`):

| Kickoff deck column | Existing QPM field | Exists today? |
|---|---|---|
| Metric / KPI | `metric_name` | Yes |
| Unit of Measure | `uom` | Yes |
| Priority | `priority` | Yes |
| Target Value | `target` | Yes |
| LCL | `lsl` | Yes |
| UCL | `usl` | Yes |
| Frequency of Analysis | `frequency` | Yes |
| Project Goal | — | **No — new field needed either way** |
| Remarks | — | **No — new field needed either way** |

Seven of nine columns already exist on `KpiPlanMetric`. Only two are
genuinely new, regardless of which option you pick.

---

## 3. The Two Options

### Option A — Standalone kickoff-only table

Build a new, separate table (`project_kickoff_metrics_plan`) that
records the deck's Metrics Plan exactly as its own thing, with no
connection to `KpiPlanMetric`.

```
id, project_id (FK)
project_goal (text)
metric_name (string)          -- free text, NOT validated against the catalog
uom (string)
priority (string)
target_value (numeric, nullable)
lcl (numeric, nullable)
ucl (numeric, nullable)
frequency_of_analysis (string)
remarks (text)
sort_order (int)
```

**Pros:**
- Fastest to build — one new table, no changes to any existing QPM
  model or code path
- Zero risk of accidentally breaking anything in `docs/specs/`
- A PM can sketch out "here's roughly what we're planning to track" at
  kickoff time, before the actual project + KPI Plan even fully exists

**Cons:**
- **Two disconnected places record "what metrics are we tracking."**
  The kickoff table and the real `KpiPlanMetric` rows will drift —
  someone adds a metric to the real KPI Plan later and never updates
  the kickoff record, or vice versa, and nobody notices until a review
  meeting surfaces the mismatch
- The kickoff Metrics Plan becomes stale documentation almost
  immediately — exactly the problem this whole module exists to solve
  for the *other* 5 sections, reintroduced here for the one section
  that actually touches live tracked data

### Option B — Linked directly to `KpiPlanMetric` (recommended)

Add two nullable columns directly to the existing `KpiPlanMetric`
model:

```sql
ALTER TABLE kpi_plan_metrics ADD COLUMN project_goal TEXT NULL;
ALTER TABLE kpi_plan_metrics ADD COLUMN remarks TEXT NULL;
```

The Kickoff module's "Metrics Plan" page becomes a **view into the same
underlying KPI Plan data** the QPM module already manages — filling in
the kickoff deck's metrics table *is* setting up the project's KPI
Plan, just presented with the two extra kickoff-specific fields
visible alongside the existing ones.

**Pros:**
- One source of truth. There is no "kickoff version" vs. "real
  version" of the metrics list — there's just the metrics list
- `project_goal` and `remarks` become genuinely useful context that
  shows up wherever `KpiPlanMetric` is already displayed (Tracker,
  Summary, Data Entry) — "why are we tracking this metric" becomes
  visible at the point of entry, not buried in a kickoff doc nobody
  revisits
- No duplicate data entry — a PM filling in the KPI Plan during actual
  QPM setup has already satisfied the kickoff requirement

**Cons:**
- Touches an existing, heavily-used model (`KpiPlanMetric` is read and
  written by nearly every QPM page) — even though adding two nullable
  columns is low-risk in isolation, it means this spec can't be built
  in complete isolation from the QPM module the way Specs 01-03, 05 can
- The Kickoff module's Metrics Plan page can only be meaningfully
  filled in **after** a KPI Plan exists for the project (metrics have
  been chosen via the existing `QPMPlanPage` flow) — it can't be filled
  in earlier as a rough sketch the way Option A allows

**Recommendation: Option B.** The whole premise of this module is
replacing stale, disconnected documentation with live data — building
Option A would recreate exactly that staleness problem for the one
section where it matters most (the metrics actually being tracked).
The "con" of not being fillable before a KPI Plan exists is a
reasonable constraint, not a real problem: a project genuinely
shouldn't have a "kickoff metrics plan" that's disconnected from what
it's actually tracking.

---

## 4. Implementation — if Option B is chosen

### 4.1 Migration + model

Add to the existing `KpiPlanMetric` model (in whichever file it's
defined, alongside `lsl`/`target`/`usl`):

```python
project_goal: Mapped[str | None] = mapped_column(Text, nullable=True)
remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
```

Straightforward additive migration — no backfill needed, no existing
row's meaning changes.

### 4.2 API

Extend whatever endpoint currently creates/updates a `KpiPlanMetric`
(the QPM Plan's add/update-metric endpoint) to accept optional
`project_goal` and `remarks` fields in the request body, and include
them in the response schema. No new endpoint needed — this is a field
addition to existing CRUD, not a new resource.

### 4.3 Frontend

Two touch points:

1. **`QPMPlanPage.tsx`** (existing) — when adding/editing a metric in
   the real KPI Plan flow, add two optional fields: "Project Goal" and
   "Remarks." This is where the data actually gets entered.
2. **New: `KickoffMetricsPlanPage.tsx`** — a **read-oriented view**
   (not a separate entry form) that displays the current KPI Plan's
   metrics with all 9 kickoff-deck columns visible at once (Project
   Goal, Metric, UOM, Priority, Target, LCL, UCL, Frequency, Remarks).
   If a project has no KPI Plan yet, this page should say so plainly
   and link to `QPMPlanPage.tsx` to create one — not present an empty
   form pretending to be independent.

This keeps entry in one place (`QPMPlanPage.tsx`) while giving the
Kickoff module its own page that presents the same data in the deck's
original column layout, satisfying "the kickoff review needs to see
this information" without a second data-entry path.

### 4.4 Build Order

1. Migration + model fields
2. API field additions (no new endpoint)
3. `QPMPlanPage.tsx` — add the two new optional fields to the
   existing add/edit metric form
4. `KickoffMetricsPlanPage.tsx` — new read-oriented view

---

## 5. If Option A Is Chosen Instead

Flag this decision explicitly to whoever builds it — Option A's table
schema is given in Section 3 above in full, and can be built
independently of the QPM module with no migration risk to
`KpiPlanMetric`. If chosen, revisit this spec later once the
duplication problem described in Section 3's "Cons" becomes visible in
practice, since migrating from A to B afterward means reconciling two
diverged data sets, not just adding new columns.

---

## 6. What Does NOT Change

- Regardless of which option is picked, nothing in `docs/specs/` beyond
  the two additive columns (if Option B) changes — RAG computation,
  shared parameters, DM review, reporting cycles all stay exactly as
  specced
