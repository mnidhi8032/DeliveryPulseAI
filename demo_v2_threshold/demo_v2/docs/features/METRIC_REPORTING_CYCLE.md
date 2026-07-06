# Feature: Metric Reporting Cycle (Frequency-Aware Submission & Review Windows)

> **Status:** Planned — Not Yet Implemented
> **Priority:** High — Core Governance Feature
> **Created:** 2026-07-02
> **Last Updated:** 2026-07-03 (Working-day calendar, Sprint removed, Observation Period terminology)

---

# 1. Purpose

Every KPI metric has a reporting frequency:

- Weekly
- Fortnightly
- Monthly
- Quarterly

The platform enforces a structured reporting lifecycle consisting of six stages:

```
Observation Period
        ↓
Submission Window (Project Manager)
        ↓
Review Window (Delivery Manager / Delivery Director)
        ↓
(Optional) Delivery Head Review
        ↓
Cycle Lock
        ↓
Historical Snapshot
```

This ensures that:

- Project data is submitted in a controlled reporting window.
- Reviews happen after submission.
- Historical records remain immutable.
- Trend analysis becomes possible across reporting cycles.

This is **not an approval workflow**.

The reporting cycle is **calendar-driven**, not user-driven.

The reporting engine operates using configurable working days (business days), not calendar days.

---

# 2. Design Principles

| Principle | Description |
|------------|-------------|
| Reporting ≠ Submission | Work happens throughout the Observation Period, but data is submitted only during the submission window. |
| Sequential workflow | PM submits first → DM/DD reviews → Cycle locks. |
| No approvals | Reviewers only comment and create actions. |
| Working-day based governance | Locking occurs automatically based on working-day reporting dates. |
| Historical snapshots | Every completed reporting cycle becomes immutable historical data. |
| Configurable | Reporting windows are configurable by Platform Admin. |
| Working Calendar | The reporting engine calculates reporting windows using business days (Monday–Friday) and ignores weekends. Future versions may also support company holidays. |

---

# 3. Reporting Lifecycle

## Stage 1 — Observation Period

During this stage:

- Project execution continues throughout the Observation Period.
- Metrics accumulate naturally.
- PM can monitor metrics but cannot submit until the submission window opens.
- Metrics remain read-only until the submission window opens.

Example:

```
Sprint Velocity

Observation Period

Next Submission:
Wednesday
```

---

## Stage 2 — Submission Window (Project Manager)

During this stage, the Project Manager can:

- Enter metric values
- Edit submitted values
- Upload external metric files
- Save multiple times until the submission window closes

Example:

```
Sprint Velocity

Value

_________

[Save]
```

When the submission window closes:

- PM editing is disabled.
- If no submission exists:

→ Submission Compliance = NON_COMPLIANT

---

## Stage 3 — Review Window (Delivery Manager / Delivery Director)

After submission closes:

Project Manager editing becomes read-only.

Delivery Manager / Delivery Director can:

- Review submitted metrics
- Add project-level commentary
- Create action items
- Request corrections (without rejecting submission)

Example:

Comment

```
Velocity has reduced compared to previous cycle.

Project should improve sprint planning.
```

Action

```
Improve Sprint Planning

Owner:
Project Manager

Due:
15 Jul
```

If the reviewer does not complete the review before the review window closes:

→ Review Compliance = NON_COMPLIANT

A review is considered complete when the Delivery Manager has added **at least one comment OR created at least one action item** for a submission within the review window.

Simply opening the submission without commenting does not count as a review.

---

## Stage 4 — Delivery Head Review (Optional)

Delivery Head may review:

- Business Unit trends
- Accounts
- Cross-project trends

The Delivery Head can:

- Add governance comments
- Create organizational actions

Delivery Head review is **optional** and is **not part of compliance tracking**.

---

## Stage 5 — Cycle Lock

When the reporting window expires:

- PM cannot edit metrics.
- DM/DD cannot edit reviews.
- Delivery Head cannot modify commentary.
- Records become immutable.

No changes are permitted after locking.

---

## Stage 6 — Historical Snapshot

The completed reporting cycle is permanently stored.

Example:

```
Cycle 1

Productivity

82%

Cycle 2

84%

Cycle 3

87%
```

Historical snapshots are used for:

- Trend charts
- Dashboard analytics
- AI insights (Phase 2)
- Organizational reporting

---

# 4. Metric States (UI)

Every metric should appear in one of four states.

---

## State 1 — Observation Period

```
Sprint Velocity

Observation Period

Submission Opens:
Wednesday
```

Properties

- Read-only
- Shows next submission date

---

## State 2 — SUBMISSION OPEN

```
Sprint Velocity

Value

_______

[Save]
```

Properties

- Editable
- PM may modify values
- Upload enabled

---

## State 3 — UNDER REVIEW

```
Sprint Velocity

Submitted

82

Waiting for Review
```

Properties

- Read-only for PM
- DM/DD review enabled
- Comments enabled
- Action creation enabled

---

## State 4 — LOCKED

