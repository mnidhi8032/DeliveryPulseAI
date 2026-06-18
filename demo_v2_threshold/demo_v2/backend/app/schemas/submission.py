"""Submission API schemas (workflow skeleton, no metrics yet)."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class SubmissionCreateRequest(BaseModel):
    project_id: UUID
    governance_period_id: UUID


class SubmissionResponse(BaseModel):
    id: UUID
    project_id: UUID
    governance_period_id: UUID
    status_code: str

    created_by_user_id: UUID
    reviewed_by_user_id: UUID | None

    submission_date: datetime | None
    approval_date: datetime | None
    rag_start_date: date | None
    locked_at: datetime | None
    review_comments: str | None

    # BRD §5.4.1.7: PM perception RAG
    pm_perception_rag: str | None = None
    pm_rag_comments: str | None = None

    # BRD §5.5.1.3: Multi-tier review comments
    dm_comments: str | None = None
    dm_review_date: datetime | None = None
    dm_review_status: str | None = None
    dd_comments: str | None = None
    dd_review_date: datetime | None = None
    dd_review_status: str | None = None

    created_at: datetime
    updated_at: datetime


class SubmissionRejectRequest(BaseModel):
    review_comments: str = Field(min_length=1)


class SubmissionReopenRequest(BaseModel):
    review_comments: str = Field(min_length=1)


class SubmissionDraftUpdateRequest(BaseModel):
    """PM-only edits while status is DRAFT (workflow skeleton fields, no metrics)."""

    review_comments: str | None = None
    rag_start_date: date | None = None

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "SubmissionDraftUpdateRequest":
        if self.review_comments is None and self.rag_start_date is None:
            raise ValueError("At least one of review_comments or rag_start_date is required")
        return self


# BRD §5.4.1.7: PM perception RAG update request
class PMPerceptionRagRequest(BaseModel):
    pm_perception_rag: str = Field(pattern="^(GREEN|AMBER|RED)$")
    pm_rag_comments: str | None = None


# BRD §5.5.1.2: Reviewer comment request (DM / DD)
class ReviewerCommentRequest(BaseModel):
    comments: str = Field(min_length=1)
    review_status: str = "REVIEWED"

