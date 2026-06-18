"""QPM API routes — Sheet 1–5 exact replica."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.qpm import (
    KpiComputeRequest, KpiDocInfoRequest, KpiDocInfoResponse,
    KpiDocVersionHistoryRequest, KpiDocVersionHistoryResponse,
    KpiMeasureEntryCreateRequest, KpiMeasureEntryResponse,
    KpiMeasurementResponse, KpiMeasurementUpdateRequest,
    KpiPlanMetricCreateRequest, KpiPlanMetricResponse, KpiPlanMetricUpdateRequest,
    KpiPlanResponse, KpiPlanUpdateRequest, KpiSummaryResponse,
    KpiTrackerRowResponse, QPMCatalogMetricResponse,
    QPMSubmitRequest,
)
from app.services.qpm_service import QPMService, get_required_measures

router = APIRouter(prefix="/qpm", tags=["qpm"])


# ── Catalog ─────────────────────────────────────────────────────────────────────

@router.get("/catalog", response_model=list[QPMCatalogMetricResponse])
def list_catalog(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    category: str | None = Query(default=None),
    project_type: str | None = Query(default=None),
    delivery_model: str | None = Query(default=None),
):
    return QPMService(db).list_catalog(category, project_type, delivery_model)


@router.get("/catalog/measures")
def get_metric_required_measures(
    metric_name: str = Query(),
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
):
    """Return the list of raw measures required to compute a given metric."""
    return {"metric_name": metric_name, "required_measures": get_required_measures(metric_name)}


# Keep old path-param route for backwards compat
@router.get("/catalog/measures/{metric_name}")
def get_metric_required_measures_path(
    metric_name: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Return the list of raw measures required to compute a given metric (path param variant)."""
    return {"metric_name": metric_name, "required_measures": get_required_measures(metric_name)}


# ── KPI Plan (Sheet 1) ──────────────────────────────────────────────────────────

@router.get("/plans/by-project/{project_id}", response_model=KpiPlanResponse)
def get_or_create_plan(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).get_or_create_plan(current_user, project_id)


@router.patch("/plans/{plan_id}/config", response_model=KpiPlanResponse)
def update_plan(
    plan_id: UUID,
    body: KpiPlanUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).update_plan(current_user, plan_id, body)


@router.post("/plans/{plan_id}/metrics", response_model=KpiPlanMetricResponse, status_code=201)
def add_metric(
    plan_id: UUID,
    body: KpiPlanMetricCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).add_metric_to_plan(current_user, plan_id, body)


@router.patch("/plan-metrics/{metric_id}", response_model=KpiPlanMetricResponse)
def update_plan_metric(
    metric_id: UUID,
    body: KpiPlanMetricUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).update_plan_metric(current_user, metric_id, body)


@router.delete("/plan-metrics/{metric_id}", status_code=204)
def remove_plan_metric(
    metric_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    QPMService(db).remove_plan_metric(current_user, metric_id)


# ── Measure Entry (Sheet 2) ──────────────────────────────────────────────────────

@router.post("/measure-entries", response_model=KpiMeasureEntryResponse, status_code=201)
def add_measure_entry(
    body: KpiMeasureEntryCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).add_measure_entry(current_user, body)


@router.get("/measure-entries", response_model=list[KpiMeasureEntryResponse])
def list_measure_entries(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    plan_metric_id: UUID = Query(),
    frequency_name: str | None = Query(default=None),
):
    return QPMService(db).list_measure_entries(plan_metric_id, frequency_name)


# ── Compute KPI from measures ────────────────────────────────────────────────────

@router.post("/compute/{plan_metric_id}", response_model=KpiMeasurementResponse)
def compute_kpi(
    plan_metric_id: UUID,
    body: KpiComputeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).compute_kpi(
        current_user, plan_metric_id,
        body.frequency_name, body.from_date, body.to_date,
        override_target=body.override_target,
        override_lsl=body.override_lsl,
        override_usl=body.override_usl,
        analysis_comments=body.analysis_comments,
    )


# ── KPI Tracker (Sheet 3) ────────────────────────────────────────────────────────

@router.get("/plans/{plan_id}/tracker", response_model=list[KpiTrackerRowResponse])
def get_tracker(
    plan_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).get_tracker(current_user, plan_id)


@router.patch("/measurements/{measurement_id}", response_model=KpiMeasurementResponse)
def update_measurement(
    measurement_id: UUID,
    body: KpiMeasurementUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).update_tracker_row(current_user, measurement_id, body)


# ── KPI Summary (Sheet 4) ────────────────────────────────────────────────────────

@router.get("/plans/{plan_id}/summary", response_model=KpiSummaryResponse)
def get_summary(
    plan_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).get_summary(current_user, plan_id)


@router.get("/plan-metrics/{plan_metric_id}/trend")
def get_metric_trend(
    plan_metric_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Return full time-series history for a single plan metric for sparkline rendering."""
    return QPMService(db).get_metric_trend(current_user, plan_metric_id)


# ── Doc Info (Sheet 5) ───────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/doc-info", response_model=KpiDocInfoResponse)
def get_doc_info(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).get_or_create_doc_info(current_user, project_id)


@router.post("/projects/{project_id}/doc-info", response_model=KpiDocInfoResponse)
def save_doc_info(
    project_id: UUID,
    body: KpiDocInfoRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).save_doc_info(current_user, project_id, body)


@router.post("/doc-info/{doc_info_id}/version-history", response_model=KpiDocVersionHistoryResponse, status_code=201)
def add_version_history(
    doc_info_id: UUID,
    body: KpiDocVersionHistoryRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return QPMService(db).add_version_history(current_user, doc_info_id, body)


# ── QPM Submit / Review Workflow ─────────────────────────────────────────────────

@router.post("/plans/{plan_id}/submit", response_model=KpiPlanResponse)
def submit_qpm_plan(
    plan_id: UUID,
    body: QPMSubmitRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """PM submits the KPI Plan. Auto-approved immediately — no DH review step."""
    return QPMService(db).submit_qpm_plan(
        current_user, plan_id, body.pm_perception_rag, body.pm_rag_comments
    )


@router.post("/plans/{plan_id}/reopen", response_model=KpiPlanResponse)
def reopen_qpm_plan(
    plan_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """PM reopens an APPROVED KPI Plan to revise data and re-submit."""
    return QPMService(db).reopen_qpm_plan(current_user, plan_id)
