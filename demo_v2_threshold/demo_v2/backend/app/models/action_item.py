"""ActionItem model — BRD §8: Action & Improvement tracking per metric/submission."""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.submission import Submission
    from app.models.user import User


class ActionItem(Base, TimestampMixin):
    """
    BRD §8: When a KPI turns Red or Amber, PM logs a corrective action item.
    Lifecycle: OPEN → IN_PROGRESS → CLOSED
    """
    __tablename__ = "action_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Context — linked to a project and optionally a specific submission/metric
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    submission_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("submissions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Which metric this action is for (metric name string, not FK to keep flexible)
    metric_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    rag_status_at_creation: Mapped[str | None] = mapped_column(String(10), nullable=True)  # RED, AMBER

    # Action details
    root_cause: Mapped[str] = mapped_column(Text, nullable=False)
    corrective_action: Mapped[str] = mapped_column(Text, nullable=False)

    # Ownership
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    owner_name: Mapped[str | None] = mapped_column(String(200), nullable=True)  # free-text fallback

    # Timeline
    target_closure_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Status: OPEN, IN_PROGRESS, CLOSED
    action_status: Mapped[str] = mapped_column(String(20), nullable=False, default="OPEN")

    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", foreign_keys=[project_id])
    submission: Mapped["Submission | None"] = relationship("Submission", foreign_keys=[submission_id])
    owner: Mapped["User | None"] = relationship("User", foreign_keys=[owner_user_id])
    created_by: Mapped["User | None"] = relationship("User", foreign_keys=[created_by_user_id])

    def __repr__(self) -> str:
        return f"<ActionItem project={self.project_id} status={self.action_status}>"
