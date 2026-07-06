"""DM Review API routes — Delivery Manager review cycle per project per period."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.dm_review import (
    DMReviewCreateRequest,
    DMReviewUpdateRequest,
    DMReviewResponse,
    ProjectReviewStatus,
)
from app.services.dm_review_service import DMReviewService

router = APIRouter(prefix="/dm-reviews", tags=["dm-reviews"])


@router.get("/project-statuses", response_model=list[ProjectReviewStatus])
def get_project_review_statuses(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ProjectReviewStatus]:
    """Return review status for all projects the DM has access to.
    Each entry includes whether new measurements exist since the last review.
    """
    return DMReviewService(db).get_project_review_statuses(current_user)


@router.get("/project/{project_id}", response_model=list[DMReviewResponse])
def list_reviews_for_project(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[DMReviewResponse]:
    """List all DM reviews for a specific project (newest first)."""
    return DMReviewService(db).list_for_project(current_user, project_id)


@router.post("", response_model=DMReviewResponse, status_code=201)
def create_review(
    body: DMReviewCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DMReviewResponse:
    """DM submits a review for a project for a given reporting period."""
    return DMReviewService(db).create(current_user, body)


@router.patch("/{review_id}", response_model=DMReviewResponse)
def update_review(
    review_id: UUID,
    body: DMReviewUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DMReviewResponse:
    """DM updates an existing review (add/edit comments or action items)."""
    return DMReviewService(db).update(current_user, review_id, body)
