# Kickoff Module — Overview

**Status:** Planned — Not Yet Implemented
**Priority:** High
**Created:** July 2026
**Source:** Sonata Software "OM-DEV-TM-01 — Project Kickoff Meeting" template
**Folder:** `docs/kickoff/` — self-contained, separate from `docs/specs/` (QPM module)

---

## 1. Purpose

Before a project ever produces its first KPI reading, it goes through a
**kickoff phase** — defining scope, standing up the team, agreeing on
governance, and identifying which metrics will be tracked. Today this
happens entirely outside DeliveryPulse, in a static PowerPoint deck
filled in by hand and emailed around.

This module brings that kickoff process into the platform as structured,
living data — the thing a PM fills in once at project start and keeps
current, rather than a slide deck that goes stale the day after the
kickoff meeting.

**This is explicitly upstream of the QPM module.** Everything in
`docs/specs/` (KPI Plan, Data Entry, RAG computation, DM Review, etc.)
assumes a project already exists with metrics chosen. This module is
what happens *before* that — and one section of it (the Metrics Plan)
overlaps directly with QPM setup, which is why Section 04 gets special
treatment below.

---

## 2. The Six Files in This Folder

| File | Covers | Nature |
|---|---|---|
| `00_OVERVIEW.md` | This file — index, build order, the one open decision | — |
| `01_PROJECT_CHARTER.md` | Customer/Project Overview, Scope & Assumptions, Org Structure, Roles & Responsibilities, Current Project Status, Document Info & Revision History | Fill-once-ish form fields |
| `02_RISK_ISSUE_TRACKING.md` | Project Risks & Opportunities, Open Issues/Dependencies/Actions | Live, continuously-updated tables |
| `03_GOVERNANCE_PROCESS.md` | Execution Methodology, Gate Review Plan, Governance Reviews & Reporting, Escalation Management, Scope/Change Management | Process definition (mostly structured free text) |
| `04_METRICS_PLAN_INTEGRATION.md` | The kickoff deck's "Metrics Plan (QPM Plan)" slide | **Touches the live QPM system — see the open decision below** |
| `05_RESOURCING_INFRASTRUCTURE.md` | HR Plan & Readiness, HR Training Plan, Infrastructure Plan, Configuration Management Plan | Self-contained checklists |

---

## 3. The One Open Decision (blocks Section 04 only)

The kickoff deck's Metrics Plan table (`Project Goal | Metric/KPI | Unit
of Measure | Priority | Target Value | LCL | UCL | Frequency of Analysis
| Remarks`) maps almost column-for-column onto the existing
`KpiPlanMetric` model used throughout the QPM module:

| Kickoff deck column | Existing QPM field |
|---|---|
| Metric/KPI | `metric_name` |
| Unit of Measure | `uom` |
| Priority | `priority` |
| Target Value | `target` |
| LCL | `lsl` |
| UCL | `usl` |
| Frequency of Analysis | `frequency` |
| Project Goal | *(doesn't exist yet)* |
| Remarks | *(doesn't exist yet)* |

**This is a real decision, not a detail** — Section 04 presents two
options (standalone kickoff-only table vs. writing directly into
`KpiPlanMetric` with two new optional fields) and a recommendation, but
does not silently pick one. Confirm the direction before Section 04 is
built, since it determines whether "filling in the kickoff deck's
metrics table" and "setting up the KPI Plan" become the same action or
stay two separate ones.

Sections 01, 02, 03, and 05 have no such dependency and can be built in
any order relative to each other.

---

## 4. Suggested Build Order

1. **`01_PROJECT_CHARTER.md`** — lowest complexity, highest immediate
   value (what a PM wants on day one of a new project)
2. **`02_RISK_ISSUE_TRACKING.md`** — different data pattern (live CRUD,
   not a form), worth its own careful build
3. **`03_GOVERNANCE_PROCESS.md`** — mostly structured free text, low risk
4. **Resolve the Section 04 decision**, then build `04_METRICS_PLAN_INTEGRATION.md`
5. **`05_RESOURCING_INFRASTRUCTURE.md`** — least urgent, most self-contained

---

## 5. What This Module Deliberately Does Not Do

- It does not replace or modify anything in `docs/specs/` — the RAG
  engine, shared parameters, DM review cycle, reporting windows, and
  everything else already built or planned there is untouched.
- It is not a project-creation wizard — a project must already exist
  (created via the existing `Project` model / Platform Admin flow)
  before its kickoff data can be filled in.
- Section 02's risk/issue tracking is not a replacement for any
  existing issue-tracking tool (Jira, etc.) the org may already use —
  it's a lightweight in-platform record, not a project management suite.
