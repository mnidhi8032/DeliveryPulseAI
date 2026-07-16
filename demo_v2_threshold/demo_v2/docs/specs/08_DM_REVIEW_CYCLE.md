# Spec 08 — Delivery Manager Review Cycle

**Version:** 2.1  
**Last Updated:** July 2026

---

## Overview

The DM Review Cycle allows Delivery Managers to periodically review KPI data for their assigned projects and add commentary. Action items are managed on a separate dedicated page. This creates an audit trail of delivery oversight without blocking the PM's ability to enter data.

**This is NOT an approval workflow.** The PM can always enter data. The DM reviews independently.

---

## DM Dashboard

**Route:** `/delivery-manager`  
**Component:** `DMDashboardPage`  
**Theme:** Light purple — CSS variables (`var(--surface)`, `var(--text)`, `var(--muted)`, `var(--border)`)

### Stat Cards (4 cards)
All stat cards are **clickable** — clicking opens a filtered project modal.

| Card | Color | Filter Applied |
|---|---|---|
| Total Projects | Purple `#6c63ff` | All projects |
| Needs Review | Orange `#f97316` | Projects with new measurements since last review |
| Green Health | Green `#22c55e` | `current_rag = GREEN` |
| At Risk | Amber `#f59e0b` | `current_rag = AMBER` or `RED` |

Each card: count number, label, sub-label, hover lift effect.

### Stat Card → Project Modal

Clicking any stat card opens a modal overlay:
- **Header:** colored bar (matching card), project count badge, title
- **Rows:** project name, code, account, BU, RAG pill, "Review KPIs" button → `/delivery-manager/projects/{id}/review`
- **Empty state:** "No projects in this category"
- Close: ✕ button or backdrop click

### Charts Row (2 charts)

**Health Distribution Bar Chart (SVG):**
- Three bars: Green / Amber / Red counts
- No external chart library

**Review Status Donut (SVG):**
- Two segments: Needs Review / Up to Date
- Center: "X% needs review"

### "Needs Review" Alert Banner

When any projects have new metric data since the last DM review:
> *"X projects have new metric data awaiting your review"*

Shown in a warm amber card (`#fff7ed` background).

### Projects Table (grouped by account)

**Account group header:** Account name + BU name + project count

**Per project row:**
| Column | Content |
|---|---|
| Project | Name (bold) + project code (monospace) |
| PM | PM name |
| Health | RAG dot + text label |
| Review Status | "Needs review" (amber pill) / "Up to date" (green pill) / "Not reviewed" |
| Last Reviewed | Date + period label |
| Action | "Review KPIs →" (solid purple if needs review) / "View" (outline) |

---

## DM Project Review Page

**Route:** `/delivery-manager/projects/{projectId}/review`  
**Component:** `DMProjectReviewPage`

### Header
- "← Dashboard" link (back navigation)
- Project name (h1), BU, Account, PM name (meta chips)
- Overall Health RAG badge (top-right card)

### RAG Summary Strip
Four count tiles: Green / Amber / Red / No Data metric counts (solid colored backgrounds)

### KPI Summary (expandable by category)
- Metrics grouped by category (all categories expanded by default)
- Category row: colored dot + category name + metric count badge + collapse chevron
- Clicking a category collapses/expands its metrics

**Per metric row:**
| Column | Content |
|---|---|
| Metric | Name (bold) + UOM |
| Value | Latest value (right-aligned, bold) |
| Target | Target value (right-aligned) |
| RAG | Dot + colored text label |
| Trend | ↑ Improving / ↓ Declining / → Stable |
| Updated | Last updated date |

### Review Form

**Purpose:** DM adds commentary about project KPI performance for the reporting period.

| Field | Type | Required |
|---|---|---|
| Reporting period | Text input (e.g. "July 2026") | Yes — pre-filled with current month |
| Commentary | Textarea | Yes |

> **Note:** Action items have been removed from the review form. They are managed exclusively on the dedicated Action Items page (`/delivery-manager/actions`).

**Submit / Update Review button** → creates or updates a `dm_reviews` record.

### Review History

All past DM reviews shown below the form, newest first:
- Period label badge
- Reviewer name + timestamp
- Commentary text (indented with left border)
- **Edit** button to load into the form for update

---

## DM Action Items Page

**Route:** `/delivery-manager/actions`  
**Component:** `DMActionItemsPage`

Action items are **completely separate** from the review submission. This page is the dedicated place to create and manage corrective actions.

### Project Selector
- Dropdown to select a project (all DM's accessible projects)
- Auto-selects the first project on page load
- URL parameter `?projectId=xxx` pre-selects a project (used from notification deep-links)

### Stat Tiles (3 tiles)
| Tile | Color | Content |
|---|---|---|
| Total | Purple | Total action items for selected project |
| Open | Amber | Items with `action_status = OPEN` |
| In Progress | Blue | Items with `action_status = IN_PROGRESS` |

### Create Action Item Form (toggle)

"+ New action item" button shows/hides the form.

| Field | Type | Required |
|---|---|---|
| Metric / area of concern | Text input | No |
| Owner name | Text input | No |
| Target closure date | Date input | No |
| Root cause | Textarea | Yes |
| Corrective action | Textarea | Yes |

On submit:
- `POST /api/v1/action-items` creates the action item
- Backend automatically creates an in-app notification for the project's PM (Spec 11)
- Form resets and new item appears in the list

### Action Items List

Each item card shows:
- Metric name badge (if provided)
- Root cause (bold)
- Corrective action
- Owner name + Due date (if provided)
- Status pill (Open / In Progress / Closed / Overdue)

---

## Review Status Logic

`needs_review = True` when:
- There are `KpiMeasurement` rows with `updated_at` after the most recent `dm_reviews.reviewed_at`
- OR there are no DM reviews at all but measurements exist

**API endpoint:** `GET /api/v1/dm-reviews/project-statuses`  
Returns one `ProjectReviewStatus` per project with: `needs_review`, `last_reviewed_at`, `last_review_period`, `latest_measurement_at`, `total_reviews`.

---

## Data Storage

### `dm_reviews` table
| Column | Description |
|---|---|
| `project_id` | The project being reviewed |
| `kpi_plan_id` | The KPI plan version |
| `reviewed_by_user_id` | The DM who wrote the review |
| `period_label` | The reporting period this review covers |
| `dm_comments` | The DM's commentary text |
| `action_items` | JSON array (always empty — action items are in the `action_items` table) |
| `reviewed_at` | Timestamp of review submission |

Multiple reviews can exist per project. Each review is a separate record (full audit history).

### `action_items` table
| Column | Description |
|---|---|
| `project_id` | The project this action is for |
| `root_cause` | Description of the root cause |
| `corrective_action` | The corrective action to take |
| `metric_name` | Optional — which metric this relates to |
| `owner_name` | Optional — who owns this action |
| `target_closure_date` | Optional — due date |
| `action_status` | OPEN / IN_PROGRESS / CLOSED |
| `created_by_user_id` | The DM who created it |
| `rag_status_at_creation` | RAG status when the item was created |

---

## DM Navigation

| Page | Route |
|---|---|
| Dashboard | `/delivery-manager` |
| Project Review | `/delivery-manager/projects/{id}/review` |
| Action Items | `/delivery-manager/actions` |
