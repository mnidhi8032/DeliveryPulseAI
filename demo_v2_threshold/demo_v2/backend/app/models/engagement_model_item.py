"""EngagementModelItem — database-driven registry for engagement model dropdowns.

Replaces the hardcoded frontend arrays (PROJECT_TYPES, DELIVERY_MODELS,
PROJECT_CATEGORIES, WORK_SIZE_UNITS, METRIC_CATEGORIES) with rows in this
table so DE / Platform Admin can add, edit, and deactivate values without
code changes.

item_type values:
  PROJECT_TYPE     — e.g. "Fresh Development", "Testing"
  DELIVERY_MODEL   — e.g. "Agile-Scrum", "Waterfall"
  PROJECT_CATEGORY — e.g. "Fixed Price", "Time & Material"
  WORK_SIZE_UNIT   — e.g. "Story Point-SP", "Function Point-FP"
  DIMENSION        — metric category, e.g. "Efficiency", "Internal Quality"
                     DIMENSION rows also carry min_mandatory_count (Spec 18.3)
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class EngagementModelItem(Base):
    __tablename__ = "engagement_model_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    item_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    value: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # DIMENSION rows only — minimum metrics required per category at plan finalization
    min_mandatory_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)

    # Relationships
    created_by: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[created_by_user_id],
    )
    metric_mappings: Mapped[list["EngagementModelMetricMapping"]] = relationship(
        "EngagementModelMetricMapping",
        back_populates="engagement_item",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<EngagementModelItem {self.item_type}:{self.value!r}>"
