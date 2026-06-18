"""GovernancePeriod data access."""

import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.governance_period import GovernancePeriod


class GovernancePeriodRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, **kwargs) -> GovernancePeriod:
        period = GovernancePeriod(**kwargs)
        self._session.add(period)
        self._session.flush()
        return period

    def get_by_id(self, period_id: uuid.UUID) -> GovernancePeriod | None:
        stmt = (
            select(GovernancePeriod)
            .where(GovernancePeriod.id == period_id)
            .where(GovernancePeriod.deleted_at.is_(None))
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def list_all(self, *, active_only: bool = True) -> list[GovernancePeriod]:
        stmt = select(GovernancePeriod).where(GovernancePeriod.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(GovernancePeriod.is_active.is_(True))
        stmt = stmt.order_by(GovernancePeriod.period_start.desc())
        return list(self._session.execute(stmt).scalars().all())

