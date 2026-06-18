"""Action Item service — BRD §8: Action & Improvement tracking."""

import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.action_item import ActionItem
from app.models.user import User
from app.services.access_control_service import AccessControlService
from app.repositories.project_repository import ProjectRepository


class ActionItemService:
    VALID_STATUSES = ("OPEN", "IN_PROGRESS", "CLOSED")

    def __init__(self, session: Session) -> None:
        self._session = session
        self._access = AccessControlService(session)
        self._projects = ProjectRepository(session)

    def list_by_project(self, user: User, project_id: uuid.UUID) -> list[ActionItem]:
        project = self._projects.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        self._access.require_can_view_project(user, project)
        stmt = (
            select(ActionItem)
            .where(ActionItem.project_id == project_id)
            .order_by(ActionItem.created_at.desc())
        )
        return list(self._session.execute(stmt).scalars().all())

    def list_overdue(self, user: User, project_id: uuid.UUID) -> list[ActionItem]:
        """BRD §8.3: Return open/in-progress items past their target closure date."""
        project = self._projects.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        self._access.require_can_view_project(user, project)
        today = date.today()
        stmt = (
            select(ActionItem)
            .where(ActionItem.project_id == project_id)
            .where(ActionItem.action_status.in_(("OPEN", "IN_PROGRESS")))
            .where(ActionItem.target_closure_date < today)
        )
        return list(self._session.execute(stmt).scalars().all())

    def create(
        self,
        user: User,
        project_id: uuid.UUID,
        root_cause: str,
        corrective_action: str,
        metric_name: str | None = None,
        rag_status_at_creation: str | None = None,
        submission_id: uuid.UUID | None = None,
        owner_user_id: uuid.UUID | None = None,
        owner_name: str | None = None,
        target_closure_date: date | None = None,
    ) -> ActionItem:
        project = self._projects.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        self._access.require_can_view_project(user, project)

        item = ActionItem(
            id=uuid.uuid4(),
            project_id=project_id,
            submission_id=submission_id,
            metric_name=metric_name,
            rag_status_at_creation=rag_status_at_creation,
            root_cause=root_cause,
            corrective_action=corrective_action,
            owner_user_id=owner_user_id,
            owner_name=owner_name,
            target_closure_date=target_closure_date,
            action_status="OPEN",
            created_by_user_id=user.id,
        )
        self._session.add(item)
        self._session.commit()
        return item

    def update_status(
        self,
        user: User,
        item_id: uuid.UUID,
        new_status: str,
        corrective_action: str | None = None,
        owner_name: str | None = None,
        target_closure_date: date | None = None,
    ) -> ActionItem:
        item = self._session.get(ActionItem, item_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Action item not found")
        project = self._projects.get_by_id(item.project_id)
        assert project is not None
        self._access.require_can_view_project(user, project)

        if new_status not in self.VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of {self.VALID_STATUSES}")

        item.action_status = new_status
        if new_status == "CLOSED":
            item.closed_at = datetime.now(timezone.utc)
        if corrective_action is not None:
            item.corrective_action = corrective_action
        if owner_name is not None:
            item.owner_name = owner_name
        if target_closure_date is not None:
            item.target_closure_date = target_closure_date

        self._session.commit()
        return item

    def delete(self, user: User, item_id: uuid.UUID) -> None:
        item = self._session.get(ActionItem, item_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Action item not found")
        project = self._projects.get_by_id(item.project_id)
        assert project is not None
        self._access.require_can_manage_project(user, project)
        self._session.delete(item)
        self._session.commit()
