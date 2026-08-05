# Spec 15 — Action Items System

**Status:** Implemented ✅
**Version:** 1.1
**Last Updated:** July 2026

---

## Overview

Action items are corrective actions logged against a project when a KPI is performing poorly or when the project needs a broader intervention. They can be raised by both Project Managers and Delivery Managers.

---

## Action Item Types

### Metric-Level Action Item
Tied to a specific metric. Has `metric_name` and optionally `rag_status_at_creation` populated.
Raised from:
- The metric trend panel (RED/AMBER metrics) in `QPMSummaryPage` and `PMSummaryPage`
- The DM Project Review page inline form (metric field filled in)
- The DM Action Items page (`/delivery-manager/actions`)
- The PM per-project Action Items page (`/pm/projects/:id/actions`)

### Project-Level Action Item
Not tied to any metric. `metric_name` is null/blank.
Raised from:
- The "Project-Level Action" form at the bottom of `QPMSummaryPage` (after all metric cards)
- The "Project-Level Action" form at the bottom of `PMSummaryPage` (after all metric cards)
- The DM Project Review page inline form (metric field left blank)
- The DM Submission Review page inline form (metric field left blank)

---

## Data Model

### `action_items` table

| Column | Type | Description |
|---|---|---|
| id | UUID PK | Primary key |
| project_id | UUID FK → projects | Required — which project |
| submission_id | UUID FK → submissions | Optional — linked submission |
| metric_name | VARCHAR(200) | Optional — null for project-level actions |
| rag_status_at_creation | VARCHAR(10) | RED / AMBER at time of raising (optional) |
| root_cause | TEXT | Required |
| corrective_action | TEXT | Required |
| owner_user_id | UUID FK → users | Optional — FK to user |
| owner_name | VARCHAR(200) | Optional — free text fallback |
| target_closure_date | DATE | Optional |
| closed_at | TIMESTAMPTZ | Set when status → CLOSED |
| action_status | VARCHAR(20) | OPEN / IN_PROGRESS / CLOSED |
| created_by_user_id | UUID FK → users | Who raised it (DM or PM) |

---

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/action-items/by-project/{project_id}` | List items for project; `?overdue_only=true` filter |
| POST | `/api/v1/action-items` | Create action item |
| PATCH | `/api/v1/action-items/{id}/status` | Update status / corrective action / owner / date |
| DELETE | `/api/v1/action-items/{id}` | Delete (requires `can_manage_project`) |

---

## PM Actions Page (`/pm/actions`) — `PMAllActionsPage`

Consolidated view of all action items across all PM's projects.

### Filters

| Filter | Options | Behaviour |
|---|---|---|
| Status | All / Open / In Progress / Closed | Counts shown on stat chips |
| Type | All / Project-Level (N) / Metric (N) | Filters by `metric_name` null vs non-null |
| Raised by | All / PM / DM | Heuristic: DM items have `created_by_name` prefixed with "DM" |
| Project | All Projects + individual projects | Dropdown |

### Visual Distinction for Project-Level Items

- Left border: **indigo `#6366f1`** (metric-specific items use RAG status colour)
- Badge: **📋 Project-Level** (indigo pill) instead of metric name badge
- Type filter shows count: "Project-Level (N)"

### Deep-link Support
`?project={id}` query param auto-selects the project filter and highlights matching cards (used from notification bell deep-links).

---

## PM per-project Actions Page (`/pm/projects/:id/actions`) — `ActionItemsPage`

Shows all action items for one specific project. Allows creating new items with optional metric name and RAG status. Status can be changed inline.

---

## DM Actions Page (`/delivery-manager/actions`) — `DMActionItemsPage`

Project dropdown to select which project to view/manage. Stat tiles: Total / Open / In Progress.
Create form: Metric/area, Owner, Target date, Root cause, Corrective action.

---

## DM Inline Raise — Review KPIs Page

A "Raise Action Item" card is embedded directly in `DMProjectReviewPage` below the review/commentary form. DM can create an action without leaving the review page.

- **Metric field blank** → project-level action
- **Metric field filled** → metric-specific action
- On save: `POST /api/v1/action-items`, PM notified automatically (Spec 11)

---

## DM Inline Raise — Submission Review Page

A "Raise Action Item" section is embedded in `DMSubmissionReviewPage` below the commentary section, replacing the old "Manage actions →" link. Also passes `submission_id` so the action is linked to the specific submission for traceability.

---

## Summary Page Project-Level Actions

Both `QPMSummaryPage` (`/pm/projects/:id/qpm/summary`) and `PMSummaryPage` (`/pm/summary`) show a **"Project-Level Action"** card at the bottom of the metrics list. This allows PMs to raise a corrective action for the whole project in context.

The form expands inline with: Root Cause, Corrective Action, Owner Name, Target Closure Date. On save it creates an action item with `metric_name = null`.

---

## Notification Flow

When any user creates an action item:
1. `ActionItemService.create()` saves the item
2. If `project.project_manager_id` is set AND differs from the creator → a `Notification` row is inserted for the PM
3. PM's bell shows `+1 unread`
4. PM clicks notification → navigates to `/pm/actions?project={id}`

See `11_DM_ACTION_ITEM_PM_NOTIFICATION.md` for full detail.
