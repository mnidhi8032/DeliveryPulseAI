"""QPM Plan API schemas."""
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class QPMCatalogMetricResponse(BaseModel):
    id: UUID
    category: str
    name: str
    objective_type: str | None
    org_goal: str | None
    higher_objective: str | None
    formula: str | None
    uom: str | None
    metrics_type: str | None
    intent: str | None
    project_type: str | None
    delivery_model: str | None
    project_category: str | None
    frequency: str | None
    compliance: str | None
    default_target: Decimal | None
    default_lsl: Decimal | None
    default_usl: Decimal | None
    is_active: bool
    model_config = {"from_attributes": True}


class KpiPlanCreateRequest(BaseModel):
    project_id: UUID

class KpiPlanUpdateRequest(BaseModel):
    project_type: str | None = None
    delivery_process_model: str | None = None
    project_category: str | None = None
    work_size_unit: str | None = None
    is_finalized: bool | None = None
    pm_perception_rag: str | None = None
    pm_rag_comments: str | None = None

class KpiPlanMetricCreateRequest(BaseModel):
    catalog_metric_id: UUID | None = None
    metric_name: str
    metric_category: str | None = None
    formula: str | None = None
    uom: str | None = None
    intent: str | None = None
    frequency: str | None = None
    priority: str | None = None
    target: Decimal | None = None
    lsl: Decimal | None = None
    usl: Decimal | None = None
    is_custom: bool = False
    tailoring_reason: str | None = None
    reported_to_customer: bool = False
    rationale: str | None = None
    data_source: str | None = None

class KpiPlanMetricUpdateRequest(BaseModel):
    frequency: str | None = None
    priority: str | None = None
    target: Decimal | None = None
    lsl: Decimal | None = None
    usl: Decimal | None = None
    reported_to_customer: bool | None = None
    rationale: str | None = None
    data_source: str | None = None
    is_active: bool | None = None
    tailoring_reason: str | None = None

