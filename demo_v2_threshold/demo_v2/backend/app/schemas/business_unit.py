"""Business unit API schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BusinessUnitCreateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    delivery_head_user_id: UUID | None = None
    is_active: bool = True


class BusinessUnitUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    delivery_head_user_id: UUID | None = None
    bu_head_user_id: UUID | None = None
    is_active: bool | None = None


class BusinessUnitResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: str | None
    delivery_head_user_id: UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
