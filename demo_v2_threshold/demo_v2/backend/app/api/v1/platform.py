"""Platform Admin governance API routes (Phase 10, read-only)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import require_roles
from app.core.constants import RoleCode
from app.models.user import User
from app.schemas.platform_governance import (
    PlatformApprovalLatencyRow,
    PlatformBUAnalysisResponse,
    PlatformOverviewResponse,
    PlatformRiskSummaryRow,
    PlatformTemplateAdoptionRow,
)
from app.services.platform_governance_service import PlatformGovernanceService

router = APIRouter(prefix="/platform", tags=["platform"])


@router.get("/overview", response_model=PlatformOverviewResponse)
def platform_overview(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> PlatformOverviewResponse:
    return PlatformGovernanceService(db).overview(current_user)


@router.get("/risk-summary", response_model=list[PlatformRiskSummaryRow])
def platform_risk_summary(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> list[PlatformRiskSummaryRow]:
    return PlatformGovernanceService(db).risk_summary(current_user)


@router.get("/approval-latency", response_model=list[PlatformApprovalLatencyRow])
def platform_approval_latency(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> list[PlatformApprovalLatencyRow]:
    return PlatformGovernanceService(db).approval_latency(current_user)


@router.get("/template-adoption", response_model=list[PlatformTemplateAdoptionRow])
def platform_template_adoption(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> list[PlatformTemplateAdoptionRow]:
    return PlatformGovernanceService(db).template_adoption(current_user)


@router.get("/business-units/{bu_id}", response_model=PlatformBUAnalysisResponse)
def platform_bu_analysis(
    bu_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> PlatformBUAnalysisResponse:
    return PlatformGovernanceService(db).bu_analysis(current_user, bu_id)


# --- Phase 15 settings and metrics catalog routes ---
from app.schemas.system_configuration import SystemConfigurationResponse, SystemConfigurationUpdateRequest
from app.schemas.metric_definition import MetricDefinitionResponse, MetricDefinitionUpdateRequest
from app.schemas.audit_event import AuditEventResponse
from app.services.system_configuration_service import SystemConfigurationService


@router.get("/settings", response_model=SystemConfigurationResponse)
def get_platform_settings(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> SystemConfigurationResponse:
    return SystemConfigurationService(db).get_settings(current_user)


@router.put("/settings", response_model=SystemConfigurationResponse)
def update_platform_settings(
    body: SystemConfigurationUpdateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> SystemConfigurationResponse:
    return SystemConfigurationService(db).update_settings(current_user, body)


@router.get("/settings/metrics", response_model=list[MetricDefinitionResponse])
def get_platform_metrics(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> list[MetricDefinitionResponse]:
    return SystemConfigurationService(db).list_metrics(current_user)


@router.put("/settings/metrics/{metric_id}", response_model=MetricDefinitionResponse)
def update_platform_metric(
    metric_id: UUID,
    body: MetricDefinitionUpdateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> MetricDefinitionResponse:
    return SystemConfigurationService(db).update_metric(current_user, metric_id, body)


@router.get("/settings/audit", response_model=list[AuditEventResponse])
def get_global_settings_audit(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
    page: int = 1,
    limit: int = 50,
) -> list[AuditEventResponse]:
    from sqlalchemy import select
    from sqlalchemy.orm import joinedload
    from app.models.audit_event import AuditEvent
    stmt = (
        select(AuditEvent)
        .options(joinedload(AuditEvent.performer))
        .order_by(AuditEvent.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    events = list(db.execute(stmt).scalars().all())
    return events


# --- User management CRUD routes ---
from app.schemas.user_management import (
    UserManagementCreateRequest,
    UserManagementResponse,
    UserManagementUpdateRequest,
)
from app.services.user_management_service import UserManagementService


@router.get("/users", response_model=list[UserManagementResponse])
def list_users(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> list[UserManagementResponse]:
    return UserManagementService(db).list_users()


@router.post("/users", response_model=UserManagementResponse, status_code=201)
def create_user(
    body: UserManagementCreateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> UserManagementResponse:
    return UserManagementService(db).create_user(body)


@router.patch("/users/{user_id}", response_model=UserManagementResponse)
def update_user(
    user_id: UUID,
    body: UserManagementUpdateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> UserManagementResponse:
    return UserManagementService(db).update_user(user_id, body)


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    UserManagementService(db).delete_user(user_id)

