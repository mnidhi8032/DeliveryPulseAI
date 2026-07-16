# Functional Requirements

---

## FR-001 to FR-007 — Authentication and Role Access

### FR-001 — User Login
**Priority:** Critical  
**Description:** The system shall allow users to log in using email and password.  
**Acceptance Criteria:**
- POST `/api/v1/auth/login` accepts `{ email, password }` and returns a JWT access token and user object
- Invalid credentials return HTTP 401 with message "Incorrect email or password"
- Token expires after 60 minutes
- Token is stored client-side in localStorage
- **Implemented:** ✅

### FR-002 — Role-Based Route Protection
**Priority:** Critical  
**Description:** Each application route shall be accessible only to users with the permitted role.  
**Acceptance Criteria:**
- Navigating to a role-restricted route without valid token redirects to `/login`
- Navigating to a route with a different role redirects to `/unauthorized`
- Six roles are supported: PLATFORM_ADMIN, CEO, DELIVERY_EXCELLENCE, DELIVERY_HEAD, DELIVERY_MANAGER, PM
- **Implemented:** ✅

### FR-003 — Role-Based Data Scoping
**Priority:** Critical  
**Description:** Each role shall only see data they are authorised to access.  
**Acceptance Criteria:**
- PM sees only their own projects
- DM sees only projects in their assigned accounts
- Delivery Head sees only projects in their assigned BU
- CEO / Platform Admin / Delivery Excellence see all projects
- **Implemented:** ✅

### FR-004 — User Provisioning
**Priority:** High  
**Description:** Platform Admin shall be able to create, edit, and deactivate user accounts for all roles.  
**Acceptance Criteria:**
- Settings → User Directory supports: Provision User, Edit User, Delete User
- All six roles available in the role dropdown
- Password set at creation; editable by admin
- **Implemented:** ✅

### FR-005 — Session Management
**Priority:** High  
**Description:** Unauthenticated or expired sessions shall redirect to login.  
**Acceptance Criteria:**
- Expired or invalid token returns HTTP 401
- Frontend detects 401 and clears token, redirects to `/login`
- Login page redirects authenticated users to their role's home path
- **Implemented:** ✅

### FR-006 — Role-Based Home Redirect
**Priority:** Medium  
**Description:** After login, each role shall be redirected to their designated home page.  
**Acceptance Criteria:**
- PLATFORM_ADMIN → `/platform`
- CEO → `/ceo`
- DELIVERY_EXCELLENCE → `/delivery-excellence`
- DELIVERY_HEAD → `/delivery-head`
- DELIVERY_MANAGER → `/delivery-manager`
- PM → `/pm`
- **Implemented:** ✅

### FR-007 — Current User Profile
**Priority:** Medium  
**Description:** The system shall expose the authenticated user's details.  
**Acceptance Criteria:**
- `GET /auth/me` returns `{ id, email, full_name, role_code }`
- Used by sidebar to display user initials, name, and role label
- **Implemented:** ✅

---

## FR-008 to FR-015 — Organisation Setup

### FR-008 — Business Unit Creation
**Priority:** High  
**Description:** Platform Admin shall be able to create and manage Business Units.  
**Acceptance Criteria:**
- Settings → Org Setup → Create BU accepts: code, name, description, is_active
- BU code is unique and immutable after creation
- Delivery Head can be assigned to a BU at creation or edit time
- **Implemented:** ✅

### FR-009 — PM Assignment to BU
**Priority:** High  
**Description:** Each Business Unit shall have exactly one assigned Project Manager.  
**Acceptance Criteria:**
- `business_units.pm_user_id` stores the PM assignment
- PM sees only accounts in their assigned BU when creating projects
- PM's BU is displayed (read-only) on the project creation form
- **Implemented:** ✅

### FR-010 — Account Creation
**Priority:** High  
**Description:** Platform Admin shall be able to create client accounts under a BU.  
**Acceptance Criteria:**
- Accounts belong to exactly one BU
- Account has: code, name, is_active, business_unit_id
- **Implemented:** ✅

### FR-011 — DM Assignment to Account
**Priority:** High  
**Description:** Platform Admin shall be able to assign a Delivery Manager to each account.  
**Acceptance Criteria:**
- Settings → Org Setup → Account DM Assignment table shows all accounts
- Each row has a DM dropdown showing all users with DELIVERY_MANAGER role
- Saving updates `accounts.delivery_manager_user_id`
- DM immediately gains access to projects under that account
- **Implemented:** ✅

