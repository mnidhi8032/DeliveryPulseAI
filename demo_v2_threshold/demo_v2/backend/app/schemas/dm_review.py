"""DM Review API schemas."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class DMReviewCreateRequest(BaseModel):
    project_id: UUID
    kpi_plan_id: UUID
    period_label: str
    dm_comments: str | None = None
    action_items: list[str] = []   # list of free-text action items


class DMReviewUpdateRequest(BaseModel):
    dm_comments: str | None = None
    action_items: list[str] | None = None


class DMReviewResponse(BaseModel):
    id: UUID
    project_id: UUID
    kpi_plan_id: UUID
    reviewed_by_user_id: UUID | None
    reviewed_by_name: str | None = None
    period_label: str
    dm_comments: str | None
    action_items: list[str] = []
    reviewed_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectReviewStatus(BaseModel):
    """Summary of a project's review status — returned alongside the project list."""
    project_id: UUID
    kpi_plan_id: UUID
    last_reviewed_at: datetime | None
    last_review_period: str | None
    last_reviewer_name: str | None
    latest_measurement_at: datetime | None
    # True when there are new measurements since the last DM review
    needs_review: bool
    total_reviews: int