```
Sprint Velocity

82

Locked

Submitted:
30 Jun
```

Properties

- Read-only
- Historical snapshot
- Cannot be modified

---

# 5. Reporting Calendar

The company works Monday–Friday. The reporting engine uses working days only. Weekends are excluded from all window calculations.

---

## Weekly (5 Working Days)

```
Monday – Tuesday

Observation Period

Wednesday – Thursday

Submission Window (PM)

Friday

Review Window (DM/DD)

Friday End of Business

Cycle Locked
```

---

## Fortnightly (10 Working Days)

```
Working Days 1 – 7

Observation Period

Working Days 8 – 9

Submission Window (PM)

Working Day 10

Review Window (DM/DD)

Working Day 10 End of Business

Cycle Locked
```

---

## Monthly

Use the Last Working Week of the month.

```
Monday – Tuesday (Last Working Week)

Observation Period

Wednesday – Thursday (Last Working Week)

Submission Window (PM)

Friday (Last Working Week)

Review Window (DM/DD)

Friday End of Business (Last Working Week)

Cycle Locked
```

---

## Quarterly

Use the Last Working Week of the Quarter.

```
Monday – Tuesday (Last Working Week of Quarter)

Observation Period

Wednesday – Thursday (Last Working Week of Quarter)

Submission Window (PM)

Friday (Last Working Week of Quarter)

Review Window (DM/DD)

Friday End of Business (Last Working Week of Quarter)

Cycle Locked
```

---

# 6. Configurable Reporting Windows

Database Table

```sql
CREATE TABLE reporting_window_config (

    id UUID PRIMARY KEY,

    frequency VARCHAR(20) NOT NULL,

    reporting_days INTEGER NOT NULL,

    submission_window_days INTEGER NOT NULL,

    review_window_days INTEGER NOT NULL,

    lock_on_review_close BOOLEAN DEFAULT TRUE,

    working_days_only BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ

);
```

Future table for holiday support:

```sql
CREATE TABLE working_calendar (

    id UUID PRIMARY KEY,

    calendar_date DATE NOT NULL,

    is_working_day BOOLEAN NOT NULL DEFAULT TRUE,

    reason VARCHAR(255),

    created_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ

);
```

---

## Default Configuration

| Frequency | Observation Period | Submission | Review | Lock |
|------------|-----------------|------------|--------|------|
| Weekly | 2 Working Days | 2 Working Days | 1 Working Day | Friday EOD |
| Fortnightly | 7 Working Days | 2 Working Days | 1 Working Day | Working Day 10 EOD |
| Monthly | Until Last Working Week | 2 Working Days | 1 Working Day | Last Working Friday |
| Quarterly | Until Last Working Week | 2 Working Days | 1 Working Day | Last Working Friday |

Platform Admin may modify these values without changing application logic.

---

# 7. Compliance Rules

## Submission Compliance (Project Manager)

If no submission exists before the Submission Window closes:

```
Submission Compliance

↓

NON_COMPLIANT
```

---

## Review Compliance (Delivery Manager / Delivery Director)

If no review exists before the Review Window closes:

```
Review Compliance

↓

NON_COMPLIANT
```

A review is considered complete when the Delivery Manager has added **at least one comment OR created at least one action item** for a submission within the review window.

Simply opening the submission without commenting does not count as a review.

---

## Delivery Head

Review is optional.

No compliance tracking.

---

# 8. Backend Implementation

## Step 1

Create

```
reporting_window_config
```

table.

Also create

```
working_calendar
```

table for future holiday support.

---

## Step 2

Create

```
app/utils/reporting_window.py
```

Returns

```
OBSERVATION_PERIOD

SUBMISSION_OPEN

UNDER_REVIEW

LOCKED
```

---

## Step 3

API Enhancement

Inject

```
reporting_state
submission_compliance
review_compliance
```

into every metric response.

---

## Step 4

Frontend

Display four sections

```
Observation Period

Submission Open

Under Review

Locked
```

---

## Step 5

Compliance Service

Automatically generate:

- Submission NON_COMPLIANT
- Review NON_COMPLIANT

when reporting windows expire.

---

## Step 6

Platform Admin

New page

```
Reporting Window Configuration
```

where administrators configure:

- Reporting Windows
- Working Days
- Weekend Definition

Future Enhancement:

```
Company Holiday Calendar
```

---

# 9. What Does NOT Change

- Existing KPI Measurement table
- GovernancePeriod lifecycle
- Historical storage model
- Trend analysis
- Manual admin override
- AI integration roadmap
- Existing RAG computation

---

# 10. Benefits

This approach provides:

- Monday–Friday governance
- No weekend dependency
- Better compliance tracking
- Cleaner audit trail
- Historical reporting snapshots
- AI-ready reporting history
- Fully configurable reporting engine
- Business-day aware scheduling
- Alignment with BRD, SRD and FRD

---

# 11. Future Enhancements

- Company Holiday Calendar
- Regional Holiday Support
- Jira Sprint Integration
- Email Reminder Notifications
- Microsoft Teams Notifications
- Compliance Escalation Workflow
