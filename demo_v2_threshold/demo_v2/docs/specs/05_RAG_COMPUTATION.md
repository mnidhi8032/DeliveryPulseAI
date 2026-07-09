# Spec 05 — RAG Computation

---

## What is RAG?

RAG (Red-Amber-Green) is the health status assigned to each KPI metric measurement based on the actual computed value compared against configured thresholds.

---

## Thresholds

Three threshold values are configured per metric:

| Threshold | Meaning |
|---|---|
| **Target** | The goal value the PM is aiming for |
| **LSL** (Lower Spec Limit) | The lower boundary — below this is a problem |
| **USL** (Upper Spec Limit) | The upper boundary — above this is a problem |

**Priority order for threshold values:**
1. PM's last saved threshold (from most recent `KpiMeasurement`) — persists across sessions
2. Organisation catalog defaults (`kpi_plan_metrics.target / lsl / usl`)
3. Empty (no threshold set)

PMs can edit thresholds in the Thresholds panel on the Data Entry page. Changes are saved when PM clicks Save.

---

## RAG Logic by Intent

| Intent | GREEN | AMBER | RED |
|---|---|---|---|
| **Higher the better** | actual ≥ Target | LSL ≤ actual < Target | actual < LSL |
| **Lower the better** | actual ≤ Target | Target < actual ≤ USL | actual > USL |
| **Within Limits** | LSL ≤ actual ≤ USL | N/A | actual < LSL or > USL |
| **Nominal the best** | within 5% of Target | outside 5% but within limits | < LSL or > USL |
| **No thresholds set** | meets target | within 10% of target | > 10% away from target |

---

## Metric RAG → Category RAG → Project RAG

**Category RAG** (per dimension):
- Any metric in category is RED → category = RED
- Else any AMBER → category = AMBER
- Else all GREEN → category = GREEN

**Project RAG** (overall):
- Any category is RED → project = RED
- Else any AMBER → project = AMBER
- Else all GREEN → project = GREEN

The overall project RAG is stored on `project.current_rag` and shown in the Portfolio Dashboard and project cards.

---

## RAG Display

| Status | Colour | Usage |
|---|---|---|
| GREEN | Emerald (#10b981) | Metric is on target |
| AMBER | Amber (#f59e0b) | Metric is between LSL and Target (or above Target for "lower is better") |
| RED | Rose (#f43f5e) | Metric has breached LSL (or exceeded USL) |

RAG badges always include text (never colour only) for accessibility.

---

## Threshold Change Tracking

When a PM changes the Target, LSL, or USL for a period:
- New values are stored on the `KpiMeasurement` row for that save
- The threshold chart in the Summary page shows the change as a **visual step** at the period where the change occurred
- Historical measurements retain the thresholds that were active when they were computed
- This allows the trend chart to accurately show whether the metric was in compliance at each point in history