class KpiPlanMetricResponse(BaseModel):
    id: UUID
    kpi_plan_id: UUID
    catalog_metric_id: UUID | None
    metric_name: str
    metric_category: str | None
    formula: str | None
    uom: str | None
    intent: str | None
    frequency: str | None
    priority: str | None
    target: Decimal | None
    lsl: Decimal | None
    usl: Decimal | None
    is_custom: bool
    tailoring_reason: str | None
    reported_to_customer: bool
    rationale: str | None
    data_source: str | None
    is_active: bool
    required_measures: str | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class KpiPlanResponse(BaseModel):
    id: UUID
    project_id: UUID
    project_type: str | None
    delivery_process_model: str | None
    project_category: str | None
    work_size_unit: str | None
    is_finalized: bool
    # QPM submission workflow
    qpm_status: str
    qpm_submitted_at: datetime | None = None
    qpm_approved_at: datetime | None = None
    qpm_reviewed_by_user_id: UUID | None = None
    qpm_review_comments: str | None = None
    # PM perception RAG
    pm_perception_rag: str | None = None
    pm_rag_comments: str | None = None
    metrics: list[KpiPlanMetricResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# QPM submit/review requests
class QPMSubmitRequest(BaseModel):
    pm_perception_rag: str | None = None   # GREEN | AMBER | RED
    pm_rag_comments: str | None = None

class QPMReviewRequest(BaseModel):
    action: str   # APPROVE | REJECT
    review_comments: str | None = None


# Sheet 2 — Raw measure entry
class KpiMeasureEntryCreateRequest(BaseModel):
    plan_metric_id: UUID
    measure_name: str
    actual_value: Decimal | None = None
    uom: str | None = None
    frequency: str | None = None
    frequency_name: str | None = None
    from_date: date | None = None
    to_date: date | None = None

class KpiMeasureEntryResponse(BaseModel):
    id: UUID
    plan_metric_id: UUID
    measure_name: str
    actual_value: Decimal | None
    uom: str | None
    frequency: str | None
    frequency_name: str | None
    from_date: date | None
    to_date: date | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# Sheet 3 — Computed tracker row
class KpiMeasurementCreateRequest(BaseModel):
    plan_metric_id: UUID
    frequency: str | None = None
    frequency_name: str | None = None
    from_date: date | None = None
    to_date: date | None = None
    actual_value: Decimal | None = None
    target: Decimal | None = None
    lsl: Decimal | None = None
    usl: Decimal | None = None
    analysis_comments: str | None = None
    action_taken: str | None = None
    responsibility: str | None = None
    action_status: str | None = None

class KpiMeasurementUpdateRequest(BaseModel):
    actual_value: Decimal | None = None
    target: Decimal | None = None
    lsl: Decimal | None = None
    usl: Decimal | None = None
    analysis_comments: str | None = None
    action_taken: str | None = None
    responsibility: str | None = None
    action_status: str | None = None
    frequency_name: str | None = None
    from_date: date | None = None
    to_date: date | None = None

class KpiMeasurementResponse(BaseModel):
    id: UUID
    plan_metric_id: UUID
    metric_name: str | None = None
    metric_category: str | None = None
    uom: str | None = None
    intent: str | None = None
    frequency: str | None
    frequency_name: str | None
    from_date: date | None
    to_date: date | None
    actual_value: Decimal | None
    target: Decimal | None
    lsl: Decimal | None
    usl: Decimal | None
    measure1_name: str | None = None
    measure1_value: Decimal | None = None
    measure2_name: str | None = None
    measure2_value: Decimal | None = None
    measure3_name: str | None = None
    measure3_value: Decimal | None = None
    measure4_name: str | None = None
    measure4_value: Decimal | None = None
    submitted_by: str | None = None
    submitted_date: datetime | None = None
    analysis_comments: str | None
    action_taken: str | None
    responsibility: str | None
    action_status: str | None
    updated_by: str | None
    rag_status: str | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

# Full tracker row (Sheet 3 exact replica)
class KpiTrackerRowResponse(BaseModel):
    id: UUID
    plan_metric_id: UUID
    metric: str
    frequency: str | None
    frequency_name: str | None
    actual_value: Decimal | None
    uom: str | None
    target_operator: str | None
    target: Decimal | None
    lsl: Decimal | None
    usl: Decimal | None
    measure1_name: str | None
    measure1_value: Decimal | None
    measure2_name: str | None
    measure2_value: Decimal | None
    measure3_name: str | None
    measure3_value: Decimal | None
    measure4_name: str | None
    measure4_value: Decimal | None
    from_date: date | None
    to_date: date | None
    submitted_by: str | None
    submitted_date: datetime | None
    rag_status: str | None
    analysis_comments: str | None
    action_taken: str | None
    responsibility: str | None
    action_status: str | None
    updated_by: str | None
    updated_date: datetime | None


# Sheet 4 — Summary
class KpiSummaryMetric(BaseModel):
    plan_metric_id: UUID
    metric_name: str
    metric_category: str | None
    uom: str | None
    intent: str | None
    latest_value: Decimal | None
    target: Decimal | None
    lsl: Decimal | None
    usl: Decimal | None
    rag_status: str | None
    trend: str | None
    measurement_count: int
    last_updated: datetime | None
    # Time-series history for sparkline: list of {period, value, rag, target, lsl, usl}
    history: list[dict] = []

class KpiSummaryResponse(BaseModel):
    kpi_plan_id: UUID
    project_id: UUID
    project_type: str | None
    delivery_process_model: str | None
    is_finalized: bool
    total_metrics: int
    green_count: int
    amber_count: int
    red_count: int
    no_data_count: int
    # Aggregated RAG by category (dimension): any RED → RED, else any AMBER → AMBER, else GREEN
    category_rag: dict[str, str] = {}     # { "Internal Quality": "RED", "Efficiency": "GREEN", ... }
    # Overall project RAG: any category RED → RED, else any AMBER → AMBER, else GREEN
    overall_rag: str | None = None
    metrics: list[KpiSummaryMetric]


# Sheet 5 — Doc Info
class KpiDocInfoRequest(BaseModel):
    project_name: str | None = None
    project_id_code: str | None = None
    customer_name: str | None = None
    document_title: str | None = None
    issue_no: str | None = None
    pm_name: str | None = None
    issue_date: date | None = None
    prepared_by: str | None = None
    preparation_date: date | None = None
    reviewed_by: str | None = None
    review_date: date | None = None
    template_version: str | None = None

class KpiDocVersionHistoryRequest(BaseModel):
    issue_id: str | None = None
    issue_date: date | None = None
    prepared_by: str | None = None
    reviewed_by: str | None = None
    description: str | None = None

class KpiDocVersionHistoryResponse(BaseModel):
    id: UUID
    doc_info_id: UUID
    issue_id: str | None
    issue_date: date | None
    prepared_by: str | None
    reviewed_by: str | None
    description: str | None
    created_at: datetime
    model_config = {"from_attributes": True}

class KpiDocInfoResponse(BaseModel):
    id: UUID
    project_id: UUID
    project_name: str | None
    project_id_code: str | None
    customer_name: str | None
    document_title: str | None
    issue_no: str | None
    pm_name: str | None
    issue_date: date | None
    prepared_by: str | None
    preparation_date: date | None
    reviewed_by: str | None
    review_date: date | None
    template_version: str | None
    version_history: list[KpiDocVersionHistoryResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# Compute request
class KpiComputeRequest(BaseModel):
    frequency_name: str
    from_date: date | None = None
    to_date: date | None = None
    # Period-level threshold overrides (optional — if not set, uses plan metric defaults)
    override_target: Decimal | None = None
    override_lsl: Decimal | None = None
    override_usl: Decimal | None = None
    # Modification reason — required when PM re-enters an existing period
    analysis_comments: str | None = None


# Per-metric trend endpoint
class KpiTrendPoint(BaseModel):
    frequency_name: str
    from_date: date | None
    to_date: date | None
    actual_value: Decimal | None
    target: Decimal | None
    lsl: Decimal | None
    usl: Decimal | None
    rag_status: str | None
    submitted_date: datetime | None

class KpiMetricTrendResponse(BaseModel):
    plan_metric_id: UUID
    metric_name: str
    uom: str | None
    intent: str | None
    history: list[KpiTrendPoint]
