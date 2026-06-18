"""AuditEvent API schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID
from pydantic import BaseModel, model_validator


class AuditEventResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    event_type: str
    performed_by_user_id: UUID
    performed_by_name: str | None = None
    old_value: dict[str, Any] | None = None
    new_value: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def resolve_performer_name(cls, data: Any) -> Any:
        if hasattr(data, "performer") and data.performer:
            # For ORM object, dynamically set the attribute so Pydantic can read it
            data.performed_by_name = data.performer.full_name
        elif isinstance(data, dict):
            performer = data.get("performer")
            if performer:
                data["performed_by_name"] = getattr(performer, "full_name", None) or performer.get("full_name")
        return data
