"""Metric definition data access."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.metric_definition import MetricDefinition


class MetricDefinitionRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_code(self, code: str) -> MetricDefinition | None:
        stmt = select(MetricDefinition).where(MetricDefinition.code == code).where(MetricDefinition.is_active.is_(True))
        return self._session.execute(stmt).scalar_one_or_none()

    def get_by_id(self, definition_id: uuid.UUID) -> MetricDefinition | None:
        return self._session.get(MetricDefinition, definition_id)

    def list_active(self) -> list[MetricDefinition]:
        stmt = select(MetricDefinition).where(MetricDefinition.is_active.is_(True)).order_by(MetricDefinition.dimension, MetricDefinition.code)
        return list(self._session.execute(stmt).scalars().all())

    def list_by_codes(self, codes: list[str]) -> list[MetricDefinition]:
        if not codes:
            return []
        stmt = select(MetricDefinition).where(MetricDefinition.code.in_(codes)).where(MetricDefinition.is_active.is_(True))
        return list(self._session.execute(stmt).scalars().all())

    def list_all_with_inactive(self) -> list[MetricDefinition]:
        stmt = select(MetricDefinition).order_by(MetricDefinition.dimension, MetricDefinition.code)
        return list(self._session.execute(stmt).scalars().all())

    def update(self, definition: MetricDefinition, **kwargs) -> MetricDefinition:
        for key, value in kwargs.items():
            if value is not None:
                setattr(definition, key, value)
        self._session.flush()
        return definition

