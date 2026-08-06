# Spec 18 — Catalog Governance and PM Metric Flexibility

**Status:** Planned — Not Yet Implemented
**Priority:** High
**Created:** August 2026
**Requested by:** Mentor review session

---

## Overview

This spec covers three related mentor-requested changes that together give
administrators full control over the metric catalog and engagement model,
while giving Project Managers full flexibility over their own KPI plan.

| # | Feature | Who benefits | Size |
|---|---|---|---|
| 18.1 | PM can remove any metric, including mandatory ones | PM | Small |
| 18.2 | DE / Platform Admin manage engagement model dropdowns and metric mappings | DE, Platform Admin | Large |
| 18.3 | DE / Platform Admin control mandatory metric count per category | DE, Platform Admin | Medium |

---

## 18.1 — PM Can Remove Mandatory Metrics

### What changes

Today, metrics with `priority = 'M'` (Mandatory) are locked in the KPI plan.
The "Remove" button is hidden for them, and the backend throws a 403 if a
delete is attempted. The mentor confirmed this restriction should be lifted —
a PM should be able to remove any metric from their plan, including mandatory
ones.

### Why this is safe

Mandatory metrics are "recommended defaults" loaded on project creation.
Once they are in the plan, the PM owns the plan. If a mandatory metric is
irrelevant to a specific project, forcing it to stay makes the data noisy.
Removing it is a deliberate choice by the PM who knows their project best.

### Backend change

File: `backend/app/services/qpm_service.py` — method `remove_plan_metric`

Remove this guard (or soften it to a warning log only):
```python
if plan_metric.priority == "M":
    raise HTTPException(status_code=403, detail="Mandatory metrics cannot be removed.")
```

No migration needed.

### Frontend change

File: `frontend/src/pages/pm/QPMPlanPage.tsx` — Selected Metrics tab

Remove the condition that hides the Remove button for mandatory metrics:
```tsx
{!plan?.is_finalized && pm.priority !== "M" && (
  <button onClick={() => handleRemove(pm)}>Remove</button>
)}
```
Change to:
```tsx
{!plan?.is_finalized && (
  <button onClick={() => handleRemove(pm)}>Remove</button>
)}
```

File: `frontend/src/pages/pm/PMProjectsPage.tsx` — Manage Metrics modal

Same guard exists in `handleRemoveMetric`:
```tsx
if (metric?.priority === "M") {
  toast.error("Mandatory metrics cannot be removed.");
  return;
}
```
Remove that early return.

### What stays the same

- The plan finalize lock still prevents any removal once the plan is finalized
- The "Auto-add All Mandatory (M) Metrics" button still works
- The compliance badge still shows "Mandatory" on the card — it is informational only now, not a lock

---

## 18.2 — Engagement Model and Dimension Management

### Problem

The dropdown values for Project Type, Delivery Model, Project Category,
Work Size Unit, and Metric Category (Dimension) are **hardcoded** in
`frontend/src/types/qpm.ts` as static arrays. To add a new option, a
developer must edit the source code and redeploy. DE and Platform Admin
cannot do this themselves.

Additionally, when any of these values are created, there is no way to
associate which catalog metrics should be suggested / mandatory for that
value without writing SQL directly.

### Solution

Make all five dropdown lists **database-driven**. DE and Platform Admin
manage them through a new "Engagement Model & Dimensions" admin page.
When creating or editing any item, they choose which catalog metrics
are associated with it. Those associations drive both:
- The dropdown options the PM sees when creating a project
- Which metrics get auto-added on project creation (the `engagement_model_presets`
  and ILIKE fallback logic already uses these field values)

### New database tables

#### `engagement_model_items`

Stores the allowed values for each engagement model field and dimensions.

