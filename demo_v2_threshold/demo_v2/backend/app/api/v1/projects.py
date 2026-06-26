"""Project API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.core.constants import RoleCode
from app.models.user import User
from app.schemas.project import ProjectCreateRequest, ProjectResponse, ProjectUpdateRequest, ProjectCreateWithPlanRequest
from app.schemas.project_enriched import ProjectEnrichedResponse
from app.schemas.timeline import HealthHistoryEvent, SubmissionTimelineEvent
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectEnrichedResponse])
def list_projects(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ProjectEnrichedResponse]:
    return ProjectService(db).list(current_user)


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    body: ProjectCreateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    return ProjectService(db).create(current_user, body)


@router.post("/create-with-plan", status_code=201)
def create_project_with_plan(
    body: ProjectCreateWithPlanRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Create project + KPI plan + auto-add mandatory metrics in one shot."""
    return ProjectService(db).create_with_plan(current_user, body)



@router.get("/{project_id}", response_model=ProjectEnrichedResponse)
def get_project(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectEnrichedResponse:
    return ProjectService(db).get_by_id(current_user, project_id)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    body: ProjectUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    return ProjectService(db).update(current_user, project_id, body)


@router.get("/{project_id}/health-history", response_model=list[HealthHistoryEvent])
def get_health_history(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[HealthHistoryEvent]:
    from app.services.timeline_service import TimelineService
    return TimelineService(db).get_health_history(project_id, current_user)


@router.get("/{project_id}/submission-timeline", response_model=list[SubmissionTimelineEvent])
def get_submission_timeline(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[SubmissionTimelineEvent]:
    from app.services.timeline_service import TimelineService
    return TimelineService(db).get_submission_timeline(project_id, current_user)
