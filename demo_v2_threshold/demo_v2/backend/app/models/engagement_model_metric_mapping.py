"""EngagementModelMetricMapping — links catalog metrics to engagement model items.

Each row says: "this catalog metric belongs to this engagement model item,
and is_mandatory controls whether it auto-selects on project creation."
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class EngagementModelMetricMapping(Base):
    __tablename__ = "engagement_model_metric_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    engagement_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("engagement_model_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    catalog_metric_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("qpm_catalog_metrics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # When True, the metric auto-selects for projects with this engagement item
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)

    # Relationships
    engagement_item: Mapped["EngagementModelItem"] = relationship(  # type: ignore[name-defined]
        "EngagementModelItem", back_populates="metric_mappings",
    )
    catalog_metric: Mapped["QPMCatalogMetric"] = relationship(  # type: ignore[name-defined]
        "QPMCatalogMetric", foreign_keys=[catalog_metric_id],
    )

    def __repr__(self) -> str:
        return (
            f"<EngagementModelMetricMapping "
            f"item={self.engagement_item_id} "
            f"metric={self.catalog_metric_id} "
            f"mandatory={self.is_mandatory}>"
        )
