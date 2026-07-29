# Kickoff Module — Spec 05: Resourcing & Infrastructure

**Status:** Planned — Not Yet Implemented
**Priority:** Low — most self-contained, least urgent of the 6 files
**Covers deck sections:** Human Resource Plan and Readiness Status ·
Human Resource Training Plan · Infrastructure Plan · Configuration
Management Plan

---

## 1. Purpose

The remaining checklist-style content from the kickoff deck — staffing
needs, training plans, hardware/software requirements, and source
control conventions. Grouped together because each is a simple,
self-contained list or single-row form with no dependency on any other
Kickoff spec or the QPM module.

---

## 2. Data Model

### 2.1 `project_hr_plan` — list, from "Human Resource Plan and Readiness Status"

```
id, project_id (FK)
role (string)
is_critical (boolean, default false)
skill (string)
skill_level (string, nullable)
number_required (int, nullable)
from_date, to_date (date, nullable)
already_available (boolean, default false)
training_required (boolean, default false)
sort_order (int)
```

### 2.2 `project_hr_training` — list

```
id, project_id (FK)
training_area_name (string)
resources_to_train (text)          -- free text list of names, or comma-separated
planned_completion_date (date, nullable)
sort_order (int)
```

### 2.3 `project_infrastructure_hardware` — list

```
id, project_id (FK)
hardware (string)
configuration (text)
customer_supplied (boolean, default false)
number_of_items (int, nullable)
required_by_date (date, nullable)
additional_details (text, nullable)
sort_order (int)
```

### 2.4 `project_infrastructure_software` — list

```
id, project_id (FK)
software_tool (string)
version_release (string, nullable)
customer_supplied (boolean, default false)
number_of_licenses (int, nullable)
required_by_date (date, nullable)
additional_details (text, nullable)
sort_order (int)
```

### 2.5 `project_configuration_management` — one row per project

```
id, project_id (FK, unique)
configuration_area (text)           -- control area / repository description
configuration_tool (string, nullable)
scc_coordinator (string, nullable)
access_rights (text, nullable)
naming_conventions (text, nullable)
branching_merging_guideline (text, nullable)
baseline_audit_frequency (string, nullable)
reference_documents_url (string, nullable)
```

---

## 3. API Endpoints

Under `/api/v1/kickoff/projects/{project_id}/...`:

| Method | Path | Purpose |
|---|---|---|
| GET/POST/PUT/DELETE | `/hr-plan` | HR plan rows |
| GET/POST/PUT/DELETE | `/hr-training` | Training plan rows |
| GET/POST/PUT/DELETE | `/infrastructure/hardware` | Hardware requirement rows |
| GET/POST/PUT/DELETE | `/infrastructure/software` | Software/tool requirement rows |
| GET | `/configuration-management` | Fetch the single config-mgmt row |
| PUT | `/configuration-management` | Update it |

Same unified-GET principle as the other specs: once all pieces exist,
one `GET /resourcing` composite endpoint returning HR plan, training,
infrastructure (both tables), and configuration management together
saves the frontend from 5 separate calls.

---

## 4. Frontend

New page: `frontend/src/pages/pm/KickoffResourcingPage.tsx`, sectioned:

1. **HR Plan and Readiness** — table with the boolean columns
   (Critical / Already Available / Training Required) rendered as
   simple yes/no toggles or checkmarks, not free-text "Yes/No" strings
   — this is exactly the kind of field the original deck stores as
   literal text ("Yes/No") that should become a real boolean in a live
   system, so it can be filtered/counted (e.g. "show me all critical
   roles not yet available") rather than just displayed
2. **HR Training Plan** — simple table
3. **Infrastructure Plan** — two tables side by side or stacked
   (Hardware, Software/Tools), same boolean treatment for "Customer
   Supplied?"
4. **Configuration Management Plan** — single form, most fields are
   free text/links

---

## 5. Build Order

1. `project_hr_plan`
2. `project_hr_training`
3. `project_infrastructure_hardware` + `project_infrastructure_software`
4. `project_configuration_management`
5. Unified GET endpoint
6. Frontend, section by section

This is the lowest-priority file of the six — reasonable to defer
entirely until Specs 01-04 are built and in use, since nothing else in
the Kickoff module or QPM module depends on this content existing.

---

## 6. What Does NOT Change

- No relationship to any other Kickoff spec or the QPM module — this
  is the most fully self-contained file of the six
