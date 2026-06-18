"""QPM Catalog Metric — full 83-metric catalog from the QPM Plan Excel."""

import uuid
from sqlalchemy import Boolean, String, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class QPMCatalogMetric(Base, TimestampMixin):
    __tablename__ = "qpm_catalog_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Classification
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    objective_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    org_goal: Mapped[str | None] = mapped_column(String(300), nullable=True)
    higher_objective: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Formula & measurement
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    uom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    metrics_type: Mapped[str | None] = mapped_column(String(30), nullable=True)   # Result / Enabler / Insight
    intent: Mapped[str | None] = mapped_column(String(50), nullable=True)          # Higher/Lower/Nominal/Within

    # Applicability
    project_type: Mapped[str | None] = mapped_column(Text, nullable=True)          # comma-separated
    delivery_model: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_category: Mapped[str | None] = mapped_column(Text, nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Compliance: M=Mandatory, O=Optional, C=Conditional, R=Recommended
    compliance: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Default thresholds from catalog
    default_target: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    default_lsl: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    default_usl: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    kpi_plan_metrics: Mapped[list["KpiPlanMetric"]] = relationship(
        "KpiPlanMetric", back_populates="catalog_metric"
    )

    def __repr__(self) -> str:
        return f"<QPMCatalogMetric {self.category}/{self.name!r}>"
