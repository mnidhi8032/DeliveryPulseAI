# Spec 14 — RAG Explanation & Recommendation Engine

**Status:** Implementing  
**Priority:** High  
**Created:** July 2026  
**Approach:** Rule-based / deterministic. No AI or LLM. No hallucination risk.

---

## 1. What Is This Feature?

Right now, when a PM sees a metric is RED or AMBER on the KPI Summary page, they only see a red badge and a number. They have to manually figure out why it is red and what to do about it.

This feature **automatically generates two things** next to every RED or AMBER metric:

1. **Explanation** — *Why* is it red? Generated automatically from the same numbers that computed the RAG status. Example:
   > "Effort Variance is 18.0%, which is 3.0 points above the upper limit of 15.0%. This has worsened over the last 3 periods."

2. **Recommendation** — *What should I do?* Fetched from an admin-editable library in the database. Example:
   > "Actual effort is significantly exceeding plan. Review recent scope changes or re-baseline the estimate."

This is **not AI**. It is pure template text filled in with real numbers. It cannot be wrong because it uses the exact same numbers that already computed the RAG status.

---

## 2. Design Principles

| Principle | What it means |
|---|---|
| One source of truth | Explanation reuses `_compute_rag()` from `qpm_service.py` — not reimplemented |
| Numerically guaranteed | The explanation uses the same values that set the badge — can never contradict it |
| No new data needed | Uses existing: `KpiMeasurement`, `KpiPlanMetric`, `QPMCatalogMetric` |
| Admin-owned text | Recommendation text is in the DB, editable by Platform Admin in Settings |
| Zero cost | Pure string templates. No external API calls. No caching needed |
| Role-appropriate | PM sees full detail; DH sees read-only; read-only pages see one line |

---

## 3. Where Users See This (in this project)

### Primary — `QPMSummaryPage.tsx`
PM's main metric view. Each RED/AMBER metric card shows a small **ℹ️** icon.
Clicking the card already opens `MetricTrendPanel`. At the top of that panel, a highlighted box shows:
- The explanation (auto-generated)
- The recommendation (from DB, or "No recommendation configured yet" if not set)

### Secondary — `ProjectSummaryReadOnlyPage.tsx`
Read-only view for CEO, Platform Admin, Delivery Excellence.
Shows only the **first sentence** of the explanation under the RAG pill — no recommendation shown (read-only context).

### Tertiary — `DMProjectReviewPage.tsx`
DM sees metrics when reviewing a project.
A collapsed **"Why is this red?"** toggle on RED/AMBER metrics. Read-only. DM's own commentary is separate.

### Not shown in:
- `QPMDataEntryPage.tsx` — PM is mid-entry, values may still change
- Portfolio dashboards — too aggregated, per-metric explanations don't fit

---

## 4. Data Model

### New table: `metric_recommendations`

```sql
CREATE TABLE metric_recommendations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name  VARCHAR(200) NOT NULL,
    breach_type  VARCHAR(50)  NOT NULL,
    recommendation_text TEXT NOT NULL,
    created_at   TIMESTAMPTZ  DEFAULT now(),
    updated_at   TIMESTAMPTZ  DEFAULT now(),
    UNIQUE (metric_name, breach_type)
);
```

### breach_type values (covers all 4 intents from `_compute_rag()`)

| breach_type | When used |
|---|---|
| `under_lsl` | Intent "Higher the better" — value below LSL (RED) |
| `under_target_amber` | Intent "Higher the better" — value between LSL and Target (AMBER) |
| `over_usl` | Intent "Lower the better" — value above USL (RED) |
| `over_target_amber` | Intent "Lower the better" — value between Target and USL (AMBER) |
| `outside_limits` | Intent "Within limits" — value outside LSL or USL (RED) |
| `outside_nominal_above` | Intent "Nominal the best" — value more than 5% above target (AMBER/RED) |
| `outside_nominal_below` | Intent "Nominal the best" — value more than 5% below target (AMBER/RED) |

### No changes to existing tables
`KpiMeasurement`, `KpiPlanMetric`, and `QPMCatalogMetric` are read-only inputs.

---

## 5. Backend Components

### 5.1 `app/services/rag_explainer.py` (new)
Pure Python. No DB writes. No API. Reads facts from measurement + plan metric and returns:
```python
{
  "metric_name": "Effort Variance",
  "value": 18.0,
  "rag": "RED",
  "intent": "Lower the better",
  "breach_type": "over_usl",
  "threshold_value": 15.0,
  "breach_margin": 3.0,
  "trend": [12.0, 15.5, 18.0],
  "is_worsening": True,
  "is_first_breach": False,
  "explanation": "Effort Variance is 18.0%, which is 3.0 points above the upper limit of 15.0%. This has worsened over the last 3 periods."
}
```

