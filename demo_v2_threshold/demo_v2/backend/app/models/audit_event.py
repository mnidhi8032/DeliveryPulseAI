"""AuditEvent ORM model for auditing portfolio actions and status modifications."""

import uuid
from datetime import datetime
from typing import Any, TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., SUBMISSION, PROJECT
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)   # e.g., DRAFT_CREATED, METRICS_UPDATED, SUBMITTED
    performed_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    old_value: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    performer: Mapped["User"] = relationship(
        "User",
        foreign_keys=[performed_by_user_id],
    )

    def __init__(self, **kwargs: Any) -> None:
        if "old_value" in kwargs and kwargs["old_value"] is not None:
            kwargs["old_value"] = self._sanitize(kwargs["old_value"])
        if "new_value" in kwargs and kwargs["new_value"] is not None:
            kwargs["new_value"] = self._sanitize(kwargs["new_value"])
        super().__init__(**kwargs)

    def _sanitize(self, val: Any) -> Any:
        import decimal
        import uuid
        if isinstance(val, dict):
            return {k: self._sanitize(v) for k, v in val.items()}
        elif isinstance(val, list):
            return [self._sanitize(v) for v in val]
        elif isinstance(val, decimal.Decimal):
            if val % 1 == 0:
                return int(val)
            return float(val)
        elif isinstance(val, uuid.UUID):
            return str(val)
        return val

    def __repr__(self) -> str:
        return f"<AuditEvent id={self.id} entity_type={self.entity_type} event_type={self.event_type} performer={self.performed_by_user_id}>"
