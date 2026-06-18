# QPM Platform — Requirements

> Derived from the Excel-based QPM (Quality & Performance Management) Plan (OM-DEV-TM-71)
> and aligned with the existing platform architecture (FastAPI · React · PostgreSQL · RBAC).

---

## 1. Project Setup Module

**US-1.1** — A user must be able to create a new QPM project by providing:
- Project name, description, and start/end dates
- Project Type (Agile, Waterfall, Hybrid)
- Delivery Model (Scrum, Kanban, SAFe, etc.)
- Engagement Model (Fixed Price, T&M, etc.)
- Work Size Unit (Story Points, Function Points, LOC)

**US-1.2** — On project creation, the system must auto-suggest a default KPI set based on the selected Project Type and Delivery Model.

**US-1.3** — A project must belong to a Business Unit and Account (aligned with existing hierarchy).

---

## 2. KPI Definition & Selection Module

**US-2.1** — The system must maintain a master KPI library with predefined KPIs, each containing:
- KPI name, category, formula description
- Direction (Higher is Better / Lower is Better / Within Range)
- Default Target, LSL (Lower Spec Limit), USL (Upper Spec Limit)
- Measurement unit and frequency (Sprint, Monthly, Release)

**US-2.2** — A Project Manager must be able to select KPIs from the library and assign them to a project.

**US-2.3** — Per project, each selected KPI must allow override of: Target, LSL, USL, and Frequency.

**US-2.4** — Mandatory KPIs (platform-defined) must not be removable from a project without Admin approval.

**US-2.5** — Users must be able to create custom KPIs with a name, formula description, and thresholds.

**US-2.6** — Threshold changes on mandatory KPIs must trigger an approval workflow.

---

## 3. Metrics Calculation Engine

**US-3.1** — The system must automatically compute metric values from raw inputs using defined formulas, e.g.:
- Productivity = Size / Effort
- Defect Density = Defects / Size
- Defect Removal Efficiency = Defects Removed / Total Defects
- Schedule Adherence = Planned Date / Actual Date

**US-3.2** — The engine must support:
- Simple ratio calculations
- Weighted calculations (e.g., defect severity weighting)
- Time-based rolling calculations (e.g., 3-sprint rolling average)

**US-3.3** — Computed values must be stored as time-series data per project, per KPI, per period.

**US-3.4** — The engine must re-calculate on new data entry or when thresholds are updated.

---

## 4. Data Entry Module

**US-4.1** — Project team members must be able to enter actual raw values per period (Sprint/Month/Release) for:
- Effort (Planned vs Actual)
- Defects (by severity: Critical, Major, Minor)
- Size delivered
- Revenue / Cost (if applicable)

**US-4.2** — Data entry must enforce mandatory field validation and unit consistency checks.

**US-4.3** — The system must support bulk upload of metric data via Excel/CSV template.

**US-4.4** — Submitted data must be locked for the period after approval (no silent edits).

**US-4.5** — Data entry periods must align with the project's governance cadence (Sprint / Monthly).

---

## 5. RAG Status Engine

**US-5.1** — The system must automatically compute a RAG (Red/Amber/Green) status for each KPI per period using:
- **Green**: Actual meets or exceeds Target (Higher is Better) or is at/below Target (Lower is Better)
- **Amber**: Actual is between the Target and LSL/USL boundary
- **Red**: Actual breaches LSL or USL

**US-5.2** — RAG status must be computed and stored at the KPI level, dimension level, and overall project level.

**US-5.3** — RAG rules must be configurable per KPI direction type.

---

## 6. KPI Tracker / Dashboard Module

**US-6.1** — Users must be able to view a KPI tracker showing per period:
- KPI name, actual value, target, RAG status
- Trend sparkline across recent periods

**US-6.2** — The dashboard must support drill-down from Project → Release → Sprint level.

**US-6.3** — Users must be able to filter by: time period, KPI category, project, and RAG status.

**US-6.4** — Visualizations must include:
- Trend line charts (actual vs target over time)
- KPI summary cards with RAG color indicators
- Bar charts for comparison across projects
- Burn-down / Cumulative Flow charts for Agile projects

---

## 7. Enabler Plan Module

