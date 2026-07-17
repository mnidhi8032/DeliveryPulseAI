"""
Metric Recommendations API — Spec 14.

Two sets of routes:
  1. /qpm/plans/{plan_metric_id}/explain  — PM / DM / DH read
  2. /admin/metric-recommendations        — Platform Admin CRUD
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.core.constants import RoleCode
from app.models.kpi_measurement import KpiMeasurement
from app.models.kpi_plan import KpiPlanMetric
from app.models.user import User
from app.schemas.metric_recommendation import (
    MetricRecommendationCreateRequest,
    MetricRecommendationResponse,
    MetricRecommendationUpdateRequest,
    RagExplainResponse,
)
from app.services.metric_recommendation_service import MetricRecommendationService
from app.services.rag_explainer import extract_and_explain

# ── Router ─────────────────────────────────────────────────────────────────────
router = APIRouter(tags=["metric-recommendations"])


# ─────────────────────────────────────────────────────────────────────────────
# /explain — PM, DM, DH
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/qpm/plans/{plan_metric_id}/explain",
    response_model=RagExplainResponse,
    summary="Explain why a metric is Red or Amber",
)
def explain_metric(
    plan_metric_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RagExplainResponse:
    """
    Returns a plain-English explanation of why the metric's latest measurement
    is Red or Amber, plus an admin-configured recommendation.

    Returns explanation=None and recommendation=None when RAG is GREEN or no data.
    """
    # 1. Load the plan metric (thresholds, intent, name)
    pm: KpiPlanMetric | None = db.get(KpiPlanMetric, plan_metric_id)
    if pm is None:
        return RagExplainResponse(
            explanation=None, recommendation=None,
            breach_type=None, is_worsening=False, is_first_breach=True,
        )

    # 2. Load all measurements for this metric, ordered oldest → newest
    measurements = list(
        db.execute(
            select(KpiMeasurement)
            .where(KpiMeasurement.plan_metric_id == plan_metric_id)
            .order_by(KpiMeasurement.submitted_date.asc().nullslast(),
                      KpiMeasurement.created_at.asc())
        ).scalars().all()
    )

    if not measurements:
        return RagExplainResponse(
            explanation=None, recommendation=None,
            breach_type=None, is_worsening=False, is_first_breach=True,
        )

    latest = measurements[-1]

    # 3. Only explain RED / AMBER
    if latest.rag_status not in ("RED", "AMBER"):
        return RagExplainResponse(
            explanation=None, recommendation=None,
            breach_type=None, is_worsening=False, is_first_breach=True,
        )

    # 4. Build recent history (all but latest), extract values
    recent_values = [
        float(m.actual_value)
        for m in measurements[:-1]
        if m.actual_value is not None
    ]

    # 5. Run the explainer
    result = extract_and_explain(
        metric_name   = pm.metric_name,
        actual        = latest.actual_value,
        uom           = pm.uom,
        intent        = pm.intent,
        target        = latest.target,
        lsl           = latest.lsl,
        usl           = latest.usl,
        rag           = latest.rag_status,
        recent_values = recent_values,
    )

    # 6. Look up the recommendation from DB
    recommendation_text: str | None = None
    if result["breach_type"]:
        rec = MetricRecommendationService(db).get_for(pm.metric_name, result["breach_type"])
        if rec:
            recommendation_text = rec.recommendation_text

    return RagExplainResponse(
        explanation     = result["explanation"],
        recommendation  = recommendation_text,
        breach_type     = result["breach_type"],
        is_worsening    = result["is_worsening"],
        is_first_breach = result["is_first_breach"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# Admin CRUD — Platform Admin only
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/admin/metric-recommendations",
    response_model=list[MetricRecommendationResponse],
    summary="List all metric recommendations (Platform Admin)",
)
def list_recommendations(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> list[MetricRecommendationResponse]:
    rows = MetricRecommendationService(db).list_all()
    return [MetricRecommendationResponse.model_validate(r) for r in rows]


@router.post(
    "/admin/metric-recommendations",
    response_model=MetricRecommendationResponse,
    status_code=201,
    summary="Create a metric recommendation (Platform Admin)",
)
def create_recommendation(
    body: MetricRecommendationCreateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> MetricRecommendationResponse:
    row = MetricRecommendationService(db).create(
        metric_name=body.metric_name,
        breach_type=body.breach_type,
        recommendation_text=body.recommendation_text,
    )
    return MetricRecommendationResponse.model_validate(row)


@router.put(
    "/admin/metric-recommendations/{rec_id}",
    response_model=MetricRecommendationResponse,
    summary="Update a metric recommendation (Platform Admin)",
)
def update_recommendation(
    rec_id: UUID,
    body: MetricRecommendationUpdateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> MetricRecommendationResponse:
    row = MetricRecommendationService(db).update(rec_id, body.recommendation_text)
    return MetricRecommendationResponse.model_validate(row)


@router.delete(
    "/admin/metric-recommendations/{rec_id}",
    status_code=204,
    summary="Delete a metric recommendation (Platform Admin)",
)
def delete_recommendation(
    rec_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    MetricRecommendationService(db).delete(rec_id)
