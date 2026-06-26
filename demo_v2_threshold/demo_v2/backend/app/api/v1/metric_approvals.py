"""Metric approval request API routes."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.metric_approval import (
    MetricApprovalRequestCreate,
    MetricApprovalRequestResponse,
    MetricApprovalDecision,
)
from app.services.metric_approval_service import MetricApprovalService

router = APIRouter(prefix="/metric-approvals", tags=["metric-approvals"])


@router.post("", response_model=MetricApprovalRequestResponse, status_code=201)
def create_request(
    body: MetricApprovalRequestCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """PM submits a custom metric request for DE approval."""
    return MetricApprovalService(db).create_request(current_user, body)


@router.get("", response_model=list[MetricApprovalRequestResponse])
def list_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """DE sees all requests; PM sees only their own."""
    return MetricApprovalService(db).list_pending(current_user)


@router.post("/{request_id}/decide", response_model=MetricApprovalRequestResponse)
def decide_request(
    request_id: UUID,
    body: MetricApprovalDecision,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """DE approves or rejects a pending request."""
    return MetricApprovalService(db).decide(current_user, request_id, body)
