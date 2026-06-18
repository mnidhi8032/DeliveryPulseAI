"""Computed dimension score per submission."""

import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class DimensionScore(Base, TimestampMixin):
    __tablename__ = "dimension_scores"
    __table_args__ = (
        UniqueConstraint(
            "submission_id",
            "dimension_name",
            name="uq_dimension_scores_submission_dimension",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("submissions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    dimension_name: Mapped[str] = mapped_column(String(50), nullable=False)
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    rag_status: Mapped[str] = mapped_column(String(10), nullable=False)
    # V2: governance status (GREEN / AMBER / RED / CRITICAL)
    governance_status: Mapped[str | None] = mapped_column(String(10), nullable=True)

    submission: Mapped["Submission"] = relationship(
        "Submission",
        back_populates="dimension_scores",
        foreign_keys=[submission_id],
    )

    def __repr__(self) -> str:
        return f"<DimensionScore {self.dimension_name} score={self.score}>"
