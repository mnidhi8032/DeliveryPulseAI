"""KPI Measurement (Sheet 3 Tracker) and KPI Measure Entry (Sheet 2 Data Entry)."""
import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import ForeignKey, String, Text, Numeric, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class KpiMeasureEntry(Base, TimestampMixin):
    """
    Sheet 2 — Raw component measure entered by PM.
    A metric may need 1-4 measures to compute its final KPI value.
    E.g. 'Effort Variance' needs: Actual Effort, Remaining Effort, Planned Effort.
    """
    __tablename__ = "kpi_measure_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_metric_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kpi_plan_metrics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entered_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    measure_name: Mapped[str] = mapped_column(String(300), nullable=False)
    actual_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    uom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(200), nullable=True)
    frequency_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    from_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    to_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    plan_metric: Mapped["KpiPlanMetric"] = relationship("KpiPlanMetric", foreign_keys=[plan_metric_id])
    entered_by: Mapped["User | None"] = relationship("User", foreign_keys=[entered_by_user_id])

    def __repr__(self) -> str:
        return f"<KpiMeasureEntry {self.measure_name}={self.actual_value}>"


class KpiMeasurement(Base, TimestampMixin):
    """
    Sheet 3 — Computed KPI Tracker row.
    actual_value is COMPUTED from component KpiMeasureEntry rows.
    Stores up to 4 measure name/value pairs for display in the tracker.
    """
    __tablename__ = "kpi_measurements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_metric_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kpi_plan_metrics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entered_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Period
    frequency: Mapped[str | None] = mapped_column(String(200), nullable=True)
    frequency_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    from_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    to_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Computed KPI value
    actual_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)

    # Thresholds (copied from plan metric at time of entry)
    target_operator: Mapped[str | None] = mapped_column(String(10), nullable=True)
    target: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)
    lsl: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)
    usl: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)

    # Component measures stored for display (Sheet 3 Measure1..4 columns)
    measure1_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    measure1_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    measure2_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    measure2_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    measure3_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    measure3_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    measure4_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    measure4_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)

    # Submission info
    submitted_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    submitted_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Analysis (Sheet 3 columns)
    analysis_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_taken: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsibility: Mapped[str | None] = mapped_column(String(200), nullable=True)
    action_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Computed RAG
    rag_status: Mapped[str | None] = mapped_column(String(10), nullable=True)

    plan_metric: Mapped["KpiPlanMetric"] = relationship("KpiPlanMetric", back_populates="measurements")
    entered_by: Mapped["User | None"] = relationship("User", foreign_keys=[entered_by_user_id])

    def __repr__(self) -> str:
        return f"<KpiMeasurement {self.frequency_name} actual={self.actual_value} rag={self.rag_status}>"
