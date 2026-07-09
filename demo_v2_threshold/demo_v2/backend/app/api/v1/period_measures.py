"""Period Measures API — unified parameter entry for a project+period."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.period_measures import (
    AllMeasuresForPeriodResponse,
    PeriodMeasureSaveRequest,
    PeriodSaveResponse,
)
from app.services.period_measures_service import PeriodMeasuresService

router = APIRouter(prefix="/period-measures", tags=["period-measures"])


@router.get("/projects/{project_id}", response_model=AllMeasuresForPeriodResponse)
def get_all_measures(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    period_label: str = Query(...),
) -> AllMeasuresForPeriodResponse:
    """
    Return all parameters (measures) needed for a project's active metrics,
    with current values for the given period, plus history.
    """
    return PeriodMeasuresService(db).get_all_measures(current_user, project_id, period_label)


@router.post("/projects/{project_id}/save", response_model=PeriodSaveResponse)
def save_and_compute(
    project_id: UUID,
    body: PeriodMeasureSaveRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PeriodSaveResponse:
    """
    Save all parameters for a project+period and auto-compute every metric
    that has complete inputs. Returns computation results for all metrics.
    """
    return PeriodMeasuresService(db).save_and_compute(current_user, project_id, body)
