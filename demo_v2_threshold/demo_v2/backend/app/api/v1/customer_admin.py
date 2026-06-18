"""Customer Admin portfolio API routes (Phase 9, read-only)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.core.constants import RoleCode
from app.models.user import User
from app.schemas.customer_admin_portfolio import (
    BusinessUnitDetailResponse,
    BusinessUnitHealthRow,
    ImpactMatrixRow,
    PortfolioSummaryResponse,
    SubmissionAgingResponse,
    BUTrendSummaryResponse,
)
from app.services.customer_admin_portfolio_service import CustomerAdminPortfolioService

router = APIRouter(prefix="/customer-admin", tags=["customer-admin"])


@router.get("/portfolio-summary", response_model=PortfolioSummaryResponse)
def portfolio_summary(
    current_user: Annotated[User, Depends(require_roles(RoleCode.CEO, RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> PortfolioSummaryResponse:
    return CustomerAdminPortfolioService(db).portfolio_summary(current_user)


@router.get("/business-unit-health", response_model=list[BusinessUnitHealthRow])
def business_unit_health(
    current_user: Annotated[User, Depends(require_roles(RoleCode.CEO, RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> list[BusinessUnitHealthRow]:
    return CustomerAdminPortfolioService(db).business_unit_health(current_user)


@router.get("/aging", response_model=SubmissionAgingResponse)
def submission_aging(
    current_user: Annotated[User, Depends(require_roles(RoleCode.CEO, RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionAgingResponse:
    return CustomerAdminPortfolioService(db).submission_aging(current_user)


@router.get("/impact-matrix", response_model=list[ImpactMatrixRow])
def impact_matrix(
    current_user: Annotated[User, Depends(require_roles(RoleCode.CEO, RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> list[ImpactMatrixRow]:
    return CustomerAdminPortfolioService(db).impact_matrix(current_user)


@router.get("/business-units/{bu_id}", response_model=BusinessUnitDetailResponse)
def business_unit_detail(
    bu_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.CEO, RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> BusinessUnitDetailResponse:
    return CustomerAdminPortfolioService(db).business_unit_detail(current_user, bu_id)


@router.get("/business-units/{bu_id}/trends", response_model=BUTrendSummaryResponse)
def business_unit_trend_summary(
    bu_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.CEO, RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> BUTrendSummaryResponse:
    return CustomerAdminPortfolioService(db).trend_summary(current_user, bu_id)


# --- Phase 15 setup workspace routes ---
from app.schemas.user_lite import UserLiteResponse
from app.repositories.user_repository import UserRepository


@router.get("/users", response_model=list[UserLiteResponse])
def list_setup_users(
    current_user: Annotated[User, Depends(require_roles(RoleCode.CEO, RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> list[UserLiteResponse]:
    from app.core.constants import RoleCode
    users = UserRepository(db).list_all_active_by_roles([RoleCode.PM, RoleCode.BU_HEAD])
    return [
        UserLiteResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role_code=u.role.code,
        )
        for u in users
    ]

