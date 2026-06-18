"""Authentication request/response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role_code: str

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    """Decoded JWT access token claims."""

    sub: str
    token_type: str = Field(validation_alias="type")
    exp: int | datetime

    model_config = {"populate_by_name": True}
