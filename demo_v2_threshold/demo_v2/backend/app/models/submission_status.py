"""Submission status lookup model."""

from sqlalchemy import Boolean, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SubmissionStatus(Base, TimestampMixin):
    """
    Lookup for submission lifecycle.

    Codes (seeded):
      DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, REOPENED, LOCKED
    """

    __tablename__ = "submission_statuses"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    code: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    allows_editing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_terminal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    submissions: Mapped[list["Submission"]] = relationship(
        "Submission",
        back_populates="status",
        foreign_keys="Submission.status_id",
    )

    def __repr__(self) -> str:
        return f"<SubmissionStatus id={self.id} code={self.code!r}>"