```sql
CREATE TABLE engagement_model_items (
    id          UUID PRIMARY KEY,
    item_type   VARCHAR(50)  NOT NULL,   -- PROJECT_TYPE | DELIVERY_MODEL |
                                         -- PROJECT_CATEGORY | WORK_SIZE_UNIT |
                                         -- DIMENSION
    value       VARCHAR(200) NOT NULL,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (item_type, value)
);

CREATE INDEX ix_emi_type_active ON engagement_model_items (item_type, is_active);
```

#### `engagement_model_metric_mappings`

Associates catalog metrics with each engagement model item.
This is the "which metrics belong to this type/model/category/unit/dimension" table.

```sql
CREATE TABLE engagement_model_metric_mappings (
    id                     UUID PRIMARY KEY,
    engagement_item_id     UUID NOT NULL REFERENCES engagement_model_items(id) ON DELETE CASCADE,
    catalog_metric_id      UUID NOT NULL REFERENCES qpm_catalog_metrics(id) ON DELETE CASCADE,
    is_mandatory           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (engagement_item_id, catalog_metric_id)
);

CREATE INDEX ix_emmm_item ON engagement_model_metric_mappings (engagement_item_id);
```

`is_mandatory = true` means: when this item is part of a project's engagement
model, this metric should be treated as mandatory for that project.

### How it connects to project creation

The existing `engagement_model_presets` table handles `(project_type, delivery_model)` combos and remains unchanged for the 3 seeded presets. The new mappings table is used as a **supplementary source** when no preset exists:

```
Project created with (project_type, delivery_model, project_category, work_size_unit)
        ↓
1. Check engagement_model_presets for exact (type, model) match  ← existing logic
        ↓ no preset found
2. Query engagement_model_metric_mappings for all 4 fields
   → UNION of metrics mapped to this project_type OR delivery_model
     OR project_category OR work_size_unit, where is_mandatory = true
        ↓ still no results
3. Fall back to ILIKE tag-matching on qpm_catalog_metrics  ← existing fallback
```

### Where existing hardcoded arrays get replaced

| File | Array | Replaced with |
|---|---|---|
| `frontend/src/types/qpm.ts` | `PROJECT_TYPES` | API call `GET /api/v1/engagement-model-items?type=PROJECT_TYPE` |
| `frontend/src/types/qpm.ts` | `DELIVERY_MODELS` | API call `GET /api/v1/engagement-model-items?type=DELIVERY_MODEL` |
| `frontend/src/types/qpm.ts` | `PROJECT_CATEGORIES` | API call `GET /api/v1/engagement-model-items?type=PROJECT_CATEGORY` |
| `frontend/src/types/qpm.ts` | `WORK_SIZE_UNITS` | API call `GET /api/v1/engagement-model-items?type=WORK_SIZE_UNIT` |
| `frontend/src/types/qpm.ts` | `METRIC_CATEGORIES` | API call `GET /api/v1/engagement-model-items?type=DIMENSION` |

The static arrays stay as **fallback defaults** during migration and can be
seeded into the new table on first run so existing behaviour is unchanged.

### New API endpoints

```
GET    /api/v1/engagement-model-items              # list (filter by ?type=)
POST   /api/v1/engagement-model-items              # create — DE / Platform Admin only
PATCH  /api/v1/engagement-model-items/{id}         # edit name, description, is_active
DELETE /api/v1/engagement-model-items/{id}         # soft-delete (set is_active=false)

GET    /api/v1/engagement-model-items/{id}/metrics # list mapped catalog metrics
POST   /api/v1/engagement-model-items/{id}/metrics # add metric mapping
DELETE /api/v1/engagement-model-items/{id}/metrics/{catalog_metric_id}  # remove mapping
```

All write endpoints: `require_roles(DELIVERY_EXCELLENCE, PLATFORM_ADMIN)`.

### Admin UI — where it lives

**DE side:** `DECatalogPage.tsx` gets a new third tab: **"Engagement Model"**

**Platform Admin side:** `PlatformAdminSettingsPage.tsx` gets a new section: **"Engagement Model & Dimensions"** (same component, different route)

Both show the same `EngagementModelManagerPanel` component, since permissions are identical.