### FR-012 — BU-Scoped Account Visibility for PM
**Priority:** High  
**Description:** PM shall see only accounts in their assigned BU.  
**Acceptance Criteria:**
- `GET /accounts` for PM role returns only accounts where `business_unit.pm_user_id = user.id`
- Fallback: if no BU assigned, returns all accounts
- **Implemented:** ✅

### FR-013 — DM-Scoped Account and Project Visibility
**Priority:** High  
**Description:** DM shall see only accounts and projects assigned to them.  
**Acceptance Criteria:**
- `GET /accounts` for DM returns accounts where `delivery_manager_user_id = user.id`
- `GET /projects` for DM returns projects under those accounts
- **Implemented:** ✅

### FR-014 — Delivery Head BU Scope
**Priority:** High  
**Description:** Delivery Head shall see only projects and accounts in their assigned BU.  
**Acceptance Criteria:**
- `GET /projects` for DH returns projects in BUs where `bu_head_user_id = user.id`
- **Implemented:** ✅

### FR-015 — Org Setup UI
**Priority:** Medium  
**Description:** Platform Admin shall have a single Org Setup tab to manage BUs, accounts, and assignments.  
**Acceptance Criteria:**
- Settings → Org Setup shows BU table (create/edit) and Account DM Assignment table
- DM dropdown only shows users with DELIVERY_MANAGER role
- PM dropdown on BU only shows users with PM role
- **Implemented:** ✅

---

## FR-016 to FR-022 — Project Management

### FR-016 — Project Creation
**Priority:** Critical  
**Description:** PM shall be able to create a new project from the My Projects page.  
**Acceptance Criteria:**
- Form shows PM's BU (read-only) at the top
- PM selects Account from their BU's accounts
- PM enters: project code, project name, description, start date, target end date
- PM selects engagement model: project type, delivery model, project category, work size unit
- On submit: project created + KPI plan created + mandatory metrics auto-added
- PM navigated directly to Data Entry page after creation
- **Implemented:** ✅

### FR-017 — Mandatory Metrics Auto-Addition
**Priority:** High  
**Description:** On project creation, all mandatory (M) catalog metrics matching the engagement model shall be automatically added to the KPI plan.  
**Acceptance Criteria:**
- System queries catalog for metrics where `compliance = 'M'` and `project_type` / `delivery_model` match
- All matching mandatory metrics are added to the plan
- Toast notification shows count of mandatory metrics added
- **Implemented:** ✅

### FR-018 — Project List View
**Priority:** High  
**Description:** PM shall see all their projects with current RAG status.  
**Acceptance Criteria:**
- My Projects page shows all projects where `project_manager_id = user.id`
- Sorted alphabetically by project name
- Each project shows: name, code, account, BU, RAG badge, status
- Links to Data Entry, KPI Tracker, Summary Dashboard
- **Implemented:** ✅

### FR-019 — Project Code Uniqueness
**Priority:** Medium  
**Description:** Project codes shall be unique within an account.  
**Acceptance Criteria:**
- Duplicate project code within same account returns HTTP 400
- **Implemented:** ✅

### FR-020 — Project Status
**Priority:** Medium  
**Description:** Projects shall have a status field.  
**Acceptance Criteria:**
- Status values: ACTIVE, CLOSED, ON_HOLD
- Default: ACTIVE on creation
- **Implemented:** ✅

### FR-021 — Project RAG (current_rag)
**Priority:** High  
**Description:** Each project shall have a computed overall RAG status visible across the platform.  
**Acceptance Criteria:**
- `projects.current_rag` is derived from the latest KPI measurements
- Visible in My Projects list, Portfolio Dashboard, DM Dashboard
- Values: GREEN, AMBER, RED, null (no data)
- **Implemented:** ✅

### FR-022 — Carry-Forward of Previous Values
**Priority:** High  
**Description:** When PM opens the Data Entry page, previously entered parameter values shall be pre-filled.  
**Acceptance Criteria:**
- Parameters pre-filled from latest `project_period_measures` for that project
- Thresholds pre-filled from latest `KpiMeasurement` thresholds or catalog defaults
- PM only changes what differs from previous period
- **Implemented:** ✅

---

## FR-023 to FR-030 — KPI Plan Setup

### FR-023 — Metric Catalog Browse
**Priority:** High  
**Description:** PM shall be able to browse the QPM metric catalog and add metrics to their plan.  
**Acceptance Criteria:**
- Catalog page shows all active metrics with: name, category, formula, UOM, intent, compliance, thresholds
- Search by name; filter by category
- Add button adds metric to plan (disabled if metric already in plan)
- **Implemented:** ✅

