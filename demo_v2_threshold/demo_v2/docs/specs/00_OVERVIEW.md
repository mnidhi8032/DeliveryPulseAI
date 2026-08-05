# DeliveryPulse AI — Project Specification Overview

**Version:** 2.2
**Status:** Active
**Last Updated:** July 2026

---

## What Is DeliveryPulse AI?

DeliveryPulse AI is an enterprise delivery governance platform that enables software delivery organisations to monitor, measure, and improve project health through structured KPI tracking.

The platform replaces manual spreadsheet-based QPM (Quality Performance Measurement) reporting with a centralised, role-aware system. Project Managers enter metric data once. The system automatically computes KPI values, assigns RAG (Red-Amber-Green) health statuses, and surfaces trends to leadership.

---

## Core Purpose

1. **Structured KPI Tracking** — Every project has a KPI Plan with selected metrics from an organisational catalog. PMs enter parameter values; the system computes the metric results.

2. **Shared Parameter Entry** — Parameters shared across multiple metrics (e.g. "Delivered and Accepted Size" used by 7+ metrics) are entered once and propagate to all relevant metrics automatically.

3. **RAG Health Visibility** — Each metric gets GREEN / AMBER / RED status based on Target, LSL, and USL thresholds. Project health rolls up from metric → category → project.

4. **Role-Based Access** — Six roles with strict data isolation. PMs see only their projects. Delivery Managers see only their assigned accounts. Leadership sees the full portfolio.

5. **Executive Portfolio Dashboard** — Platform Admin, CEO, and Delivery Excellence see a rich dashboard with stat cards, BU health bar chart, RAG donut, filter bar, and full project table. Clicking any stat card shows a filtered project modal.

6. **PM Dashboard** — Project Managers see a personalised workspace with stat cards, quick actions, portfolio health panel, and project cards. Clicking stat cards shows a filtered project modal with Summary and Data Entry shortcuts.

7. **DM Review Cycle** — Delivery Managers review KPI data per project, add commentary creating an audit trail of delivery oversight. DMs can also raise action items directly from the Review KPIs page inline, without navigating away.

8. **DM → PM Notification** — When a Delivery Manager creates an action item for a project, the assigned PM is automatically notified in-app with a deep-link to the action items page.

9. **Project-Level Action Items** — Both PMs and DMs can raise action items scoped to the whole project (not tied to any specific metric). These appear in the PM Actions page with a distinct "📋 Project-Level" badge and can be filtered separately from metric-specific actions using the Type filter.

10. **Engagement Model Preset System** — New projects with a known engagement combo (e.g. Testing / Agile-Scrum) get an exact, evidence-based mandatory metric list from the `engagement_model_presets` table. Three presets seeded from real client projects (JNJ AM R5.0, JNJ Platform Support, JNJ JJCC Hybris). Unlisted combos fall back to the existing ILIKE tag-matching logic.

11. **Dark / Light Theme** — All pages support a togglable dark/light theme using CSS variables (`var(--bg)`, `var(--surface)`, `var(--text)`, `var(--muted)`, `var(--border)`, `var(--primary)`).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic |
| Database | PostgreSQL |
| Auth | JWT (RS256), bcrypt password hashing |
| Charts | Pure SVG (no chart library dependency) |

---

## Specification Files

| File | Contents |
|---|---|
| `01_ROLES_AND_ACCESS.md` | All six roles, permissions, data scoping, dashboard routes |
| `02_ORGANISATION_STRUCTURE.md` | BU → Account → Project hierarchy |
| `03_KPI_PLAN.md` | Metric catalog, plan setup, engagement model, preset system |
| `04_DATA_ENTRY.md` | Unified parameter entry, shared measures, computation |
| `05_RAG_COMPUTATION.md` | Thresholds, RAG logic, per-metric and project RAG |
| `06_SUMMARY_AND_TRENDS.md` | KPI Summary page, threshold chart, trend history, project-level actions |
| `07_PORTFOLIO_DASHBOARD.md` | Executive portfolio view, stat cards, charts, modal drill-down |
| `08_DM_REVIEW_CYCLE.md` | DM review workflow, inline action raising, commentary |
| `09_DATA_MODEL.md` | All database tables and relationships |
| `10_API_ENDPOINTS.md` | All REST API endpoints grouped by feature |
| `11_DM_ACTION_ITEM_PM_NOTIFICATION.md` | DM action item → PM in-app notification flow |
| `12_PM_DASHBOARD.md` | PM workspace dashboard, stat cards, project cards, modal |
| `13_THEME_SYSTEM.md` | Light/dark theme architecture and CSS variable usage |
| `14_RAG_EXPLANATION_RECOMMENDATION.md` | AI explanation + recommendation for RED/AMBER metrics |
| `15_ACTION_ITEMS_SYSTEM.md` | Full action items system — project-level, metric-level, type filter, DM inline raise |
| `16_ENGAGEMENT_MODEL_PRESETS.md` | Preset system for evidence-based mandatory metric selection |
