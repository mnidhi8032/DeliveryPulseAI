"""Project responses with org context for PM workspace."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class ProjectEnrichedResponse(BaseModel):
    id: UUID
    account_id: UUID
    project_code: str
    project_name: str
    project_manager_id: UUID | None
    description: str | None
    start_date: date | None
    target_end_date: date | None
    status: str
    created_at: datetime
    updated_at: datetime
    account_name: str
    account_code: str
    business_unit_name: str
    project_manager_name: str | None = None
    project_manager_email: str | None = None
    delivery_head_user_id: UUID | None = None
    # QPM overall health RAG (GREEN/AMBER/RED) — derived from latest KPI measurements
    current_rag: str | None = None
