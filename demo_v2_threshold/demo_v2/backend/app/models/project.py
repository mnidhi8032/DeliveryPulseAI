"""Project ORM model."""

import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.project_phase import ProjectPhase
    from app.models.submission import Submission
    from app.models.user import User


class Project(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    project_code: Mapped[str] = mapped_column(String(50), nullable=False)
    project_name: Mapped[str] = mapped_column(String(200), nullable=False)
    project_manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    delivery_head_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")

    # BRD §1: Project attributes for KPI auto-suggestion
    project_type: Mapped[str | None] = mapped_column(String(50), nullable=True)       # AGILE, WATERFALL, HYBRID
    delivery_model: Mapped[str | None] = mapped_column(String(50), nullable=True)     # SCRUM, KANBAN, SAFE, etc.
    engagement_model: Mapped[str | None] = mapped_column(String(50), nullable=True)   # FIXED_PRICE, T&M, etc.
    work_size_unit: Mapped[str | None] = mapped_column(String(50), nullable=True)     # STORY_POINTS, FUNCTION_POINTS, LOC

    # BRD §5.4.1.7: PM perception RAG (separate from computed RAG)
    pm_perception_rag: Mapped[str | None] = mapped_column(String(10), nullable=True)  # GREEN, AMBER, RED
    pm_rag_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    account: Mapped["Account"] = relationship("Account", back_populates="projects")
    project_manager: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[project_manager_id],
        back_populates="managed_projects",
    )
    delivery_head: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[delivery_head_user_id],
    )
    submissions: Mapped[list["Submission"]] = relationship(
        "Submission",
        back_populates="project",
        foreign_keys="Submission.project_id",
    )
    phases: Mapped[list["ProjectPhase"]] = relationship(
        "ProjectPhase",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Project id={self.id} project_code={self.project_code!r}>"
