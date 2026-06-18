"""Governance Review service — BRD §5.5.2."""

import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import RoleCode
from app.models.governance_review import GovernanceReview
from app.models.user import User
from app.services.access_control_service import AccessControlService


class GovernanceReviewService:
    VALID_LEVELS = ("BU", "ACCOUNT", "PROJECT")
    VALID_STATUSES = ("SCHEDULED", "COMPLETED", "CANCELLED")

    def __init__(self, session: Session) -> None:
        self._session = session
        self._access = AccessControlService(session)

    def list_reviews(
        self,
        user: User,
        project_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        bu_id: uuid.UUID | None = None,
    ) -> list[GovernanceReview]:
        stmt = select(GovernanceReview)
        if project_id:
            stmt = stmt.where(GovernanceReview.project_id == project_id)
        elif account_id:
            stmt = stmt.where(GovernanceReview.account_id == account_id)
        elif bu_id:
            stmt = stmt.where(GovernanceReview.business_unit_id == bu_id)
        stmt = stmt.order_by(GovernanceReview.review_date.desc())
        return list(self._session.execute(stmt).scalars().all())

    def create(
        self,
        user: User,
        review_level: str,
        review_date: date,
        review_title: str,
        outcome_comments: str | None = None,
        business_unit_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        project_id: uuid.UUID | None = None,
        review_status: str = "SCHEDULED",
    ) -> GovernanceReview:
        if review_level not in self.VALID_LEVELS:
            raise HTTPException(status_code=400, detail=f"review_level must be one of {self.VALID_LEVELS}")
        # Only DH and above can create governance reviews
        if user.role.code not in (RoleCode.BU_HEAD, RoleCode.CEO, RoleCode.PLATFORM_ADMIN):
            raise HTTPException(status_code=403, detail="Insufficient permissions to create governance reviews")

        review = GovernanceReview(
            id=uuid.uuid4(),
            review_level=review_level,
            business_unit_id=business_unit_id,
            account_id=account_id,
            project_id=project_id,
            review_date=review_date,
            review_title=review_title,
            outcome_comments=outcome_comments,
            conducted_by_user_id=user.id,
            status=review_status,
        )
        self._session.add(review)
        self._session.commit()
        return review

    def update(
        self,
        user: User,
        review_id: uuid.UUID,
        outcome_comments: str | None = None,
        review_status: str | None = None,
        review_title: str | None = None,
    ) -> GovernanceReview:
        review = self._session.get(GovernanceReview, review_id)
        if review is None:
            raise HTTPException(status_code=404, detail="Governance review not found")
        if user.role.code not in (RoleCode.BU_HEAD, RoleCode.CEO, RoleCode.PLATFORM_ADMIN):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        if review_status and review_status not in self.VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of {self.VALID_STATUSES}")

        if outcome_comments is not None:
            review.outcome_comments = outcome_comments
        if review_status is not None:
            review.status = review_status
        if review_title is not None:
            review.review_title = review_title
        self._session.commit()
        return review
