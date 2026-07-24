"""Schemas for the unified period-level parameter entry."""
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class PeriodMeasureItem(BaseModel):
    measure_name: str
    actual_value: Decimal | None = None
    # NULL = shared default; non-NULL = per-metric override for this plan_metric_id only
    plan_metric_id: UUID | None = None


class PeriodMeasureSaveRequest(BaseModel):
    plan_id: UUID
    period_label: str
    frequency: str | None = None
    from_date: date | None = None
    to_date: date | None = None
    measures: list[PeriodMeasureItem]
    # Optional PM-edited thresholds: {plan_metric_id -> {lsl, target, usl}}
    thresholds: dict[str, dict[str, float | None]] = {}


class PeriodMeasureResponse(BaseModel):
    measure_name: str
    actual_value: Decimal | None
    updated_at: datetime
    plan_metric_id: UUID | None = None

    model_config = {"from_attributes": True}


class MetricComputeResult(BaseModel):
    """Result of auto-computing one metric from the shared parameters."""
    plan_metric_id: UUID
    metric_name: str
    metric_category: str | None
    frequency_name: str
    actual_value: Decimal | None
    rag_status: str | None
    target: Decimal | None
    lsl: Decimal | None
    usl: Decimal | None
    # Whether all required measures were present
    complete: bool
    missing_measures: list[str] = []


class PeriodSaveResponse(BaseModel):
    period_label: str
    saved_measures: list[PeriodMeasureResponse]
    computed_metrics: list[MetricComputeResult]


class AllMeasuresForPeriodResponse(BaseModel):
    """All parameters needed for a project's active metrics, with current values."""
    period_label: str
    # All unique measure names across all active metrics, with usage counts
    measures: list[dict]   # {measure_name, actual_value, metrics_using: [...metric names]}
    # All active metrics with their thresholds
    metrics: list[dict]    # {plan_metric_id, metric_name, lsl, target, usl, required_measures}
    # History: all past KpiMeasurement rows for all metrics
    history: list[dict]
