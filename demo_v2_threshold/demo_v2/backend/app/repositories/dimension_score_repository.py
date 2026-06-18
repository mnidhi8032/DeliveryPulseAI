"""Dimension score persistence."""

import uuid
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.dimension_score import DimensionScore


class DimensionScoreRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def replace_for_submission(
        self,
        submission_id: uuid.UUID,
        scores: list[tuple[str, Decimal, Decimal, str]],
    ) -> list[DimensionScore]:
        self._session.execute(delete(DimensionScore).where(DimensionScore.submission_id == submission_id))
        rows: list[DimensionScore] = []
        for dimension_name, score, weight, rag_status in scores:
            row = DimensionScore(
                submission_id=submission_id,
                dimension_name=dimension_name,
                score=score,
                weight=weight,
                rag_status=rag_status,
            )
            self._session.add(row)
            rows.append(row)
        self._session.flush()
        return rows

    def list_by_submission(self, submission_id: uuid.UUID) -> list[DimensionScore]:
        stmt = (
            select(DimensionScore)
            .where(DimensionScore.submission_id == submission_id)
            .order_by(DimensionScore.dimension_name)
        )
        return list(self._session.execute(stmt).scalars().all())
