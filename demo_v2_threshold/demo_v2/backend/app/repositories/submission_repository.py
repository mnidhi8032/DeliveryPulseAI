"""Submission data access."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.submission import Submission


class SubmissionRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, **kwargs) -> Submission:
        submission = Submission(**kwargs)
        self._session.add(submission)
        self._session.flush()
        return submission

    def get_by_id(self, submission_id: uuid.UUID) -> Submission | None:
        stmt = (
            select(Submission)
            .options(
                joinedload(Submission.project),
                joinedload(Submission.governance_period),
                joinedload(Submission.status),
                joinedload(Submission.creator),
                joinedload(Submission.reviewer),
            )
            .where(Submission.id == submission_id)
            .where(Submission.deleted_at.is_(None))
        )
        return self._session.execute(stmt).unique().scalar_one_or_none()

    def list_by_project_ids(self, project_ids: list[uuid.UUID]) -> list[Submission]:
        if not project_ids:
            return []
        stmt = (
            select(Submission)
            .options(joinedload(Submission.status))
            .where(Submission.project_id.in_(project_ids))
            .where(Submission.deleted_at.is_(None))
            .order_by(Submission.created_at.desc())
        )
        return list(self._session.execute(stmt).scalars().all())

    def update(self, submission: Submission, **fields) -> Submission:
        for k, v in fields.items():
            if hasattr(submission, k):
                setattr(submission, k, v)
        self._session.flush()
        return submission

