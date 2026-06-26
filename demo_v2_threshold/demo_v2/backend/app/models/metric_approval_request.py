"""Metric approval request — PM requests a custom metric, DE approves/rejects."""
import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class MetricApprovalRequest(Base, TimestampMixin):
    """
    When a PM wants to add a custom metric to their KPI plan,
    they submit a request. Delivery Excellence approves or rejects it.
    Status: PENDING | APPROVED | REJECTED
    """
    __tablename__ = "metric_approval_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Which KPI plan this metric should be added to on approval
    kpi_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kpi_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Proposed metric details
    metric_name: Mapped[str] = mapped_column(String(300), nullable=False)
    metric_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    uom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    intent: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(200), nullable=True)
    priority: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # PM's justification
    justification: Mapped[str] = mapped_column(Text, nullable=False)

    # Workflow
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")  # PENDING | APPROVED | REJECTED
    review_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    kpi_plan: Mapped["KpiPlan"] = relationship("KpiPlan", foreign_keys=[kpi_plan_id])
    requested_by: Mapped["User"] = relationship("User", foreign_keys=[requested_by_user_id])
    reviewed_by: Mapped["User | None"] = relationship("User", foreign_keys=[reviewed_by_user_id])

    def __repr__(self) -> str:
        return f"<MetricApprovalRequest {self.metric_name!r} status={self.status}>"
