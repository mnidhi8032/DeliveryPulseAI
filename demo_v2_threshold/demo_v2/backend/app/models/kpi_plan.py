"""KPI Plan — per-project QPM plan (Sheet 1 replica) + Doc Info (Sheet 5)."""

import uuid
from datetime import date, datetime
from sqlalchemy import ForeignKey, String, UniqueConstraint, Boolean, Numeric, Text, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class KpiPlan(Base, TimestampMixin):
    __tablename__ = "kpi_plans"
    __table_args__ = (UniqueConstraint("project_id", name="uq_kpi_plans_project"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    project_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivery_process_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    project_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    work_size_unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_finalized: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # QPM submission workflow — PM submits KPI plan for DH review
    # Status: DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED
    qpm_status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")
    qpm_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    qpm_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    qpm_reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    qpm_review_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # PM perception RAG on the KPI plan itself
    pm_perception_rag: Mapped[str | None] = mapped_column(String(10), nullable=True)  # GREEN | AMBER | RED
    pm_rag_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship("Project")
    metrics: Mapped[list["KpiPlanMetric"]] = relationship(
        "KpiPlanMetric", back_populates="kpi_plan", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<KpiPlan project_id={self.project_id} status={self.qpm_status}>"


class KpiPlanMetric(Base, TimestampMixin):
    __tablename__ = "kpi_plan_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kpi_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kpi_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    catalog_metric_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qpm_catalog_metrics.id", ondelete="SET NULL"), nullable=True
    )
    metric_name: Mapped[str] = mapped_column(String(300), nullable=False)
    metric_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    uom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    intent: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(200), nullable=True)
    priority: Mapped[str | None] = mapped_column(String(20), nullable=True)
    target: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    lsl: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    usl: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tailoring_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reported_to_customer: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_source: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Stores the required measure names as JSON array string
    required_measures: Mapped[str | None] = mapped_column(Text, nullable=True)

    kpi_plan: Mapped["KpiPlan"] = relationship("KpiPlan", back_populates="metrics")
    catalog_metric: Mapped["QPMCatalogMetric | None"] = relationship("QPMCatalogMetric", back_populates="kpi_plan_metrics")
    measurements: Mapped[list["KpiMeasurement"]] = relationship(
        "KpiMeasurement", back_populates="plan_metric", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<KpiPlanMetric {self.metric_name!r}>"


class KpiDocInfo(Base, TimestampMixin):
    """Sheet 5 — Document Information."""
    __tablename__ = "kpi_doc_info"
    __table_args__ = (UniqueConstraint("project_id", name="uq_kpi_doc_info_project"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    project_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    project_id_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    document_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    issue_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pm_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    prepared_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    preparation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    review_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    template_version: Mapped[str | None] = mapped_column(String(20), nullable=True, default="3.1")

    version_history: Mapped[list["KpiDocVersionHistory"]] = relationship(
        "KpiDocVersionHistory", back_populates="doc_info", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<KpiDocInfo project_id={self.project_id}>"


class KpiDocVersionHistory(Base, TimestampMixin):
    __tablename__ = "kpi_doc_version_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doc_info_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kpi_doc_info.id", ondelete="CASCADE"), nullable=False, index=True
    )
    issue_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    prepared_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    doc_info: Mapped["KpiDocInfo"] = relationship("KpiDocInfo", back_populates="version_history")