### EngagementModelManagerPanel — UX flow

```
┌─────────────────────────────────────────────────────────────┐
│  Engagement Model & Dimensions                               │
│                                                              │
│  [ Project Types ] [ Delivery Models ] [ Project Categories ]│
│  [ Work Size Units ] [ Dimensions ]                          │
│                                              + Add New       │
├─────────────────────────────────────────────────────────────┤
│  ▼  Fresh Development          [Edit] [Manage Metrics]       │
│  ▼  Testing                    [Edit] [Manage Metrics]       │
│  ▼  Maintenance & Support      [Edit] [Manage Metrics]       │
│     AI Development (new) ✦     [Edit] [Manage Metrics]       │
└─────────────────────────────────────────────────────────────┘
```

Clicking **"Manage Metrics"** opens an inline panel showing:
- Left: all active catalog metrics (searchable, filterable by dimension)
- Right: currently mapped metrics with is_mandatory toggle
- Admin checks metrics on the left → they appear on the right
- Each mapped metric has a toggle: **Mandatory / Optional**

```
┌──────────────────────────────────────────────────────────────┐
│  Metrics for: AI Development                                  │
│                                                              │
│  Catalog (search)              │  Mapped metrics             │
│  ─────────────────────         │  ────────────────────────   │
│  □ Schedule Variance           │  ✓ Velocity          [M]   │
│  □ Effort Variance             │  ✓ Code Review Rate  [O]   │
│  ✓ Velocity                    │  ✓ Defect Density    [M]   │
│  □ Gross Margin%               │                            │
│  ✓ Code Review Rate            │                            │
│  ✓ Defect Density              │                  [Save]    │
└──────────────────────────────────────────────────────────────┘
```

### Seed strategy

On first deployment, seed the new table from the existing hardcoded arrays:
- `backend/scripts/seed_engagement_model_items.py`
- Seeds all 14 Project Types, 12 Delivery Models, 6 Project Categories,
  7 Work Size Units, and 11 Dimensions into `engagement_model_items`
- Seeds metric mappings from the existing `engagement_model_presets` rows
  into `engagement_model_metric_mappings`
- Safe to re-run (idempotent)

---

## 18.3 — Mandatory Metric Count per Category

### What the mentor showed

The Excel screenshot shows a table: **Metric Category → Number of Mandatory Metrics in each Category**.

Example:
| Category | Min mandatory count |
|---|---|
| Time & Speed | 1 |
| Efficiency | 1 |
| Internal Quality | 0 |
| Delivered Quality | 1 |
| Scope | 0 |
| Financial | 0 |
| Stakeholder Perception | 0 |
| Knowledge & Reuse | 0 |

This is a **governance rule**: when a PM finalizes their KPI plan, the system should
check that they have selected at least N metrics from each category. If they have
fewer, the system warns them (or blocks finalization, depending on configuration).

### New database table

This can live as a column on `engagement_model_items` for DIMENSION-type rows:

```sql
ALTER TABLE engagement_model_items
  ADD COLUMN min_mandatory_count INTEGER NOT NULL DEFAULT 0;
```

For non-DIMENSION item types, this column is ignored (always 0).

### How it works

1. DE/Admin sets `min_mandatory_count` on each Dimension via the admin UI
2. When PM opens the KPI Plan → Selected Metrics tab, the UI shows per-category counts:
   ```
   Efficiency:  2 selected (min: 1) ✓
   Financial:   0 selected (min: 1) ⚠ Need at least 1
   ```
3. When PM clicks **Finalize Plan**, the backend checks all categories with
   `min_mandatory_count > 0` and counts active metrics for that plan in each category
4. If any category is below its minimum → return 400 with a list of violations

### Admin UI addition

In the **Dimensions** sub-tab of `EngagementModelManagerPanel`, each dimension row shows an editable **"Min mandatory metrics"** number input (default 0).

### Backend enforcement

