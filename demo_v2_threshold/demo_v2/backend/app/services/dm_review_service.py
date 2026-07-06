"""Delivery Manager Review Service."""
import json
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dm_review import DMReview
from app.models.kpi_plan import KpiPlan, KpiPlanMetric
from app.models.kpi_measurement import KpiMeasurement
from app.models.project import Project
from app.models.user import User
from app.schemas.dm_review import (
    DMReviewCreateRequest,
    DMReviewUpdateRequest,
    DMReviewResponse,
    ProjectReviewStatus,
)
from app.services.access_control_service import AccessControlService


class DMReviewService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._access = AccessControlService(session)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _require_dm(self, user: User) -> None:
        if not self._access.is_delivery_manager(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Delivery Manager role required",
            )

    def _can_access_project(self, user: User, project_id: uuid.UUID) -> bool:
        """Check if DM has access to the given project via their account assignment."""
        dm_accounts = self._access._get_dm_accounts(user.id)
        dm_account_ids = {a.id for a in dm_accounts}
        project = self._session.get(Project, project_id)
        return project is not None and project.account_id in dm_account_ids

    def _to_response(self, review: DMReview) -> DMReviewResponse:
        action_items: list[str] = []
        if review.action_items:
            try:
                action_items = json.loads(review.action_items)
            except Exception:
                action_items = []
        reviewer_name = review.reviewed_by.full_name if review.reviewed_by else None
        return DMReviewResponse(
            id=review.id,
            project_id=review.project_id,
            kpi_plan_id=review.kpi_plan_id,
            reviewed_by_user_id=review.reviewed_by_user_id,
            reviewed_by_name=reviewer_name,
            period_label=review.period_label,
            dm_comments=review.dm_comments,
            action_items=action_items,
            reviewed_at=review.reviewed_at,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )

    # ── Create review ─────────────────────────────────────────────────────────

    def create(self, user: User, body: DMReviewCreateRequest) -> DMReviewResponse:
        self._require_dm(user)
        if not self._can_access_project(user, body.project_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this project",
            )
        review = DMReview(
            id=uuid.uuid4(),
            project_id=body.project_id,
            kpi_plan_id=body.kpi_plan_id,
            reviewed_by_user_id=user.id,
            period_label=body.period_label.strip(),
            dm_comments=body.dm_comments,
            action_items=json.dumps(body.action_items) if body.action_items else None,
            reviewed_at=datetime.now(timezone.utc),
        )
        self._session.add(review)
        self._session.commit()
        self._session.refresh(review)
        return self._to_response(review)

    # ── Update review ─────────────────────────────────────────────────────────

    def update(self, user: User, review_id: uuid.UUID, body: DMReviewUpdateRequest) -> DMReviewResponse:
        self._require_dm(user)
        review = self._session.get(DMReview, review_id)
        if review is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
        if review.reviewed_by_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own reviews")
        if body.dm_comments is not None:
            review.dm_comments = body.dm_comments
        if body.action_items is not None:
            review.action_items = json.dumps(body.action_items)
        review.reviewed_at = datetime.now(timezone.utc)
        self._session.commit()
        self._session.refresh(review)
        return self._to_response(review)

    # ── List reviews for a project ────────────────────────────────────────────

    def list_for_project(self, user: User, project_id: uuid.UUID) -> list[DMReviewResponse]:
        # Platform admins, CEOs and the DM assigned to this project can see reviews
        if not (
            self._access.is_platform_admin(user)
            or self._access.is_ceo(user)
            or self._access.is_delivery_head(user)
            or self._access.is_delivery_excellence(user)
            or (self._access.is_delivery_manager(user) and self._can_access_project(user, project_id))
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        stmt = (
            select(DMReview)
            .where(DMReview.project_id == project_id)
            .order_by(DMReview.reviewed_at.desc())
        )
        reviews = list(self._session.execute(stmt).scalars().all())
        return [self._to_response(r) for r in reviews]

    # ── Project review status list (DM dashboard) ─────────────────────────────

    def get_project_review_statuses(self, user: User) -> list[ProjectReviewStatus]:
        """For each project the DM has access to, return review status summary."""
        self._require_dm(user)
        # Get DM's projects
        projects = self._access.list_projects_for_user(user)
        result = []
        for project in projects:
            # Get KPI plan
            plan_stmt = select(KpiPlan).where(KpiPlan.project_id == project.id)
            plan = self._session.execute(plan_stmt).scalar_one_or_none()
            if plan is None:
                result.append(ProjectReviewStatus(
                    project_id=project.id,
                    kpi_plan_id=uuid.uuid4(),  # placeholder
                    last_reviewed_at=None,
                    last_review_period=None,
                    last_reviewer_name=None,
                    latest_measurement_at=None,
                    needs_review=False,
                    total_reviews=0,
                ))
                continue

            # Last DM review for this project
            review_stmt = (
                select(DMReview)
                .where(DMReview.project_id == project.id)
                .order_by(DMReview.reviewed_at.desc())
                .limit(1)
            )
            last_review = self._session.execute(review_stmt).scalar_one_or_none()

            # Latest measurement across all metrics in this plan
            metric_ids_stmt = select(KpiPlanMetric.id).where(
                KpiPlanMetric.kpi_plan_id == plan.id,
                KpiPlanMetric.is_active == True,
            )
            metric_ids = [r[0] for r in self._session.execute(metric_ids_stmt).fetchall()]

            latest_measurement_at: datetime | None = None
            if metric_ids:
                meas_stmt = (
                    select(KpiMeasurement.updated_at)
                    .where(KpiMeasurement.plan_metric_id.in_(metric_ids))
                    .order_by(KpiMeasurement.updated_at.desc())
                    .limit(1)
                )
                row = self._session.execute(meas_stmt).scalar_one_or_none()
                if row:
                    latest_measurement_at = row

            # Needs review = new measurements exist after last review
            needs_review = False
            if latest_measurement_at is not None:
                if last_review is None:
                    needs_review = True
                else:
                    last_review_ts = last_review.reviewed_at
                    if last_review_ts.tzinfo is None:
                        last_review_ts = last_review_ts.replace(tzinfo=timezone.utc)
                    meas_ts = latest_measurement_at
                    if meas_ts.tzinfo is None:
                        meas_ts = meas_ts.replace(tzinfo=timezone.utc)
                    needs_review = meas_ts > last_review_ts

            # Count total reviews
            count_stmt = select(DMReview).where(DMReview.project_id == project.id)
            total_reviews = len(list(self._session.execute(count_stmt).scalars().all()))

            reviewer_name = None
            if last_review and last_review.reviewed_by:
                reviewer_name = last_review.reviewed_by.full_name

            result.append(ProjectReviewStatus(
                project_id=project.id,
                kpi_plan_id=plan.id,
                last_reviewed_at=last_review.reviewed_at if last_review else None,
                last_review_period=last_review.period_label if last_review else None,
                last_reviewer_name=reviewer_name,
                latest_measurement_at=latest_measurement_at,
                needs_review=needs_review,
                total_reviews=total_reviews,
            ))
        return result
