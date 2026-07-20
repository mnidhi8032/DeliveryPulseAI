"""Pydantic schemas for MetricRecommendation — Spec 14."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MetricRecommendationResponse(BaseModel):
    id: UUID
    metric_name: str
    breach_type: str
    recommendation_text: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MetricRecommendationCreateRequest(BaseModel):
    metric_name: str
    breach_type: str
    recommendation_text: str


class MetricRecommendationUpdateRequest(BaseModel):
    recommendation_text: str


# ── /explain endpoint response ────────────────────────────────────────────────

class RagExplainResponse(BaseModel):
    """
    Returned by GET /qpm/plans/{plan_metric_id}/explain.

    explanation and recommendation are None when RAG is GREEN or no data.
    """
    explanation: str | None
    recommendation: str | None
    breach_type: str | None
    is_worsening: bool
    is_first_breach: bool
