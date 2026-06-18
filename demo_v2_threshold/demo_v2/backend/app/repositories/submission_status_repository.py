"""SubmissionStatus data access."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.submission_status import SubmissionStatus


class SubmissionStatusRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_code(self, code: str) -> SubmissionStatus | None:
        stmt = select(SubmissionStatus).where(SubmissionStatus.code == code)
        return self._session.execute(stmt).scalar_one_or_none()

    def get_by_id(self, status_id: int) -> SubmissionStatus | None:
        return self._session.get(SubmissionStatus, status_id)

    def list_all(self) -> list[SubmissionStatus]:
        stmt = select(SubmissionStatus).order_by(SubmissionStatus.id)
        return list(self._session.execute(stmt).scalars().all())

    def create(self, **kwargs) -> SubmissionStatus:
        status = SubmissionStatus(**kwargs)
        self._session.add(status)
        self._session.flush()
        return status

