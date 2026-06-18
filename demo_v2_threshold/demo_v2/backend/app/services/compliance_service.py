"""Compliance reporting service — BRD §5.6.1.2/5.6.1.7.

Reports:
- Which PMs have not submitted data for which periods
- Which DMs/DHs have not reviewed submissions within threshold
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone, timedelta
from dataclasses import dataclass, field

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.constants import RoleCode
from app.models.governance_period import GovernancePeriod
from app.models.project import Project
from app.models.submission import Submission
from app.models.submission_status import SubmissionStatus
from app.models.user import User
from app.services.access_control_service import AccessControlService


@dataclass
class PMComplianceRow:
    pm_id: uuid.UUID
    pm_name: str
    pm_email: str
    project_id: uuid.UUID
    project_name: str
    period_id: uuid.UUID
    period_name: str
    period_end: date
    submitted: bool
    days_overdue: int


@dataclass
class ReviewerComplianceRow:
    reviewer_role: str   # DH / DM / DD
    reviewer_id: uuid.UUID | None
    reviewer_name: str
    submission_id: uuid.UUID
    project_name: str
    submitted_date: datetime
    days_pending: int
    current_status: str


@dataclass
class ComplianceReport:
    pm_non_submissions: list[PMComplianceRow] = field(default_factory=list)
    pending_reviews: list[ReviewerComplianceRow] = field(default_factory=list)
    summary: dict = field(default_factory=dict)


class ComplianceService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._access = AccessControlService(session)

    def get_report(self, user: User, review_threshold_days: int = 3) -> ComplianceReport:
        """
        BRD §5.6.1.2: Generate compliance report showing:
        1. PMs who haven't submitted for active governance periods
        2. Submissions pending DH review beyond threshold
        """
        report = ComplianceReport()

        # ── 1. PM Non-submissions ──────────────────────────────────────────────
        # Get all active governance periods
        active_periods = self._session.execute(
            select(GovernancePeriod).where(GovernancePeriod.is_active == True)
        ).scalars().all()

        # Get all projects visible to this user
        projects = self._access.list_projects_for_user(user)

        # For each project × period, check if submission exists
        submitted_pairs: set[tuple] = set()
        if active_periods:
            period_ids = [p.id for p in active_periods]
            project_ids = [p.id for p in projects]
            if project_ids and period_ids:
                stmt = select(
                    Submission.project_id,
                    Submission.governance_period_id,
                ).where(
                    Submission.project_id.in_(project_ids),
                    Submission.governance_period_id.in_(period_ids),
                    Submission.deleted_at.is_(None),
                )
                for row in self._session.execute(stmt):
                    submitted_pairs.add((row.project_id, row.governance_period_id))

        today = date.today()
        for project in projects:
            pm = project.project_manager
            if not pm:
                continue
            for period in active_periods:
                if (project.id, period.id) not in submitted_pairs:
                    days_overdue = (today - period.period_end).days if period.period_end < today else 0
                    report.pm_non_submissions.append(PMComplianceRow(
                        pm_id=pm.id,
                        pm_name=pm.full_name,
                        pm_email=pm.email,
                        project_id=project.id,
                        project_name=project.project_name,
                        period_id=period.id,
                        period_name=period.name,
                        period_end=period.period_end,
                        submitted=False,
                        days_overdue=days_overdue,
                    ))

        # ── 2. Pending Reviews (submissions in UNDER_REVIEW beyond threshold) ──
        under_review_status = self._session.execute(
            select(SubmissionStatus).where(SubmissionStatus.code == "UNDER_REVIEW")
        ).scalar_one_or_none()

        if under_review_status:
            project_ids = [p.id for p in projects]
            if project_ids:
                stmt = (
                    select(Submission)
                    .where(Submission.project_id.in_(project_ids))
                    .where(Submission.status_id == under_review_status.id)
                    .where(Submission.deleted_at.is_(None))
                )
                under_review_subs = self._session.execute(stmt).scalars().all()
                now = datetime.now(timezone.utc)
                for sub in under_review_subs:
                    if sub.submission_date:
                        days_pending = (now - sub.submission_date).days
                        if days_pending >= review_threshold_days:
                            dh = sub.project.delivery_head
                            report.pending_reviews.append(ReviewerComplianceRow(
                                reviewer_role="DH",
                                reviewer_id=dh.id if dh else None,
                                reviewer_name=dh.full_name if dh else "Unassigned",
                                submission_id=sub.id,
                                project_name=sub.project.project_name,
                                submitted_date=sub.submission_date,
                                days_pending=days_pending,
                                current_status="UNDER_REVIEW",
                            ))

        # ── Summary ────────────────────────────────────────────────────────────
        report.summary = {
            "total_pm_non_submissions": len(report.pm_non_submissions),
            "total_pending_reviews": len(report.pending_reviews),
            "overdue_pm_submissions": sum(1 for r in report.pm_non_submissions if r.days_overdue > 0),
            "review_threshold_days": review_threshold_days,
        }
        return report
