"""Business unit data access."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.business_unit import BusinessUnit


class BusinessUnitRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, **kwargs) -> BusinessUnit:
        bu = BusinessUnit(**kwargs)
        self._session.add(bu)
        self._session.flush()
        return bu

    def get_by_id(self, bu_id: uuid.UUID) -> BusinessUnit | None:
        stmt = (
            select(BusinessUnit)
            .where(BusinessUnit.id == bu_id)
            .where(BusinessUnit.deleted_at.is_(None))
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def get_by_code(self, code: str) -> BusinessUnit | None:
        stmt = (
            select(BusinessUnit)
            .where(BusinessUnit.code == code)
            .where(BusinessUnit.deleted_at.is_(None))
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def list_all(self) -> list[BusinessUnit]:
        stmt = (
            select(BusinessUnit)
            .where(BusinessUnit.deleted_at.is_(None))
            .order_by(BusinessUnit.code)
        )
        return list(self._session.execute(stmt).scalars().all())

    def update(self, bu: BusinessUnit, **fields) -> BusinessUnit:
        for key, value in fields.items():
            if value is not None and hasattr(bu, key):
                setattr(bu, key, value)
        self._session.flush()
        return bu

    def soft_delete(self, bu: BusinessUnit) -> None:
        bu.deleted_at = datetime.now(timezone.utc)
        bu.is_active = False
        self._session.flush()
