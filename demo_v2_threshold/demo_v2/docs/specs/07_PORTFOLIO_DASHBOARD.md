# Spec 07 — Portfolio Dashboard

**Version:** 2.1  
**Last Updated:** July 2026

---

## Overview

The Portfolio Dashboard is the executive-level view of all projects across the organisation. It is the default home page for Platform Admin, CEO, and Delivery Excellence roles.

**Routes:**
- `/platform` — Platform Admin  
- `/ceo` — CEO  
- `/delivery-excellence` — Delivery Excellence  

**Component:** `PortfolioDashboardPage` — shared across all three roles  
**Theme:** Light/dark adaptive using CSS variables (`var(--surface)`, `var(--text)`, `var(--border)`, `var(--muted)`, `var(--primary)`)

---

## Page Layout

### Header
- Page title: **Dashboard**
- Subtitle: current date (e.g. "Wednesday, 15 July 2026")
- Top-right badge: "X projects total"

---

## Stat Cards (5 cards)

All stat cards are **clickable** — clicking opens a filtered project modal (see below).

| Card | Color | Filter Applied |
|---|---|---|
| Total Projects | Purple `#6c63ff` | All projects |
| Green Health | Green `#22c55e` | `current_rag = GREEN` |
| Amber | Amber `#f59e0b` | `current_rag = AMBER` |
| Red / Critical | Red `#ef4444` | `current_rag = RED` or `CRITICAL` |
| No Score | Blue `#3b82f6` | `current_rag = null` |

Each card shows:
- Large count number
- Label (uppercase)
- Sub-label (e.g. "On track", "Monitor closely", "Needs action", "Awaiting entry")
- Trend badge (e.g. "↑ 0%", "↓ 4 at risk")
- SVG icon (top-right corner)
- Hover: lifts `translateY(-2px)` with deeper shadow

---

## Charts Row

Two side-by-side panels below the stat cards.

### 1. Project Health by Business Unit (Bar Chart)
- SVG bar chart — pure SVG, no library
- Three grouped bars per BU: Green / Amber / Red
- Y-axis auto-scales to maximum count
- Legend: coloured square + label
- Responsive via `viewBox` scaling

### 2. Portfolio RAG (Donut Chart)
- SVG donut chart showing Green / Amber / Red / No Data proportions
- Center text: "X% Green health"
- Legend with count per RAG status
- Summary rows below: Projects on track / Need attention / Awaiting first entry

---

## Filter Bar

Sticky bar below the charts. Stays visible while scrolling the project table.

| Filter | Options | Behaviour |
|---|---|---|
| Business Unit | All + BU names derived from project data | Resets Account filter when changed |
| Account | All + accounts (cascades from BU selection) | Filtered by selected BU |
| Project Type | All + 14 standard project types | Client-side filter on `kpiPlan.project_type` |
| Project Category | All + 6 categories | Client-side filter on `kpiPlan.project_category` |

- "✕ Reset filters" button appears when any filter is non-default
- Shows "Showing X of Y projects" count

**Data loading strategy:** Projects load immediately on page mount. KPI plans are fetched in the background (non-blocking) to populate the Project Type and Category filter columns.

---

## Project Table

Shown below the filter bar. All matching projects in a single scrollable table (not individual cards).

**Table columns:**
- Project (name bold in `var(--primary)`, code in monospace)
- Business Unit
- Account
- Type (from KPI plan)
- Category (from KPI plan)
- PM name
- Health (RAG badge)

Each row has a colored left border (`3px`) matching the project's RAG status.

**Clicking any row** navigates to the read-only KPI summary for that project at `{basePath}/projects/{id}/summary`.

---

## At-Risk Projects Panel

Below the table, a separate panel shows all AMBER + RED + CRITICAL projects.

- Background: `rgba(239,68,68,0.06)` with red border
- Title: "⚠ At-Risk Projects — X projects need immediate attention"
- Lists first 5 at-risk projects; "+ N more" expand button for remainder
- Each row: project name, account, BU, RAG badge
- Clicking a row navigates to project KPI summary

---

## Project Detail: Read-Only KPI Summary

**Route:** `{basePath}/projects/:projectId/summary`  
**Component:** `ProjectSummaryReadOnlyPage`

Accessed by clicking a project row in the table or the at-risk panel, or from the stat card modal.

**Page content:**
- "← Portfolio Dashboard" back button (role-aware path)
- Project name (h1), BU, Account, Project Type, Delivery Model (meta chips)
- Overall health RAG pill (top-right)
- 4 stat tiles: Green / Amber / Red / No data metric counts
- Category filter buttons (filters the metric table)
- Metric table:
  - Metric name + category
  - Current value + UOM
  - Target
  - LSL
  - USL
  - RAG status pill
  - Last updated date

---

## Stat Card Click → Filtered Project Modal

Clicking any of the 5 stat cards opens a **modal overlay** listing filtered projects.

### Modal Design
- Fixed overlay: `rgba(0,0,0,0.45)` backdrop
- Modal card: max-width 640px, border-radius 24, `var(--surface)` background
- Slide-up + fade-in animation on open
- Close: ✕ button in header OR click outside the modal

### Modal Header
- Colored bar matching the stat card color
- Project count badge (white pill)
- Title (e.g. "Red / Critical Projects", "All Projects")

### Modal Rows (per project)
- Project name (bold, `var(--primary)`)
- Project code (monospace), account name, BU name
- RAG pill (right-aligned)
- Clicking anywhere on the row navigates to `{basePath}/projects/{id}/summary`

### Empty State
- "No projects in this category" when no projects match the filter

---

## Role-Aware Navigation

The `PortfolioDashboardPage` reads `user.role_code` to determine the correct base path for all navigation:

```typescript
const basePath =
  user?.role_code === "CEO"                   ? "/ceo"
  : user?.role_code === "DELIVERY_EXCELLENCE" ? "/delivery-excellence"
  : "/platform";
```

This ensures all links (table rows, modal rows, at-risk panel, back button) resolve to the correct role-scoped route.

---

## Roles with Access

| Role | Dashboard Path |
|---|---|
| PLATFORM_ADMIN | `/platform` (index) |
| CEO | `/ceo` (index) |
| DELIVERY_EXCELLENCE | `/delivery-excellence` (index) |

All three see identical content — the same `PortfolioDashboardPage` component backed by the same `GET /projects` API call which returns all projects for these roles.
