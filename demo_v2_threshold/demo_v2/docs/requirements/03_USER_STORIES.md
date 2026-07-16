# User Stories

---

## Platform Admin Stories

### US-PA-01 — User Provisioning
**As a** Platform Admin,  
**I want to** create user accounts for all roles (PM, DM, DH, CEO, DE),  
**So that** organisation members can access the platform with appropriate permissions.

**Acceptance Criteria:**
- Settings → User Directory → Provision User
- All six roles available in the dropdown
- User immediately able to log in after creation

---

### US-PA-02 — Organisation Setup
**As a** Platform Admin,  
**I want to** create Business Units, assign a Delivery Head and PM to each BU, and create Accounts under each BU,  
**So that** the organisational hierarchy is correctly represented.

**Acceptance Criteria:**
- Can create BU with code, name, description
- Can assign Delivery Head to BU via dropdown
- Can create Accounts under BUs
- Can assign a DM to each Account

---

### US-PA-03 — DM Assignment
**As a** Platform Admin,  
**I want to** assign a Delivery Manager to each client account from the Org Setup page,  
**So that** DMs automatically gain visibility into the correct projects.

**Acceptance Criteria:**
- Org Setup → Account DM Assignment table shows all accounts
- Dropdown shows only DELIVERY_MANAGER role users
- Saving persists the assignment immediately

---

## CEO / Delivery Excellence / Portfolio Viewer Stories

### US-CEO-01 — Portfolio Overview
**As a** CEO (or Platform Admin or Delivery Excellence),  
**I want to** see all projects across the organisation in a single dashboard,  
**So that** I can quickly assess delivery health at a glance.

**Acceptance Criteria:**
- Portfolio Dashboard shows all projects as individual cards
- Each card shows project name, BU, account, type, category, overall RAG
- RAG summary strip shows counts: Green / Amber / Red / No Data

---

### US-CEO-02 — Portfolio Filtering
**As a** CEO,  
**I want to** filter projects by Business Unit, Account, Project Type, and Project Category,  
**So that** I can focus on specific areas of interest.

**Acceptance Criteria:**
- Sticky filter bar with 4 dropdowns
- Account dropdown cascades from BU selection
- Filter results update immediately without page reload

---

### US-CEO-03 — Per-Project Metrics
**As a** CEO,  
**I want to** see the metric-level KPI data for each project on the dashboard,  
**So that** I can drill into specific project performance without navigating away.

**Acceptance Criteria:**
- Each project card has a horizontally scrollable metric table
- Table shows: Metric Name, Category, Current Value, Target, RAG Status, Trend, Last Updated

---

## Delivery Excellence Stories

### US-DE-01 — Metric Catalog Management
**As a** Delivery Excellence team member,  
**I want to** maintain the QPM metric catalog with standard metrics,  
**So that** Project Managers have a consistent set of metrics to choose from.

**Acceptance Criteria:**
- Can add, edit, activate/deactivate catalog metrics
- Can search and filter by category
- All 83+ metrics visible in the catalog

---

### US-DE-02 — Custom Metric Approval
**As a** Delivery Excellence team member,  
**I want to** review and approve or reject PM requests for custom metrics,  
**So that** non-standard metrics have appropriate oversight before being used.

**Acceptance Criteria:**
- Pending requests tab shows count badge
- Can approve with one click or reject with optional comment
- Approved metric is automatically added to the PM's plan

---

## Project Manager Stories

### US-PM-01 — Create Project
**As a** Project Manager,  
**I want to** create a new project for my assigned BU's client,  
**So that** I can start tracking KPI metrics for that engagement.

**Acceptance Criteria:**
- My Projects → Create Project button
- My BU shown at top (read-only)
- Select account from my BU's accounts
- Fill project details and engagement model
- Mandatory metrics auto-added on creation

---

### US-PM-02 — Enter KPI Parameters
**As a** Project Manager,  
**I want to** enter parameter values for the current reporting period once,  
**So that** all metrics that share those parameters are computed automatically.

**Acceptance Criteria:**
- Data Entry page shows all unique parameters in one panel
- Entering "Delivered and Accepted Size" once computes Productivity, Delivered Defect Density, and all other metrics needing it
- Save button computes all metrics that have complete inputs

---

### US-PM-03 — Avoid Re-entering Unchanged Values
**As a** Project Manager,  
**I want to** see my previously entered parameter values when I open data entry,  
**So that** I only need to change what's different each period.

**Acceptance Criteria:**
- Parameters pre-filled from last saved values for this project
- Thresholds pre-filled from last saved thresholds
- No need to re-enter unchanged values

---

