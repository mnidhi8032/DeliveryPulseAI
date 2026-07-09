# Spec 03 — KPI Plan and Metric Catalog

---

## KPI Plan

Every project has exactly one KPI Plan. The plan is auto-created when the project is created.

**Plan fields:**
- `project_type` — e.g. Fresh Development, Migration, Maintenance & Support
- `delivery_process_model` — e.g. Agile-Scrum, Waterfall, ITIL
- `project_category` — e.g. Fixed Price, Time & Material
- `work_size_unit` — e.g. Story Point, Function Point
- `is_finalized` — boolean (once finalized, metrics cannot be added/removed)
- `qpm_status` — DRAFT (active state for all data entry)
- `pm_rag_comments` — optional PM commentary visible to DM

---

## Metric Catalog

The QPM Metric Catalog contains 83+ standard metrics across 11 categories, managed by the Delivery Excellence team.

**Categories:**
- Efficiency
- Delivered Quality
- Internal Quality
- Time & Speed
- Financial
- Scope
- Stakeholder Perception
- Non-functional (Performance, Security, Usability, Maintainability)

**Catalog fields per metric:**
- `name` — metric name
- `category` — dimension category
- `formula` — calculation formula description
- `uom` — unit of measure (%, Number, Person-hours/Size Unit, etc.)
- `intent` — Higher the better / Lower the better / Within Limits / Nominal the best
- `compliance` — M (Mandatory) / O (Optional) / C (Conditional) / R (Recommended)
- `default_target`, `default_lsl`, `default_usl` — organisational defaults
- `project_type` — applicable project types (comma-separated)
- `delivery_model` — applicable delivery models
- `frequency` — reporting frequency (Weekly, Monthly, Quarterly, etc.)
- `is_active` — catalog item active status

---

## Metric Selection

**Auto-selection on project creation:**  
When a project is created with engagement model details, all mandatory (M) metrics matching the project type and delivery model are automatically added to the plan.

**Manual selection:**  
PM can browse the catalog by category or search, and add optional/conditional metrics.

**Auto-add button:**  
"★ Auto-add All Mandatory (M) Metrics" — adds all mandatory metrics not yet in the plan.

**Removal:**  
Mandatory metrics cannot be removed. Optional/custom metrics can be removed until the plan is finalized.

---

## Custom Metrics

PMs can add custom metrics not in the catalog. These require Delivery Excellence approval.

**Custom metric request flow:**
1. PM submits request with: metric name, category, formula, UOM, intent, frequency, justification
2. DE reviews pending requests
3. DE approves → metric added to project's KPI plan
4. DE rejects → request marked rejected with review comment

---

## Engagement Model

The engagement model drives which catalog metrics are shown as relevant:

| Field | Options |
|---|---|
| Project Type | Fresh Development, Maintenance & Support, Testing, Migration, etc. (14 types) |
| Delivery Process Model | Agile-Scrum, Waterfall, Iterative, ITIL, etc. (12 models) |
| Project Category | Fixed Price, Time & Material, Time & Material With Cap, etc. (6 categories) |
| Work Size Unit | Story Point-SP, Function Point-FP, Person-days, etc. (7 units) |

Changing the engagement model after plan setup will auto-remove catalog metrics no longer applicable to the new model (custom metrics are preserved).
