"""Notification API schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: str
    category: str
    type: str
    is_read: bool
    related_submission_id: UUID | None
    related_project_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationUnreadCountResponse(BaseModel):
    unread_count: int
