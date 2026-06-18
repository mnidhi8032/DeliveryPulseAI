"""Project Phase service — BRD §5.2.3."""

import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project_phase import ProjectPhase
from app.models.user import User
from app.services.access_control_service import AccessControlService
from app.repositories.project_repository import ProjectRepository


class ProjectPhaseService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._access = AccessControlService(session)
        self._projects = ProjectRepository(session)

    def list_phases(self, user: User, project_id: uuid.UUID) -> list[ProjectPhase]:
        project = self._projects.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        self._access.require_can_view_project(user, project)
        stmt = select(ProjectPhase).where(ProjectPhase.project_id == project_id).order_by(ProjectPhase.planned_start_date)
        return list(self._session.execute(stmt).scalars().all())

    def create_phase(
        self,
        user: User,
        project_id: uuid.UUID,
        phase_type: str,
        phase_name: str,
        planned_start_date: date | None,
        planned_end_date: date | None,
        actual_start_date: date | None,
        actual_end_date: date | None,
        phase_status: str,
    ) -> ProjectPhase:
        project = self._projects.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        self._access.require_can_manage_project(user, project)

        valid_types = ("SPRINT", "RELEASE", "MILESTONE", "OTHER")
        if phase_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"phase_type must be one of {valid_types}")

        phase = ProjectPhase(
            id=uuid.uuid4(),
            project_id=project_id,
            phase_type=phase_type,
            phase_name=phase_name,
            planned_start_date=planned_start_date,
            planned_end_date=planned_end_date,
            actual_start_date=actual_start_date,
            actual_end_date=actual_end_date,
            status=phase_status,
        )
        self._session.add(phase)
        self._session.commit()
        return phase

    def update_phase(
        self,
        user: User,
        phase_id: uuid.UUID,
        **kwargs,
    ) -> ProjectPhase:
        phase = self._session.get(ProjectPhase, phase_id)
        if phase is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
        project = self._projects.get_by_id(phase.project_id)
        assert project is not None
        self._access.require_can_manage_project(user, project)

        for k, v in kwargs.items():
            if v is not None and hasattr(phase, k):
                setattr(phase, k, v)
        self._session.commit()
        return phase

    def delete_phase(self, user: User, phase_id: uuid.UUID) -> None:
        phase = self._session.get(ProjectPhase, phase_id)
        if phase is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
        project = self._projects.get_by_id(phase.project_id)
        assert project is not None
        self._access.require_can_manage_project(user, project)
        self._session.delete(phase)
        self._session.commit()
