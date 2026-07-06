"""Account API schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AccountCreateRequest(BaseModel):
    business_unit_id: UUID
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    is_active: bool = True


class AccountUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    is_active: bool | None = None
    delivery_manager_user_id: UUID | None = None


class AccountResponse(BaseModel):
    id: UUID
    business_unit_id: UUID
    code: str
    name: str
    is_active: bool
    delivery_manager_user_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
