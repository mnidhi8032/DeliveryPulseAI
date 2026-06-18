"""Metric catalog (definitions per governance dimension)."""

import uuid

from sqlalchemy import Boolean, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class MetricDefinition(Base, TimestampMixin):
    __tablename__ = "metric_definitions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    dimension: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_type: Mapped[str] = mapped_column(String(30), nullable=False)  # decimal, integer, currency
    weight: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=1.0)
    validation_rules: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # V1 scoring fields — kept for migration compatibility, not used by V2 engine
    target_value: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    fail_value: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    calculation_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    direction_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    step_configuration: Mapped[str | None] = mapped_column(Text, nullable=True)

    # V2 governance threshold fields
    green_threshold: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    amber_threshold: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    red_threshold: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    critical_threshold: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    metric_values: Mapped[list["MetricValue"]] = relationship(
        "MetricValue",
        back_populates="metric_definition",
    )

    def __repr__(self) -> str:
        return f"<MetricDefinition code={self.code!r}>"
