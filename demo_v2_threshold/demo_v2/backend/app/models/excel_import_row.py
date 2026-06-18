"""Parsed row from an Excel import batch (editable preview)."""

import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ExcelImportRow(Base):
    __tablename__ = "excel_import_rows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("excel_import_batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    metric_code: Mapped[str] = mapped_column(String(80), nullable=False)
    raw_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    parsed_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    validation_errors: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)

    batch: Mapped["ExcelImportBatch"] = relationship(
        "ExcelImportBatch",
        back_populates="rows",
        foreign_keys=[batch_id],
    )

    def __repr__(self) -> str:
        return f"<ExcelImportRow metric_code={self.metric_code!r} row={self.row_number}>"
