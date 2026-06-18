"""Append-only audit rows for submission lifecycle (e.g. REOPENED)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class SubmissionLifecycleAudit(Base):
    """
    Immutable lifecycle audit trail (no updates/deletes via app).

    Used when a submission enters REOPENED so compliance can trace who reopened and why.
    """

    __tablename__ = "submission_lifecycle_audits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("submissions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    submission: Mapped["Submission"] = relationship(
        "Submission",
        back_populates="lifecycle_audits",
        foreign_keys=[submission_id],
    )

    def __repr__(self) -> str:
        return f"<SubmissionLifecycleAudit id={self.id} event_type={self.event_type!r}>"
