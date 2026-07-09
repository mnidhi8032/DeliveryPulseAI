# Glossary of Terms

---

## A

**Account**  
A client organisation (e.g. "Apex Bank", "Acme Corp") that belongs to one Business Unit and has one or more Projects under it. Managed by a Delivery Manager.

**Action Item**  
A task recorded by a Delivery Manager during a project review. Stored as a list of strings within a DM Review record.

**Actual Value**  
The computed KPI result for a metric for a specific reporting period. Calculated from the PM-entered parameter values using the metric's formula.

---

## B

**Business Rule**  
A constraint or condition that governs how the system behaves. Documented in `04_BUSINESS_RULES.md`.

**Business Unit (BU)**  
The top-level organisational grouping. Contains one or more Accounts. Has one assigned Delivery Head and one assigned Project Manager.

---

## C

**Carry-Forward**  
The behaviour of pre-filling the Data Entry page with previously entered parameter values from the most recent save, so the PM only needs to update what changed.

**Category RAG**  
The aggregated RAG status for all metrics within a single category/dimension (e.g. "Efficiency"). Derived by: any RED → RED, else any AMBER → AMBER, else GREEN.

**Catalog Default**  
The default LSL, Target, and USL values defined in the QPM metric catalog by the Delivery Excellence team. Used as the initial threshold values for a metric when no PM-specific values have been saved.

**Custom Metric**  
A metric added to a project's KPI plan that is not part of the standard QPM catalog. Created directly by the PM with no approval required. Different from a Metric Approval Request.

---

## D

**Data Entry**  
The page and process by which the Project Manager enters parameter values for the current reporting period. Located at `/pm/projects/{id}/qpm/entry`.

**DE** (Delivery Excellence)  
The team responsible for managing the QPM metric catalog, approving custom metric requests, and viewing the portfolio dashboard.

**Delivery Head (DH)**  
Senior management role responsible for overseeing a Business Unit. Read-only access to BU projects and health trends.

**Delivery Manager (DM)**  
Operational management role responsible for reviewing KPI data and providing commentary for accounts assigned to them.

**DM Review**  
A formal record of a Delivery Manager's review of a project's KPI data for a reporting period. Contains period label, commentary, and optional action items.

---

## E

**Engagement Model**  
Four fields that describe the type of project: Project Type, Delivery Process Model, Project Category, and Work Size Unit. Used to filter relevant metrics from the catalog.

---

## F

**Frequency**  
How often a metric is measured and reported. Common values: Weekly, Monthly, Quarterly, Half Yearly, Sprint, Release. Set per metric in the KPI plan.

**FR** (Functional Requirement)  
A specific capability the system must provide. Documented in `01_FUNCTIONAL_REQUIREMENTS.md`.

---

## H

**History Entry**  
A `KpiMeasurement` row created each time the PM clicks Save and a metric's computation is successful. Every save creates a new row — previous entries are never overwritten.

---

## I

**Intent**  
Describes the direction of a metric — whether a higher or lower value is desirable. Values: "Higher the better", "Lower the better", "Within Limits", "Nominal the best", "Not Applicable".

---

## J

**JWT** (JSON Web Token)  
The authentication token issued on login. Stored in localStorage. Expires after 60 minutes. All API calls except login require a valid JWT.

---

## K

**KPI** (Key Performance Indicator)  
A measurable value that demonstrates how effectively a project is achieving key objectives. In this system, KPI values are computed from raw parameter inputs.

**KPI Measurement (KpiMeasurement)**  
A database record representing one computed KPI result for one metric at one point in time. Stores: actual value, thresholds used, RAG status, input measure snapshot, and submission timestamp.

**KPI Plan (KpiPlan)**  
A project-level document that lists all selected metrics, their thresholds, and the project's engagement model. One plan per project. Status is always DRAFT.

**KPI Plan Metric (KpiPlanMetric)**  
A single metric within a KPI plan. Contains the metric's LSL, Target, USL, UOM, intent, frequency, and required measures. Thresholds on this record represent the PM's current configured values.

---

## L

