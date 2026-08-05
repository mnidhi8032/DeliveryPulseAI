# DeliveryPulse AI — Requirements Index

**Version:** 2.2
**Status:** Implemented
**Last Updated:** July 2026

---

## Document Structure

| File | Contents |
|---|---|
| `01_FUNCTIONAL_REQUIREMENTS.md` | All functional requirements (FR-001 to FR-090) |
| `02_NON_FUNCTIONAL_REQUIREMENTS.md` | Performance, security, usability, scalability |
| `03_USER_STORIES.md` | User stories per role with acceptance criteria |
| `04_BUSINESS_RULES.md` | Business logic rules and constraints |
| `05_GLOSSARY.md` | Terms, abbreviations, and definitions |

---

## Summary of Requirement Areas

| Area | FR Range | Status |
|---|---|---|
| Authentication & Role Access | FR-001 – FR-007 | ✅ Implemented |
| Organisation Setup | FR-008 – FR-015 | ✅ Implemented |
| Project Management | FR-016 – FR-022 | ✅ Implemented |
| KPI Plan Setup | FR-023 – FR-030 | ✅ Implemented |
| KPI Data Entry | FR-031 – FR-040 | ✅ Implemented |
| RAG Computation | FR-041 – FR-046 | ✅ Implemented |
| KPI Summary & Trends | FR-047 – FR-052 | ✅ Implemented |
| Portfolio Dashboard (Exec) | FR-053 – FR-060 | ✅ Implemented |
| DM Review Cycle | FR-061 – FR-066 | ✅ Implemented |
| PM Dashboard | FR-067 – FR-070 | ✅ Implemented |
| DM Action Items & PM Notification | FR-071 – FR-075 | ✅ Implemented |
| Theme System | FR-076 – FR-078 | ✅ Implemented |
| Delivery Head Dashboard | FR-079 – FR-080 | ✅ Implemented |
| Project-Level Action Items | FR-081 – FR-083 | ✅ Implemented |
| DM Inline Action Raise | FR-084 – FR-085 | ✅ Implemented |
| Engagement Model Presets | FR-086 – FR-090 | ✅ Implemented |

---

## New Requirements (July 2026)

### FR-081 — Project-Level Action Items (PM)
PMs can raise action items scoped to a whole project (not tied to any metric) from the KPI Summary pages. These have `metric_name = null` and are created using the "Raise Project Action" form below the metric cards on `QPMSummaryPage` and `PMSummaryPage`.

### FR-082 — Project-Level Action Badge in PM Actions Page
Project-level action items are visually distinct in `PMAllActionsPage` with a "📋 Project-Level" indigo badge and indigo left border (vs RAG-status-coloured border for metric items).

### FR-083 — Type Filter in PM Actions Page
`PMAllActionsPage` includes a "Type" filter: All / Project-Level (N) / Metric (N). Allows PM to view only project-scoped actions or only metric-specific actions.

### FR-084 — DM Inline Action Raise from Review KPIs Page
Delivery Managers can raise action items directly from `DMProjectReviewPage` using an inline card below the commentary form. Leaving the metric field blank creates a project-level action. PM is notified automatically.

### FR-085 — DM Inline Action Raise from Submission Review Page
Delivery Managers can raise action items from `DMSubmissionReviewPage`. The form also passes `submission_id` so the action is traceable to the specific submission.

### FR-086 — Engagement Model Preset Table
A `engagement_model_presets` table stores exact, client-validated mandatory metric lists keyed by `(project_type, delivery_model)`. Added via Alembic migration `s2t3u4v5w6x7`.

### FR-087 — Preset-First Metric Selection
`project_service.create_with_plan` checks presets first. If an exact match exists, metrics are selected by exact name (compliance flag bypassed). If no preset, falls back to ILIKE.

### FR-088 — Preset Seed (3 Client Projects)
Three presets seeded: Testing/Agile-Scrum (7 metrics, JNJ AM R5.0), Maintenance/ITIL (6 metrics, JNJ Platform Support), Fresh Development/Agile-Scrum (9 metrics, JNJ JJCC Hybris).

### FR-089 — Idempotent Preset Seeding
`seed_engagement_presets.py` is safe to re-run — skips existing `(project_type, delivery_model, metric_name)` triples.

### FR-090 — Migration Health Fix
Fixed a split Alembic branch (`c48e6e0e1286` + `d5e6f7a8b9c0`) that left `metric_approval_requests` missing columns (`default_target`, `default_lsl`, `default_usl`, `measures_json`, `metrics_type`, `project_type`, `delivery_model`). Merged via `4e586ca0c465_merge_metric_approval_extra_fields_and_engagement_presets.py`. All columns now present.

---

## Requirement Priority Levels

| Priority | Meaning |
|---|---|
| Critical | Core business functionality — system cannot operate without it |
| High | Important feature expected by stakeholders |
| Medium | Valuable enhancement that improves usability |
| Low | Nice-to-have — can be deferred |
