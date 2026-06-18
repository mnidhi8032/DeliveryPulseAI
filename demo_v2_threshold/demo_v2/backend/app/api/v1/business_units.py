"""Business unit API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.core.constants import RoleCode
from app.models.user import User
from app.schemas.business_unit import (
    BusinessUnitCreateRequest,
    BusinessUnitResponse,
    BusinessUnitUpdateRequest,
)
from app.services.business_unit_service import BusinessUnitService

router = APIRouter(prefix="/business-units", tags=["business-units"])


@router.get("", response_model=list[BusinessUnitResponse])
def list_business_units(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[BusinessUnitResponse]:
    return BusinessUnitService(db).list(current_user)


@router.post("", response_model=BusinessUnitResponse, status_code=201)
def create_business_unit(
    body: BusinessUnitCreateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> BusinessUnitResponse:
    return BusinessUnitService(db).create(current_user, body)


@router.get("/{bu_id}", response_model=BusinessUnitResponse)
def get_business_unit(
    bu_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BusinessUnitResponse:
    return BusinessUnitService(db).get_by_id(current_user, bu_id)


@router.patch("/{bu_id}", response_model=BusinessUnitResponse)
def update_business_unit(
    bu_id: UUID,
    body: BusinessUnitUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BusinessUnitResponse:
    return BusinessUnitService(db).update(current_user, bu_id, body)
