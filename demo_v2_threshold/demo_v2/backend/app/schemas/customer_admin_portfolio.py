"""Customer Admin portfolio aggregation API schemas (Phase 9)."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class PortfolioSummaryResponse(BaseModel):
    total_business_units: int
    total_projects: int
    total_submissions: int
    green_count: int
    amber_count: int
    red_count: int


class BusinessUnitHealthRow(BaseModel):
    business_unit_id: UUID
    business_unit_name: str
    business_unit_code: str
    delivery_head_name: str | None
    project_count: int
    green_count: int
    amber_count: int
    red_count: int
    health_percent: float | None
    submission_count: int


class AgingProjectDetail(BaseModel):
    project_id: UUID
    project_name: str
    business_unit_name: str
    delivery_head_name: str | None
    rag_status: str | None
    weeks_count: float


class SubmissionAgingResponse(BaseModel):
    weeks_0_2: int
    weeks_3_4: int
    weeks_5_8: int
    weeks_8_plus: int
    projects_0_2: list[AgingProjectDetail] = []
    projects_3_4: list[AgingProjectDetail] = []
    projects_5_8: list[AgingProjectDetail] = []
    projects_8_plus: list[AgingProjectDetail] = []



class ImpactMatrixRow(BaseModel):
    business_unit_id: UUID
    business_unit_name: str
    schedule_impact: int
    quality_impact: int
    finance_impact: int
    people_impact: int


class BusinessUnitProjectSummary(BaseModel):
    id: UUID
    project_code: str
    project_name: str
    account_name: str
    status: str
    submission_count: int
    kpi_plan_status: str | None = None   # DRAFT | UNDER_REVIEW | APPROVED | REJECTED | None
    kpi_plan_rag: str | None = None      # overall RAG from QPM measurements


class BusinessUnitSubmissionSummary(BaseModel):
    id: UUID
    project_name: str
    status_code: str
    overall_score: float | None
    rag_status: str | None
    submission_date: datetime | None
    created_at: datetime


class BusinessUnitDetailResponse(BaseModel):
    business_unit_id: UUID
    business_unit_name: str
    business_unit_code: str
    description: str | None
    delivery_head_names: list[str]
    project_count: int
    submission_count: int
    green_count: int
    amber_count: int
    red_count: int
    health_percent: float | None
    projects: list[BusinessUnitProjectSummary]
    recent_submissions: list[BusinessUnitSubmissionSummary]


class HealthChangeRow(BaseModel):
    project_name: str
    previous_score: float | None
    current_score: float | None
    trend: str


class RedProjectMovementRow(BaseModel):
    date: datetime
    red_count: int


class AgingChangeRow(BaseModel):
    category: str
    count: int


class BUTrendSummaryResponse(BaseModel):
    recent_submissions: list[BusinessUnitSubmissionSummary]
    health_changes: list[HealthChangeRow]
    red_project_movement: list[RedProjectMovementRow]
    aging_changes: list[AgingChangeRow]
