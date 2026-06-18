"""Metric values captured on a submission."""

import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class MetricValue(Base, TimestampMixin):
    __tablename__ = "metric_values"
    __table_args__ = (
        UniqueConstraint(
            "submission_id",
            "metric_definition_id",
            name="uq_metric_values_submission_metric",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("submissions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    metric_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("metric_definitions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)

    submission: Mapped["Submission"] = relationship(
        "Submission",
        back_populates="metric_values",
        foreign_keys=[submission_id],
    )
    metric_definition: Mapped["MetricDefinition"] = relationship(
        "MetricDefinition",
        back_populates="metric_values",
        foreign_keys=[metric_definition_id],
    )

    def __repr__(self) -> str:
        return f"<MetricValue submission_id={self.submission_id} metric_definition_id={self.metric_definition_id}>"