### FR-024 — Auto-Add Mandatory Metrics
**Priority:** High  
**Description:** PM shall be able to auto-add all mandatory metrics in one click.  
**Acceptance Criteria:**
- "★ Auto-add All Mandatory (M) Metrics" button adds all unselected mandatory metrics
- Toast shows count added
- **Implemented:** ✅

### FR-025 — Metric Removal
**Priority:** Medium  
**Description:** PM shall be able to remove optional/custom metrics from the plan.  
**Acceptance Criteria:**
- Mandatory metrics cannot be removed (backend enforces this)
- Metrics in finalized plans cannot be removed
- Remove button available on Selected Metrics tab for non-mandatory metrics
- **Implemented:** ✅

### FR-026 — Custom Metric Addition
**Priority:** Medium  
**Description:** PM shall be able to add project-specific custom metrics not in the standard catalog.  
**Acceptance Criteria:**
- Custom metrics require DE approval to add to plan
- PM fills: name, category, formula, UOM, intent, frequency, priority, target, LSL, USL, tailoring reason
- Custom metrics are flagged with "Custom" badge
- **Implemented:** ✅

### FR-027 — Custom Metric Approval Request
**Priority:** Medium  
**Description:** PM shall be able to request DE approval for metrics that require inclusion in the organization catalog.  
**Acceptance Criteria:**
- PM submits request with: metric name, details, justification
- DE sees pending requests and can approve or reject
- Approved metrics are added to the project's KPI plan
- **Implemented:** ✅

<!-- ### FR-028 — Engagement Model Update
**Priority:** Medium  
**Description:** PM shall be able to update the project's engagement model.  
**Acceptance Criteria:**
- Changing project type/delivery model filters catalog to relevant metrics
- Optional auto-removal of catalog metrics no longer applicable to new model
- Custom metrics are never auto-removed
- **Implemented:** ✅ -->

### FR-029 — Plan Finalization
**Priority:** Low  
**Description:** PM shall be able to finalize the KPI plan to lock metric selection.  
**Acceptance Criteria:**
- Finalized plans prevent add/remove of metrics
- "Finalize Plan" / "Unfinalize" toggle button
- Status shown: "Draft" or "✓ Finalized"
- **Implemented:** ✅

### FR-030 — Metric Catalog Management by DE
**Priority:** High  
**Description:** Delivery Excellence shall be able to manage the QPM metric catalog.  
**Acceptance Criteria:**
- DE can add, edit, activate/deactivate catalog metrics
- DE can view all metrics including inactive
- DE can review and approve/reject PM custom metric requests
- **Implemented:** ✅

---

## FR-031 to FR-040 — KPI Data Entry

### FR-031 — Unified Parameter Entry
**Priority:** Critical  
**Description:** The Data Entry page shall present all unique input parameters across all plan metrics in a single, unified parameters panel.  
**Acceptance Criteria:**
- All unique measure names across all active metrics are shown as individual input cards
- Each card displays: parameter name, count of metrics using it, input field
- Parameters are sorted by number of metrics using them (highest first)
- **Implemented:** ✅

### FR-032 — Shared Parameter Propagation
**Priority:** Critical  
**Description:** A parameter entered once shall be used by all metrics that require it.  
**Acceptance Criteria:**
- "Delivered and Accepted Size" entered once is used by Productivity, Delivered Defect Density, and all other metrics that need it
- Stored in `project_period_measures` table keyed by (project, period, measure_name)
- **Implemented:** ✅

### FR-033 — Not-Entered Visual Indicator
**Priority:** High  
**Description:** Empty parameter fields shall be visually distinguished from filled fields.  
**Acceptance Criteria:**
- Empty fields show amber border + "Not entered" placeholder
- Filled fields show slate border with entered value
- Badge on each card shows metric usage count in amber when empty
- **Implemented:** ✅

### FR-034 — Threshold Management per Metric
**Priority:** High  
**Description:** PM shall be able to view and edit LSL, Target, and USL for each metric in a thresholds table.  
**Acceptance Criteria:**
- Thresholds section shows a table: Metric | LSL | Target | USL
- All three threshold fields are editable inline
- Initial values: last saved thresholds or catalog defaults
- Result and RAG columns are NOT shown in this table (visible in Summary only)
- **Implemented:** ✅

### FR-035 — Auto-Compute on Save
**Priority:** Critical  
**Description:** Clicking Save shall automatically compute KPI values for all metrics with complete inputs.  
**Acceptance Criteria:**
- For each active metric: if all required measures are present → compute KPI
- If any measure missing → metric remains incomplete (not computed)
- Toast: "Saved. X/Y metrics computed."
- **Implemented:** ✅

