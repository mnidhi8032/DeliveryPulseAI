"""Platform Admin governance aggregation schemas (Phase 10)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PlatformOverviewResponse(BaseModel):
    total_customers: int
    total_business_units: int
    total_projects: int
    total_submissions: int
    green_percent: float
    amber_percent: float
    red_percent: float
    green_count: int
    amber_count: int
    red_count: int


class PlatformRiskSummaryRow(BaseModel):
    business_unit_id: UUID
    business_unit_name: str
    delivery_head_name: str | None
    project_count: int
    red_projects: int
    red_percent: float
    escalation_flag: bool


class PlatformApprovalLatencyRow(BaseModel):
    business_unit_id: UUID
    business_unit_name: str
    average_approval_days: float | None
    min_approval_days: int | None
    max_approval_days: int | None
    sample_count: int


class PlatformTemplateAdoptionRow(BaseModel):
    business_unit_id: UUID
    business_unit_name: str
    manual_submissions: int
    excel_submissions: int
    adoption_percent: float | None


class PlatformSubmissionTrend(BaseModel):
    status_code: str
    count: int


class PlatformRecentApproval(BaseModel):
    submission_id: UUID
    project_name: str
    status_code: str
    approval_date: datetime | None
    overall_score: float | None
    rag_status: str | None


class PlatformBUAnalysisResponse(BaseModel):
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
    submission_trends: list[PlatformSubmissionTrend]
    recent_approvals: list[PlatformRecentApproval]
