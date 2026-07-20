"""MetricRecommendation model — Spec 14: admin-editable recommendation text per breach type."""

import uuid

from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class MetricRecommendation(Base, TimestampMixin):
    """
    Stores the recommended corrective action for a specific metric + breach combination.

    Platform Admin can create / edit / delete these via the Settings UI.
    The /explain API fetches the matching row at query time.
    """
    __tablename__ = "metric_recommendations"
    __table_args__ = (
        UniqueConstraint("metric_name", "breach_type", name="uq_metric_breach"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    # Matches QPMCatalogMetric.name — string comparison, not FK (keeps it flexible)
    metric_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)

    # One of the breach_type constants defined in rag_explainer.py
    breach_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # The human-readable advice text — edited by Platform Admin
    recommendation_text: Mapped[str] = mapped_column(Text, nullable=False)

    def __repr__(self) -> str:
        return f"<MetricRecommendation {self.metric_name!r} / {self.breach_type!r}>"