### US-PM-04 — Track Threshold Changes Over Time
**As a** Project Manager,  
**I want to** change LSL, Target, or USL values for a metric,  
**So that** targets can evolve with project maturity, and the chart shows when they changed.

**Acceptance Criteria:**
- Thresholds editable in the Thresholds panel
- Saved on every Save click
- Chart shows a visible step in the threshold line when value changes between periods

---

### US-PM-05 — View Metric Trend History
**As a** Project Manager,  
**I want to** click on any metric card in the Summary page and see its full history with a chart,  
**So that** I can track how a metric has evolved and identify trends.

**Acceptance Criteria:**
- Click metric card → trend panel expands
- Chart shows all historical Actual values as a line
- USL, Target, LSL shown as stepped reference lines
- Full history table below chart

---

### US-PM-06 — Add Project Commentary
**As a** Project Manager,  
**I want to** add an optional comment about the project for the current reporting period,  
**So that** my Delivery Manager understands the context behind the metric values.

**Acceptance Criteria:**
- Comment box on Data Entry page
- Optional — not required to save measurements
- Visible to DM on the Project Review page

---

## Delivery Manager Stories

### US-DM-01 — See Which Projects Need Review
**As a** Delivery Manager,  
**I want to** see immediately which projects have new metric data since my last review,  
**So that** I know where to focus my attention.

**Acceptance Criteria:**
- Dashboard shows "Needs Review" badge (amber, pulsing) on relevant projects
- Alert banner shows total count of projects needing review
- "Review KPIs →" button highlighted in amber for those projects

---

### US-DM-02 — Review KPI Data
**As a** Delivery Manager,  
**I want to** view the KPI data for a project and understand current health,  
**So that** I can assess whether the project is on track.

**Acceptance Criteria:**
- DM Review page shows KPI summary grouped by category
- Each metric shows latest value, target, RAG status
- RED metrics are highlighted

---

### US-DM-03 — Add Commentary and Action Items
**As a** Delivery Manager,  
**I want to** record my observations and any actions required for a project,  
**So that** there is an audit trail of my oversight activity.

**Acceptance Criteria:**
- Review form has: period label, commentary (required), action items list (optional)
- Submitting creates a new DM review record
- Past reviews visible in Review History section
- Can edit previous reviews

---

## Delivery Head Stories

### US-DH-01 — Monitor BU Projects
**As a** Delivery Head,  
**I want to** see all projects in my BU and their health status,  
**So that** I can identify at-risk projects and take governance action.

**Acceptance Criteria:**
- My BU page shows all accounts and projects in the BU
- Each project shows RAG badge
- Can navigate to project details and KPI summary

---

---

## Updated / New Executive (Portfolio) Stories

### US-CEO-04 — Clickable Stat Cards
**As a** CEO (or Platform Admin or Delivery Excellence),  
**I want to** click a stat card (e.g. "Red / Critical") and immediately see a list of all projects in that category,  
**So that** I can quickly drill into problem areas without scrolling through the full project table.

**Acceptance Criteria:**
- Clicking any of the 5 stat cards opens a modal overlay
- Modal header is colour-matched to the card (green, amber, red, blue, purple)
- Modal lists only the projects matching that card's filter with name, code, account, BU, and RAG pill
- Clicking a project row navigates to its read-only KPI summary
- Modal closes on ✕ click or backdrop click
- **Implemented:** ✅

---

### US-CEO-05 — Read-Only Project KPI Summary
**As a** CEO (or Platform Admin or Delivery Excellence),  
**I want to** click a project and see all its KPI metrics in a full-page read-only view,  
**So that** I can review project health without accessing the PM's data entry flow.

**Acceptance Criteria:**
- Project click → navigates to `{role_base}/projects/{id}/summary`
- Page shows: project name, BU, account, overall RAG, Green/Amber/Red/No Data count tiles
- Category filter buttons to narrow the metric list
- Full metric table: Metric, Current Value, Target, LSL, USL, RAG Status, Last Updated
- "← Portfolio Dashboard" back button returns to correct role home
- **Implemented:** ✅

---

### US-CEO-06 — Portfolio Charts
**As a** CEO,  
**I want to** see a bar chart of project health per Business Unit and a RAG donut chart,  
**So that** I can understand the portfolio health distribution at a glance without needing to read every row.

**Acceptance Criteria:**
- Bar chart: grouped Green / Amber / Red bars per BU
- Donut: RAG proportions with center showing % green health
- Summary below donut: projects on track / need attention / awaiting entry counts
- **Implemented:** ✅

---

## Updated PM Stories