**US-7.1** — The system must allow definition of sub-processes (e.g., Coding, Testing, Design, Requirements) with:
- Contribution score
- Data availability score
- Control feasibility score

**US-7.2** — Based on scores, the system must recommend a control type per sub-process:
- Statistical Process Control (SPC)
- Quantitative Project Management control

**US-7.3** — Enabler plan data must be versioned per governance period.

---

## 8. Action & Improvement Module

**US-8.1** — When a KPI turns Red or Amber, a user must be able to log an action item with:
- Root cause
- Corrective action description
- Owner (assigned user)
- Target closure date

**US-8.2** — Action items must have a status lifecycle: Open → In Progress → Closed.

**US-8.3** — Overdue actions must be flagged and surfaced on the dashboard.

---

## 9. Notifications & Alerts

**US-9.1** — The system must send email/in-app notifications when:
- A KPI status turns Red
- A data entry deadline is approaching
- An action item is overdue

**US-9.2** — Notification preferences must be configurable per user role.

---

## 10. User & Role Management

**US-10.1** — The system must support the following roles (extending existing RBAC):

| Role | Permissions |
|------|-------------|
| Platform Admin | Full system access, manage KPI library, approve threshold changes |
| Delivery Manager | View all projects under their BU, approve submissions |
| Project Manager | Create/configure projects, enter/approve KPI data |
| Team Member | Data entry only |

**US-10.2** — Role-based access must restrict module visibility and edit permissions accordingly.

---

## 11. Governance & Audit

**US-11.1** — All KPI submissions must follow a governance lifecycle: Draft → Submitted → Approved / Rejected.

**US-11.2** — All changes to KPI definitions, thresholds, and submissions must be captured in an audit log.

**US-11.3** — Rejected submissions must allow resubmission with a comment.

---

## 12. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Performance | Dashboard loads within 3 seconds for 100+ projects |
| Scalability | Support 1000+ users, 500+ projects concurrently |
| Security | RBAC, JWT auth, encrypted storage, full audit trail |
| Usability | RAG indicators visible without drill-down; mobile-responsive |
| Data Integrity | No metric value accepted without unit and period validation |
| Availability | 99.5% uptime SLA |

---

## 13. Business Rules

### KPI Rules
- Every KPI must have a Target, Frequency, and Data Source defined before activation.
- KPIs without a defined direction (Higher/Lower/Within Range) cannot be activated.

### Validation Rules
- No data submission accepted without all mandatory fields filled.
- Units submitted must match the KPI definition's unit type.

### Governance Rules
- Mandatory KPIs cannot be removed from a project without Platform Admin approval.
- Any change to Target, LSL, or USL on a mandatory KPI must go through an approval workflow.

---

## 14. End-to-End Workflow

```
Create Project
     ↓
Select KPIs from Library
     ↓
Configure Targets / LSL / USL per KPI
     ↓
Enter Actual Data per Period
     ↓
System Calculates Metrics (Engine)
     ↓
RAG Status Generated per KPI
     ↓
Dashboard Displays Trends & Summaries
     ↓
Actions Logged for Red/Amber KPIs
     ↓
Continuous Monitoring & Governance
```

---

## 15. Optional / Advanced Features

| Feature | Description |
|---------|-------------|
| AI Trend Prediction | Forecast KPI trajectory based on historical data |
| Risk Forecasting | Predict KPIs at risk of turning Red in the next period |
| JIRA Integration | Auto-fetch defect and story data from JIRA |
| ERP Integration | Auto-fetch cost/revenue data from ERP systems |
| Auto Reminders | Scheduled reminders for data entry deadlines |

---

## Alignment with Existing Platform

The QPM requirements map onto the existing platform components as follows:

| QPM Module | Existing Platform Equivalent |
|------------|------------------------------|
| Project Setup | Project + Account + Business Unit models |
| Governance Cadence | Governance Periods |
| Submission Lifecycle | Submission → Draft → Approved |
| RAG Engine | Health Score + RAG Engine |
| Audit Trail | Audit Event model |
| Role Management | Existing RBAC roles |
| Notifications | Notification model |
| Data Entry | Metric Values + Excel Import |

The primary net-new additions are the **KPI Library**, **Metrics Calculation Engine**, **Enabler Plan Module**, and **Action & Improvement tracking**.
