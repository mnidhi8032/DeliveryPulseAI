"""DM Review — Delivery Manager review record per project per period."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.project import Project
    from app.models.kpi_plan import KpiPlan


class DMReview(Base, TimestampMixin):
    __tablename__ = "dm_reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kpi_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kpi_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Reporting period label (e.g. "July 2026", "Week of 30 Jun 2026")
    period_label: Mapped[str] = mapped_column(String(200), nullable=False)
    dm_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Action items as JSON array string: ["Fix defect rate", "Check sprint velocity"]
    action_items: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    project: Mapped["Project"] = relationship("Project")
    kpi_plan: Mapped["KpiPlan"] = relationship("KpiPlan")
    reviewed_by: Mapped["User | None"] = relationship(
        "User", foreign_keys=[reviewed_by_user_id]
    )

    def __repr__(self) -> str:
        return f"<DMReview project_id={self.project_id} period={self.period_label!r}>"
