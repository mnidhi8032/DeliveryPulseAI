"""Excel import API schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ExcelImportRowPreview(BaseModel):
    id: UUID
    metric_code: str
    raw_value: str | None
    parsed_value: Decimal | None
    validation_errors: list[str]
    row_number: int


class ExcelImportBatchResponse(BaseModel):
    id: UUID
    filename: str
    status: str
    submission_id: UUID | None
    uploaded_at: datetime
    validation_summary: dict | None
    rows: list[ExcelImportRowPreview]


class ExcelApplyRowEdit(BaseModel):
    metric_code: str
    value: Decimal | float | int | str


class ExcelApplyRequest(BaseModel):
    submission_id: UUID
    rows: list[ExcelApplyRowEdit] | None = Field(
        default=None,
        description="PM-edited values; omit to use parsed values from batch",
    )
