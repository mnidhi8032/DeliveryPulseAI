"""Project Period Measure — shared parameter store per project per reporting period."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.project import Project
    from app.models.kpi_plan import KpiPlan


class ProjectPeriodMeasure(Base, TimestampMixin):
    """
    Shared parameter store for a project+period combination.

    One row per (project_id, period_label, measure_name).
    Used by the new unified data entry UI so parameters like
    "Delivered and Accepted Size" are entered once and automatically
    propagated to all metrics that need them.
    """
    __tablename__ = "project_period_measures"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "period_label", "measure_name",
            name="uq_ppm_project_period_measure",
        ),
    )

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
    period_label: Mapped[str] = mapped_column(String(200), nullable=False)
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    from_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    to_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    measure_name: Mapped[str] = mapped_column(String(300), nullable=False)
    actual_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    entered_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    entered_by: Mapped["User | None"] = relationship("User", foreign_keys=[entered_by_user_id])

    def __repr__(self) -> str:
        return f"<ProjectPeriodMeasure {self.measure_name}={self.actual_value} period={self.period_label!r}>"
