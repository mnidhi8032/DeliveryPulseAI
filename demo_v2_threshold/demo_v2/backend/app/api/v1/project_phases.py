"""Project Phases API — BRD §5.2.3."""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.project_phase_service import ProjectPhaseService

router = APIRouter(prefix="/projects/{project_id}/phases", tags=["project-phases"])


class PhaseCreateRequest(BaseModel):
    phase_type: str = "SPRINT"   # SPRINT, RELEASE, MILESTONE, OTHER
    phase_name: str
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    status: str = "PLANNED"


class PhaseUpdateRequest(BaseModel):
    phase_type: str | None = None
    phase_name: str | None = None
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    status: str | None = None


class PhaseResponse(BaseModel):
    id: UUID
    project_id: UUID
    phase_type: str
    phase_name: str
    planned_start_date: date | None
    planned_end_date: date | None
    actual_start_date: date | None
    actual_end_date: date | None
    status: str

    model_config = {"from_attributes": True}


@router.get("", response_model=list[PhaseResponse])
def list_phases(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[PhaseResponse]:
    phases = ProjectPhaseService(db).list_phases(current_user, project_id)
    return [PhaseResponse.model_validate(p) for p in phases]


@router.post("", response_model=PhaseResponse, status_code=201)
def create_phase(
    project_id: UUID,
    body: PhaseCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PhaseResponse:
    phase = ProjectPhaseService(db).create_phase(
        user=current_user,
        project_id=project_id,
        phase_type=body.phase_type,
        phase_name=body.phase_name,
        planned_start_date=body.planned_start_date,
        planned_end_date=body.planned_end_date,
        actual_start_date=body.actual_start_date,
        actual_end_date=body.actual_end_date,
        phase_status=body.status,
    )
    return PhaseResponse.model_validate(phase)


@router.patch("/{phase_id}", response_model=PhaseResponse)
def update_phase(
    project_id: UUID,
    phase_id: UUID,
    body: PhaseUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PhaseResponse:
    phase = ProjectPhaseService(db).update_phase(
        user=current_user,
        phase_id=phase_id,
        **body.model_dump(exclude_none=True),
    )
    return PhaseResponse.model_validate(phase)


@router.delete("/{phase_id}", status_code=204)
def delete_phase(
    project_id: UUID,
    phase_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    ProjectPhaseService(db).delete_phase(current_user, phase_id)
