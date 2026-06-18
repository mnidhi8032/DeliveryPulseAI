"""Submission API routes (Phase 3 lifecycle skeleton)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.core.constants import RoleCode
from app.models.user import User
from app.schemas.metric import SubmissionHealthResponse
from app.schemas.submission import (
    SubmissionCreateRequest,
    SubmissionDraftUpdateRequest,
    SubmissionRejectRequest,
    SubmissionReopenRequest,
    SubmissionResponse,
    PMPerceptionRagRequest,
    ReviewerCommentRequest,
)
from app.services.submission_health_service import SubmissionHealthService
from app.services.submission_service import SubmissionService

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("", response_model=SubmissionResponse, status_code=201)
def create_submission(
    body: SubmissionCreateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    return SubmissionService(db).create_draft(current_user, body)


@router.get("", response_model=list[SubmissionResponse])
def list_submissions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[SubmissionResponse]:
    return SubmissionService(db).list(current_user)


@router.get("/{submission_id}/health", response_model=SubmissionHealthResponse)
def get_submission_health(
    submission_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionHealthResponse:
    return SubmissionHealthService(db).get_health(current_user, submission_id)


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    return SubmissionService(db).get_by_id(current_user, submission_id)


@router.patch("/{submission_id}", response_model=SubmissionResponse)
def update_submission_draft(
    submission_id: UUID,
    body: SubmissionDraftUpdateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    return SubmissionService(db).update_draft(current_user, submission_id, body)


@router.post("/{submission_id}/submit", response_model=SubmissionResponse)
def submit_submission(
    submission_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    return SubmissionService(db).submit(current_user, submission_id)


@router.post("/{submission_id}/approve", response_model=SubmissionResponse)
def approve_submission(
    submission_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    return SubmissionService(db).approve(current_user, submission_id)


@router.post("/{submission_id}/reject", response_model=SubmissionResponse)
def reject_submission(
    submission_id: UUID,
    body: SubmissionRejectRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    return SubmissionService(db).reject(current_user, submission_id, body)


@router.post("/{submission_id}/reopen", response_model=SubmissionResponse)
def reopen_submission(
    submission_id: UUID,
    body: SubmissionReopenRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    return SubmissionService(db).reopen(current_user, submission_id, body)


@router.post("/{submission_id}/lock", response_model=SubmissionResponse)
def lock_submission(
    submission_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.BU_HEAD))],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    return SubmissionService(db).lock(current_user, submission_id)


@router.delete("/{submission_id}", status_code=204)
def delete_submission_draft(
    submission_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    SubmissionService(db).delete_draft(current_user, submission_id)


# ── BRD §11.3: PM resubmits a REJECTED submission ─────────────────────────────
@router.post("/{submission_id}/resubmit", response_model=SubmissionResponse)
def resubmit_rejected(
    submission_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    """Move a REJECTED submission back to DRAFT so PM can revise and resubmit."""
    return SubmissionService(db).resubmit_rejected(current_user, submission_id)


# ── BRD §5.4.1.7: PM sets perception RAG ─────────────────────────────────────
@router.patch("/{submission_id}/pm-rag", response_model=SubmissionResponse)
def update_pm_rag(
    submission_id: UUID,
    body: PMPerceptionRagRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    """PM sets their perceived overall RAG status (stored separately from computed RAG)."""
    return SubmissionService(db).update_pm_perception_rag(
        current_user, submission_id, body.pm_perception_rag, body.pm_rag_comments
    )


# ── BRD §5.5.1.2: DM adds review commentary ──────────────────────────────────
@router.post("/{submission_id}/dm-review", response_model=SubmissionResponse)
def add_dm_review(
    submission_id: UUID,
    body: ReviewerCommentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    """Delivery Manager adds review commentary on a submission."""
    return SubmissionService(db).add_dm_review(
        current_user, submission_id, body.comments, body.review_status
    )


# ── BRD §5.5.1.2: DD adds review commentary ──────────────────────────────────
@router.post("/{submission_id}/dd-review", response_model=SubmissionResponse)
def add_dd_review(
    submission_id: UUID,
    body: ReviewerCommentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SubmissionResponse:
    """Delivery Director adds review commentary on a submission."""
    return SubmissionService(db).add_dd_review(
        current_user, submission_id, body.comments, body.review_status
    )


