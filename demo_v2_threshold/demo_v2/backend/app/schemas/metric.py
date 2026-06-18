"""Metric API schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class MetricInputItem(BaseModel):
    metric_code: str
    value: Decimal | float | int


class MetricsUpsertRequest(BaseModel):
    submission_id: UUID
    metrics: list[MetricInputItem] = Field(min_length=1)


class MetricValueResponse(BaseModel):
    id: UUID
    submission_id: UUID
    metric_code: str
    metric_name: str
    dimension: str
    value: Decimal
    created_at: datetime
    updated_at: datetime


class DimensionScoreResponse(BaseModel):
    dimension_name: str
    score: Decimal
    weight: Decimal
    rag_status: str
    governance_status: str | None = None


class SubmissionHealthResponse(BaseModel):
    submission_id: UUID
    health_available: bool
    metrics_completed: int
    metrics_required: int
    message: str | None = None
    overall_score: Decimal | None = None
    rag_status: str | None = None
    explanation: str | None = None
    dimension_scores: list[DimensionScoreResponse] = []
    computed_at: datetime | None = None

