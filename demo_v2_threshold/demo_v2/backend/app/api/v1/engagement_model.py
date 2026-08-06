"""Engagement Model Items API — Spec 18.2 + 18.3."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.core.constants import RoleCode
from app.models.user import User
from app.schemas.engagement_model import (
    EngagementModelItemCreate,
    EngagementModelItemUpdate,
    EngagementModelItemResponse,
    MetricMappingCreate,
    MetricMappingUpdate,
    MetricMappingResponse,
)
from app.services.engagement_model_service import EngagementModelService

router = APIRouter(prefix="/engagement-model-items", tags=["engagement-model"])

_ADMIN = require_roles(RoleCode.DELIVERY_EXCELLENCE, RoleCode.PLATFORM_ADMIN)


# ── Items ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[EngagementModelItemResponse])
def list_items(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    item_type: str | None = Query(default=None),
    active_only: bool = Query(default=True),
) -> list[EngagementModelItemResponse]:
    """List engagement model items. Available to all authenticated users (read)."""
    return EngagementModelService(db).list_items(item_type, active_only)


@router.post("", response_model=EngagementModelItemResponse, status_code=201)
def create_item(
    body: EngagementModelItemCreate,
    current_user: Annotated[User, Depends(_ADMIN)],
    db: Annotated[Session, Depends(get_db)],
) -> EngagementModelItemResponse:
    """Create a new dropdown value or dimension. DE / Platform Admin only."""
    return EngagementModelService(db).create_item(current_user, body)


@router.patch("/{item_id}", response_model=EngagementModelItemResponse)
def update_item(
    item_id: UUID,
    body: EngagementModelItemUpdate,
    current_user: Annotated[User, Depends(_ADMIN)],
    db: Annotated[Session, Depends(get_db)],
) -> EngagementModelItemResponse:
    """Edit an existing item (rename, toggle active, set min count). DE / Platform Admin only."""
    return EngagementModelService(db).update_item(current_user, item_id, body)


# ── Metric Mappings ────────────────────────────────────────────────────────────

@router.get("/{item_id}/metrics", response_model=list[MetricMappingResponse])
def list_mappings(
    item_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[MetricMappingResponse]:
    """List catalog metrics mapped to this item."""
    return EngagementModelService(db).list_mappings(item_id)


@router.post("/{item_id}/metrics", response_model=MetricMappingResponse, status_code=201)
def add_mapping(
    item_id: UUID,
    body: MetricMappingCreate,
    current_user: Annotated[User, Depends(_ADMIN)],
    db: Annotated[Session, Depends(get_db)],
) -> MetricMappingResponse:
    """Map a catalog metric to this item. DE / Platform Admin only."""
    return EngagementModelService(db).add_mapping(item_id, body)


@router.patch("/{item_id}/metrics/{catalog_metric_id}", response_model=MetricMappingResponse)
def update_mapping(
    item_id: UUID,
    catalog_metric_id: UUID,
    body: MetricMappingUpdate,
    current_user: Annotated[User, Depends(_ADMIN)],
    db: Annotated[Session, Depends(get_db)],
) -> MetricMappingResponse:
    """Toggle is_mandatory on a mapping. DE / Platform Admin only."""
    return EngagementModelService(db).update_mapping(item_id, catalog_metric_id, body.is_mandatory)


@router.delete("/{item_id}/metrics/{catalog_metric_id}", status_code=204)
def remove_mapping(
    item_id: UUID,
    catalog_metric_id: UUID,
    current_user: Annotated[User, Depends(_ADMIN)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Remove a metric mapping. DE / Platform Admin only."""
    EngagementModelService(db).remove_mapping(item_id, catalog_metric_id)
