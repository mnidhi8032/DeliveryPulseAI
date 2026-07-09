# Spec 04 — KPI Data Entry

---

## Overview

The Data Entry page is the primary workspace for the Project Manager. Instead of entering values metric-by-metric, the system presents a **unified parameters view** — all unique input measures across all metrics are shown as a single set of parameter cards.

---

## Shared Parameters Concept

Many metrics share the same input parameters. For example:

| Parameter | Used by metrics |
|---|---|
| Delivered and Accepted Size | Productivity, Delivered Defect Density, Total Defect Density, Unit Test Coverage %, Review Coverage %, Commitment to Delivery % |
| Planned Effort | Effort Variance, Reuse Saving %, Change Impact % |
| Total Weighted Defects Leaked to Customer | Delivered Defect Density, Total Defect Density, Test Efficiency |
| Earned Value | Schedule Performance Index, Cost Performance Index |

**The PM enters each parameter once. The system automatically uses that value for every metric that needs it.**

---

## Data Entry Page Layout

### Section 1 — Parameters Panel
- Displays all unique measure names across all active metrics in the plan
- Each parameter card shows:
  - Parameter name
  - Badge showing how many metrics use it (e.g. "7 metrics")
  - Input field (number)
  - Amber highlight + "Not entered" placeholder when empty
- Sorted by number of metrics that use the parameter (most-used first)

### Section 2 — Thresholds Panel
- Displays all active metrics in a table
- Columns: Metric name, Category, LSL (editable), Target (editable), USL (editable)
- **Result and RAG columns are NOT shown here** — these are visible in the Summary page
- Initial values: organisation catalog defaults
- After PM edits and saves: shows PM's last-saved values
- Changes persist on next visit

### Bottom Action Bar
- **Period label input** — editable text field (default: current month, e.g. "July 2026")
- **View metrics summary** button → navigates to QPM Summary page for this project
- **Save** button → saves all parameters + computes all metrics with complete inputs

---

## Period Label

The PM manually types the period label. Examples:
- "July 2026" (monthly)
- "Week of 30 Jun 2026" (weekly)
- "Q2 2026" (quarterly)

Each unique period label creates a separate set of data points in the history and chart.

---

## Save Behaviour

When PM clicks **Save**:

1. All parameter values are saved to `project_period_measures` table (keyed by project + period + measure_name)
2. PM-edited thresholds (LSL/Target/USL) are saved back to `kpi_plan_metrics` table
3. For every active metric in the plan:
   - The system checks if all required measures for that metric are now present
   - If **all measures present** → KPI value is computed using the formula
   - If **any measure missing** → metric marked as incomplete (no computation)
4. A new `KpiMeasurement` row is inserted for each computed metric (**always a new row, never overwrites**)
5. RAG status is computed and stored on each `KpiMeasurement` row
6. Toast notification shows: "Saved. X/Y metrics computed."

**Every Save creates a new data point in the chart.** If PM saves 3 times for July 2026 with different parameter values, all 3 values appear as separate points in the trend chart.

---

## Carry-Forward (Pre-fill)

When PM opens the data entry page:
- **Parameters** — pre-filled from the most recent `project_period_measures` values for this project
- **Thresholds** — pre-filled from the last used thresholds (from most recent `KpiMeasurement`) or catalog defaults if no prior measurement exists

PM only needs to update what changed.

---

## Computation Logic

Parameters flow through the measure mapping file (`scripts/measure_mapping.json`) which defines for each metric:

```
comp_type = "D" (Direct) → metric value = parameter value directly
comp_type = "C" (Computed) → metric value = formula(numerator measures / denominator measures)
```

**Percentage scaling:** Only metrics with UOM = "%" are multiplied by 100. Ratio metrics (e.g. Person-hours/Size Unit) remain as plain division.

**Example — Effort Variance:**
```
Formula: (Actual Effort + Remaining Effort - Planned Effort) / Planned Effort × 100
UOM: %
Inputs: [Actual Effort for the Work till date, Remaining Effort for completing the pending work, Planned Effort]
```

**Example — Productivity:**
```
Formula: Delivered and Accepted Size / Total Actual Effort in Person day
UOM: Size Unit per Person day
Inputs: [Delivered and Accepted Size, Total Actual Effort in Person day]
```

---

## History Panel

Accessible by clicking the clock icon (⏱) in the Thresholds panel header.

Shows all `KpiMeasurement` rows across all metrics, ordered newest-first.

**Columns:**
- Metric name
- Period (frequency_name)
- Inputs (measure values concatenated)
- LSL / Target / USL
- Computed value
- RAG status
- Submitted datetime

**Filter:** dropdown to show a specific metric or "All metrics"

---

## PM Comment

An optional free-text comment box at the bottom of the page. PM can describe project context, blockers, or highlights for the DM. Saved to `kpi_plan.pm_rag_comments`. Visible to Delivery Manager.
