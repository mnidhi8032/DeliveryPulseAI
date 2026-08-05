# Spec 16 — Engagement Model Preset System

**Status:** Implemented ✅
**Version:** 1.0
**Last Updated:** July 2026

---

## Purpose

Replace the broad ILIKE tag-matching used during project creation with an exact, evidence-based mandatory metric list for known engagement combinations. This prevents over-selection (old system returned ~13 metrics for Testing/Agile-Scrum; the correct client-validated list is 7).

---

## How It Works

When `project_service.create_with_plan` is called, the service checks the `engagement_model_presets` table for an exact match on `(project_type, delivery_process_model)`:

```
Preset found → select QPMCatalogMetric rows by exact name IN (preset list)
               — compliance flag ignored (preset IS the authority)

No preset → fall back to existing ILIKE query:
            QPMCatalogMetric WHERE is_active=True AND compliance='M'
            AND project_type ILIKE '%{type}%'
            AND delivery_model ILIKE '%{model}%'
```

The code after this block (the loop creating `KpiPlanMetric` rows) is identical for both paths.

---

## Database Table

**`engagement_model_presets`** — added via migration `s2t3u4v5w6x7_add_engagement_model_presets.py`

| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| project_type | VARCHAR(100) | Exact project type string |
| delivery_model | VARCHAR(100) | Exact delivery model string |
| metric_name | VARCHAR(200) | Exact name matching `qpm_catalog_metrics.name` |
| source_reference | VARCHAR(200) | Client project this was derived from |
| created_at | TIMESTAMPTZ | |

Index: `ix_engagement_preset_lookup (project_type, delivery_model)`

Each row = one metric in a preset. A preset with 7 metrics has 7 rows.

---

## Seeded Presets

Seeded via `backend/scripts/seed_engagement_presets.py`. All metric names verified as exact case-sensitive matches in `qpm_catalog_metrics` before seeding.

### Testing / Agile-Scrum (7 metrics) — JNJ AM R5.0

| Metric | Catalog compliance |
|---|---|
| Defect Detection Efficiency % | M |
| Test Execution Productivity | M |
| Percentage of valid defects % | M |
| Reuse Saving % | **O** (included because client mandates it) |
| Test Coverage % | **O** (included because client mandates it) |
| Schedule Variance | M |
| Test Automation % | **O** (included because client mandates it) |

### Maintenance / ITIL based Service Delivery (6 metrics) — JNJ Platform Support

| Metric | Catalog compliance |
|---|---|
| First Time Fit  % | M |
| Backlog Management Index | M |
| SLA Adherance % - P3 Resolution | M |
| SLA Adherance % - P3 Response | M |
| SLA Adherance % - P4 Resolution | M |
| SLA Adherance % - P4 Response | M |

> Note: "First Time Fit  %" has a double-space — this matches the catalog exactly.

### Fresh Development / Agile-Scrum (9 metrics) — JNJ JJCC Hybris

| Metric | Catalog compliance |
|---|---|
| Gross Margin% | M |
| Customer Satisfaction Index | M |
| Overall Delivery Rate | M |
| Delivered Defect Density | M |
| Velocity | M |
| Commitment to Delivery % | M |
| Coding Delivery Rate | M |
| Code Review Delivery Rate | M |
| Review Defect Density | M |

---

## Why compliance is ignored on the preset path

Three Testing/Agile-Scrum metrics (`Reuse Saving %`, `Test Coverage %`, `Test Automation %`) are marked `compliance = 'O'` (Optional) in the catalog. However, the JNJ AM R5.0 project file explicitly requires them. The preset IS the client-validated authority — applying the `compliance = 'M'` filter on top of it would silently drop those three metrics.

---

## Adding New Presets

1. Verify each metric name in `qpm_catalog_metrics` (case-sensitive exact match)
2. Add rows to `engagement_model_presets` via the seed script or direct INSERT
3. Re-run `python scripts/seed_engagement_presets.py` — it is idempotent (skips existing triples)

---

## Files Changed

| File | Change |
|---|---|
| `backend/alembic/versions/s2t3u4v5w6x7_add_engagement_model_presets.py` | Migration — creates table + index |
| `backend/app/models/engagement_model_preset.py` | SQLAlchemy ORM model |
| `backend/app/models/__init__.py` | Registers model in Base metadata |
| `backend/scripts/seed_engagement_presets.py` | Seeds 3 presets (22 rows) — idempotent |
| `backend/app/services/project_service.py` | `create_with_plan` — preset-first selection logic |
