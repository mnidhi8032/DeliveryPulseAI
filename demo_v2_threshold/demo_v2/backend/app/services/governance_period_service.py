"""Governance period service."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.constants import RoleCode
from app.models.user import User
from app.repositories.governance_period_repository import GovernancePeriodRepository
from app.schemas.governance_period import GovernancePeriodCreateRequest, GovernancePeriodResponse
from app.services.access_control_service import AccessControlService


class GovernancePeriodService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._repo = GovernancePeriodRepository(session)
        self._access = AccessControlService(session)

    def create(self, user: User, body: GovernancePeriodCreateRequest) -> GovernancePeriodResponse:
        # Governance framework belongs to platform governance team.
        if user.role.code != RoleCode.PLATFORM_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Platform Admin role required",
            )
        if body.period_end < body.period_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="period_end must be >= period_start",
            )
        period = self._repo.create(
            name=body.name.strip(),
            period_type=body.period_type.strip().upper(),
            period_start=body.period_start,
            period_end=body.period_end,
            is_active=body.is_active,
        )
        self._session.commit()
        return GovernancePeriodResponse.model_validate(period)

    def list(self, user: User) -> list[GovernancePeriodResponse]:
        # Any authenticated user can view periods.
        periods = self._repo.list_all(active_only=False)
        return [GovernancePeriodResponse.model_validate(p) for p in periods]

