# Spec 09 — Data Model

---

## Core Tables

### users
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| email | VARCHAR(255) | Login email (unique) |
| password_hash | VARCHAR(255) | bcrypt hash |
| full_name | VARCHAR(200) | Display name |
| role_id | UUID FK → roles | Assigned role |
| is_active | BOOLEAN | Account enabled |
| last_login_at | TIMESTAMPTZ | Last login timestamp |

### roles
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| code | VARCHAR(50) | PLATFORM_ADMIN / CEO / DELIVERY_HEAD / DELIVERY_MANAGER / PM / DELIVERY_EXCELLENCE |
| name | VARCHAR(100) | Display name |

### business_units
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| code | VARCHAR(50) | Short code (e.g. BFSI) |
| name | VARCHAR(200) | Full name |
| description | TEXT | Optional description |
| is_active | BOOLEAN | Active flag |
| bu_head_user_id | UUID FK → users | Assigned Delivery Head |
| pm_user_id | UUID FK → users | Assigned Project Manager |

### accounts
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| business_unit_id | UUID FK → business_units | Parent BU |
| code | VARCHAR(50) | Short code |
| name | VARCHAR(200) | Client name |
| is_active | BOOLEAN | Active flag |
| delivery_manager_user_id | UUID FK → users | Assigned Delivery Manager |

### projects
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| account_id | UUID FK → accounts | Parent account |
| project_code | VARCHAR(50) | Unique code within account |
| project_name | VARCHAR(200) | Display name |
| project_manager_id | UUID FK → users | Assigned PM |
| delivery_head_user_id | UUID FK → users | Derived from BU head |
| description | TEXT | Optional |
| start_date | DATE | Project start |
| target_end_date | DATE | Target completion |
| status | VARCHAR(20) | ACTIVE / CLOSED / ON_HOLD |

---

## KPI Tables

### kpi_plans
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key (one per project) |
| project_id | UUID FK → projects | Parent project |
| project_type | VARCHAR(100) | Engagement model |
| delivery_process_model | VARCHAR(100) | Engagement model |
| project_category | VARCHAR(100) | Engagement model |
| work_size_unit | VARCHAR(50) | Engagement model |
| is_finalized | BOOLEAN | Plan locked for metric add/remove |
| qpm_status | VARCHAR(20) | DRAFT (always DRAFT — no approval gate) |
| pm_perception_rag | VARCHAR(10) | PM's subjective RAG |
| pm_rag_comments | TEXT | PM's project commentary |

### qpm_catalog_metrics
Standard catalog maintained by Delivery Excellence. 83+ metrics.

### kpi_plan_metrics
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| kpi_plan_id | UUID FK → kpi_plans | Parent plan |
| catalog_metric_id | UUID FK → qpm_catalog_metrics | Source catalog metric (null for custom) |
| metric_name | VARCHAR(300) | Metric name |
| metric_category | VARCHAR(100) | Dimension category |
| uom | VARCHAR(100) | Unit of measure |
| intent | VARCHAR(100) | Higher/Lower/Within/Nominal |
| frequency | VARCHAR(200) | Reporting frequency |
| priority | VARCHAR(20) | M/O/C/R compliance level |
| target | NUMERIC(12,4) | Organisation/PM threshold |
| lsl | NUMERIC(12,4) | Lower spec limit |
| usl | NUMERIC(12,4) | Upper spec limit |
| is_custom | BOOLEAN | Custom metric flag |
| is_active | BOOLEAN | Active in plan |
| required_measures | TEXT | JSON array of input measure names |

### project_period_measures
Shared parameter store — one value per (project, period, measure_name).
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| project_id | UUID FK → projects | Project |
| kpi_plan_id | UUID FK → kpi_plans | Plan version |
| period_label | VARCHAR(200) | e.g. "July 2026" |
| frequency | VARCHAR(100) | e.g. "Monthly" |
| from_date | DATE | Period start |
| to_date | DATE | Period end |
| measure_name | VARCHAR(300) | Parameter name |
| actual_value | NUMERIC(18,4) | PM-entered value |
| entered_by_user_id | UUID FK → users | Who entered it |
| UNIQUE | (project_id, period_label, measure_name) | One value per parameter per period |

### kpi_measure_entries
Legacy/backward-compat: raw measure entries per plan_metric_id.
Kept in sync with `project_period_measures` during save.

### kpi_measurements
Computed KPI results. **Every Save inserts a new row** (no upsert).
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| plan_metric_id | UUID FK → kpi_plan_metrics | The metric |
| frequency_name | VARCHAR(100) | Period label |
| from_date | DATE | Period start |
| to_date | DATE | Period end |
| actual_value | NUMERIC(18,4) | Computed KPI value |
| target | NUMERIC(12,4) | Threshold at time of computation |
| lsl | NUMERIC(12,4) | Threshold at time of computation |
| usl | NUMERIC(12,4) | Threshold at time of computation |
| rag_status | VARCHAR(10) | GREEN / AMBER / RED |
| submitted_by | VARCHAR(200) | PM full name |
| submitted_date | TIMESTAMPTZ | When computed |
| measure1_name/value … measure4_name/value | — | Input measure snapshot for display |

---

## Review Tables

### dm_reviews
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| project_id | UUID FK → projects | Reviewed project |
| kpi_plan_id | UUID FK → kpi_plans | Plan version |
| reviewed_by_user_id | UUID FK → users | DM reviewer |
| period_label | VARCHAR(200) | Reporting period covered |
| dm_comments | TEXT | DM commentary |
| action_items | TEXT | JSON array of action item strings |
| reviewed_at | TIMESTAMPTZ | Review submission time |

### metric_approval_requests
Custom metric requests from PM to DE.
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| kpi_plan_id | UUID FK → kpi_plans | Requesting plan |
| requested_by_user_id | UUID FK → users | PM |
| metric_name | VARCHAR(300) | Proposed metric |
| justification | TEXT | PM's reason |
| status | VARCHAR(20) | PENDING / APPROVED / REJECTED |
| review_comments | TEXT | DE's decision note |

---

## Relationship Summary

```
users ←→ roles (many-to-one)

business_units → users (bu_head_user_id, pm_user_id)
accounts → business_units + users (delivery_manager_user_id)
projects → accounts + users (project_manager_id)

kpi_plans → projects (one-to-one)
kpi_plan_metrics → kpi_plans + qpm_catalog_metrics
project_period_measures → projects + kpi_plans
kpi_measure_entries → kpi_plan_metrics
kpi_measurements → kpi_plan_metrics

dm_reviews → projects + kpi_plans + users
metric_approval_requests → kpi_plans + users
```
