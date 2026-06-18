"""Overall health score per submission."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class HealthScore(Base):
    __tablename__ = "health_scores"
    __table_args__ = (UniqueConstraint("submission_id", name="uq_health_scores_submission"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("submissions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    overall_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    rag_status: Mapped[str] = mapped_column(String(10), nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    submission: Mapped["Submission"] = relationship(
        "Submission",
        back_populates="health_score",
        foreign_keys=[submission_id],
        uselist=False,
    )

    def __repr__(self) -> str:
        return f"<HealthScore submission_id={self.submission_id} overall={self.overall_score}>"