### 5.2 `app/models/metric_recommendation.py` (new)
SQLAlchemy model for the table above.

### 5.3 `app/services/metric_recommendation_service.py` (new)
`list_all()`, `get_for(metric_name, breach_type)`, `upsert(...)`, `delete(...)`.

### 5.4 New API routes

| Method | Path | Who can call |
|---|---|---|
| `GET` | `/api/v1/qpm/plans/{plan_metric_id}/explain` | PM, DM, DH |
| `GET` | `/api/v1/admin/metric-recommendations` | Platform Admin |
| `POST` | `/api/v1/admin/metric-recommendations` | Platform Admin |
| `PUT` | `/api/v1/admin/metric-recommendations/{id}` | Platform Admin |
| `DELETE` | `/api/v1/admin/metric-recommendations/{id}` | Platform Admin |

### `/explain` response
```json
{
  "explanation": "Effort Variance is 18.0%, ...",
  "recommendation": "Review recent scope changes...",
  "breach_type": "over_usl",
  "is_worsening": true
}
```
If RAG is GREEN or null → `{ "explanation": null, "recommendation": null }` — HTTP 200, not an error.

---

## 6. Frontend Components

### 6.1 `QPMSummaryPage.tsx` changes
- `MetricCard`: add a small `ℹ️` badge on RED/AMBER cards
- `MetricTrendPanel`: call `/explain` when opening. Show explanation box at the top.

### 6.2 `ProjectSummaryReadOnlyPage.tsx` changes
- Add a small "why" text column to the metric table rows (RED/AMBER only)
- One sentence max, no recommendation shown

### 6.3 `DMProjectReviewPage.tsx` changes
- Collapsible "Why is this red?" section on RED/AMBER metric rows
- Read-only, explanation only (no recommendation shown to DM)

### 6.4 `PlatformAdminSettingsPage.tsx` changes
- New section: "Metric Recommendations"
- Table showing all configured recommendations
- Add / Edit / Delete buttons

---

## 7. Build Order

1. ✅ Write this spec
2. `rag_explainer.py` — facts extraction + explanation templates (no DB, unit-testable)
3. DB migration + `MetricRecommendation` model
4. Seed script — pre-load recommendations for demo metrics
5. `metric_recommendation_service.py` + admin CRUD API routes
6. `/explain` endpoint wiring explainer + recommendation lookup
7. `QPMSummaryPage.tsx` integration (primary user-facing surface)
8. `ProjectSummaryReadOnlyPage.tsx` (one-liner)
9. `DMProjectReviewPage.tsx` (collapsed toggle)
10. `PlatformAdminSettingsPage.tsx` (admin editor UI)

---

## 8. Seed Recommendations (for demo)

Pre-loaded for the metrics already in demo data:

| Metric | Breach Type | Recommendation |
|---|---|---|
| Effort Variance | over_usl | Review recent scope changes and re-baseline the estimate. Check if unplanned work was added to the sprint. |
| Effort Variance | over_target_amber | Monitor closely. Effort is trending above plan. Confirm no scope creep. |
| Schedule Variance | under_lsl | Sprint delivery is significantly behind. Run a retrospective on blockers. |
| Schedule Variance | under_target_amber | Delivery is slightly behind schedule. Identify and resolve current blockers this week. |
| Delivered Defect Density | over_usl | Defect rate is critically high. Pause new feature work and focus on quality improvements. |
| Delivered Defect Density | over_target_amber | Defect trend is rising. Review testing practices and code review thoroughness. |
| First Time Fit % | under_lsl | Too many deliverables are failing initial review. Improve definition of done and acceptance criteria. |
| First Time Fit % | under_target_amber | First-pass acceptance rate is below target. Check if requirements clarity needs improvement. |

---

## 9. What Does NOT Change

- `_compute_rag()` logic and thresholds
- `KpiMeasurement`, `KpiPlanMetric`, `QPMCatalogMetric` schemas
- All existing RAG badge rendering
- Shared parameter entry model, data entry flow

---

## 10. Future (Spec 15, not this spec)

- AI-generated explanations layered on top of the same fact extractor
- Cross-metric synthesis ("Schedule and Effort are both red — likely same root cause")
- Portfolio/BU-level rollup explanations
- PM free-text comments incorporated into the explanation
