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
