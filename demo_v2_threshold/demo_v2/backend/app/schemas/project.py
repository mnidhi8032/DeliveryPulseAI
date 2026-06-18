"""Project API schemas."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import ProjectStatus


class ProjectCreateRequest(BaseModel):
    account_id: UUID
    project_code: str = Field(min_length=1, max_length=50)
    project_name: str = Field(min_length=1, max_length=200)
    project_manager_id: UUID | None = None
    delivery_head_user_id: UUID | None = None
    description: str | None = None
    start_date: date | None = None
    target_end_date: date | None = None
    status: ProjectStatus = ProjectStatus.ACTIVE


class ProjectUpdateRequest(BaseModel):
    project_name: str | None = Field(default=None, min_length=1, max_length=200)
    project_manager_id: UUID | None = None
    delivery_head_user_id: UUID | None = None
    description: str | None = None
    start_date: date | None = None
    target_end_date: date | None = None
    status: ProjectStatus | None = None


class ProjectResponse(BaseModel):
    id: UUID
    account_id: UUID
    project_code: str
    project_name: str
    project_manager_id: UUID | None
    delivery_head_user_id: UUID | None
    description: str | None
    start_date: date | None
    target_end_date: date | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