### FR-036 — Every Save Creates a New History Entry
**Priority:** Critical  
**Description:** Each Save shall create a new KpiMeasurement record, preserving the full change history.  
**Acceptance Criteria:**
- `period_measures_service.save_and_compute` always inserts a new `KpiMeasurement` row
- Saving July 2026 three times with different values creates three separate history entries
- All entries are visible in the history table and trend chart
- **Implemented:** ✅

### FR-037 — Threshold Persistence
**Priority:** High  
**Description:** PM-edited threshold values shall persist across sessions.  
**Acceptance Criteria:**
- Threshold changes are saved to `kpi_plan_metrics.target / lsl / usl` when PM clicks Save
- Next time PM opens the page, PM's last-saved thresholds are shown (not catalog defaults)
- **Implemented:** ✅

### FR-038 — Period Label
**Priority:** High  
**Description:** PM shall specify a reporting period label for each set of entries.  
**Acceptance Criteria:**
- Period label is a free-text input (e.g. "July 2026", "Week of 30 Jun 2026")
- Default value is the current month and year
- Period label is stored on `project_period_measures` and `KpiMeasurement`
- **Implemented:** ✅

### FR-039 — History Panel
**Priority:** High  
**Description:** PM shall be able to view all previous KPI entries for the current project.  
**Acceptance Criteria:**
- Clock icon in Thresholds header opens the History panel
- History shows all `KpiMeasurement` rows across all metrics
- Columns: Metric, Period, Inputs, LSL/Target/USL, Result, RAG, Submitted datetime
- Filter dropdown to view a specific metric
- "Latest" badge on most recent entry per metric
- **Implemented:** ✅

### FR-040 — PM Project Comment
**Priority:** Medium  
**Description:** PM shall be able to add an optional comment about the project for the reporting period.  
**Acceptance Criteria:**
- Comment box at bottom of Data Entry page
- Optional (not required to save measurements)
- Saved to `kpi_plan.pm_rag_comments`
- Visible to Delivery Manager on their review page
- **Implemented:** ✅

---

## FR-041 to FR-046 — RAG Computation

### FR-041 — Metric RAG Computation
**Priority:** Critical  
**Description:** The system shall compute RAG status for each metric measurement based on intent and thresholds.  
**Acceptance Criteria:**
- Higher the better: GREEN ≥ Target, AMBER ≥ LSL < Target, RED < LSL
- Lower the better: GREEN ≤ Target, AMBER ≤ USL > Target, RED > USL
- Within Limits: GREEN if LSL ≤ actual ≤ USL, else RED
- Nominal the best: GREEN within 5% of Target, AMBER within limits, RED outside limits
- **Implemented:** ✅

### FR-042 — Category RAG Rollup
**Priority:** High  
**Description:** Category (dimension) RAG shall be aggregated from individual metric RAGs.  
**Acceptance Criteria:**
- Any RED metric in a category → category = RED
- No RED, any AMBER → category = AMBER
- All GREEN → category = GREEN
- **Implemented:** ✅

### FR-043 — Project RAG Rollup
**Priority:** High  
**Description:** Overall project RAG shall be aggregated from category RAGs.  
**Acceptance Criteria:**
- Any category RED → project = RED
- No RED, any AMBER → project = AMBER
- All GREEN → project = GREEN
- Stored in `projects.current_rag`
- **Implemented:** ✅

### FR-044 — Percentage vs Ratio Scaling
**Priority:** High  
**Description:** KPI values shall only be multiplied by 100 when the metric UOM is "%".  
**Acceptance Criteria:**
- Metrics with UOM = "%" have their computed ratio multiplied by 100
- Ratio metrics (e.g. Person-hours/Size Unit) remain as plain division result
- **Implemented:** ✅

### FR-045 — Threshold Change Tracking in Chart
**Priority:** High  
**Description:** The trend chart shall visually show when thresholds changed between periods.  
**Acceptance Criteria:**
- Each `KpiMeasurement` stores the target/lsl/usl at the time of computation
- Chart threshold lines are stepped — value holds for the period, then steps to new value
- If Target changed from 10 to 8 in August, the Target line visibly steps down at August
- **Implemented:** ✅

### FR-046 — Incomplete Metric Handling
**Priority:** High  
**Description:** Metrics with missing required parameters shall not be computed and shall be clearly indicated.  
**Acceptance Criteria:**
- Metric result = null when any required measure is missing
- `missing_measures` list returned in save response
- UI shows "Missing data" instead of a value
- **Implemented:** ✅

