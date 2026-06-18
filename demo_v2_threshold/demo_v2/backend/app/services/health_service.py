"""Persist computed health and dimension scores (V2 Governance Engine)."""

import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.governance_constants import DIMENSION_WEIGHTS, GovernanceStatus
from app.health_engine.health_calculator import calculate_health_v2, STATUS_SCORE
from app.health_engine.rag_engine import governance_status_to_rag
from app.repositories.dimension_score_repository import DimensionScoreRepository
from app.repositories.health_score_repository import HealthScoreRepository
from app.repositories.metric_value_repository import MetricValueRepository


class HealthService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._metrics = MetricValueRepository(session)
        self._dimensions = DimensionScoreRepository(session)
        self._health = HealthScoreRepository(session)

    def compute_and_persist(self, submission_id: uuid.UUID) -> tuple[float, str, str | None]:
        from app.models.submission import Submission
        from app.models.governance_period import GovernancePeriod
        from app.models.user import User
        from app.models.role import Role
        from app.models.notification import Notification
        from app.models.project import Project
        from app.models.account import Account
        from app.core.constants import RoleCode

        # 1. Fetch current submission & related objects
        curr_sub = self._session.query(Submission).filter(Submission.id == submission_id).one()
        project = curr_sub.project
        account = project.account
        bu = account.business_unit

        # 2. Find the previous submission's RAG status
        prev_sub = (
            self._session.query(Submission)
            .join(GovernancePeriod)
            .filter(
                Submission.project_id == project.id,
                Submission.id != submission_id,
                GovernancePeriod.period_start < curr_sub.governance_period.period_start
            )
            .order_by(GovernancePeriod.period_start.desc())
            .first()
        )
        prev_rag = None
        if prev_sub and prev_sub.health_score:
            prev_rag = prev_sub.health_score.rag_status

        # 3. Calculate BU Red % before this submission's update
        bu_projects = (
            self._session.query(Project)
            .join(Account)
            .filter(Account.business_unit_id == bu.id, Project.deleted_at.is_(None))
            .all()
        )

        def get_project_latest_rag(proj_id, exclude_sub_id=None):
            stmt = (
                self._session.query(Submission)
                .join(GovernancePeriod)
                .filter(Submission.project_id == proj_id)
            )
            if exclude_sub_id:
                stmt = stmt.filter(Submission.id != exclude_sub_id)
            sub = stmt.order_by(GovernancePeriod.period_start.desc()).first()
            if sub and sub.health_score:
                return sub.health_score.rag_status
            return None

        before_red_count = 0
        for p in bu_projects:
            rag_val = get_project_latest_rag(p.id, exclude_sub_id=submission_id) if p.id == project.id else get_project_latest_rag(p.id)
            if rag_val in ("RED", GovernanceStatus.CRITICAL):
                before_red_count += 1
        before_pct = (before_red_count / len(bu_projects) * 100.0) if bu_projects else 0.0

        # 4. Compute the health of the current submission using V2 engine
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
            self._session.flush()
            return 0.0, GovernanceStatus.RED, None

        # V2: get governance statuses directly
        project_status, dimension_statuses, metric_statuses_map, explanations = calculate_health_v2(values)
        explanation = "; ".join(explanations) if explanations else None

        # Sentinel score for DB backward-compat
        overall = STATUS_SCORE[project_status]

        # Persist dimension scores — store governance_status, use sentinel score
        dim_rows = []
        for dim_name, dim_status in dimension_statuses.items():
            dim_score = Decimal(str(STATUS_SCORE[dim_status]))
            dim_weight = Decimal(str(DIMENSION_WEIGHTS.get(dim_name, 0.0)))
            dim_rows.append((dim_name, dim_score, dim_weight, dim_status))

        self._dimensions.replace_for_submission(submission_id, dim_rows)

        # Persist overall health — rag_status stores the governance status directly
        rag = governance_status_to_rag(project_status)
        self._health.upsert(
            submission_id=submission_id,
            overall_score=Decimal(str(overall)),
            rag_status=rag,
            explanation=explanation,
        )

        # 5. Calculate BU Red % after this submission's update
        after_red_count = 0
        for p in bu_projects:
            rag_val = rag if p.id == project.id else get_project_latest_rag(p.id)
            if rag_val in ("RED", GovernanceStatus.CRITICAL):
                after_red_count += 1
        after_pct = (after_red_count / len(bu_projects) * 100.0) if bu_projects else 0.0

        # 6. Trigger: project escalated to RED or CRITICAL
        if rag in (GovernanceStatus.RED, GovernanceStatus.CRITICAL) and prev_rag not in (GovernanceStatus.RED, GovernanceStatus.CRITICAL):
            customer_admins = (
                self._session.query(User)
                .join(Role)
                .filter(Role.code == RoleCode.CEO, User.is_active == True)
                .all()
            )
            for ca in customer_admins:
                notification = Notification(
                    user_id=ca.id,
                    title=f"Project Health Escalation - {rag}",
                    message=(
                        f"Project {project.project_name} overall health has escalated to "
                        f"{rag} in the latest governance report."
                    ),
                    category="RISK",
                    type="PROJECT_RED",
                    is_read=False,
                    related_submission_id=submission_id,
                )
                self._session.add(notification)

        # 7. Trigger: BU RED limit breached (<=20% → >20%)
        if before_pct <= 20.0 and after_pct > 20.0:
            platform_admins = (
                self._session.query(User)
                .join(Role)
                .filter(Role.code == RoleCode.PLATFORM_ADMIN, User.is_active == True)
                .all()
            )
            for pa in platform_admins:
                notification = Notification(
                    user_id=pa.id,
                    title="Business Unit High Risk Warning",
                    message=(
                        f"Business Unit {bu.name} has breached the high-risk threshold "
                        f"with {after_pct:.1f}% of projects in RED/CRITICAL status."
                    ),
                    category="RISK",
                    type="BU_RED_HIGH",
                    is_read=False,
                    related_submission_id=submission_id,
                )
                self._session.add(notification)

        self._session.flush()
        return overall, rag, explanation
