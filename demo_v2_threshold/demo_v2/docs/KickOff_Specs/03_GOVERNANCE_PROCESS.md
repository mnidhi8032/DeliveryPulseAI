# Kickoff Module — Spec 03: Governance & Process

**Status:** Planned — Not Yet Implemented
**Priority:** Medium
**Covers deck sections:** Execution Methodology · Gate Review Plan ·
Governance Reviews & Reporting · Escalation Management and Contacts ·
Scope/Change Management (both slides — process description and
estimation inputs)

---

## 1. Purpose

Define, once, how the project will actually be run: its delivery
methodology, its review gates, its meeting cadence, its escalation
path, and its change-control rules. Unlike Spec 02 (risks/issues), this
content is mostly set once at kickoff and only occasionally revised —
closer to Spec 01's "fill-once" pattern than Spec 02's "continuously
updated" one, but kept as its own file since it's a genuinely different
topic (process definition, not project identity).

---

## 2. Data Model

### 2.1 `project_execution_methodology` — one row per project

```
id, project_id (FK, unique)
life_cycle_model (string)          -- e.g. "Agile", "Waterfall", "Iterative"
process_overview (text)            -- steps described in text; if a diagram
                                     -- is needed, store an uploaded-file
                                     -- reference (reuse whatever file-upload
                                     -- mechanism already exists elsewhere in
                                     -- the app, don't build a new one)
tools (text)                        -- required tools / client-provided / to procure
tailoring_details (text)
entered_by_user_id, created_at, updated_at
```

### 2.2 `project_gate_reviews` — list

```
id, project_id (FK)
phase (string)                     -- e.g. "Analysis", "Design", "Build"
review_component (string)          -- e.g. "Fit-Gap Analysis", "SDD", "TDD"
coverage_pct (numeric, nullable)
go_no_go_criteria (text)
reviewer (string)
status ("PENDING" | "PASSED" | "FAILED", default "PENDING")
sort_order (int)
```

### 2.3 `project_governance_meetings` — list

```
id, project_id (FK)
meeting_name (string)
purpose_agenda (text)
frequency (string)                 -- e.g. "Daily", "Weekly", "Monthly / Quarterly"
associated_report_type (string, nullable)
participants (text)
sort_order (int)
```

### 2.4 `project_escalation_rules` — list

```
id, project_id (FK)
issue_type (string, nullable)      -- defaults to "Any issue identified" if blank
trigger_for_escalation (text)      -- e.g. "Issue not resolved within 3 days"
escalated_by (string)
internal_escalate_to (string)
external_escalate_to (string, nullable)
sort_order (int)
```

### 2.5 `project_change_management` — one row per project

```
id, project_id (FK, unique)
process_description (text)
change_control_board (text)        -- names/roles, free text list
change_threshold_impact (text)
change_threshold_effort (text)
sort_order n/a (single row)
```

### 2.6 `project_estimation` — one row per project, from the second
Scope/Change Management slide

```
id, project_id (FK, unique)
estimation_input_source (text)     -- e.g. "RFP / Scope Document"
estimation_guidelines (text)
estimated_size_value (numeric, nullable)
estimated_size_uom (string, nullable)   -- "Function Points" | "Story Points" | etc.
estimated_effort_value (numeric, nullable)
estimated_effort_uom (string, nullable) -- "Person days" | "Person-months"
total_duration_value (numeric, nullable)
total_duration_uom (string, nullable)   -- "Calendar days" | "Calendar Months"
```

**Why `estimated_size`/`effort`/`duration` are split into value + UOM
pairs rather than one text field:** the deck explicitly allows
different units per project (Function Points vs. Story Points vs.
Lines of Code for size; person-days vs. person-months for effort).
Storing them as separate numeric + unit columns keeps the value
queryable/sortable later (e.g. for a portfolio-wide estimation report)
without needing to parse free text.

---

## 3. API Endpoints

Under `/api/v1/kickoff/projects/{project_id}/governance/...`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/methodology` | Fetch execution methodology |
| PUT | `/methodology` | Update it |
| GET/POST/PUT/DELETE | `/gate-reviews` | Gate review plan rows |
| GET/POST/PUT/DELETE | `/meetings` | Governance meeting rows |
| GET/POST/PUT/DELETE | `/escalation-rules` | Escalation rule rows |
| GET | `/change-management` | Fetch change management + estimation together |
| PUT | `/change-management` | Update change management fields |
| PUT | `/estimation` | Update estimation fields |

Same "one unified GET for the whole page" principle as Spec 01 — a
single `GET /governance` composite endpoint returning methodology,
gate reviews, meetings, escalation rules, change management, and
estimation together is worth adding once all the individual pieces
exist, to avoid 6 separate calls on page load.

---

## 4. Frontend

New page: `frontend/src/pages/pm/KickoffGovernancePage.tsx`, sectioned
same as the deck:

1. **Execution Methodology** — simple form, life cycle model as a
   dropdown (Agile/Waterfall/Iterative/Testing/Maintenance/Other),
   free-text fields for the rest
2. **Gate Review Plan** — table, add/edit rows, status shown as a
   simple badge (Pending/Passed/Failed)
3. **Governance Reviews & Reporting** — table of meetings
4. **Escalation Management** — table of escalation tiers; consider a
   simple visual "ladder" (issue → PM → DM → Delivery Director) rather
   than a plain table, since the deck's own content is inherently a
   sequence
5. **Scope/Change Management** — one combined section with the process
   description fields and the estimation fields together (matches the
   deck's own two-slides-one-topic structure)

---

## 5. Build Order

1. `project_execution_methodology` (simplest — single row, no list)
2. `project_gate_reviews`
3. `project_governance_meetings`
4. `project_escalation_rules`
5. `project_change_management` + `project_estimation`
6. Unified GET endpoint
7. Frontend, section by section, same order

---

## 6. What Does NOT Change

- No relationship to `docs/specs/` reporting-cycle or reviewer-role
  work — the "Governance Reviews & Reporting" meeting cadence here is
  about the project's own meeting schedule (steering committees, daily
  standups), not the KPI reporting windows (Weekly/Monthly/Quarterly
  submission-review-lock cycle) defined in the QPM module
- No relationship to `02_RISK_ISSUE_TRACKING.md`'s data — escalation
  rules here define the *process* for escalating; actual open
  issues/risks live in Spec 02's tables
