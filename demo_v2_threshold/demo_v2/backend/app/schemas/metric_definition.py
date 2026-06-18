"""Metric definition catalog schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class MetricDefinitionResponse(BaseModel):
    id: UUID
    code: str
    name: str
    dimension: str
    description: str | None
    data_type: str
    weight: Decimal
    validation_rules: dict | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MetricDefinitionUpdateRequest(BaseModel):
    weight: Decimal | None = None
    is_active: bool | None = None

