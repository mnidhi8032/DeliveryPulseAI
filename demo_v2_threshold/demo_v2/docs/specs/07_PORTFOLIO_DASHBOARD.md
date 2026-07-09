# Spec 07 — Portfolio Dashboard

---

## Overview

The Portfolio Dashboard is the executive-level view of all projects across the organisation. It is the default home page for Platform Admin, CEO, and Delivery Excellence roles.

**Route:** `/platform` (Platform Admin), `/ceo` (CEO), `/delivery-excellence` (DE)  
**Component:** `PortfolioDashboardPage` — shared across all three roles

---

## Page Layout

### Header
- Page title: **Portfolio Dashboard**
- Subtitle: "X of Y projects" (updates with filters)

### RAG Summary Strip (top right)
- Four pills: Green [count] · Amber [count] · Red [count] · No Data [count]
- Updates live when filters are applied

### Sticky Filter Bar
Four dropdowns that filter the project cards below:

| Filter | Options | Source |
|---|---|---|
| Business Unit | All + BU names from project data | Derived from `project.business_unit_name` |
| Account | All + account names (cascades from BU selection) | Derived from `project.account_name` |
| Project Type | All + full list of 14 project types | Static list from `types/qpm.ts` |
| Project Category | All + full list of 6 project categories | Static list from `types/qpm.ts` |

**Sticky behaviour:** Filter bar stays visible while scrolling through project cards.

**Account cascade:** When a BU is selected, the Account dropdown filters to show only accounts in that BU.

**Project Type / Category filtering:** Filters against `kpi_plan.project_type` and `kpi_plan.project_category` fetched when the page loads.

---

## Project Cards

One card per matching project, displayed vertically.

### Card Header
- Project name (large, bold)
- Project code (monospace, small)
- **Overall Health** badge (GREEN / AMBER / RED / No data) — top right
- Four meta items with icons:
  - Business Unit (building icon, indigo)
  - Account (briefcase icon, emerald)
  - Project Type (PT label, amber)
  - Category (PC label, purple)

### Card Metrics (horizontally scrollable table)
- Metric data is fetched lazily per card (on mount, via `getKpiPlan` → `getKpiSummary`)
- The metric table section scrolls horizontally when metrics exceed screen width
- The project header remains fixed above the scrollable table

**Metric table columns:**
- Metric Name (sticky left column)
- Category
- Current Value
- Target
- RAG Status (badge with dot)
- Trend ([+] / [-] / [=])
- Last Updated
- Frequency

**Empty states:**
- "Loading metrics..." while fetching
- "Metrics unavailable" on API error
- "No metrics configured yet" if plan has no active metrics

---

## Data Fetching Strategy

1. Page load: `listProjects()` + `getKpiPlan()` for all projects (in parallel) → populates filters and pre-fills Project Type/Category
2. Each project card independently fetches `getKpiSummary(plan.id)` on mount
3. Pre-fetched `kpiPlan` is passed down to each card to avoid duplicate plan fetches
4. Filters are applied client-side (no additional API calls)

---

## Roles with Access

| Role | Dashboard Path |
|---|---|
| PLATFORM_ADMIN | `/platform` (index) |
| CEO | `/ceo` (index) |
| DELIVERY_EXCELLENCE | `/delivery-excellence` (index) |

All three see identical content — the same `PortfolioDashboardPage` component, backed by the same `GET /projects` API call which returns all 9 projects for these roles.
