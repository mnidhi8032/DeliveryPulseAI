"""Append-only submission lifecycle audit persistence."""

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.submission_lifecycle_audit import SubmissionLifecycleAudit


class SubmissionLifecycleAuditRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def record(
        self,
        *,
        submission_id: uuid.UUID,
        event_type: str,
        actor_user_id: uuid.UUID,
        detail: str | None,
    ) -> SubmissionLifecycleAudit:
        row = SubmissionLifecycleAudit(
            id=uuid.uuid4(),
            submission_id=submission_id,
            event_type=event_type,
            actor_user_id=actor_user_id,
            detail=detail,
            created_at=datetime.now(timezone.utc),
        )
        self._session.add(row)
        self._session.flush()
        return row
