# DeliveryPulse AI — Project Specification Overview

**Version:** 2.0  
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

5. **Portfolio Dashboard** — Executive view showing all projects across all BUs with filters, metric tables, and RAG summaries.

6. **DM Review Cycle** — Delivery Managers review KPI data per project, add commentary, and create action items — creating an audit trail of delivery oversight.

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
| `01_ROLES_AND_ACCESS.md` | All six roles, permissions, data scoping |
| `02_ORGANISATION_STRUCTURE.md` | BU → Account → Project hierarchy |
| `03_KPI_PLAN.md` | Metric catalog, plan setup, engagement model |
| `04_DATA_ENTRY.md` | Unified parameter entry, shared measures, computation |
| `05_RAG_COMPUTATION.md` | Thresholds, RAG logic, per-metric and project RAG |
| `06_SUMMARY_AND_TRENDS.md` | KPI Summary page, threshold chart, trend history |
| `07_PORTFOLIO_DASHBOARD.md` | Executive portfolio view, filters, metric cards |
| `08_DM_REVIEW_CYCLE.md` | DM review workflow, commentary, action items |
| `09_DATA_MODEL.md` | All database tables and relationships |
| `10_API_ENDPOINTS.md` | All REST API endpoints grouped by feature |
