# Spec 11 — DM Action Item → PM Notification

**Status:** Planned  
**Priority:** High  
**Created:** July 2026

---

## 1. Purpose

When a Delivery Manager creates or updates an Action Item for a project, the Project Manager who owns that project must be automatically notified in-app. The PM can then see exactly what action has been raised, by which DM, for which project, and take appropriate steps.

---

## 2. User Story

> **As a Project Manager**, I want to receive an in-app notification whenever my Delivery Manager raises an action item against one of my projects, so that I know what corrective actions are expected from me without having to manually check.

> **As a Delivery Manager**, I want the PM to be automatically informed when I create an action item, so that the PM is aware and can act on it promptly.

---

## 3. Current State

### What already exists

| Component | Status |
|---|---|
| `notifications` table | ✅ Exists — has `user_id`, `title`, `message`, `category`, `type`, `is_read`, `related_submission_id` |
| `action_items` table | ✅ Exists — has `project_id`, `created_by_user_id`, `owner_name`, `metric_name`, `root_cause`, `corrective_action` |
| In-app notification bell (frontend) | ✅ Exists — polls `GET /notifications` every 30 seconds, shows unread count badge |
| `POST /notifications` or notification service | ✅ Partially — `NotificationService` exists for creating notifications |
| DM Action Items page | ✅ Exists — DM creates action items via `POST /brd/action-items` |
| PM notification bell | ✅ Exists — same `Header` component used on PM pages |

### What is missing

1. **Trigger**: After a DM creates an action item, no notification is sent to the PM.
2. **`related_project_id` on Notification**: The notification model only links to `related_submission_id`. There is no `related_project_id` or `related_action_item_id` field for deep-linking to the action item.
3. **PM-side view**: PM has no dedicated page to view all action items raised against their projects.

---

## 4. Notification Flow

```
DM clicks "Create Action Item"
        ↓
POST /brd/action-items (existing endpoint)
        ↓
Backend: action_items service creates the row
        ↓
Backend: look up project.project_manager_id
        ↓
Backend: create Notification row for the PM
  {
    user_id:  project.project_manager_id,
    title:    "New action item for {project_name}",
    message:  "DM {dm_name} raised: {root_cause[:100]}",
    category: "WORKFLOW",
    type:     "ACTION_ITEM_CREATED",
    is_read:  false
  }
        ↓
PM notification bell shows +1 unread (polled every 30s)
        ↓
PM clicks notification → navigates to action items page for that project
```

---

## 5. Data Model Changes

### Option A — Minimal (recommended)
No schema change. Reuse existing `Notification` model. Store the project ID in the `message` string or use the existing `related_submission_id` field repurposed as `related_project_id` (not ideal).

**Better**: Add a `related_project_id` column to `notifications`.

### Option B — Add `related_project_id` to Notification (recommended)

```sql
ALTER TABLE notifications
ADD COLUMN related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
```

Alembic migration: `p0q1r2s3t4u5_add_project_id_to_notifications.py`

This allows the frontend notification click handler to deep-link directly to `/pm/projects/{project_id}/actions`.

### Option C — Add `related_action_item_id` to Notification
Most specific — links directly to the action item row. Allows PM to see full detail. Requires more migration work.

**Recommendation: Option B** — simple, backward-compatible, enables deep-linking.

---

## 6. Backend Implementation Plan

### Step 1 — Migration
Add `related_project_id UUID FK → projects(id)` to `notifications` table.

### Step 2 — Notification Model Update
Add `related_project_id` mapped column to `app/models/notification.py`.

### Step 3 — Action Item Service (`app/services/brd_service.py` or similar)
After creating an action item, call `NotificationService.create(...)` with:
```python
Notification(
    user_id     = project.project_manager_id,
    title       = f"Action item raised — {project.project_name}",
    message     = f"{creator.full_name} raised: {root_cause[:120]}",
    category    = "WORKFLOW",
    type        = "ACTION_ITEM_CREATED",
    is_read     = False,
    related_project_id = project.id,
)
```

### Step 4 — Notification Schema Update
Add `related_project_id: UUID | None` to `NotificationResponse` Pydantic schema.

### Step 5 — API Response Update
`GET /notifications` already returns all notifications for the logged-in user. The new field will appear automatically once the schema is updated.

---

## 7. Frontend Implementation Plan

### Step 1 — Update Notification type (`frontend/src/services/notificationService.ts`)
Add `related_project_id: string | null` to the `Notification` interface.

### Step 2 — Update Header click handler (`frontend/src/components/Header.tsx`)
In `handleNotificationClick`, add a branch:
```typescript
if (notif.related_project_id && user?.role_code === "PM") {
  navigate(`/pm/projects/${notif.related_project_id}/actions`);
}
```

### Step 3 — PM Action Items page (`/pm/projects/{id}/actions`)
This route already exists (`ActionItemsPage` at `/pm/projects/:projectId/actions`).  
The PM will be deep-linked directly to the action items list for their specific project.

### Step 4 — Notification content (DM Header)
The DM's own notification bell (`DeliveryManagerLayout.tsx`) already handles notifications. No change needed there — DMs don't need to receive their own action item notifications.

---

## 8. PM Action Items View — Enhancement

Currently the PM has `ActionItemsPage` accessible from the project detail page. After this feature:

- PM receives notification → clicks it → lands on `/pm/projects/{id}/actions`
- The page shows all action items for that project including the one just raised by the DM
- Each action item shows: metric name, root cause, corrective action, owner, due date, status, and **who created it** (DM name)

**Enhancement needed**: Add a "Raised by" column to the PM's action items view showing the DM's name (`created_by_user_id` → `User.full_name`).

---

## 9. DM Review Notification (Optional Extension)

Same pattern can be extended: when DM submits a **Review** (commentary via `dm_reviews` table), notify the PM with:
```
Title:   "DM review submitted — {project_name}"
Message: "{dm_name} reviewed your KPIs for {period_label}"
```
Deep-link: `/pm/projects/{id}/qpm/summary`

---

## 10. Implementation Checklist

### Backend
- [ ] Migration: Add `related_project_id` to `notifications`
- [ ] Model: Update `Notification` model
- [ ] Service: Trigger notification in `createActionItem` service method
- [ ] Schema: Add `related_project_id` to `NotificationResponse`
- [ ] Test: Verify notification created when DM creates action item

### Frontend
- [ ] Type: Add `related_project_id` to `Notification` interface
- [ ] Header: Handle `ACTION_ITEM_CREATED` type in click handler (PM role)
- [ ] PM Actions page: Add "Raised by" column
- [ ] (Optional) DM Review notification: extend same pattern

---

## 11. Acceptance Criteria

1. DM creates an action item for "Loan Management System" → PM Anita Roy receives a notification bell badge
2. PM clicks the notification → navigates directly to `/pm/projects/{id}/actions`
3. Action items list shows the new item with DM's name in "Raised by"
4. Notification is marked read after PM clicks it
5. If DM creates multiple action items for the same project, each creates a separate notification
6. DMs do not receive notifications for their own action items

---

## 12. Out of Scope (for this spec)

- Email notifications (can be a future enhancement)
- Notification preferences / mute settings
- DM notifications when PM updates/closes an action item
- Action item status change notifications
