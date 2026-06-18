"""Notification data access repository."""

import uuid
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session, joinedload
from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, **kwargs) -> Notification:
        notification = Notification(**kwargs)
        self._session.add(notification)
        self._session.flush()
        return notification

    def get_by_id(self, notification_id: uuid.UUID) -> Notification | None:
        stmt = (
            select(Notification)
            .options(joinedload(Notification.submission))
            .where(Notification.id == notification_id)
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def list_by_user(self, user_id: uuid.UUID) -> list[Notification]:
        stmt = (
            select(Notification)
            .options(joinedload(Notification.submission))
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
        return list(self._session.execute(stmt).scalars().all())

    def get_unread_count(self, user_id: uuid.UUID) -> int:
        stmt = (
            select(func.count(Notification.id))
            .where(Notification.user_id == user_id)
            .where(Notification.is_read.is_(False))
        )
        return self._session.execute(stmt).scalar() or 0

    def mark_as_read(self, notification_id: uuid.UUID) -> Notification | None:
        notification = self.get_by_id(notification_id)
        if notification:
            notification.is_read = True
            self._session.flush()
        return notification

    def mark_all_as_read(self, user_id: uuid.UUID) -> None:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id)
            .where(Notification.is_read.is_(False))
            .values(is_read=True)
        )
        self._session.execute(stmt)
        self._session.flush()
