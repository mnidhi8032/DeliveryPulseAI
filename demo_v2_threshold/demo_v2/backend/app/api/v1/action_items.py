"""Action Items API — BRD §8."""

from datetime import date, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.action_item_service import ActionItemService

router = APIRouter(prefix="/action-items", tags=["action-items"])


class ActionItemCreateRequest(BaseModel):
    project_id: UUID
    root_cause: str
    corrective_action: str
    metric_name: str | None = None
    rag_status_at_creation: str | None = None
    submission_id: UUID | None = None
    owner_user_id: UUID | None = None
    owner_name: str | None = None
    target_closure_date: date | None = None


class ActionItemStatusUpdateRequest(BaseModel):
    action_status: str               # OPEN, IN_PROGRESS, CLOSED
    corrective_action: str | None = None
    owner_name: str | None = None
    target_closure_date: date | None = None


class ActionItemResponse(BaseModel):
    id: UUID
    project_id: UUID
    submission_id: UUID | None
    metric_name: str | None
    rag_status_at_creation: str | None
    root_cause: str
    corrective_action: str
    owner_user_id: UUID | None
    owner_name: str | None
    target_closure_date: date | None
    closed_at: datetime | None
    action_status: str
    created_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.get("/by-project/{project_id}", response_model=list[ActionItemResponse])
def list_action_items(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    overdue_only: bool = Query(False),
) -> list[ActionItemResponse]:
    svc = ActionItemService(db)
    if overdue_only:
        items = svc.list_overdue(current_user, project_id)
    else:
        items = svc.list_by_project(current_user, project_id)
    return [ActionItemResponse.model_validate(i) for i in items]


@router.post("", response_model=ActionItemResponse, status_code=201)
def create_action_item(
    body: ActionItemCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ActionItemResponse:
    item = ActionItemService(db).create(
        user=current_user,
        project_id=body.project_id,
        root_cause=body.root_cause,
        corrective_action=body.corrective_action,
        metric_name=body.metric_name,
        rag_status_at_creation=body.rag_status_at_creation,
        submission_id=body.submission_id,
        owner_user_id=body.owner_user_id,
        owner_name=body.owner_name,
        target_closure_date=body.target_closure_date,
    )
    return ActionItemResponse.model_validate(item)


@router.patch("/{item_id}/status", response_model=ActionItemResponse)
def update_action_item_status(
    item_id: UUID,
    body: ActionItemStatusUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ActionItemResponse:
    item = ActionItemService(db).update_status(
        user=current_user,
        item_id=item_id,
        new_status=body.action_status,
        corrective_action=body.corrective_action,
        owner_name=body.owner_name,
        target_closure_date=body.target_closure_date,
    )
    return ActionItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=204)
def delete_action_item(
    item_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    ActionItemService(db).delete(current_user, item_id)
