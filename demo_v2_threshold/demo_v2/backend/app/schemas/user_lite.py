"""Lite user representation schema."""

from uuid import UUID
from pydantic import BaseModel, Field


class UserLiteResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role_code: str

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }
