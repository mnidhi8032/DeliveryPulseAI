"""Notification API routes."""

from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import NotificationResponse, NotificationUnreadCountResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[NotificationResponse]:
    """Retrieve all notifications for the authenticated user."""
    repo = NotificationRepository(db)
    return repo.list_by_user(current_user.id)


@router.get("/unread-count", response_model=NotificationUnreadCountResponse)
def get_unread_count(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> NotificationUnreadCountResponse:
    """Retrieve the unread notifications count for the bell icon badge."""
    repo = NotificationRepository(db)
    count = repo.get_unread_count(current_user.id)
    return NotificationUnreadCountResponse(unread_count=count)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> NotificationResponse:
    """Mark a specific notification as read, checking ownership."""
    repo = NotificationRepository(db)
    notif = repo.get_by_id(notification_id)
    if notif is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    if notif.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this notification",
        )
    updated_notif = repo.mark_as_read(notification_id)
    db.commit()
    return updated_notif


@router.post("/read-all", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Mark all unread notifications of the authenticated user as read."""
    repo = NotificationRepository(db)
    repo.mark_all_as_read(current_user.id)
    db.commit()
    return {"status": "success"}