---

## FR-047 to FR-052 — KPI Summary and Trends

### FR-047 — Summary Page Overview
**Priority:** High  
**Description:** PM shall have a summary page showing the overall health of all metrics for a project.  
**Acceptance Criteria:**
- Overall project RAG card (coloured)
- Dimension RAG grid
- Donut chart (Green/Amber/Red/No Data counts)
- Category stacked bar chart
- Metric cards grid
- **Implemented:** ✅

### FR-048 — Metric Card
**Priority:** High  
**Description:** Each metric shall be shown as a card with key information.  
**Acceptance Criteria:**
- Shows: category, metric name, RAG dot, latest value + UOM, trend indicator, RAG badge, mini sparkline, Target/LSL/USL, period count
- Clickable to open trend panel
- **Implemented:** ✅

### FR-049 — Trend Panel (on metric click)
**Priority:** High  
**Description:** Clicking a metric card shall expand a trend panel with full history and chart.  
**Acceptance Criteria:**
- Shows 4 stat cards: Latest Value, Target, LSL, USL
- Shows Threshold Chart
- Shows full history table with all entries
- Close button dismisses panel
- **Implemented:** ✅

### FR-050 — Threshold Chart
**Priority:** High  
**Description:** The trend chart shall show Actual value history plus USL, Target, and LSL reference lines.  
**Acceptance Criteria:**
- Actual line: solid dark line connecting all data points in chronological order
- USL line: orange dashed stepped line (steps when threshold changes)
- Target line: blue dashed stepped line (steps when threshold changes)
- LSL line: purple dashed stepped line (steps when threshold changes)
- Actual data point dots coloured by RAG status
- Value labels above each actual dot
- X-axis: period labels; Y-axis: auto-scaled with 5 ticks
- **Implemented:** ✅

### FR-051 — Summary Filters
**Priority:** Medium  
**Description:** PM shall be able to filter the metric cards by category and RAG status.  
**Acceptance Criteria:**
- Category dropdown + RAG dropdown
- Live filtering of visible metric cards
- Count of matching metrics shown
- **Implemented:** ✅

### FR-052 — Navigation from Summary
**Priority:** Medium  
**Description:** Summary page shall provide navigation back to Data Entry.  
**Acceptance Criteria:**
- "← Back to Data Entry" link navigates to `/pm/projects/{id}/qpm/entry`
- "Open Tracker" button is NOT present (removed)
- **Implemented:** ✅

---

## FR-053 to FR-056 — Portfolio Dashboard

### FR-053 — Portfolio Dashboard Access
**Priority:** High  
**Description:** Platform Admin, CEO, and Delivery Excellence shall see a Portfolio Dashboard as their home page.  
**Acceptance Criteria:**
- All three roles land on `PortfolioDashboardPage` at their respective home routes
- All three see all projects (no scoping restriction for these roles)
- **Implemented:** ✅

### FR-054 — Portfolio Filter Bar
**Priority:** High  
**Description:** The dashboard shall have a sticky filter bar with four filters.  
**Acceptance Criteria:**
- Filters: Business Unit, Account (cascades from BU), Project Type, Project Category
- Default: "All" for every filter
- Account dropdown resets when BU changes
- Filter bar stays sticky while scrolling
- **Implemented:** ✅

### FR-055 — Portfolio Project Cards
**Priority:** High  
**Description:** Each project shall be shown as a separate card with meta information and scrollable metrics table.  
**Acceptance Criteria:**
- Card header: project name, project code, Overall Health badge, BU, Account, Project Type, Category
- Horizontally scrollable metric table below header
- Project header fixed; only metric table scrolls
- Metric columns: Metric Name (sticky), Category, Current Value, Target, RAG Status, Trend, Last Updated, Frequency
- **Implemented:** ✅

### FR-056 — Portfolio RAG Summary Strip
**Priority:** Medium  
**Description:** The dashboard header shall show counts of Green, Amber, Red, and No Data projects.  
**Acceptance Criteria:**
- Four coloured pills: Green [count] · Amber [count] · Red [count] · No Data [count]
- Updates live as filters are applied
- **Implemented:** ✅

---

## FR-057 to FR-060 — DM Review Cycle

