"""Audit Event API routes."""

from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.repositories.audit_event_repository import AuditEventRepository
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.audit_event import AuditEventResponse
from app.services.access_control_service import AccessControlService

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/entity/{entity_type}/{entity_id}", response_model=list[AuditEventResponse])
def get_audit_trail(
    entity_type: str,
    entity_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[AuditEventResponse]:
    """
    Retrieve full audit timeline for the specified entity type and ID.
    
    Platform Admins can see all audit logs. Other roles can only view it
    if they have view permissions to the underlying project/submission.
    """
    access = AccessControlService(db)
    normalized_type = entity_type.upper()

    if normalized_type not in ("SUBMISSION", "PROJECT"):
        # For any unknown type, require Platform Admin
        access.require_platform_admin(current_user)
    elif not access.is_platform_admin(current_user):
        # Enforce security for non-Platform Admins
        if normalized_type == "SUBMISSION":
            sub_repo = SubmissionRepository(db)
            submission = sub_repo.get_by_id(entity_id)
            if submission is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Submission not found",
                )
            access.require_can_view_project(current_user, submission.project)
        elif normalized_type == "PROJECT":
            proj_repo = ProjectRepository(db)
            project = proj_repo.get_by_id(entity_id)
            if project is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found",
                )
            access.require_can_view_project(current_user, project)

    repo = AuditEventRepository(db)
    events = repo.list_by_entity(normalized_type, entity_id)
    return events
