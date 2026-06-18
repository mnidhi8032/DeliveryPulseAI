import uuid
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.project import Project
from app.models.submission import Submission
from app.models.user import User
from app.schemas.timeline import DimensionHistoryRow, HealthHistoryEvent, SubmissionTimelineEvent
from app.services.access_control_service import AccessControlService


class TimelineService:
    def __init__(self, session: Session):
        self._session = session
        self._access = AccessControlService(session)

    def _get_project_or_404(self, project_id: uuid.UUID, current_user: User) -> Project:
        from fastapi import HTTPException
        project = self._session.execute(
            select(Project)
            .options(joinedload(Project.account))
            .where(Project.id == project_id)
        ).scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        self._access.require_can_view_project(current_user, project)
        return project

    def get_health_history(self, project_id: uuid.UUID, current_user: User) -> list[HealthHistoryEvent]:
        self._get_project_or_404(project_id, current_user)

        stmt = (
            select(Submission)
            .options(
                joinedload(Submission.health_score),
                joinedload(Submission.dimension_scores),
            )
            .where(Submission.project_id == project_id)
            .where(Submission.deleted_at.is_(None))
            .order_by(Submission.created_at)
        )
        submissions = self._session.execute(stmt).unique().scalars().all()

        history = []
        for sub in submissions:
            dims = []
            for ds in sub.dimension_scores:
                dims.append(DimensionHistoryRow(
                    dimension_name=ds.dimension_name,
                    score=float(ds.score)
                ))
            
            # Need a stable date. Usually submission_date, but if draft use created_at
            date_val = sub.submission_date or sub.created_at

            history.append(HealthHistoryEvent(
                submission_id=sub.id,
                date=date_val,
                overall_score=float(sub.health_score.overall_score) if sub.health_score else None,
                rag_status=sub.health_score.rag_status if sub.health_score else None,
                dimensions=dims,
            ))

        return history

    def get_submission_timeline(self, project_id: uuid.UUID, current_user: User) -> list[SubmissionTimelineEvent]:
        self._get_project_or_404(project_id, current_user)

        stmt = (
            select(Submission)
            .options(
                joinedload(Submission.status),
                joinedload(Submission.health_score),
                joinedload(Submission.creator).joinedload(User.role),
                joinedload(Submission.reviewer).joinedload(User.role),
            )
            .where(Submission.project_id == project_id)
            .where(Submission.deleted_at.is_(None))
            .order_by(Submission.created_at)
        )
        submissions = self._session.execute(stmt).unique().scalars().all()

        timeline = []
        prev_score = None

        for sub in submissions:
            score = float(sub.health_score.overall_score) if sub.health_score else None
            
            trend: Literal["improving", "declining", "stable", "none"] = "none"
            if score is not None and prev_score is not None:
                diff = score - prev_score
                if diff > 10:
                    trend = "improving"
                elif diff < -10:
                    trend = "declining"
                else:
                    trend = "stable"

            if score is not None:
                prev_score = score

            # Determine actor info
            status_code = sub.status.code
            actor_name = None
            actor_role = None
            action_desc = ""

            if status_code == "DRAFT":
                actor_name = sub.creator.full_name
                actor_role = sub.creator.role.name
                action_desc = f"Draft created by {actor_name or 'System'}"
            elif status_code == "SUBMITTED":
                actor_name = sub.creator.full_name
                actor_role = sub.creator.role.name
                action_desc = f"Submitted by {actor_name or 'System'}"
            elif status_code in ("APPROVED", "REJECTED", "LOCKED"):
                if sub.reviewer:
                    actor_name = sub.reviewer.full_name
                    actor_role = sub.reviewer.role.name
                action_desc = f"{status_code.capitalize()} by {actor_name or 'System'}"
            elif status_code == "REOPENED":
                if sub.reviewer:
                    actor_name = sub.reviewer.full_name
                    actor_role = sub.reviewer.role.name
                action_desc = f"Reopened by {actor_name or 'System'}"
            else:
                action_desc = f"Status updated to {status_code}"

            date_val = sub.submission_date or sub.created_at
            
            timeline.append(SubmissionTimelineEvent(
                submission_id=sub.id,
                date=date_val,
                overall_score=score,
                rag_status=sub.health_score.rag_status if sub.health_score else None,
                status_code=status_code,
                trend=trend,
                action_description=action_desc,
                actor_name=actor_name,
                actor_role=actor_role,
                created_at=sub.created_at,
                submission_date=sub.submission_date,
                approval_date=sub.approval_date,
                locked_at=sub.locked_at,
            ))

        return timeline
