"""GovernanceReview model — BRD §5.5.2: Governance reviews at BU/Account/Project level."""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.business_unit import BusinessUnit
    from app.models.account import Account
    from app.models.project import Project
    from app.models.user import User


class GovernanceReview(Base, TimestampMixin):
    """
    BRD §5.5.2: Governance review conducted at BU, Account, or Project level.
    Captures outcome, action plans, and attendees for the review meeting.
    """
    __tablename__ = "governance_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Review scope — at least one of these must be set
    review_level: Mapped[str] = mapped_column(String(20), nullable=False)  # BU, ACCOUNT, PROJECT
    business_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("business_units.id", ondelete="SET NULL"),
        nullable=True,
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Review details
    review_date: Mapped[date] = mapped_column(Date, nullable=False)
    review_title: Mapped[str] = mapped_column(String(300), nullable=False)
    outcome_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Reviewer
    conducted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Status: SCHEDULED, COMPLETED, CANCELLED
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="SCHEDULED")

    # Relationships
    business_unit: Mapped["BusinessUnit | None"] = relationship("BusinessUnit", foreign_keys=[business_unit_id])
    account: Mapped["Account | None"] = relationship("Account", foreign_keys=[account_id])
    project: Mapped["Project | None"] = relationship("Project", foreign_keys=[project_id])
    conducted_by: Mapped["User | None"] = relationship("User", foreign_keys=[conducted_by_user_id])

    def __repr__(self) -> str:
        return f"<GovernanceReview level={self.review_level} date={self.review_date} status={self.status}>"
