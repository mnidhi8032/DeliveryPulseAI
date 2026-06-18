"""Metric capture and health recomputation."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.constants import RoleCode
from app.models.user import User
from app.repositories.metric_definition_repository import MetricDefinitionRepository
from app.repositories.metric_value_repository import MetricValueRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.metric import MetricValueResponse, MetricsUpsertRequest
from app.services.access_control_service import AccessControlService
from app.services.health_service import HealthService
from app.services.metric_validation import MetricValidationError, validate_metric_value


REQUIRED_METRIC_CODES = [
    "planned_progress_percent",
    "actual_progress_percent",
    "dependency_delay_count",
    "critical_defects",
    "test_pass_rate",
    "prod_incidents",
    "scope_change_requests",
    "requirement_stability_percent",
    "budget_used",
    "planned_budget",
    "billing_delay_days",
    "resource_availability",
    "team_attrition",
]


class MetricService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._definitions = MetricDefinitionRepository(session)
        self._values = MetricValueRepository(session)
        self._submissions = SubmissionRepository(session)
        self._access = AccessControlService(session)
        self._health = HealthService(session)

    def _require_editable(self, submission) -> None:
        if not submission.status.allows_editing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Metrics cannot be edited unless submission is in DRAFT",
            )

    def _to_response(self, row) -> MetricValueResponse:
        return MetricValueResponse(
            id=row.id,
            submission_id=row.submission_id,
            metric_code=row.metric_definition.code,
            metric_name=row.metric_definition.name,
            dimension=row.metric_definition.dimension,
            value=row.value,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def upsert_metrics(self, user: User, body: MetricsUpsertRequest) -> list[MetricValueResponse]:
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PM role required")

        submission = self._submissions.get_by_id(body.submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if submission.created_by_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit metrics for another user's submission")
        self._access.require_can_view_project(user, submission.project)
        self._require_editable(submission)

        errors: list[str] = []
        validated: list[tuple] = []
        for item in body.metrics:
            definition = self._definitions.get_by_code(item.metric_code)
            if definition is None:
                errors.append(f"Unknown metric: {item.metric_code}")
                continue
            try:
                value = validate_metric_value(definition, item.value)
            except MetricValidationError as exc:
                errors.append(f"{exc.code}: {exc.message}")
                continue
            validated.append((definition, value))

        if errors:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"errors": errors})

        # Get existing metric values before they are modified
        existing_values = {r.metric_definition.code: r.value for r in self._values.list_by_submission(submission.id)}

        changes_old = {}
        changes_new = {}

        for definition, value in validated:
            old_val = existing_values.get(definition.code)
            if old_val != value:
                changes_old[definition.code] = old_val
                changes_new[definition.code] = value

            self._values.upsert(
                submission_id=submission.id,
                metric_definition_id=definition.id,
                value=value,
            )

        if changes_new:
            from app.models.audit_event import AuditEvent
            audit_event = AuditEvent(
                entity_type="SUBMISSION",
                entity_id=submission.id,
                event_type="METRICS_UPDATED",
                performed_by_user_id=user.id,
                old_value=changes_old,
                new_value=changes_new,
            )
            self._session.add(audit_event)
            self._session.flush()

        self._health.compute_and_persist(submission.id)
        self._session.commit()

        rows = self._values.list_by_submission(submission.id)
        return [self._to_response(r) for r in rows]

    def list_metrics(self, user: User, submission_id: uuid.UUID) -> list[MetricValueResponse]:
        submission = self._submissions.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        self._access.require_can_view_project(user, submission.project)
        rows = self._values.list_by_submission(submission_id)
        return [self._to_response(r) for r in rows]

    def validate_all_required_present(self, submission_id: uuid.UUID) -> None:
        """Used before submit in future; exposed for tests."""
        present = set(self._values.values_by_code(submission_id).keys())
        missing = [c for c in REQUIRED_METRIC_CODES if c not in present]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required metrics: {', '.join(missing)}",
            )
