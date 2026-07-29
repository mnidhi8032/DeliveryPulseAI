"""EngagementModelPreset model — evidence-based mandatory metric lists per engagement combo."""

import uuid
from datetime import datetime

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EngagementModelPreset(Base):
    """
    Stores an exact, evidence-based mandatory metric list for a specific
    (project_type, delivery_model) combination.

    Each row represents one metric name belonging to a preset.
    project_service.create_with_plan checks this table first; if a preset exists
    for the incoming (project_type, delivery_process_model) pair the metric list
    is taken from here (exact name match against qpm_catalog_metrics) instead of
    the broad ILIKE tag fallback.
    """
    __tablename__ = "engagement_model_presets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    project_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    delivery_model: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(200), nullable=False)
    source_reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<EngagementModelPreset "
            f"project_type={self.project_type!r} "
            f"delivery_model={self.delivery_model!r} "
            f"metric_name={self.metric_name!r}>"
        )
