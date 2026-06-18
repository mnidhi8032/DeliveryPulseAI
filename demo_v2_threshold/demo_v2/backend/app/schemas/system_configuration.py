"""System configuration Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class SystemConfigurationResponse(BaseModel):
    reporting_frequency: str = Field(..., description="weekly or monthly")
    approval_sla_days: int = Field(..., ge=1)
    auto_lock_days: int = Field(..., ge=0)
    reopen_policy: str = Field(...)
    
    green_threshold_min: Decimal = Field(..., ge=0, le=100)
    amber_threshold_min: Decimal = Field(..., ge=0, le=100)
    red_threshold_min: Decimal = Field(..., ge=0, le=100)
    
    escalation_rules_enabled: bool
    
    project_red_alerts_enabled: bool
    bu_risk_alerts_enabled: bool
    approval_reminders_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SystemConfigurationUpdateRequest(BaseModel):
    reporting_frequency: str | None = Field(default=None, pattern="^(WEEKLY|MONTHLY)$")
    approval_sla_days: int | None = Field(default=None, ge=1)
    auto_lock_days: int | None = Field(default=None, ge=0)
    reopen_policy: str | None = Field(default=None)
    
    green_threshold_min: Decimal | None = Field(default=None, ge=0, le=100)
    amber_threshold_min: Decimal | None = Field(default=None, ge=0, le=100)
    red_threshold_min: Decimal | None = Field(default=None, ge=0, le=100)
    
    escalation_rules_enabled: bool | None = None
    
    project_red_alerts_enabled: bool | None = None
    bu_risk_alerts_enabled: bool | None = None
    approval_reminders_enabled: bool | None = None
