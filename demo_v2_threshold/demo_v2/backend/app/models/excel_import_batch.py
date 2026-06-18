"""Excel import batch (staging until PM applies to DRAFT submission)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ExcelImportBatch(Base, TimestampMixin):
    __tablename__ = "excel_import_batches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    submission_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("submissions.id", ondelete="SET NULL"),
        nullable=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    validation_summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    uploader: Mapped["User"] = relationship("User", foreign_keys=[uploaded_by_user_id])
    submission: Mapped["Submission | None"] = relationship(
        "Submission",
        foreign_keys=[submission_id],
    )
    rows: Mapped[list["ExcelImportRow"]] = relationship(
        "ExcelImportRow",
        back_populates="batch",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<ExcelImportBatch id={self.id} status={self.status!r}>"
