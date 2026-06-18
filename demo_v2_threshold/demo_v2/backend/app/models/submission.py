"""Submission model (governance workflow skeleton, no metrics yet)."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class Submission(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
    )
    governance_period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("governance_periods.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status_id: Mapped[int] = mapped_column(
        ForeignKey("submission_statuses.id", ondelete="RESTRICT"),
        nullable=False,
    )

    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    submission_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approval_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rag_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # DH / primary reviewer comments
    review_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # BRD §5.4.1.7: PM perception RAG — separate from computed RAG, cannot override computed
    pm_perception_rag: Mapped[str | None] = mapped_column(Text, nullable=True)   # GREEN, AMBER, RED
    pm_rag_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # BRD §5.5.1.3: Multi-tier reviewer comments (DM, DD, DH each have separate fields)
    dm_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    dm_review_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dm_review_status: Mapped[str | None] = mapped_column(Text, nullable=True)  # REVIEWED, PENDING

    dd_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    dd_review_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dd_review_status: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="submissions",
        foreign_keys=[project_id],
    )
    governance_period: Mapped["GovernancePeriod"] = relationship(
        "GovernancePeriod",
        back_populates="submissions",
        foreign_keys=[governance_period_id],
    )
    status: Mapped["SubmissionStatus"] = relationship(
        "SubmissionStatus",
        back_populates="submissions",
        foreign_keys=[status_id],
    )
    creator: Mapped["User"] = relationship(
        "User",
        foreign_keys=[created_by_user_id],
        back_populates="created_submissions",
    )
    reviewer: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[reviewed_by_user_id],
        back_populates="reviewed_submissions",
    )
    lifecycle_audits: Mapped[list["SubmissionLifecycleAudit"]] = relationship(
        "SubmissionLifecycleAudit",
        back_populates="submission",
    )
    metric_values: Mapped[list["MetricValue"]] = relationship(
        "MetricValue",
        back_populates="submission",
    )
    dimension_scores: Mapped[list["DimensionScore"]] = relationship(
        "DimensionScore",
        back_populates="submission",
    )
    health_score: Mapped["HealthScore | None"] = relationship(
        "HealthScore",
        back_populates="submission",
        uselist=False,
    )

    def __repr__(self) -> str:
        return f"<Submission id={self.id} project_id={self.project_id} status_id={self.status_id}>"

