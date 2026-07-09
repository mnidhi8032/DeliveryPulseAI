# Spec 08 — Delivery Manager Review Cycle

---

## Overview

The DM Review Cycle allows Delivery Managers to periodically review KPI data for their assigned projects, add commentary, and record action items. This creates an audit trail of delivery oversight without blocking the PM's ability to enter data.

**This is NOT an approval workflow.** The PM can always enter data. The DM reviews independently.

---

## DM Dashboard

**Route:** `/delivery-manager`  
**Component:** `DMDashboardPage`

### Summary Cards
- Total Projects (projects in DM's assigned accounts)
- Needs Review (projects with new measurements since last DM review)
- Accounts (number of accounts assigned to this DM)

### "Needs Review" Alert
When any projects have new metric data since the last review, an amber alert banner appears:  
*"X projects have new metric data since your last review"*

### Projects Table (grouped by account)

**Account group header:** Account name + BU name + project count

**Per project row:**
- Project name, project code
- PM name
- Overall Health RAG badge
- Review Status:
  - **"Needs Review"** (amber pulsing dot) — new measurements exist since last DM review
  - **"Up to date"** (green dot) — DM has reviewed all current measurements
  - "Not reviewed yet" — no DM review exists for this project
- Last Reviewed date + period label
- **"Review KPIs →"** (amber button) or **"View KPIs"** (grey button)

---

## DM Project Review Page

**Route:** `/delivery-manager/projects/{projectId}/review`  
**Component:** `DMProjectReviewPage`

### Header
- "← Back to Dashboard"
- Project name, BU, Account, PM name
- Overall Health RAG badge

### RAG Summary Strip
- Four count cards: Green / Amber / Red / No Data metrics

### KPI Summary (expandable by category)
- Metrics grouped by category (all categories expanded by default)
- Each category row shows: category name + RAG dot + metric count + aggregated RAG badge
- Clicking a category collapses/expands its metrics

**Per metric row:**
- Metric name, UOM
- Latest Value
- Target
- RAG badge
- Trend indicator
- Last Updated date

Metrics with RED RAG are subtly highlighted (bg-red-50/30).

### Review Form
- **Reporting Period** (text input, e.g. "July 2026") — pre-filled with current month
- **Commentary** (required textarea) — DM's observations on the KPI data
- **Action Items** (optional list) — free-text items, add/remove buttons
- **Submit Review / Update Review** button

### Review History
All past DM reviews for this project shown below the form, newest first:
- Period label badge
- Reviewer name + timestamp
- Commentary text
- Action items list (bullet points)
- **Edit** button to load into form for update

---

## Review Status Logic

`needs_review = True` when:
- There are `KpiMeasurement` rows with `updated_at` after the most recent `dm_reviews.reviewed_at`
- OR there are no DM reviews at all but measurements exist

**API endpoint:** `GET /api/v1/dm-reviews/project-statuses`  
Returns one `ProjectReviewStatus` per project with: `needs_review`, `last_reviewed_at`, `last_review_period`, `latest_measurement_at`, `total_reviews`.

---

## Data Storage

`dm_reviews` table:
- `project_id` — the project being reviewed
- `kpi_plan_id` — the KPI plan version
- `reviewed_by_user_id` — the DM who wrote the review
- `period_label` — the reporting period this review covers
- `dm_comments` — the DM's commentary text
- `action_items` — JSON array of action item strings
- `reviewed_at` — timestamp of review submission

Multiple reviews can exist per project. Each review is a separate record (full audit history).

---

## DM Navigation

| Page | Route |
|---|---|
| Dashboard | `/delivery-manager` |
| Project Review | `/delivery-manager/projects/{id}/review` |
| Action Items | `/delivery-manager/actions` |
