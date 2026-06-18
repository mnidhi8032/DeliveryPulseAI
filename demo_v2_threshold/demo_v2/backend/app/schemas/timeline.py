"""Timeline and trend schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class DimensionHistoryRow(BaseModel):
    dimension_name: str
    score: float


class HealthHistoryEvent(BaseModel):
    submission_id: UUID
    date: datetime
    overall_score: float | None
    rag_status: str | None
    dimensions: list[DimensionHistoryRow]


class SubmissionTimelineEvent(BaseModel):
    submission_id: UUID
    date: datetime
    overall_score: float | None
    rag_status: str | None
    status_code: str
    trend: Literal["improving", "declining", "stable", "none"]
    action_description: str
    actor_name: str | None
    actor_role: str | None
    
    # lifecycle dates
    created_at: datetime
    submission_date: datetime | None
    approval_date: datetime | None
    locked_at: datetime | None
