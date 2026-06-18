"""User ORM model — authenticated principals."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.business_unit import BusinessUnit
    from app.models.role import Role
    from app.models.project import Project
    from app.models.submission import Submission


class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="users",
        foreign_keys=[role_id],
    )
    managed_projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="project_manager",
        foreign_keys="Project.project_manager_id",
    )
    created_submissions: Mapped[list["Submission"]] = relationship(
        "Submission",
        back_populates="creator",
        foreign_keys="Submission.created_by_user_id",
    )
    reviewed_submissions: Mapped[list["Submission"]] = relationship(
        "Submission",
        back_populates="reviewer",
        foreign_keys="Submission.reviewed_by_user_id",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"