In `qpm_service.py` → `finalize_plan` (or wherever finalization is triggered):

```python
# Check min_mandatory_count per dimension
violations = []
for item in dimension_items:   # query engagement_model_items WHERE type=DIMENSION
    if item.min_mandatory_count > 0:
        count = session.execute(
            select(func.count()).where(
                KpiPlanMetric.kpi_plan_id == plan_id,
                KpiPlanMetric.metric_category == item.value,
                KpiPlanMetric.is_active == True,
            )
        ).scalar()
        if count < item.min_mandatory_count:
            violations.append(f"{item.value}: needs {item.min_mandatory_count}, has {count}")
if violations:
    raise HTTPException(400, detail={"violations": violations})
```

### What if there is no finalization step?

Currently `qpm_status` is always `DRAFT` — there is no formal finalization gate on QPM status. The plan has an `is_finalized` boolean. The min count check should run when `is_finalized` is set to `True`. If the PM tries to finalize and violations exist, they get a clear error message per category.

---

## Data Model Summary

### New tables

| Table | Purpose |
|---|---|
| `engagement_model_items` | Stores all dropdown values (Project Type, Delivery Model, Project Category, Work Size Unit, Dimension) plus `min_mandatory_count` for Dimensions |
| `engagement_model_metric_mappings` | Stores which catalog metrics are associated with each engagement model item, and whether each is mandatory |

### Alembic migrations

| File | Content |
|---|---|
| `t2u3v4w5x6y7_engagement_model_items.py` | Creates `engagement_model_items` + index |
| `u3v4w5x6y7z8_engagement_model_metric_mappings.py` | Creates `engagement_model_metric_mappings` + index |

### Seed scripts

| Script | Content |
|---|---|
| `seed_engagement_model_items.py` | Seeds all 14+12+6+7+11 values from current hardcoded arrays; idempotent |

---

## Build Order

1. **18.1** — Remove mandatory metric lock (backend + frontend, ~1 hour)
2. **Migrations** — Create 2 new tables and run `alembic upgrade head`
3. **Seed** — Run `seed_engagement_model_items.py` to populate from existing hardcoded data
4. **Backend API** — New `engagement_model_items` router (CRUD + metric mappings)
5. **Frontend — read path** — Replace hardcoded arrays with API calls in
   `QPMPlanPage`, `PMProjectsPage`, and anywhere else the 5 arrays are used
6. **Frontend — admin UI** — `EngagementModelManagerPanel` component (new tab in DE Catalog + Platform Admin Settings)
7. **18.3** — Mandatory count enforcement on finalization (after admin UI exists)

---

## What Does NOT Change

- `engagement_model_presets` table and its 3 seeded presets — unchanged, still first priority on project creation
- ILIKE fallback logic in `project_service.py` — unchanged, still last resort
- QPM computation engine, RAG logic, threshold charts — unchanged
- Existing KPI Plan behaviour for currently-running projects — unchanged
- `metric_approval_requests` workflow — unchanged

---

## Open Questions for Review

1. **Conflict between presets and mappings** — If a `(project_type, delivery_model)` combo has both a preset AND metric mappings in the new table, which wins? Recommendation: preset always wins (current behaviour preserved), mappings only used when no preset exists.

2. **Deletion vs deactivation** — When an admin removes a Project Type, what happens to existing projects that used that type? Recommendation: always soft-delete (`is_active = false`) so the value still displays on existing projects but is not offered for new ones.

3. **Finalization enforcement level** — Should the min mandatory count violation be a hard block (400 error) or a soft warning (PM can override)? Recommendation: soft warning with a "Finalize anyway" confirmation dialog for flexibility.

4. **Project Category and Work Size Unit metric mappings** — Currently these two fields have no effect on which metrics are selected. The mentor wants all 4 fields to map metrics. This means a project with `project_category = "Fixed Price"` could get additional auto-selected metrics from the Fixed Price mapping. Is this the intended behaviour? This needs confirmation before implementing.

