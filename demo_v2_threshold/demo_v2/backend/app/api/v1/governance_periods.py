"""Governance period API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.governance_period import GovernancePeriodCreateRequest, GovernancePeriodResponse
from app.services.governance_period_service import GovernancePeriodService

router = APIRouter(prefix="/governance-periods", tags=["governance-periods"])


@router.post("", response_model=GovernancePeriodResponse, status_code=201)
def create_governance_period(
    body: GovernancePeriodCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> GovernancePeriodResponse:
    return GovernancePeriodService(db).create(current_user, body)


@router.get("", response_model=list[GovernancePeriodResponse])
def list_governance_periods(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[GovernancePeriodResponse]:
    return GovernancePeriodService(db).list(current_user)

