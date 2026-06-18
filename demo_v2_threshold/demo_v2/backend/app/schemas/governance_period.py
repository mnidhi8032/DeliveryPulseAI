"""Governance period API schemas."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class GovernancePeriodCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    period_type: str = Field(min_length=1, max_length=20)  # WEEKLY / MONTHLY
    period_start: date
    period_end: date
    is_active: bool = True


class GovernancePeriodResponse(BaseModel):
    id: UUID
    name: str
    period_type: str
    period_start: date
    period_end: date
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

