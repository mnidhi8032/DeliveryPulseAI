# Business Rules

---

## BR-001 — Organisation Hierarchy Rules

### BR-001.1
Every Account must belong to exactly one Business Unit. An account cannot exist without a parent BU.

### BR-001.2
Every Project must belong to exactly one Account. A project cannot exist without a parent account.

### BR-001.3
Each Business Unit has at most one assigned Project Manager (`pm_user_id`). One PM manages all projects across all accounts within their BU.

### BR-001.4
Each Account has at most one assigned Delivery Manager (`delivery_manager_user_id`). One DM can be assigned to multiple accounts.

### BR-001.5
Each Business Unit has at most one assigned Delivery Head (`bu_head_user_id`).

### BR-001.6
When a PM creates a project, the BU is derived from the PM's assignment — the PM cannot choose a different BU.

---

## BR-002 — Project Rules

### BR-002.1
Project codes must be unique within the same Account. Two projects in different accounts may have the same code.

### BR-002.2
Each project has exactly one KPI Plan. The KPI Plan is created automatically when the project is created.

### BR-002.3
When a project is created with an engagement model (project type + delivery model), all mandatory (M) catalog metrics matching those fields are automatically added to the KPI plan.

### BR-002.4
The PM assigned at project creation is always the logged-in user. This cannot be overridden from the UI.

### BR-002.5
The Delivery Head on a project is automatically derived from the account's BU (`bu_head_user_id`). The PM does not select the Delivery Head.

---

## BR-003 — KPI Plan Rules

### BR-003.1
Mandatory (M) metrics cannot be removed from the KPI plan.

### BR-003.2
Once a KPI plan is finalized, no metrics can be added or removed. The plan must be unfinalized first.

### BR-003.3
Metrics can only be removed from an unfinalized plan and only if they are non-mandatory (Optional, Conditional, or Recommended).

### BR-003.4
Changing the engagement model (project type or delivery model) may trigger automatic removal of catalog metrics no longer applicable to the new model. Custom metrics are never auto-removed.

### BR-003.5
The KPI plan status is always DRAFT. There is no approval gate for metric data entry.

---

## BR-004 — Data Entry Rules

### BR-004.1 — Shared Parameters
Parameters (measures) are stored at the project + period level, not per-metric. If "Delivered and Accepted Size" is entered, it is used by every metric in the plan that requires it.

### BR-004.2 — Mandatory Parameters
For a metric to be computed, ALL required measures for that metric must be present. If any required measure is missing, the metric cannot be computed and its result is null.

### BR-004.3 — Every Save Creates a New Entry
Each time PM clicks Save, a new `KpiMeasurement` row is inserted for every metric that has complete inputs. Previous entries for the same period are NOT overwritten. This is intentional — the full change history is preserved.

### BR-004.4 — Parameters Are Always Overwritten on Save
Each Save call updates (upserts) the `project_period_measures` table. Only the latest parameter value per (project, period, measure_name) is stored. Only measurements (`KpiMeasurement` rows) preserve full history.

### BR-004.5 — Threshold Persistence
When PM edits LSL, Target, or USL in the Thresholds panel and clicks Save, those values are written back to `kpi_plan_metrics`. On next load, the PM's last-saved thresholds are shown, not the catalog defaults.

### BR-004.6 — Period Label Flexibility
The period label is a free-text field set by the PM (e.g. "July 2026", "Q2 2026", "Week of 30 Jun"). It is not enforced or calendar-driven. The PM is responsible for using consistent labels across saves for the same period.

### BR-004.7 — Threshold Snapshot
The threshold values (target/lsl/usl) used for a specific computation are stored on the `KpiMeasurement` row at the time of computation. If the PM changes thresholds later and saves again, the new `KpiMeasurement` row reflects the new thresholds. Historical rows are not updated.

---

## BR-005 — RAG Computation Rules

### BR-005.1
RAG is computed at the moment of KPI computation (when Save is clicked). It is not re-computed retroactively when thresholds change.

### BR-005.2
RAG computation uses the `intent` field from the metric to determine which direction is "good":
- Higher the better → GREEN ≥ Target
- Lower the better → GREEN ≤ Target
- Within Limits → GREEN if LSL ≤ actual ≤ USL
- Nominal the best → GREEN within 5% of Target

### BR-005.3
A metric with no threshold values set has its RAG computed based on a ±10% deviation from Target. If no target is set, RAG is null.

### BR-005.4 — Percentage Scaling
Only metrics with UOM = "%" have their computed ratio multiplied by 100. Ratio metrics (e.g. Person-hours/Size Unit) remain as plain division results.

### BR-005.5 — Category RAG
Category RAG is aggregated from the latest RAG values of all active metrics in that category:
- Any RED → category = RED
- No RED, any AMBER → category = AMBER
- All GREEN → category = GREEN
- No measurements → category not shown

### BR-005.6 — Project RAG
Overall project RAG is aggregated from category RAGs using the same rule. The result is stored in `projects.current_rag` and reflects the current state of the project health.

---

## BR-006 — Chart and History Rules

### BR-006.1
The trend chart in the Summary page displays ALL `KpiMeasurement` rows for a metric, ordered chronologically by `submitted_date`. Each row is one data point on the Actual line.

### BR-006.2
If a PM saves the same period three times (correcting data), all three appear as separate sequential points in the chart. The chart shows the full history of changes, not just the "latest per period."

### BR-006.3
Threshold lines (USL, Target, LSL) in the chart are stepped — they show the exact threshold value that was used for each computation. If the threshold changed between two saves, the line visibly steps at that transition point.

### BR-006.4
The X-axis of the chart orders entries by submission timestamp. Period labels (e.g. "July 2026") are used as display labels on the X-axis.

---

## BR-007 — DM Review Rules

### BR-007.1
A DM Review is not an approval. It does not change the status of any project or measurement.

### BR-007.2
A project is considered to "need review" when there are `KpiMeasurement` rows with `updated_at` timestamps newer than the most recent `dm_reviews.reviewed_at` for that project.

### BR-007.3
Multiple DM reviews can exist for a project. Each review is a separate record with its own period label, commentary, and action items.

### BR-007.4
A DM can only edit reviews that they submitted (`reviewed_by_user_id = user.id`).

### BR-007.5
DM reviews are visible to Platform Admin, CEO, Delivery Head, and Delivery Excellence in addition to the DM who submitted them.

---

## BR-008 — Metric Approval Rules

### BR-008.1
Custom metrics added directly to a project plan by the PM do not require DE approval.

### BR-008.2
Metric Approval Requests are for PMs who want a non-standard metric added to the organisation catalog.

### BR-008.3
Approved metric requests result in the metric being added to the requesting PM's KPI plan.

### BR-008.4
Rejected requests are marked with a rejection comment. The PM cannot resubmit the same request.

---

## BR-009 — Catalog Rules

### BR-009.1
Only Delivery Excellence and Platform Admin can create, edit, or deactivate catalog metrics.

### BR-009.2
Deactivating a catalog metric does not remove it from existing KPI plans. It only prevents it from being added to new plans.

### BR-009.3
The `required_measures` field on each `kpi_plan_metric` is a JSON array of measure names populated from `scripts/measure_mapping.json`. This mapping drives the parameter-to-metric relationship.

### BR-009.4
The measure mapping file defines whether a metric is computed (type "C") or direct (type "D"). Direct metrics use the entered parameter value directly. Computed metrics apply a formula (numerator/denominator structure with operators).
