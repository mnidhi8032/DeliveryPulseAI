"""Schemas for Platform Admin User Management."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class UserManagementCreateRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=6, max_length=100)
    role_code: str = Field(min_length=1, max_length=50)
    is_active: bool = True


class UserManagementUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    email: EmailStr | None = None
    role_code: str | None = None
    is_active: bool | None = None


class UserManagementResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role_code: str
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
