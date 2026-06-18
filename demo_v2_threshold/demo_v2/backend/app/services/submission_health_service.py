"""Read submission health snapshot."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.dimension_score_repository import DimensionScoreRepository
from app.repositories.health_score_repository import HealthScoreRepository
from app.repositories.metric_value_repository import MetricValueRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.metric import DimensionScoreResponse, SubmissionHealthResponse
from app.services.access_control_service import AccessControlService
from app.services.health_service import HealthService


class SubmissionHealthService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._submissions = SubmissionRepository(session)
        self._dimensions = DimensionScoreRepository(session)
        self._health = HealthScoreRepository(session)
        self._metrics = MetricValueRepository(session)
        self._compute = HealthService(session)
        self._access = AccessControlService(session)

    def get_health(self, user: User, submission_id: uuid.UUID) -> SubmissionHealthResponse:
        submission = self._submissions.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        self._access.require_can_view_project(user, submission.project)

        values = self._metrics.values_by_code(submission_id)
        from app.services.metric_service import REQUIRED_METRIC_CODES
        metrics_completed = len([c for c in REQUIRED_METRIC_CODES if c in values])
        metrics_required = len(REQUIRED_METRIC_CODES)

        if metrics_completed < metrics_required:
            from sqlalchemy import delete
            from app.models.dimension_score import DimensionScore
            from app.models.health_score import HealthScore
            self._session.execute(delete(DimensionScore).where(DimensionScore.submission_id == submission_id))
            self._session.execute(delete(HealthScore).where(HealthScore.submission_id == submission_id))
            self._session.commit()
            return SubmissionHealthResponse(
                submission_id=submission_id,
                health_available=False,
                metrics_completed=metrics_completed,
                metrics_required=metrics_required,
                message="Complete all required metrics to calculate health.",
                dimension_scores=[]
            )

        health = self._health.get_by_submission(submission_id)
        dimensions = self._dimensions.list_by_submission(submission_id)

        if health is None:
            self._compute.compute_and_persist(submission_id)
            self._session.commit()
            health = self._health.get_by_submission(submission_id)
            dimensions = self._dimensions.list_by_submission(submission_id)

        if health is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to compute health score.",
            )

        return SubmissionHealthResponse(
            submission_id=submission_id,
            health_available=True,
            metrics_completed=metrics_completed,
            metrics_required=metrics_required,
            overall_score=health.overall_score,
            rag_status=health.rag_status,
            explanation=health.explanation,
            dimension_scores=[
                DimensionScoreResponse(
                    dimension_name=d.dimension_name,
                    score=d.score,
                    weight=d.weight,
                    rag_status=d.rag_status,
                    governance_status=d.governance_status or d.rag_status,
                )
                for d in dimensions
            ],
            computed_at=health.created_at,
        )

