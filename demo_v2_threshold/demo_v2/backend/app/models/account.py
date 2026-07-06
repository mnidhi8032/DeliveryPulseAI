"""Account ORM model."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.business_unit import BusinessUnit
    from app.models.project import Project
    from app.models.user import User


class Account(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    business_unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("business_units.id", ondelete="RESTRICT"),
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # The Delivery Manager responsible for this account
    delivery_manager_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    business_unit: Mapped["BusinessUnit"] = relationship(
        "BusinessUnit",
        back_populates="accounts",
    )
    projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="account",
    )
    delivery_manager: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[delivery_manager_user_id],
    )

    def __repr__(self) -> str:
        return f"<Account id={self.id} code={self.code!r}>"
