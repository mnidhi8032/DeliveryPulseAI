"""Metric definition catalog (read-only for PM forms)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.repositories.metric_definition_repository import MetricDefinitionRepository
from app.schemas.metric_definition import MetricDefinitionResponse

router = APIRouter(prefix="/metric-definitions", tags=["metric-definitions"])


@router.get("", response_model=list[MetricDefinitionResponse])
def list_metric_definitions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[MetricDefinitionResponse]:
    """List active metric definitions for dynamic PM data entry forms."""
    _ = current_user
    definitions = MetricDefinitionRepository(db).list_active()
    return [MetricDefinitionResponse.model_validate(d) for d in definitions]
