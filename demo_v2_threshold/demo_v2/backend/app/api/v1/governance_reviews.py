"""Governance Reviews API — BRD §5.5.2."""

from datetime import date, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.governance_review_service import GovernanceReviewService

router = APIRouter(prefix="/governance-reviews", tags=["governance-reviews"])


class GovernanceReviewCreateRequest(BaseModel):
    review_level: str                  # BU, ACCOUNT, PROJECT
    review_date: date
    review_title: str
    outcome_comments: str | None = None
    business_unit_id: UUID | None = None
    account_id: UUID | None = None
    project_id: UUID | None = None
    status: str = "SCHEDULED"


class GovernanceReviewUpdateRequest(BaseModel):
    outcome_comments: str | None = None
    status: str | None = None
    review_title: str | None = None


class GovernanceReviewResponse(BaseModel):
    id: UUID
    review_level: str
    business_unit_id: UUID | None
    account_id: UUID | None
    project_id: UUID | None
    review_date: date
    review_title: str
    outcome_comments: str | None
    conducted_by_user_id: UUID | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[GovernanceReviewResponse])
def list_reviews(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    project_id: UUID | None = Query(None),
    account_id: UUID | None = Query(None),
    bu_id: UUID | None = Query(None),
) -> list[GovernanceReviewResponse]:
    reviews = GovernanceReviewService(db).list_reviews(
        user=current_user,
        project_id=project_id,
        account_id=account_id,
        bu_id=bu_id,
    )
    return [GovernanceReviewResponse.model_validate(r) for r in reviews]


@router.post("", response_model=GovernanceReviewResponse, status_code=201)
def create_review(
    body: GovernanceReviewCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> GovernanceReviewResponse:
    review = GovernanceReviewService(db).create(
        user=current_user,
        review_level=body.review_level,
        review_date=body.review_date,
        review_title=body.review_title,
        outcome_comments=body.outcome_comments,
        business_unit_id=body.business_unit_id,
        account_id=body.account_id,
        project_id=body.project_id,
        review_status=body.status,
    )
    return GovernanceReviewResponse.model_validate(review)


@router.patch("/{review_id}", response_model=GovernanceReviewResponse)
def update_review(
    review_id: UUID,
    body: GovernanceReviewUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> GovernanceReviewResponse:
    review = GovernanceReviewService(db).update(
        user=current_user,
        review_id=review_id,
        outcome_comments=body.outcome_comments,
        review_status=body.status,
        review_title=body.review_title,
    )
    return GovernanceReviewResponse.model_validate(review)
