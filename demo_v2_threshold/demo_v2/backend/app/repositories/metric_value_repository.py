"""Metric value data access."""

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.metric_value import MetricValue


class MetricValueRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def upsert(self, *, submission_id: uuid.UUID, metric_definition_id: uuid.UUID, value: Decimal) -> MetricValue:
        stmt = (
            select(MetricValue)
            .where(MetricValue.submission_id == submission_id)
            .where(MetricValue.metric_definition_id == metric_definition_id)
        )
        existing = self._session.execute(stmt).scalar_one_or_none()
        if existing:
            existing.value = value
            self._session.flush()
            return existing
        row = MetricValue(
            submission_id=submission_id,
            metric_definition_id=metric_definition_id,
            value=value,
        )
        self._session.add(row)
        self._session.flush()
        return row

    def list_by_submission(self, submission_id: uuid.UUID) -> list[MetricValue]:
        stmt = (
            select(MetricValue)
            .options(joinedload(MetricValue.metric_definition))
            .where(MetricValue.submission_id == submission_id)
            .order_by(MetricValue.metric_definition_id)
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def values_by_code(self, submission_id: uuid.UUID) -> dict[str, Decimal]:
        rows = self.list_by_submission(submission_id)
        return {r.metric_definition.code: r.value for r in rows}
