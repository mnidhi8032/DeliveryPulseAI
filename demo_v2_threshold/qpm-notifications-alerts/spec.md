# QPM Notifications & Alerts Module — Spec

> **Stack:** FastAPI · React · PostgreSQL · RBAC · JWT

---

## 1. Overview

The Notifications & Alerts Module delivers timely email and in-app notifications to users based on platform events: KPI turning Red, data entry deadlines approaching, and action items becoming overdue. Notification preferences are configurable per user role.

---

## 2. Requirements

### R1 — Triggered Notifications

**As a** user, **I want to** receive alerts for critical platform events, **so that** I can act promptly on issues.

| # | Acceptance Criterion |
|---|----------------------|
| 1.1 | WHEN a KPI RAG status changes to Red, the platform SHALL send an in-app notification and email to the Project Manager and Delivery Manager for that project. |
| 1.2 | WHEN a data entry deadline is within the configured warning window (default: 2 days), the platform SHALL send an in-app notification to the data submitter. |
| 1.3 | WHEN an action item's target closure date passes without the item being Closed, the platform SHALL send an in-app notification to the action item owner and the Project Manager. |
| 1.4 | Notifications SHALL include: event type, project name, KPI/action item name, and a link to the relevant platform page. |

### R2 — Notification Preferences

**As a** user, **I want to** configure which notifications I receive, **so that** I only get alerts relevant to my role.

| # | Acceptance Criterion |
|---|----------------------|
| 2.1 | Each user SHALL be able to enable or disable each notification type (KPI Red, Deadline Warning, Action Overdue) independently. |
| 2.2 | Each user SHALL be able to choose delivery channels: in-app only, email only, or both. |
| 2.3 | WHEN a notification preference is saved, the platform SHALL apply it to all future notifications of that type. |
| 2.4 | Notification preferences SHALL default to enabled for all types on account creation. |
| 2.5 | Platform Admins SHALL be able to set default notification preferences per role. |

### R3 — In-App Notification Centre

| # | Acceptance Criterion |
|---|----------------------|
| 3.1 | The platform SHALL provide an in-app notification centre showing unread and read notifications. |
| 3.2 | WHEN a user marks a notification as read, the platform SHALL update its state and persist the change. |
| 3.3 | The unread notification count SHALL be visible in the navigation bar at all times. |
| 3.4 | Notifications older than 90 days SHALL be automatically archived. |

### R4 — Security & Performance

| # | Acceptance Criterion |
|---|----------------------|
| 4.1 | Notification delivery SHALL be asynchronous (background queue) and SHALL NOT block the triggering operation. |
| 4.2 | Notification endpoints SHALL require a valid JWT. |
| 4.3 | Email delivery failures SHALL be retried up to 3 times with exponential backoff and logged. |

---

## 3. Design

### Data Models

**`notifications`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| recipient_id | UUID FK | → users.id |
| notification_type | ENUM | {kpi_red, deadline_warning, action_overdue, approval_required, approval_decided} |
| title | VARCHAR(255) | |
| body | TEXT | |
| link | VARCHAR(500) | Deep-link to relevant page |
| channel | ENUM | {in_app, email, both} |
| is_read | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMPTZ | |
| archived_at | TIMESTAMPTZ | NULLABLE |

**`notification_preferences`** (new table)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | → users.id UNIQUE |
| kpi_red_enabled | BOOLEAN | DEFAULT TRUE |
| kpi_red_channel | ENUM | {in_app, email, both} DEFAULT both |
| deadline_warning_enabled | BOOLEAN | DEFAULT TRUE |
| deadline_warning_days | INTEGER | DEFAULT 2 |
| action_overdue_enabled | BOOLEAN | DEFAULT TRUE |
| action_overdue_channel | ENUM | DEFAULT both |

### Notification Flow

```
Platform Event (KPI Red / Deadline / Overdue)
    │
NotificationService.dispatch(event)
    │  async via task queue (Celery / ARQ)
    ├── In-App: insert into notifications table
    └── Email: send via SMTP/SendGrid (retry 3x on failure)
```

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/notifications` | `notifications:read` | List notifications for current user |
| PATCH | `/api/v1/notifications/{id}/read` | `notifications:read` | Mark as read |
| PATCH | `/api/v1/notifications/read-all` | `notifications:read` | Mark all as read |
| GET | `/api/v1/notifications/unread-count` | `notifications:read` | Unread badge count |
| GET/PATCH | `/api/v1/notifications/preferences` | `notifications:preferences` | Get/update preferences |

### Correctness Properties

| # | Property | Test Type |
|---|----------|-----------|
| P1 | Every KPI-Red event produces a notification for each user with kpi_red_enabled=true | Property-based |
| P2 | Disabled notification type never produces a notification for that user | Property-based |
| P3 | Notification delivery is async and never blocks the triggering operation | Integration test |
| P4 | Email failures retry exactly 3 times before being marked as failed | Property-based |

---

## 4. Implementation Tasks

- [ ] 1. Database Schema
  - [ ] 1.1 Create `notifications` table with all columns and archival timestamp
  - [ ] 1.2 Create `notification_preferences` table with per-user defaults
  - [ ] 1.3 Add index on `notifications(recipient_id, is_read, archived_at)`

- [ ] 2. Notification Service
  - [ ] 2.1 Implement `NotificationService.dispatch()`: check user preferences, create in-app record, enqueue email task
  - [ ] 2.2 Implement async email task with 3-retry exponential backoff
  - [ ] 2.3 Subscribe to: KPI-Red event, deadline-approaching event, action-overdue event, approval events
  - [ ] 2.4 Implement notification archival job (archive records > 90 days)
  - [ ] 2.5 Unit tests: dispatch with preferences enabled/disabled, retry logic
  - [ ] 2.6 Property test: KPI-Red event always creates notification for eligible users (P1)
  - [ ] 2.7 Property test: disabled type never creates notification (P2)
  - [ ] 2.8 Property test: email retries exactly 3 times on failure (P4)

- [ ] 3. Preferences Service
  - [ ] 3.1 Implement `NotificationPreferencesService.get()` and `update()`
  - [ ] 3.2 Seed default preferences on new user creation
  - [ ] 3.3 Unit tests for preference retrieval and update

- [ ] 4. API Layer
  - [ ] 4.1 GET/PATCH notification list and read-status endpoints
  - [ ] 4.2 Unread count endpoint
  - [ ] 4.3 Preferences GET/PATCH endpoint
  - [ ] 4.4 JWT auth on all endpoints
  - [ ] 4.5 Integration tests: notification creation, mark-read, unread count, preferences update

- [ ] 5. Frontend
  - [ ] 5.1 Notification badge in navigation bar showing unread count
  - [ ] 5.2 `NotificationCentre` panel/drawer: list of notifications with read/unread state
  - [ ] 5.3 Mark-as-read and mark-all-read controls
  - [ ] 5.4 `NotificationPreferencesForm`: toggle per notification type + channel selector
  - [ ] 5.5 Component tests: badge count, read state toggle, preferences form
