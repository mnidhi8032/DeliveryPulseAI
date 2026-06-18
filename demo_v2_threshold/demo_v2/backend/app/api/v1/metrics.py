"""Metric API routes (Phase 4)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.core.constants import RoleCode
from app.models.user import User
from app.schemas.metric import MetricValueResponse, MetricsUpsertRequest
from app.services.metric_service import MetricService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.post("", response_model=list[MetricValueResponse], status_code=200)
def upsert_metrics(
    body: MetricsUpsertRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> list[MetricValueResponse]:
    return MetricService(db).upsert_metrics(current_user, body)


@router.get("", response_model=list[MetricValueResponse])
def list_metrics(
    submission_id: Annotated[UUID, Query()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[MetricValueResponse]:
    return MetricService(db).list_metrics(current_user, submission_id)
