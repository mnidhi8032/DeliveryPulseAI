"""Compliance reporting API — BRD §5.6.1.2 / §5.6.1.7."""

from datetime import date, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.compliance_service import ComplianceService

router = APIRouter(prefix="/compliance", tags=["compliance"])


class PMComplianceRowOut(BaseModel):
    pm_id: UUID
    pm_name: str
    pm_email: str
    project_id: UUID
    project_name: str
    period_id: UUID
    period_name: str
    period_end: date
    submitted: bool
    days_overdue: int


class ReviewerComplianceRowOut(BaseModel):
    reviewer_role: str
    reviewer_id: UUID | None
    reviewer_name: str
    submission_id: UUID
    project_name: str
    submitted_date: datetime
    days_pending: int
    current_status: str


class ComplianceReportOut(BaseModel):
    pm_non_submissions: list[PMComplianceRowOut]
    pending_reviews: list[ReviewerComplianceRowOut]
    summary: dict


@router.get("/report", response_model=ComplianceReportOut)
def get_compliance_report(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    review_threshold_days: int = Query(default=3, ge=1, le=30),
) -> ComplianceReportOut:
    """
    BRD §5.6.1.2: Compliance report showing:
    - PMs who have not submitted data for active governance periods
    - Submissions pending review beyond the configured threshold (default 3 days)
    """
    report = ComplianceService(db).get_report(current_user, review_threshold_days)
    return ComplianceReportOut(
        pm_non_submissions=[PMComplianceRowOut(**r.__dict__) for r in report.pm_non_submissions],
        pending_reviews=[ReviewerComplianceRowOut(**r.__dict__) for r in report.pending_reviews],
        summary=report.summary,
    )
