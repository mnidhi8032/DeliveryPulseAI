"""Business unit ORM model."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.user import User


class BusinessUnit(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "business_units"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    delivery_head_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    # New: BU Head user (replaces delivery_head concept)
    bu_head_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )

    accounts: Mapped[list["Account"]] = relationship(
        "Account",
        back_populates="business_unit",
    )
    delivery_head: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[delivery_head_user_id],
    )
    bu_head: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[bu_head_user_id],
    )

    def __repr__(self) -> str:
        return f"<BusinessUnit id={self.id} code={self.code!r}>"
