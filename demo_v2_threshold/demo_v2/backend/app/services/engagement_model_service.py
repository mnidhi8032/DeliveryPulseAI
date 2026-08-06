"""Engagement Model Service — manage dropdown items and metric mappings."""
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.engagement_model_item import EngagementModelItem
from app.models.engagement_model_metric_mapping import EngagementModelMetricMapping
from app.models.qpm_catalog_metric import QPMCatalogMetric
from app.models.user import User
from app.schemas.engagement_model import (
    EngagementModelItemCreate,
    EngagementModelItemUpdate,
    EngagementModelItemResponse,
    MetricMappingCreate,
    MetricMappingResponse,
    ITEM_TYPES,
)


class EngagementModelService:
    def __init__(self, session: Session) -> None:
        self._s = session

    # ── Items CRUD ────────────────────────────────────────────────────────────

    def list_items(
        self,
        item_type: str | None = None,
        active_only: bool = True,
    ) -> list[EngagementModelItemResponse]:
        stmt = select(EngagementModelItem)
        if item_type:
            stmt = stmt.where(EngagementModelItem.item_type == item_type)
        if active_only:
            stmt = stmt.where(EngagementModelItem.is_active == True)
        stmt = stmt.order_by(
            EngagementModelItem.item_type,
            EngagementModelItem.sort_order,
            EngagementModelItem.value,
        )
        rows = list(self._s.execute(stmt).scalars().all())
        return [EngagementModelItemResponse.model_validate(r) for r in rows]

    def get_item(self, item_id: uuid.UUID) -> EngagementModelItem:
        item = self._s.get(EngagementModelItem, item_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Engagement model item not found")
        return item

    def create_item(
        self, user: User, body: EngagementModelItemCreate,
    ) -> EngagementModelItemResponse:
        if body.item_type not in ITEM_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"item_type must be one of {sorted(ITEM_TYPES)}",
            )
        # Uniqueness check
        existing = self._s.execute(
            select(EngagementModelItem).where(
                EngagementModelItem.item_type == body.item_type,
                EngagementModelItem.value == body.value,
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"'{body.value}' already exists for type '{body.item_type}'",
            )
        now = datetime.now(timezone.utc)
        item = EngagementModelItem(
            id=uuid.uuid4(),
            item_type=body.item_type,
            value=body.value,
            description=body.description,
            sort_order=body.sort_order,
            min_mandatory_count=body.min_mandatory_count if body.item_type == "DIMENSION" else 0,
            is_active=True,
            created_by_user_id=user.id,
            created_at=now,
            updated_at=now,
        )
        self._s.add(item)
        self._s.commit()
        self._s.refresh(item)
        return EngagementModelItemResponse.model_validate(item)

    def update_item(
        self, user: User, item_id: uuid.UUID, body: EngagementModelItemUpdate,
    ) -> EngagementModelItemResponse:
        item = self.get_item(item_id)
        if body.value is not None:
            item.value = body.value
        if body.description is not None:
            item.description = body.description
        if body.is_active is not None:
            item.is_active = body.is_active
        if body.sort_order is not None:
            item.sort_order = body.sort_order
        if body.min_mandatory_count is not None and item.item_type == "DIMENSION":
            item.min_mandatory_count = body.min_mandatory_count
        item.updated_at = datetime.now(timezone.utc)
        self._s.commit()
        self._s.refresh(item)
        return EngagementModelItemResponse.model_validate(item)

    # ── Metric Mappings ───────────────────────────────────────────────────────

    def list_mappings(self, item_id: uuid.UUID) -> list[MetricMappingResponse]:
        # Verify item exists
        self.get_item(item_id)
        stmt = (
            select(EngagementModelMetricMapping)
            .where(EngagementModelMetricMapping.engagement_item_id == item_id)
            .order_by(EngagementModelMetricMapping.created_at)
        )
        rows = list(self._s.execute(stmt).scalars().all())
        results = []
        for row in rows:
            resp = MetricMappingResponse.model_validate(row)
            # Resolve catalog metric name and category
            metric = self._s.get(QPMCatalogMetric, row.catalog_metric_id)
            if metric:
                resp.metric_name = metric.name
                resp.metric_category = metric.category
            results.append(resp)
        return results

    def add_mapping(
        self, item_id: uuid.UUID, body: MetricMappingCreate,
    ) -> MetricMappingResponse:
        self.get_item(item_id)
        # Verify catalog metric exists
        metric = self._s.get(QPMCatalogMetric, body.catalog_metric_id)
        if metric is None:
            raise HTTPException(status_code=404, detail="Catalog metric not found")
        # Idempotency check
        existing = self._s.execute(
            select(EngagementModelMetricMapping).where(
                EngagementModelMetricMapping.engagement_item_id == item_id,
                EngagementModelMetricMapping.catalog_metric_id == body.catalog_metric_id,
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="This metric is already mapped to this item")
        mapping = EngagementModelMetricMapping(
            id=uuid.uuid4(),
            engagement_item_id=item_id,
            catalog_metric_id=body.catalog_metric_id,
            is_mandatory=body.is_mandatory,
            created_at=datetime.now(timezone.utc),
        )
        self._s.add(mapping)
        self._s.commit()
        self._s.refresh(mapping)
        resp = MetricMappingResponse.model_validate(mapping)
        resp.metric_name = metric.name
        resp.metric_category = metric.category
        return resp

    def update_mapping(
        self, item_id: uuid.UUID, catalog_metric_id: uuid.UUID, is_mandatory: bool,
    ) -> MetricMappingResponse:
        mapping = self._s.execute(
            select(EngagementModelMetricMapping).where(
                EngagementModelMetricMapping.engagement_item_id == item_id,
                EngagementModelMetricMapping.catalog_metric_id == catalog_metric_id,
            )
        ).scalar_one_or_none()
        if mapping is None:
            raise HTTPException(status_code=404, detail="Mapping not found")
        mapping.is_mandatory = is_mandatory
        self._s.commit()
        self._s.refresh(mapping)
        resp = MetricMappingResponse.model_validate(mapping)
        metric = self._s.get(QPMCatalogMetric, catalog_metric_id)
        if metric:
            resp.metric_name = metric.name
            resp.metric_category = metric.category
        return resp

    def remove_mapping(self, item_id: uuid.UUID, catalog_metric_id: uuid.UUID) -> None:
        mapping = self._s.execute(
            select(EngagementModelMetricMapping).where(
                EngagementModelMetricMapping.engagement_item_id == item_id,
                EngagementModelMetricMapping.catalog_metric_id == catalog_metric_id,
            )
        ).scalar_one_or_none()
        if mapping is None:
            raise HTTPException(status_code=404, detail="Mapping not found")
        self._s.delete(mapping)
        self._s.commit()

    # ── 18.3: Finalization validation ─────────────────────────────────────────

    def validate_finalization(self, plan_id: uuid.UUID) -> list[str]:
        """Return a list of violation messages for categories below their
        min_mandatory_count. Empty list means the plan passes validation."""
        from app.models.kpi_plan import KpiPlanMetric
        from sqlalchemy import func

        # Get all active DIMENSION items that have a minimum count
        dimensions = list(
            self._s.execute(
                select(EngagementModelItem).where(
                    EngagementModelItem.item_type == "DIMENSION",
                    EngagementModelItem.is_active == True,
                    EngagementModelItem.min_mandatory_count > 0,
                )
            ).scalars().all()
        )
        violations: list[str] = []
        for dim in dimensions:
            count = (
                self._s.execute(
                    select(func.count()).where(
                        KpiPlanMetric.kpi_plan_id == plan_id,
                        KpiPlanMetric.metric_category == dim.value,
                        KpiPlanMetric.is_active == True,
                    )
                ).scalar()
                or 0
            )
            if count < dim.min_mandatory_count:
                violations.append(
                    f"{dim.value}: requires at least {dim.min_mandatory_count} "
                    f"metric(s), but only {count} selected"
                )
        return violations
