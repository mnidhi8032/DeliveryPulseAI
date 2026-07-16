# Spec 11 — DM Action Item → PM Notification

**Status:** Implemented ✅  
**Priority:** High  
**Created:** July 2026  
**Completed:** July 2026

---

## 1. Purpose

When a Delivery Manager creates an Action Item for a project, the Project Manager who owns that project is automatically notified in-app. The PM can see what action was raised, by which DM, for which project, and navigate directly to the action items page.

---

## 2. User Story

> **As a Project Manager**, I want to receive an in-app notification whenever my Delivery Manager raises an action item against one of my projects, so that I know what corrective actions are expected without having to manually check.

> **As a Delivery Manager**, I want the PM to be automatically informed when I create an action item, so that the PM is aware and can act promptly.

---

## 3. Implementation Summary

### What was built

| Component | Status |
|---|---|
| `related_project_id` column on `notifications` table | ✅ Added via Alembic migration `p0q1r2s3t4u5` |
| `Notification` model updated | ✅ `related_project_id: UUID \| None` mapped column |
| `ActionItemService.create()` triggers PM notification | ✅ Inline notification insert after action item commit |
| `NotificationResponse` schema updated | ✅ `related_project_id` field included |
| Header click handler routes `ACTION_ITEM_CREATED` to PM actions | ✅ `handleNotificationClick` in `Header.tsx` |
| PM action items page shows "created by" name | ✅ `created_by_name` resolved from ORM relationship |

---

## 4. Notification Flow

```
DM clicks "Create Action Item" on /delivery-manager/actions
        ↓
POST /api/v1/action-items
        ↓
ActionItemService.create() saves action_item row → session.commit()
        ↓
Checks: project.project_manager_id exists AND != DM's user.id
        ↓
Creates Notification row:
  {
    user_id:           project.project_manager_id,
    title:             "Action item raised — {project_name}",
    message:           "{dm_name} raised: {root_cause[:120]}",
    category:          "WORKFLOW",
    type:              "ACTION_ITEM_CREATED",
    is_read:           false,
    related_project_id: project.id
  }
        ↓
session.commit()  (separate commit — failure does NOT break action item creation)
        ↓
PM notification bell shows +1 unread (polled every 30 seconds)
        ↓
PM clicks notification → navigates to /pm/actions?project={project_id}
```

---

## 5. Error Handling

The notification creation is wrapped in a `try/except` block. If the notification fails (e.g. DB error, constraint violation), the action item is **not rolled back** — it was already committed. The error is logged at `ERROR` level with full traceback. A `session.rollback()` clears the failed notification state.

This ensures action item creation never fails due to notification issues.

---

## 6. Data Model

### `notifications` table (updated)

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Unique notification ID |
| `user_id` | UUID FK → users | Recipient user (the PM) |
| `title` | String(200) | Short title |
| `message` | Text | Full message body |
| `category` | String(50) | WORKFLOW / RISK / APPROVAL / SYSTEM |
| `type` | String(50) | ACTION_ITEM_CREATED / SUBMISSION_DRAFT_CREATED / etc. |
| `is_read` | Boolean | False until PM clicks the notification |
| `related_submission_id` | UUID FK → submissions | Optional — links to a submission |
| `related_project_id` | UUID FK → projects | Optional — links to a project (added Spec 11) |

### Alembic Migration
`p0q1r2s3t4u5_add_project_id_to_notifications.py` — adds `related_project_id` column.

---

## 7. Frontend — Header Notification Handler

In `Header.tsx`, `handleNotificationClick`:

```typescript
// ACTION_ITEM_CREATED — deep-link PM to consolidated actions page
if (notif.type === "ACTION_ITEM_CREATED" && notif.related_project_id && user?.role_code === "PM") {
  navigate(`/pm/actions?project=${notif.related_project_id}`);
  return;
}
```

The PM lands on `PMAllActionsPage` pre-filtered by the relevant project.

---

## 8. Notification Bell Behaviour

- **Header bell polls** `GET /api/v1/notifications/unread-count` every 30 seconds
- **Unread badge** shows count with red pulsing dot
- **Click bell** → opens dropdown showing all notifications (newest first)
- **Click notification** → marks as read + navigates to the relevant page
- **Mark all as read** → button clears badge for all unread

---

## 9. Conditions for Notification to Fire

| Condition | Result |
|---|---|
| `project.project_manager_id` is set | Notification created |
| `project.project_manager_id` is null | No notification (project has no PM) |
| DM is also the PM on this project | No notification (self-notification skipped) |
| Notification DB insert fails | Error logged, action item still saved |

---

## 10. Acceptance Criteria (All Met)

- [x] DM creates an action item → PM receives a notification bell badge
- [x] PM clicks the notification → navigates to `/pm/actions?project={id}`
- [x] Action items list shows `created_by_name` (DM's name) on each item
- [x] Notification marked as read after PM clicks it
- [x] Multiple action items by same DM → each creates a separate notification
- [x] DMs do not receive notifications for their own action items

---

## 11. Out of Scope

- Email notifications (future enhancement)
- Notification preferences / mute settings
- DM notifications when PM updates/closes an action item
- Action item status change notifications
