"""Health score persistence."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.health_score import HealthScore


class HealthScoreRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def upsert(
        self,
        *,
        submission_id: uuid.UUID,
        overall_score: Decimal,
        rag_status: str,
        explanation: str | None,
    ) -> HealthScore:
        stmt = select(HealthScore).where(HealthScore.submission_id == submission_id)
        existing = self._session.execute(stmt).scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if existing:
            existing.overall_score = overall_score
            existing.rag_status = rag_status
            existing.explanation = explanation
            existing.created_at = now
            self._session.flush()
            return existing
        row = HealthScore(
            submission_id=submission_id,
            overall_score=overall_score,
            rag_status=rag_status,
            explanation=explanation,
            created_at=now,
        )
        self._session.add(row)
        self._session.flush()
        return row

    def get_by_submission(self, submission_id: uuid.UUID) -> HealthScore | None:
        stmt = select(HealthScore).where(HealthScore.submission_id == submission_id)
        return self._session.execute(stmt).scalar_one_or_none()
