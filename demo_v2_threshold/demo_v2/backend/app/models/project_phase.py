"""ProjectPhase model — BRD §5.2.3: project phases (Sprint/Release/Milestone)."""

import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project


class ProjectPhase(Base, TimestampMixin):
    """
    Represents a phase within a project lifecycle.
    Examples: Sprint 1, Release 2, Design Milestone, etc.
    """
    __tablename__ = "project_phases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Phase type: SPRINT, RELEASE, MILESTONE, OTHER
    phase_type: Mapped[str] = mapped_column(String(50), nullable=False, default="SPRINT")
    phase_name: Mapped[str] = mapped_column(String(200), nullable=False)

    planned_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    planned_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Status: PLANNED, IN_PROGRESS, COMPLETED, ON_HOLD
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PLANNED")

    project: Mapped["Project"] = relationship("Project", back_populates="phases")

    def __repr__(self) -> str:
        return f"<ProjectPhase {self.phase_type}:{self.phase_name} status={self.status}>"
