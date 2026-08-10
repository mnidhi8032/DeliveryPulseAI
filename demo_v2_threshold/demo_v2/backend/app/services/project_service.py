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

    def create_with_plan(self, user: User, body) -> dict:
        """Create project + KPI plan + auto-add all mandatory metrics matching engagement model."""
        self._access.require_can_create_project(user)
        account = self._account_repo.get_by_id(body.account_id)
        if account is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account not found")
        if self._repo.get_by_account_and_code(body.account_id, body.project_code):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Project code already exists: {body.project_code}")
        project = self._repo.create(
            account_id=body.account_id,
            project_code=body.project_code.strip().upper(),
            project_name=body.project_name.strip(),
            project_manager_id=user.id,
            delivery_head_user_id=None,
            description=body.description,
            start_date=body.start_date,
            target_end_date=body.target_end_date,
            status="ACTIVE",
        )
        self._session.flush()

        from app.models.kpi_plan import KpiPlan, KpiPlanMetric
        from app.models.qpm_catalog_metric import QPMCatalogMetric
        from app.models.engagement_model_preset import EngagementModelPreset
        from app.services.qpm_service import get_required_measures
        from sqlalchemy import select
        import json, uuid as _uuid

        plan = KpiPlan(
            id=_uuid.uuid4(), project_id=project.id,
            project_type=body.project_type,
            delivery_process_model=body.delivery_process_model,
            project_category=body.project_category,
            work_size_unit=body.work_size_unit,
            is_finalized=False, qpm_status="DRAFT",
        )
        self._session.add(plan)
        self._session.flush()

        # ── Select metrics for the new project ──────────────────────────────
        # Three-path strategy (priority order):
        #
        # Path 1 — engagement_model_presets (exact seeded preset for this combo)
        #   Used for: the 3 real-client presets (Testing/Agile-Scrum, etc.)
        #   Result:   exact metric list, all marked priority='M'
        #
        # Path 2 — engagement_model_metric_mappings (admin-configured mappings)
        #   Used for: any new type/model/category/unit created via the admin UI
        #   Result:   UNION of metrics mapped to any of the 4 engagement fields,
        #             is_mandatory on the mapping determines priority M/O
        #
        # Path 3 — ILIKE fallback on qpm_catalog_metrics (legacy)
        #   Used for: combos not covered by paths 1 or 2
        #   Result:   broad catalog tag-matching

        from app.models.engagement_model_item import EngagementModelItem
        from app.models.engagement_model_metric_mapping import EngagementModelMetricMapping

        preset_names: list[str] = []
        if body.project_type and body.delivery_process_model:
            preset_rows = self._session.execute(
                select(EngagementModelPreset.metric_name).where(
                    EngagementModelPreset.project_type == body.project_type,
                    EngagementModelPreset.delivery_model == body.delivery_process_model,
                )
            ).scalars().all()
            preset_names = list(preset_rows)

        if preset_names:
            # ── PATH 1: seeded preset ──────────────────────────────────────
            stmt = select(QPMCatalogMetric).where(
                QPMCatalogMetric.is_active == True,
                QPMCatalogMetric.name.in_(preset_names),
            )
            use_preset_priority = True
            mapped_mandatory_ids: set[str] = set()  # not used in this path
        else:
            # ── PATH 2: admin-configured mappings ──────────────────────────
            # Original 14 standard project types — these are handled by Path 3 (ILIKE)
            # because their metric applicability is encoded in qpm_catalog_metrics.project_type.
            # Path 2 only applies to custom/admin-created types not in this list.
            STANDARD_PROJECT_TYPES = {
                "Fresh Development", "Maintenance & Support", "Testing",
                "Infrastructure Management Services", "Re-Engineering", "Migration",
                "Package Rollout", "Package implementation", "Production Support",
                "Application Build", "Helpdesk Services", "Upgrade",
                "Professional Services", "Custom Enhancements",
            }
            # Original 12 standard delivery models — same logic
            STANDARD_DELIVERY_MODELS = {
                "Waterfall", "Iterative", "Incremental", "Agile-Scrum", "Agile-Kanban",
                "Sure Step", "Agile Sure Step", "ASAP", "Oracle AIM",
                "ITIL based Service Delivery", "Traditional Maintenance & Support", "Staffing",
            }

            # Only use Path 2 if BOTH fields are custom (not in the standard lists).
            # If either field is standard, fall through to Path 3 (ILIKE) which
            # was designed for exactly these combos.
            pt_is_custom = body.project_type not in STANDARD_PROJECT_TYPES if body.project_type else False
            dm_is_custom = body.delivery_process_model not in STANDARD_DELIVERY_MODELS if body.delivery_process_model else False
            use_mapping_path = pt_is_custom or dm_is_custom

            # Only use Path 2 if at least one custom field is present
            field_pairs = []
            if use_mapping_path:
                if pt_is_custom and body.project_type:
                    field_pairs.append(("PROJECT_TYPE", body.project_type))
                if dm_is_custom and body.delivery_process_model:
                    field_pairs.append(("DELIVERY_MODEL", body.delivery_process_model))
            item_ids: list[str] = []
            if field_pairs:
                for item_type, value in field_pairs:
                    item = self._session.execute(
                        select(EngagementModelItem.id).where(
                            EngagementModelItem.item_type == item_type,
                            EngagementModelItem.value == value,
                            EngagementModelItem.is_active == True,
                        )
                    ).scalar_one_or_none()
                    if item:
                        item_ids.append(str(item))

            mapping_rows: list[EngagementModelMetricMapping] = []
            if item_ids:
                mapping_rows = list(
                    self._session.execute(
                        select(EngagementModelMetricMapping).where(
                            EngagementModelMetricMapping.engagement_item_id.in_(item_ids)
                        )
                    ).scalars().all()
                )

            if mapping_rows:
                # Collect unique catalog metric ids and track which are mandatory
                mapped_metric_ids = list({str(r.catalog_metric_id) for r in mapping_rows})
                mapped_mandatory_ids: set[str] = {
                    str(r.catalog_metric_id) for r in mapping_rows if r.is_mandatory
                }
                stmt = select(QPMCatalogMetric).where(
                    QPMCatalogMetric.is_active == True,
                    QPMCatalogMetric.id.in_([_uuid.UUID(mid) for mid in mapped_metric_ids]),
                )
                use_preset_priority = False  # priority determined per-metric below
            else:
                # ── PATH 3: ILIKE fallback ─────────────────────────────────
                mapped_mandatory_ids = set()
                use_preset_priority = False
                stmt = select(QPMCatalogMetric).where(
                    QPMCatalogMetric.is_active == True,
                    QPMCatalogMetric.compliance == "M",
                )
                if body.project_type:
                    stmt = stmt.where(
                        QPMCatalogMetric.project_type.ilike(f"%{body.project_type}%")
                    )
                if body.delivery_process_model:
                    stmt = stmt.where(
                        QPMCatalogMetric.delivery_model.ilike(
                            f"%{body.delivery_process_model}%"
                        )
                    )

        mandatory = self._session.execute(stmt).scalars().all()

        for m in mandatory:
            required = get_required_measures(m.name)
            # Determine priority:
            # Path 1 (preset): all preset metrics = Mandatory
            # Path 2 (mappings): mandatory if is_mandatory=True on the mapping
            # Path 3 (ILIKE): use catalog compliance flag
            if use_preset_priority:
                priority = "M"
            elif mapped_mandatory_ids and str(m.id) in mapped_mandatory_ids:
                priority = "M"
            elif mapped_mandatory_ids:
                priority = "O"  # mapped but not mandatory
            else:
                priority = m.compliance  # ILIKE fallback: use catalog flag
            self._session.add(KpiPlanMetric(
                id=_uuid.uuid4(), kpi_plan_id=plan.id, catalog_metric_id=m.id,
                metric_name=m.name, metric_category=m.category, formula=m.formula,
                uom=m.uom, intent=m.intent, frequency=m.frequency,
                priority=priority,
                target=float(m.default_target) if m.default_target is not None else None,
                lsl=float(m.default_lsl) if m.default_lsl is not None else None,
                usl=float(m.default_usl) if m.default_usl is not None else None,
                is_custom=False, reported_to_customer=False, is_active=True,
                required_measures=json.dumps(required),
            ))

        self._session.commit()
        return {"project_id": str(project.id), "project_code": project.project_code,
                "project_name": project.project_name, "plan_id": str(plan.id),
                "mandatory_metrics_added": len(mandatory)}

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
