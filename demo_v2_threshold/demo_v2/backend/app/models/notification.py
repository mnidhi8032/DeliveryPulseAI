"""Notification ORM model for in-app alerts."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.submission import Submission
    from app.models.user import User


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # WORKFLOW, APPROVAL, RISK, SYSTEM
    type: Mapped[str] = mapped_column(String(50), nullable=False)      # e.g., SUBMISSION_SUBMITTED, PROJECT_RED
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    related_submission_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("submissions.id", ondelete="SET NULL"),
        nullable=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    submission: Mapped["Submission | None"] = relationship(
        "Submission",
        foreign_keys=[related_submission_id],
    )

    def __repr__(self) -> str:
        return f"<Notification id={self.id} user_id={self.user_id} title={self.title!r} is_read={self.is_read}>"
