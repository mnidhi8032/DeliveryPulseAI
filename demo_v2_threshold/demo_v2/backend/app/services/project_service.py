"""Project use cases."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.account_repository import AccountRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreateRequest, ProjectResponse, ProjectUpdateRequest
from app.schemas.project_enriched import ProjectEnrichedResponse
from app.services.access_control_service import AccessControlService


class ProjectService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._repo = ProjectRepository(session)
        self._account_repo = AccountRepository(session)
        self._access = AccessControlService(session)

    @staticmethod
    def _get_project_rag(session, project_id) -> str | None:
        """Compute overall QPM RAG for a project from its latest KPI measurements."""
        from sqlalchemy import select
        from app.models.kpi_plan import KpiPlan, KpiPlanMetric
        from app.models.kpi_measurement import KpiMeasurement

        # Get the KPI plan for this project
        plan = session.execute(
            select(KpiPlan).where(KpiPlan.project_id == project_id)
        ).scalar_one_or_none()
        if plan is None:
            return None

        # Get all active plan metric ids
        metric_ids = session.execute(
            select(KpiPlanMetric.id).where(
                KpiPlanMetric.kpi_plan_id == plan.id,
                KpiPlanMetric.is_active == True,
            )
        ).scalars().all()
        if not metric_ids:
            return None

        # Get latest measurement RAG for each metric
        rags = []
        for mid in metric_ids:
            m = session.execute(
                select(KpiMeasurement.rag_status)
                .where(KpiMeasurement.plan_metric_id == mid)
                .where(KpiMeasurement.rag_status.isnot(None))
                .order_by(KpiMeasurement.from_date.desc().nullslast(), KpiMeasurement.created_at.desc())
                .limit(1)
            ).scalar_one_or_none()
            if m:
                rags.append(m)

        if not rags:
            return None

        # Aggregate: any RED -> RED, any AMBER -> AMBER, else GREEN
        if "RED" in rags:
            return "RED"
        if "AMBER" in rags:
            return "AMBER"
        return "GREEN"

    def to_enriched_response(self, project) -> ProjectEnrichedResponse:
        account = project.account
        bu_name = account.business_unit.name if account and account.business_unit else ""
        pm = project.project_manager
        current_rag = self._get_project_rag(self._session, project.id)
        return ProjectEnrichedResponse(
            id=project.id,
            account_id=project.account_id,
            project_code=project.project_code,
            project_name=project.project_name,
            project_manager_id=project.project_manager_id,
            description=project.description,
            start_date=project.start_date,
            target_end_date=project.target_end_date,
            status=project.status,
            created_at=project.created_at,
            updated_at=project.updated_at,
            account_name=account.name if account else "",
            account_code=account.code if account else "",
            business_unit_name=bu_name,
            project_manager_name=pm.full_name if pm else None,
            project_manager_email=pm.email if pm else None,
            delivery_head_user_id=project.delivery_head_user_id,
            current_rag=current_rag,
        )

    def create(self, user: User, body: ProjectCreateRequest) -> ProjectResponse:
        self._access.require_can_create_project(user)

        account = self._account_repo.get_by_id(body.account_id)
        if account is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account not found")

        # Delivery Head can only create projects in BUs assigned to them
        if self._access.is_delivery_head(user):
            if account.business_unit.delivery_head_user_id != user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: this account is not under your Business Unit")

        if self._repo.get_by_account_and_code(body.account_id, body.project_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project code already exists on account: {body.project_code}",
            )

        # Determine delivery_head_user_id
        if self._access.is_delivery_head(user):
            delivery_head_id = user.id
        elif self._access.is_pm(user):
            # PM creates: set themselves as PM, derive DH from the account's BU
            delivery_head_id = account.business_unit.delivery_head_user_id
        else:
            delivery_head_id = body.delivery_head_user_id or account.business_unit.delivery_head_user_id

        # For PM: always assign themselves unless explicitly overridden
        pm_id = body.project_manager_id
        if self._access.is_pm(user):
            pm_id = user.id

        project = self._repo.create(
            account_id=body.account_id,
            project_code=body.project_code.strip().upper(),
            project_name=body.project_name.strip(),
            project_manager_id=pm_id,
            delivery_head_user_id=delivery_head_id,
            description=body.description,
            start_date=body.start_date,
            target_end_date=body.target_end_date,
            status=body.status.value,
        )
        self._session.commit()
        return ProjectResponse.model_validate(project)

    def list(self, user: User) -> list[ProjectEnrichedResponse]:
        self._access.require_can_list_projects(user)
        projects = self._access.list_projects_for_user(user)
        return [self.to_enriched_response(p) for p in projects]

    def get_by_id(self, user: User, project_id: UUID) -> ProjectEnrichedResponse:
        project = self._repo.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        self._access.require_can_view_project(user, project)
        return self.to_enriched_response(project)
    def update(self, user: User, project_id: UUID, body: ProjectUpdateRequest) -> ProjectResponse:
        project = self._repo.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        self._access.require_can_manage_project(user, project)
        status_value = body.status.value if body.status is not None else project.status
        update_fields = dict(
            project_name=body.project_name.strip() if body.project_name else project.project_name,
            description=body.description if body.description is not None else project.description,
            start_date=body.start_date if body.start_date is not None else project.start_date,
            target_end_date=body.target_end_date if body.target_end_date is not None else project.target_end_date,
            status=status_value,
        )
        # project_manager_id: None means "clear the PM", absent means "no change"
        # We rely on Pydantic model_fields_set to distinguish but as a pragmatic fix:
        # if body explicitly sends null (None), we honour it; otherwise keep existing
        if "project_manager_id" in body.model_fields_set:
            update_fields["project_manager_id"] = body.project_manager_id
        else:
            update_fields["project_manager_id"] = project.project_manager_id

        # delivery_head_user_id: only CUSTOMER_ADMIN can reassign
        if "delivery_head_user_id" in body.model_fields_set and self._access.is_customer_admin(user):
            update_fields["delivery_head_user_id"] = body.delivery_head_user_id
        else:
            update_fields["delivery_head_user_id"] = project.delivery_head_user_id

        self._repo.update(project, **update_fields)
        self._session.commit()
        return ProjectResponse.model_validate(project)
