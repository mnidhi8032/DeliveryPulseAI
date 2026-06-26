"""Metric approval request schemas."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class MetricApprovalRequestCreate(BaseModel):
    kpi_plan_id: UUID
    metric_name: str
    metric_category: str | None = None
    formula: str | None = None
    uom: str | None = None
    intent: str | None = None
    frequency: str | None = None
    priority: str | None = None
    justification: str  # mandatory reason from PM


class MetricApprovalRequestResponse(BaseModel):
    id: UUID
    kpi_plan_id: UUID
    requested_by_user_id: UUID
    reviewed_by_user_id: UUID | None
    metric_name: str
    metric_category: str | None
    formula: str | None
    uom: str | None
    intent: str | None
    frequency: str | None
    priority: str | None
    justification: str
    status: str
    review_comments: str | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    # Enriched
    requested_by_name: str | None = None
    project_name: str | None = None
    model_config = {"from_attributes": True}


class MetricApprovalDecision(BaseModel):
    action: str          # APPROVE | REJECT
    review_comments: str | None = None