**LSL** (Lower Specification Limit)  
The minimum acceptable value for a metric. Actual values below LSL trigger RED status (for "Higher the better" intent).

---

## M

**Measure / Parameter**  
A raw input value entered by the PM (e.g. "Delivered and Accepted Size = 150"). Multiple measures combine through a formula to compute a KPI value. Stored in `project_period_measures`.

**Measure Mapping**  
The configuration file (`scripts/measure_mapping.json`) that defines which input measures are required for each catalog metric and how they combine (formula structure).

**Metric Approval Request**  
A request submitted by a PM asking the Delivery Excellence team to add a custom metric to the organisation catalog. Different from adding a custom metric directly to a project plan.

---

## N

**NFR** (Non-Functional Requirement)  
A quality attribute of the system (performance, security, usability, etc.). Documented in `02_NON_FUNCTIONAL_REQUIREMENTS.md`.

**Needs Review**  
A status flag on a project indicating that new KPI measurements exist that the Delivery Manager has not yet reviewed. Shown as an amber pulsing badge on the DM Dashboard.

---

## O

**Overall RAG**  
The aggregate health status for an entire project, derived by rolling up category RAGs. Stored in `projects.current_rag`. Values: GREEN, AMBER, RED, null.

---

## P

**Parameter** — See *Measure*.

**Period Label**  
A free-text label entered by the PM to identify the reporting period (e.g. "July 2026", "Week of 30 Jun 2026", "Q2 2026"). Used as the X-axis label in charts.

**PM** (Project Manager)  
The role responsible for creating projects, configuring KPI plans, and entering metric data.

**Portfolio Dashboard**  
The executive view showing all projects across the organisation with filters, RAG summaries, and per-project metric tables. Visible to Platform Admin, CEO, and Delivery Excellence.

**project_period_measures**  
Database table storing the latest PM-entered parameter value per (project, period, measure_name). Acts as the shared parameter store.

---

## Q

**QPM** (Quality Performance Measurement)  
The methodology and process for measuring and tracking project delivery quality. This system is a digital implementation of the QPM framework.

**QPM Catalog** — See *Metric Catalog*.

---

## R

**RAG** (Red-Amber-Green)  
A traffic-light health status system. GREEN = meeting targets, AMBER = at risk, RED = breaching limits.

**RAG Badge**  
A UI component that displays a RAG status with both colour and text label. Used throughout the application.

**Required Measures**  
The list of input parameters needed to compute a specific metric. Stored as a JSON array on `kpi_plan_metrics.required_measures`. Derived from the measure mapping file.

---

## S

**Shared Parameter** — See *Measure*.

**Soft Delete**  
A deletion pattern where a record is marked with `deleted_at` timestamp instead of being physically removed. Queries filter `WHERE deleted_at IS NULL`.

**Stepped Line**  
A chart rendering technique where a value holds constant until the next data point, then jumps vertically. Used for threshold lines (USL, Target, LSL) in the trend chart to visually show when thresholds changed.

**Summary Page**  
The KPI Summary Dashboard at `/pm/projects/{id}/qpm/summary`. Shows overall RAG, dimension breakdowns, metric cards, and clickable trend charts.

---

## T

**Target**  
The goal value for a metric. Used in RAG computation. Stored per-measurement (snapshot) and also editable at the plan level.

**Threshold**  
A boundary value (LSL, Target, or USL) that defines acceptable metric performance. PMs can edit thresholds; changes persist and are snapshotted per measurement.

**Trend**  
The direction of change in a metric's value over time. Values: improving, declining, stable. Shown as [+], [-], [=] in the Summary page.

---

## U

**UOM** (Unit of Measure)  
The unit in which a metric is expressed. Examples: %, Number, Person-hours/Size Unit, Size Unit per Person day.

**USL** (Upper Specification Limit)  
The maximum acceptable value for a metric. Actual values above USL trigger RED status (for "Lower the better" intent).

---

## W

**Work Size Unit**  
The unit used to measure deliverable size. Examples: Story Point (SP), Function Point (FP), Person-days. Part of the engagement model.