### US-PM-07 — Create Project from Dashboard
**As a** Project Manager,  
**I want to** create a new project directly from my dashboard,  
**So that** I don't need to navigate to the My Projects page first.

**Acceptance Criteria:**
- "+ New Project" button in the dashboard hero banner → opens project creation form
- "Create Project" quick action card → same destination
- **Implemented:** ✅

---

### US-PM-08 — Click Stat Card to See Filtered Projects
**As a** Project Manager,  
**I want to** click a dashboard stat card (e.g. "Needs Attention") and see a list of those specific projects,  
**So that** I can quickly jump to the projects that need my focus.

**Acceptance Criteria:**
- Clicking "Needs Attention" shows all AMBER + RED projects
- Clicking "Green Health" shows all GREEN projects
- Clicking "Awaiting Score" shows all projects with no RAG
- Each project row in the modal has two buttons: "Summary" and "Data Entry"
- **Implemented:** ✅

---

### US-PM-09 — View PM Summary Page
**As a** Project Manager,  
**I want to** click any project from my dashboard and go directly to its KPI summary,  
**So that** I get an immediate health overview without going to data entry first.

**Acceptance Criteria:**
- Clicking a project card on the PM dashboard → navigates to `/pm/projects/{id}/qpm/summary`
- Dashboard project cards show RAG badge, project name, account, BU, dates
- **Implemented:** ✅

---

### US-PM-10 — Receive Notification When DM Raises Action Item
**As a** Project Manager,  
**I want to** receive an in-app notification when my Delivery Manager raises an action item for one of my projects,  
**So that** I know what corrective actions are expected and from which DM.

**Acceptance Criteria:**
- Notification appears in the bell within 30 seconds of DM creating the action item
- Notification title: "Action item raised — {project name}"
- Message: "{DM name} raised: {root cause}"
- Clicking notification → navigates to `/pm/actions?project={id}`
- Action items list shows DM's name in "created by" context
- **Implemented:** ✅

---

## Updated DM Stories

### US-DM-04 — Click Stat Card to See Filtered Projects
**As a** Delivery Manager,  
**I want to** click a stat card (e.g. "At Risk") to see just those projects,  
**So that** I can immediately start reviewing the most critical projects.

**Acceptance Criteria:**
- Clicking "Needs Review" shows projects with new measurements
- Clicking "Green Health" shows healthy projects
- Clicking "At Risk" shows amber + red projects
- Modal rows have "Review KPIs" button navigating to the review page
- **Implemented:** ✅

---

### US-DM-05 — Manage Action Items on Dedicated Page
**As a** Delivery Manager,  
**I want to** manage all action items for my projects on a single dedicated page (separate from project reviews),  
**So that** my review commentary and action item tracking remain cleanly separated.

**Acceptance Criteria:**
- `/delivery-manager/actions` is the dedicated action items page
- Project selector to switch between projects
- Stat tiles: Total / Open / In Progress
- Create form: metric name, owner, due date, root cause, corrective action
- Creating an action item automatically notifies the project's PM
- **Implemented:** ✅

---

### US-DM-06 — Review Without Action Items in Form
**As a** Delivery Manager,  
**I want to** submit my project review with just my commentary (no action items in the review form),  
**So that** reviews are focused on observations, while action items remain in their dedicated page.

**Acceptance Criteria:**
- DM Review form has only: Reporting Period + Commentary + Submit
- No action items section in the review form
- Previous reviews show only period + commentary in history
- **Implemented:** ✅

---

## Updated Delivery Head Stories

### US-DH-02 — Click Stat Tile to See Filtered Projects
**As a** Delivery Head,  
**I want to** click a stat tile (e.g. "At risk") to see just those projects,  
**So that** I can quickly identify which projects in my BU need governance attention.

**Acceptance Criteria:**
- Clicking "Total projects" shows all projects
- Clicking "Needs attention" shows RED + CRITICAL projects
- Clicking "Green health" shows GREEN projects
- Clicking "At risk" shows AMBER + RED + CRITICAL projects
- Modal rows navigate to `/delivery-head/projects/{id}/summary`
- **Implemented:** ✅

---

## Theme Stories

### US-SYS-01 — Switch Between Light and Dark Theme
**As any** user,  
**I want to** toggle between a light and dark colour scheme,  
**So that** I can use the platform comfortably in different lighting conditions.

**Acceptance Criteria:**
- Toggle pill switch in every page's header bar
- Theme persists after page refresh (stored in localStorage)
- All page backgrounds, cards, text, and borders adapt correctly in both themes
- Coloured stat tiles and RAG badges retain their semantic colours in both themes
- **Implemented:** ✅
