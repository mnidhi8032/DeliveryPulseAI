# Spec 06 — KPI Summary and Trend Charts

---

## Summary Page Overview

The KPI Summary page (`/pm/projects/{id}/qpm/summary`) provides the PM with a visual overview of the entire project's KPI health.

**Access:** PM (own projects), Delivery Head (their BU projects), Delivery Manager (their account projects), Platform Admin, CEO, Delivery Excellence.

---

## Page Sections

### 1 — Header
- Project name, project code
- Navigation: "← Back to Data Entry"
- Overall Project RAG badge (GREEN / AMBER / RED)

### 2 — Overall Project RAG Card
- Coloured card (green/amber/red background)
- Letter indicator (G / A / R)
- Overall RAG status label

### 3 — Dimension RAG Status
- Grid of category-level RAG cards
- One card per metric category (e.g. Efficiency, Internal Quality, Financial)
- Shows the aggregated RAG for all metrics in that category

### 4 — Overall KPI Health (Donut Chart)
- SVG donut chart showing count of GREEN / AMBER / RED / No Data metrics
- Centre: number of computed metrics out of total

### 5 — By Category (Stacked Bar)
- Horizontal stacked bar per category
- Green / Amber / Red segments proportional to metric counts

### 6 — Filters
- Dropdown: filter by category
- Dropdown: filter by RAG status
- Live metric count shown

### 7 — Metric Cards Grid
- One card per metric (2-4 per row depending on screen width)
- Each card shows:
  - Category label
  - Metric name
  - RAG dot
  - Latest value + UOM
  - Trend indicator ([+] improving, [-] declining, [=] stable)
  - RAG badge
  - Mini sparkline (actual values over time)
  - Target / LSL / USL values
  - Period count
  - "click for trend" hint

### 8 — Metric Trend Panel (on click)
Expands inline when a metric card is clicked.

**Shows:**
- Metric name, category, intent, UOM, period count
- 4 stat cards: Latest Value, Target, LSL, USL (colour-coded blue/purple/orange)
- Threshold chart (see below)
- Legend for chart lines
- Full history table

---

## Threshold Chart

An SVG chart showing all entries over time for the selected metric.

**Chart lines:**
- **Actual** (dark solid line) — connects all computed values in submission order
- **USL** (orange dashed step line) — flat per period, steps visually when PM changes the USL
- **Target** (blue dashed step line) — flat per period, steps when Target changes
- **LSL** (purple dashed step line) — flat per period, steps when LSL changes

**Data points:**
- Coloured dots on the Actual line — RAG colour (green/amber/red dot)
- Actual value label shown above each dot

**X-axis:** Period labels (e.g. "February 2026", "March 2026")  
**Y-axis:** Auto-scaled to fit all values with padding. 5 ticks with formatted labels.

**Step behaviour for thresholds:**  
If Target was 10 in June and PM changed it to 8 in July, the Target line will be flat at 10 through June, then step down to 8 at July. This shows exactly when the threshold was changed.

**Multiple saves per period:**  
If PM saves 3 times for July 2026 with different parameter values (e.g. testing corrections), all 3 appear as separate sequential data points on the Actual line. This gives a complete audit trail.

---

## History Table

Below the chart in the trend panel. Shows every `KpiMeasurement` row for the selected metric.

**Columns:** Period | Value | Target | LSL | USL | RAG | Submitted

**Ordering:** Most recent first (reversed for display, oldest-first in chart).

**"Latest" badge** on the most recent row.

---

## Trend Indicator Logic

Compares the two most recent measurement values:

| Intent | Value increased | Value decreased |
|---|---|---|
| Higher the better | [+] improving | [-] declining |
| Lower the better | [-] declining | [+] improving |
| Other | [=] stable (unless clear direction) |

---

## Navigation from Summary

- "← Back to Data Entry" → `/pm/projects/{id}/qpm/entry`
- Metric card click → opens inline trend panel (no new page)
