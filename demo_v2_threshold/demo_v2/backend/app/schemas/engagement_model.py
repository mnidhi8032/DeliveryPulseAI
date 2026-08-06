"""Pydantic schemas for engagement model items and metric mappings."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


# ── Item types constant (mirrors frontend) ────────────────────────────────────
ITEM_TYPES = {
    "PROJECT_TYPE",
    "DELIVERY_MODEL",
    "PROJECT_CATEGORY",
    "WORK_SIZE_UNIT",
    "DIMENSION",
}


# ── Engagement Model Item ─────────────────────────────────────────────────────

class EngagementModelItemCreate(BaseModel):
    item_type: str           # PROJECT_TYPE | DELIVERY_MODEL | PROJECT_CATEGORY | WORK_SIZE_UNIT | DIMENSION
    value: str
    description: str | None = None
    sort_order: int = 0
    min_mandatory_count: int = 0    # only meaningful for DIMENSION rows


class EngagementModelItemUpdate(BaseModel):
    value: str | None = None
    description: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    min_mandatory_count: int | None = None    # only for DIMENSION rows


class EngagementModelItemResponse(BaseModel):
    id: UUID
    item_type: str
    value: str
    description: str | None
    is_active: bool
    sort_order: int
    min_mandatory_count: int
    created_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Metric Mapping ────────────────────────────────────────────────────────────

class MetricMappingCreate(BaseModel):
    catalog_metric_id: UUID
    is_mandatory: bool = False


class MetricMappingUpdate(BaseModel):
    is_mandatory: bool


class MetricMappingResponse(BaseModel):
    id: UUID
    engagement_item_id: UUID
    catalog_metric_id: UUID
    is_mandatory: bool
    # Denormalised catalog fields for display — resolved by the service
    metric_name: str | None = None
    metric_category: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}
