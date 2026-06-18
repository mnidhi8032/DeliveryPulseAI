"""Governance period model (time window)."""

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class GovernancePeriod(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "governance_periods"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)  # WEEKLY / MONTHLY

    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    submissions: Mapped[list["Submission"]] = relationship(
        "Submission",
        back_populates="governance_period",
        foreign_keys="Submission.governance_period_id",
    )

    def __repr__(self) -> str:
        return f"<GovernancePeriod id={self.id} name={self.name!r} type={self.period_type!r}>"