### FR-057 — DM Project Visibility
**Priority:** Critical  
**Description:** DM shall see all projects in their assigned accounts on their dashboard.  
**Acceptance Criteria:**
- DM dashboard fetches `GET /projects` (scoped to DM's accounts) and `GET /dm-reviews/project-statuses`
- Projects grouped by account
- Each project shows RAG badge and review status badge
- **Implemented:** ✅

### FR-058 — Needs-Review Detection
**Priority:** High  
**Description:** The system shall detect when a project has new metric data since the DM's last review.  
**Acceptance Criteria:**
- `needs_review = true` when latest `KpiMeasurement.updated_at` > `dm_reviews.reviewed_at`
- `needs_review = true` when no DM review exists but measurements exist
- "Needs Review" badge (amber, pulsing) shown on project row
- Alert banner shows count of projects needing review
- **Implemented:** ✅

### FR-059 — DM Review Submission
**Priority:** High  
**Description:** DM shall be able to submit a review with commentary and action items for a project.  
**Acceptance Criteria:**
- DM Review page shows: period selector, commentary textarea (required), action items list (optional)
- Submitting creates a new `dm_reviews` record
- Multiple reviews per project are allowed (full audit history)
- DM can edit their own reviews
- **Implemented:** ✅

### FR-060 — DM KPI View
**Priority:** High  
**Description:** DM shall be able to view the full KPI summary for any project they have access to.  
**Acceptance Criteria:**
- DM Review page shows KPI summary grouped by category
- Shows: metric name, latest value, target, RAG badge, trend, last updated
- RED metrics subtly highlighted
- **Implemented:** ✅

---

## FR-053 to FR-060 — Portfolio Dashboard (Executive)

### FR-053 — Portfolio Dashboard Access
**Priority:** High  
**Description:** Platform Admin, CEO, and Delivery Excellence shall see a Portfolio Dashboard as their home page.  
**Acceptance Criteria:**
- All three roles land on `PortfolioDashboardPage` at their respective home routes
- All three see all projects (no scoping restriction for these roles)
- Same component (`PortfolioDashboardPage`) rendered for all three roles
- **Implemented:** ✅

### FR-054 — Portfolio Stat Cards (Clickable)
**Priority:** High  
**Description:** The dashboard shall show five colored stat cards that are individually clickable to show filtered project lists.  
**Acceptance Criteria:**
- Five cards: Total Projects, Green Health, Amber, Red/Critical, No Score
- Each card shows count, label, sub-label, trend badge, and SVG icon
- Clicking any card opens a modal overlay listing the filtered projects
- Hover: card lifts `translateY(-2px)` with deeper shadow
- **Implemented:** ✅

### FR-055 — Portfolio Charts
**Priority:** High  
**Description:** The dashboard shall show a BU health bar chart and a RAG donut chart.  
**Acceptance Criteria:**
- Bar chart: grouped bars per BU showing Green / Amber / Red counts (SVG, no external library)
- Donut chart: RAG proportions with center showing "X% Green health" and legend
- Summary rows below donut: Projects on track / Need attention / Awaiting first entry
- **Implemented:** ✅

### FR-056 — Portfolio Filter Bar
**Priority:** High  
**Description:** The dashboard shall have a sticky filter bar with four cascading filters.  
**Acceptance Criteria:**
- Filters: Business Unit, Account (cascades from BU), Project Type, Project Category
- "✕ Reset filters" button appears when any filter is non-default
- Filter bar stays sticky while scrolling the project table
- Shows "Showing X of Y projects" count below filters
- **Implemented:** ✅

### FR-057 — Portfolio Project Table
**Priority:** High  
**Description:** All matching projects shall be shown in a single scrollable table (not individual cards).  
**Acceptance Criteria:**
- Columns: Project, Business Unit, Account, Type, Category, PM, Health
- RAG-colored left border (3px) on each row
- Clicking any row navigates to the project's read-only KPI summary
- **Implemented:** ✅

### FR-058 — At-Risk Projects Panel
**Priority:** Medium  
**Description:** The dashboard shall display a separate panel listing all AMBER and RED projects.  
**Acceptance Criteria:**
- Panel shows first 5 at-risk projects with expand/collapse for more
- Each row: project name, account, BU, RAG badge — clickable to project summary
- **Implemented:** ✅

### FR-059 — Read-Only Project KPI Summary (Executive)
**Priority:** High  
**Description:** Clicking a project from the Portfolio Dashboard shall open a full read-only KPI metrics page.  
**Acceptance Criteria:**
- Route: `{basePath}/projects/:id/summary` (role-aware: `/platform`, `/ceo`, `/delivery-excellence`)
- Page shows: project name, BU, account, overall RAG, 4 metric count tiles, category filter, full metric table
- Metric table: Metric, Current Value, Target, LSL, USL, RAG Status, Last Updated
- "← Portfolio Dashboard" back button navigates to the correct role home
- **Implemented:** ✅

### FR-060 — Stat Card Filtered Project Modal (Executive)
**Priority:** High  
**Description:** Clicking a stat card shall open a modal showing only the projects matching that card's filter.  
**Acceptance Criteria:**
- Modal: colored header bar (matching card), project count, title, ✕ close button
- Project rows: name, code, account, BU, RAG pill — click navigates to project summary
- Backdrop click closes modal
- Slide-up + fade-in animation
- Empty state: "No projects in this category"
- **Implemented:** ✅

---

## FR-061 to FR-066 — DM Review Cycle

### FR-061 — DM Dashboard Stat Cards (Clickable)
**Priority:** High  
**Description:** DM dashboard shall have four clickable stat cards.  
**Acceptance Criteria:**
- Cards: Total Projects, Needs Review, Green Health, At Risk
- Clicking each opens a filtered project modal
- Modal rows have "Review KPIs" button navigating to project review page
- **Implemented:** ✅

### FR-062 — Needs-Review Detection
**Priority:** High  
**Description:** The system shall detect when a project has new metric data since the DM's last review.  
**Acceptance Criteria:**
- `needs_review = true` when latest `KpiMeasurement.updated_at` > `dm_reviews.reviewed_at`
- `needs_review = true` when no DM review exists but measurements exist
- "Needs Review" badge shown; alert banner shows count
- **Implemented:** ✅

### FR-063 — DM Review Submission (Commentary Only)
**Priority:** High  
**Description:** DM shall be able to submit a review with commentary for a project. Action items are managed separately.  
**Acceptance Criteria:**
- Review form: period label (required, pre-filled), commentary textarea (required)
- Action items section has been removed from the review form
- Submit creates a `dm_reviews` record
- Past reviews shown in review history with Edit button
- **Implemented:** ✅

### FR-064 — DM KPI View on Review Page
**Priority:** High  
**Description:** DM Review page shall show the full KPI summary grouped by category.  
**Acceptance Criteria:**
- Categories expandable/collapsible (all open by default)
- Per metric: name, UOM, latest value, target, RAG dot+text, trend label, last updated
- **Implemented:** ✅

### FR-065 — DM Action Items Page (Dedicated)
**Priority:** High  
**Description:** DM shall have a dedicated Action Items page separate from the project review.  
**Acceptance Criteria:**
- Route: `/delivery-manager/actions`
- Project selector dropdown pre-selects first project
- Stat tiles: Total / Open / In Progress
- Create form: metric name, owner, due date, root cause (required), corrective action (required)
- Lists all action items for selected project with status badge
- Creating an action item triggers a PM in-app notification
- **Implemented:** ✅

### FR-066 — DM Review History
**Priority:** Medium  
**Description:** DM shall see all past reviews for a project on the review page.  
**Acceptance Criteria:**
- Reviews shown newest first below the form
- Each review shows: period badge, reviewer name + timestamp, commentary
- Edit button loads review into form for update
- **Implemented:** ✅

---

## FR-067 to FR-070 — PM Dashboard

### FR-067 — PM Dashboard Hero Banner
**Priority:** High  
**Description:** PM Dashboard shall display a personalised hero banner with greeting and project alerts.  
**Acceptance Criteria:**
- Purple gradient banner with time-aware greeting ("Good Morning/Afternoon/Evening, [Name] 👋")
- Current date displayed
- Amber alert badge: "X projects need attention" (AMBER + RED count)
- "+ New Project" button
- **Implemented:** ✅

### FR-068 — PM Dashboard Stat Cards (Clickable)
**Priority:** High  
**Description:** PM Dashboard shall show four clickable stat cards for quick project health overview.  
**Acceptance Criteria:**
- Cards: Total Projects, Green Health, Needs Attention, Awaiting Score
- Clicking opens a filtered project modal
- PM modal has two action buttons per project row: "Summary" and "Data Entry"
- **Implemented:** ✅

### FR-069 — PM Project Creation from Dashboard
**Priority:** Medium  
**Description:** PM shall be able to create a new project directly from the dashboard.  
**Acceptance Criteria:**
- "+ New Project" hero button → `/pm/projects?create=1`
- "Create Project" quick action card → `/pm/projects?create=1`
- **Implemented:** ✅

### FR-070 — PM Dashboard Project Cards
**Priority:** High  
**Description:** PM Dashboard shall display project cards at the bottom showing all PM's projects.  
**Acceptance Criteria:**
- Cards show: project name, code, account, BU, RAG badge, dates, status
- Clicking any card navigates to that project's KPI summary
- Empty state: "No projects yet" with create button
- **Implemented:** ✅

---

## FR-071 to FR-075 — DM Action Items & PM Notification

### FR-071 — Action Item Creation
**Priority:** High  
**Description:** DM shall be able to create action items for any accessible project.  
**Acceptance Criteria:**
- POST `/api/v1/action-items` creates an action item row
- Required fields: project_id, root_cause, corrective_action
- Optional fields: metric_name, owner_name, target_closure_date
- Default status: OPEN
- **Implemented:** ✅

### FR-072 — Automatic PM Notification on Action Item Create
**Priority:** High  
**Description:** When a DM creates an action item, the project's PM shall automatically receive an in-app notification.  
**Acceptance Criteria:**
- Backend creates a `Notification` row for `project.project_manager_id` after each action item commit
- Notification has: `type=ACTION_ITEM_CREATED`, `category=WORKFLOW`, `related_project_id`
- No notification if `project_manager_id` is null
- No notification if the DM is also the PM (self-notification skipped)
- Notification failure never blocks action item creation — logged and rolled back silently
- **Implemented:** ✅

### FR-073 — Notification Bell
**Priority:** High  
**Description:** All roles shall see a notification bell in the header with an unread count badge.  
**Acceptance Criteria:**
- Bell polls `GET /api/v1/notifications/unread-count` every 30 seconds
- Red badge with count appears when unread > 0
- Clicking bell opens dropdown showing all notifications sorted newest first
- "Mark all as read" button clears all unread
- Each notification shows: category badge, time ago, title, message snippet
- **Implemented:** ✅

### FR-074 — PM Notification Deep-Link
**Priority:** High  
**Description:** PM clicking an `ACTION_ITEM_CREATED` notification shall navigate directly to the action items page for that project.  
**Acceptance Criteria:**
- Click → navigates to `/pm/actions?project={related_project_id}`
- Notification is marked as read on click
- **Implemented:** ✅

### FR-075 — Action Item Status Tracking
**Priority:** Medium  
**Description:** Action items shall have a lifecycle status.  
**Acceptance Criteria:**
- Status values: OPEN, IN_PROGRESS, CLOSED
- Status updatable via PATCH `/api/v1/action-items/{id}/status`
- Closed items get `closed_at` timestamp
- **Implemented:** ✅

---

## FR-076 to FR-078 — Theme System

### FR-076 — Light / Dark Theme Toggle
**Priority:** High  
**Description:** All roles shall be able to toggle between light and dark theme using a control in the header.  
**Acceptance Criteria:**
- Toggle pill switch in every page's header bar
- Light mode: white/purple palette; Dark mode: dark navy palette
- Theme persists across sessions via `localStorage`
- **Implemented:** ✅

### FR-077 — CSS Variable Theming
**Priority:** High  
**Description:** All page backgrounds, card surfaces, text, and borders shall use CSS variables.  
**Acceptance Criteria:**
- Variables: `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--primary`, `--shadow`
- All inline `style` props use CSS variables, NOT hardcoded hex
- Exception: RAG status colors and stat card gradient backgrounds remain hardcoded
- **Implemented:** ✅

### FR-078 — Tailwind Dark Theme Overrides
**Priority:** Medium  
**Description:** Tailwind utility classes shall be automatically overridden for dark mode via a CSS override file.  
**Acceptance Criteria:**
- `dark-theme.css` imported after Tailwind overrides common white/light classes
- Colored stat tiles (`bg-violet`, `bg-emerald`, etc.) are intentionally preserved
- **Implemented:** ✅

---

## FR-079 to FR-080 — Delivery Head Dashboard

### FR-079 — Delivery Head Stat Tiles (Clickable)
**Priority:** High  
**Description:** Delivery Head dashboard shall show four clickable stat tiles for project health overview.  
**Acceptance Criteria:**
- Tiles: Total projects, Needs attention, Green health, At risk
- Clicking opens a filtered project modal
- Modal rows navigate to `/delivery-head/projects/{id}/summary`
- **Implemented:** ✅

### FR-080 — Delivery Head Project Filter Chips
**Priority:** Medium  
**Description:** Delivery Head dashboard shall provide RAG filter chips to filter the project list inline.  
**Acceptance Criteria:**
- Filter chips: All, Green, Amber, Red, Critical, No Score
- Active chip highlighted in the RAG color
- Also a search box (name/code/account)
- **Implemented:** ✅
