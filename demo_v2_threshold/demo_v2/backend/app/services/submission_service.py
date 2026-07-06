"""Submission service (Phase 3 lifecycle skeleton)."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.constants import RoleCode
from app.models.user import User
from app.repositories.governance_period_repository import GovernancePeriodRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.submission_lifecycle_audit_repository import SubmissionLifecycleAuditRepository
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.submission_status_repository import SubmissionStatusRepository
from app.schemas.submission import (
    SubmissionCreateRequest,
    SubmissionDraftUpdateRequest,
    SubmissionRejectRequest,
    SubmissionReopenRequest,
    SubmissionResponse,
)
from app.services.access_control_service import AccessControlService


class SubmissionService:
    """
    Lifecycle state machine (no metrics yet).

    Allowed transitions:
      DRAFT -> SUBMITTED -> UNDER_REVIEW
      UNDER_REVIEW -> APPROVED | REJECTED
      APPROVED -> REOPENED -> DRAFT
      APPROVED -> LOCKED
    """

    _ALLOWED: dict[str, set[str]] = {
        "DRAFT": {"SUBMITTED"},
        "SUBMITTED": {"UNDER_REVIEW"},
        "UNDER_REVIEW": {"APPROVED", "REJECTED"},
        "APPROVED": {"REOPENED", "LOCKED"},
        "REOPENED": {"DRAFT"},
        "REJECTED": {"DRAFT"},   # BRD §11.3: rejected submissions allow resubmission
        "LOCKED": set(),
    }

    def __init__(self, session: Session) -> None:
        self._session = session
        self._repo = SubmissionRepository(session)
        self._projects = ProjectRepository(session)
        self._periods = GovernancePeriodRepository(session)
        self._statuses = SubmissionStatusRepository(session)
        self._lifecycle_audit = SubmissionLifecycleAuditRepository(session)
        self._access = AccessControlService(session)

    def _record_audit_event(
        self,
        entity_type: str,
        entity_id: uuid.UUID,
        event_type: str,
        user_id: uuid.UUID,
        old_val: dict | None,
        new_val: dict | None,
    ) -> None:
        from app.models.audit_event import AuditEvent
        event = AuditEvent(
            entity_type=entity_type,
            entity_id=entity_id,
            event_type=event_type,
            performed_by_user_id=user_id,
            old_value=old_val,
            new_value=new_val,
        )
        self._session.add(event)
        self._session.flush()

    def _create_notification(
        self,
        user_id: uuid.UUID,
        title: str,
        message: str,
        category: str,
        type_str: str,
        submission_id: uuid.UUID | None = None,
    ) -> None:
        from app.models.notification import Notification
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            category=category,
            type=type_str,
            is_read=False,
            related_submission_id=submission_id,
        )
        self._session.add(notif)
        self._session.flush()

    def _get_status(self, code: str):
        status_row = self._statuses.get_by_code(code)
        if status_row is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Submission status not seeded: {code}",
            )
        return status_row

    def _transition(self, submission, to_code: str, *, actor: User, comments: str | None = None) -> None:
        from_code = submission.status.code
        allowed = self._ALLOWED.get(from_code, set())
        if to_code not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition: {from_code} -> {to_code}",
            )

        to_status = self._get_status(to_code)
        submission.status_id = to_status.id
        # Keep the in-memory relationship in sync for chained transitions in one request.
        submission.status = to_status
        submission.review_comments = comments if comments is not None else submission.review_comments

        now = datetime.now(timezone.utc)
        if to_code == "SUBMITTED":
            submission.submission_date = now
        if to_code == "APPROVED":
            submission.approval_date = now
        if to_code == "LOCKED":
            submission.locked_at = now

        # reviewer tracking for DH actions
        if actor.role.code == RoleCode.DELIVERY_HEAD:
            submission.reviewed_by_user_id = actor.id

        self._session.flush()

    def _to_response(self, submission) -> SubmissionResponse:
        return SubmissionResponse(
            id=submission.id,
            project_id=submission.project_id,
            governance_period_id=submission.governance_period_id,
            status_code=submission.status.code,
            created_by_user_id=submission.created_by_user_id,
            reviewed_by_user_id=submission.reviewed_by_user_id,
            submission_date=submission.submission_date,
            approval_date=submission.approval_date,
            rag_start_date=submission.rag_start_date,
            locked_at=submission.locked_at,
            review_comments=submission.review_comments,
            pm_perception_rag=submission.pm_perception_rag,
            pm_rag_comments=submission.pm_rag_comments,
            dm_comments=submission.dm_comments,
            dm_review_date=submission.dm_review_date,
            dm_review_status=submission.dm_review_status,
            dd_comments=submission.dd_comments,
            dd_review_date=submission.dd_review_date,
            dd_review_status=submission.dd_review_status,
            created_at=submission.created_at,
            updated_at=submission.updated_at,
        )

    def create_draft(self, user: User, body: SubmissionCreateRequest) -> SubmissionResponse:
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PM role required")

        project = self._projects.get_by_id(body.project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project not found")
        # PM must be assigned to the project
        self._access.require_can_view_project(user, project)

        period = self._periods.get_by_id(body.governance_period_id)
        if period is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Governance period not found")

        draft_status = self._get_status("DRAFT")
        submission = self._repo.create(
            project_id=project.id,
            governance_period_id=period.id,
            status_id=draft_status.id,
            created_by_user_id=user.id,
            reviewed_by_user_id=None,
            submission_date=None,
            approval_date=None,
            rag_start_date=None,
            locked_at=None,
            review_comments=None,
        )
        self._record_audit_event(
            entity_type="SUBMISSION",
            entity_id=submission.id,
            event_type="DRAFT_CREATED",
            user_id=user.id,
            old_val=None,
            new_val={"status": "DRAFT"}
        )
        self._session.commit()
        submission = self._repo.get_by_id(submission.id)  # reload with joins
        return self._to_response(submission)

    def update_draft(self, user: User, submission_id: uuid.UUID, body: SubmissionDraftUpdateRequest) -> SubmissionResponse:
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PM role required")

        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if submission.created_by_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another user's draft")
        self._access.require_can_view_project(user, submission.project)

        if submission.status.code != "DRAFT" or not submission.status.allows_editing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="PM cannot edit after submit or while submission is not a draft",
            )

        updates: dict = {}
        if body.review_comments is not None:
            updates["review_comments"] = body.review_comments
        if body.rag_start_date is not None:
            updates["rag_start_date"] = body.rag_start_date
        if updates:
            self._repo.update(submission, **updates)
        self._session.commit()
        submission = self._repo.get_by_id(submission_id)
        assert submission is not None
        return self._to_response(submission)

    def delete_draft(self, user: User, submission_id: uuid.UUID) -> None:
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PM role required")

        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if submission.created_by_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete another PM's draft submission")
        
        if submission.status.code != "DRAFT":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only DRAFT submissions can be deleted",
            )

        from sqlalchemy import delete
        from app.models.metric_value import MetricValue
        from app.models.dimension_score import DimensionScore
        from app.models.health_score import HealthScore
        from app.models.submission_lifecycle_audit import SubmissionLifecycleAudit

        self._session.execute(delete(MetricValue).where(MetricValue.submission_id == submission_id))
        self._session.execute(delete(DimensionScore).where(DimensionScore.submission_id == submission_id))
        self._session.execute(delete(HealthScore).where(HealthScore.submission_id == submission_id))
        self._session.execute(delete(SubmissionLifecycleAudit).where(SubmissionLifecycleAudit.submission_id == submission_id))

        self._session.delete(submission)
        self._session.commit()

    def list(self, user: User) -> list[SubmissionResponse]:
        projects = self._access.list_projects_for_user(user)
        submissions = self._repo.list_by_project_ids([p.id for p in projects])
        # Ensure status is loaded for response
        out: list[SubmissionResponse] = []
        for s in submissions:
            # repo list loads status only; fine for list
            out.append(
                SubmissionResponse(
                    id=s.id,
                    project_id=s.project_id,
                    governance_period_id=s.governance_period_id,
                    status_code=s.status.code,
                    created_by_user_id=s.created_by_user_id,
                    reviewed_by_user_id=s.reviewed_by_user_id,
                    submission_date=s.submission_date,
                    approval_date=s.approval_date,
                    rag_start_date=s.rag_start_date,
                    locked_at=s.locked_at,
                    review_comments=s.review_comments,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                )
            )
        return out

    def get_by_id(self, user: User, submission_id: uuid.UUID) -> SubmissionResponse:
        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        # enforce visibility via project visibility rules
        self._access.require_can_view_project(user, submission.project)
        return self._to_response(submission)

    def submit(self, user: User, submission_id: uuid.UUID) -> SubmissionResponse:
        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PM role required")
        if submission.created_by_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot submit another user's draft")
        # Must be PM assigned to the project
        self._access.require_can_view_project(user, submission.project)

        old_status = submission.status.code
        self._transition(submission, "SUBMITTED", actor=user)
        self._transition(submission, "UNDER_REVIEW", actor=user)

        self._record_audit_event(
            entity_type="SUBMISSION",
            entity_id=submission.id,
            event_type="SUBMITTED",
            user_id=user.id,
            old_val={"status": old_status},
            new_val={"status": "UNDER_REVIEW"}
        )

        dh_user_id = submission.project.delivery_head_user_id or (
            submission.project.account.business_unit.delivery_head_user_id
            if submission.project.account and submission.project.account.business_unit
            else None
        )
        if dh_user_id:
            period_name = submission.governance_period.name
            self._create_notification(
                user_id=dh_user_id,
                title="Submission Submitted",
                message=f"{user.full_name} has submitted the governance report for project {submission.project.project_name} for {period_name}.",
                category="WORKFLOW",
                type_str="SUBMISSION_SUBMITTED",
                submission_id=submission.id,
            )

        self._session.commit()
        submission = self._repo.get_by_id(submission.id)
        return self._to_response(submission)

    def approve(self, user: User, submission_id: uuid.UUID) -> SubmissionResponse:
        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if user.role.code != RoleCode.DELIVERY_HEAD:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Delivery Head role required")
        self._access.require_can_view_project(user, submission.project)

        old_status = submission.status.code
        self._transition(submission, "APPROVED", actor=user)

        self._record_audit_event(
            entity_type="SUBMISSION",
            entity_id=submission.id,
            event_type="APPROVED",
            user_id=user.id,
            old_val={"status": old_status},
            new_val={"status": "APPROVED"}
        )

        self._create_notification(
            user_id=submission.created_by_user_id,
            title="Submission Approved",
            message=f"Your submission for project {submission.project.project_name} has been approved by {user.full_name}.",
            category="APPROVAL",
            type_str="SUBMISSION_APPROVED",
            submission_id=submission.id,
        )

        self._session.commit()
        submission = self._repo.get_by_id(submission.id)
        return self._to_response(submission)

    def reject(self, user: User, submission_id: uuid.UUID, body: SubmissionRejectRequest) -> SubmissionResponse:
        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if user.role.code != RoleCode.DELIVERY_HEAD:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Delivery Head role required")
        self._access.require_can_view_project(user, submission.project)

        old_status = submission.status.code
        self._transition(submission, "REJECTED", actor=user, comments=body.review_comments)

        self._record_audit_event(
            entity_type="SUBMISSION",
            entity_id=submission.id,
            event_type="REJECTED",
            user_id=user.id,
            old_val={"status": old_status},
            new_val={"status": "REJECTED"}
        )

        self._create_notification(
            user_id=submission.created_by_user_id,
            title="Submission Rejected",
            message=f"Your submission for project {submission.project.project_name} has been rejected. Comments: {body.review_comments}.",
            category="APPROVAL",
            type_str="SUBMISSION_REJECTED",
            submission_id=submission.id,
        )

        self._session.commit()
        submission = self._repo.get_by_id(submission.id)
        return self._to_response(submission)

    def reopen(self, user: User, submission_id: uuid.UUID, body: SubmissionReopenRequest) -> SubmissionResponse:
        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if user.role.code != RoleCode.DELIVERY_HEAD:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Delivery Head role required")
        self._access.require_can_view_project(user, submission.project)

        old_status = submission.status.code
        self._transition(submission, "REOPENED", actor=user, comments=body.review_comments)
        self._lifecycle_audit.record(
            submission_id=submission.id,
            event_type="REOPENED",
            actor_user_id=user.id,
            detail=body.review_comments,
        )
        self._transition(submission, "DRAFT", actor=user)

        self._record_audit_event(
            entity_type="SUBMISSION",
            entity_id=submission.id,
            event_type="REOPENED",
            user_id=user.id,
            old_val={"status": old_status},
            new_val={"status": "DRAFT"}
        )

        self._create_notification(
            user_id=submission.created_by_user_id,
            title="Submission Reopened",
            message=f"Your submission for project {submission.project.project_name} has been reopened. Comments: {body.review_comments}.",
            category="APPROVAL",
            type_str="SUBMISSION_REOPENED",
            submission_id=submission.id,
        )

        self._session.commit()
        submission = self._repo.get_by_id(submission.id)
        return self._to_response(submission)

    def lock(self, user: User, submission_id: uuid.UUID) -> SubmissionResponse:
        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if user.role.code != RoleCode.DELIVERY_HEAD:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Delivery Head role required")
        self._access.require_can_view_project(user, submission.project)

        old_status = submission.status.code
        self._transition(submission, "LOCKED", actor=user)

        self._record_audit_event(
            entity_type="SUBMISSION",
            entity_id=submission.id,
            event_type="LOCKED",
            user_id=user.id,
            old_val={"status": old_status},
            new_val={"status": "LOCKED"}
        )

        self._session.commit()
        submission = self._repo.get_by_id(submission.id)
        return self._to_response(submission)

    # ── BRD §11.3: resubmit a REJECTED submission ─────────────────────────────
    def resubmit_rejected(self, user: User, submission_id: uuid.UUID) -> SubmissionResponse:
        """Allow PM to revise and resubmit a REJECTED submission (BRD §11.3)."""
        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PM role required")
        if submission.created_by_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot revise another PM's submission")

        old_status = submission.status.code
        self._transition(submission, "DRAFT", actor=user)

        self._record_audit_event(
            entity_type="SUBMISSION",
            entity_id=submission.id,
            event_type="RESUBMIT_REQUESTED",
            user_id=user.id,
            old_val={"status": old_status},
            new_val={"status": "DRAFT"},
        )
        self._session.commit()
        submission = self._repo.get_by_id(submission.id)
        return self._to_response(submission)

    # ── BRD §5.4.1.7: PM sets perception RAG (cannot override computed RAG) ──
    def update_pm_perception_rag(
        self,
        user: User,
        submission_id: uuid.UUID,
        pm_perception_rag: str,
        pm_rag_comments: str | None,
    ) -> SubmissionResponse:
        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PM role required")
        if submission.created_by_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your submission")
        if submission.status.code not in ("DRAFT", "UNDER_REVIEW"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only update PM RAG on DRAFT or UNDER_REVIEW submissions")
        if pm_perception_rag not in ("GREEN", "AMBER", "RED"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RAG must be GREEN, AMBER, or RED")

        self._repo.update(submission, pm_perception_rag=pm_perception_rag, pm_rag_comments=pm_rag_comments)
        self._session.commit()
        submission = self._repo.get_by_id(submission_id)
        assert submission is not None
        return self._to_response(submission)

    # ── BRD §5.5.1.2–3: DM / DD add their review comments ────────────────────
    def add_dm_review(
        self,
        user: User,
        submission_id: uuid.UUID,
        comments: str,
        review_status: str = "REVIEWED",
    ) -> SubmissionResponse:
        """Delivery Manager adds review commentary (BRD §5.5.1.2)."""
        from datetime import datetime, timezone
        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        # DM is the DELIVERY_HEAD role in this system
        if user.role.code not in (RoleCode.DELIVERY_HEAD, RoleCode.CEO, RoleCode.PLATFORM_ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewer role required")
        self._access.require_can_view_project(user, submission.project)

        self._repo.update(
            submission,
            dm_comments=comments,
            dm_review_date=datetime.now(timezone.utc),
            dm_review_status=review_status,
        )
        self._create_notification(
            user_id=submission.created_by_user_id,
            title="DM Review Added",
            message=f"A review comment has been added to your submission for {submission.project.project_name}.",
            category="WORKFLOW",
            type_str="DM_REVIEW_ADDED",
            submission_id=submission.id,
        )
        self._session.commit()
        submission = self._repo.get_by_id(submission_id)
        assert submission is not None
        return self._to_response(submission)

    def add_dd_review(
        self,
        user: User,
        submission_id: uuid.UUID,
        comments: str,
        review_status: str = "REVIEWED",
    ) -> SubmissionResponse:
        """Delivery Director adds review commentary (BRD §5.5.1.2)."""
        from datetime import datetime, timezone
        submission = self._repo.get_by_id(submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if user.role.code not in (RoleCode.DELIVERY_HEAD, RoleCode.CEO, RoleCode.PLATFORM_ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewer role required")
        self._access.require_can_view_project(user, submission.project)

        self._repo.update(
            submission,
            dd_comments=comments,
            dd_review_date=datetime.now(timezone.utc),
            dd_review_status=review_status,
        )
        self._session.commit()
        submission = self._repo.get_by_id(submission_id)
        assert submission is not None
        return self._to_response(submission)

