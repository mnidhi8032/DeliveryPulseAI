"""Customer Admin portfolio aggregations (read-only, Phase 9)."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.constants import RoleCode
from app.core.governance_constants import DimensionName, RagStatus
from app.models.account import Account
from app.models.business_unit import BusinessUnit
from app.models.dimension_score import DimensionScore
from app.models.health_score import HealthScore
from app.models.project import Project
from app.models.submission import Submission
from app.models.user import User
from app.repositories.account_repository import AccountRepository
from app.repositories.business_unit_repository import BusinessUnitRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.customer_admin_portfolio import (
    BusinessUnitDetailResponse,
    BusinessUnitHealthRow,
    BusinessUnitProjectSummary,
    BusinessUnitSubmissionSummary,
    ImpactMatrixRow,
    PortfolioSummaryResponse,
    SubmissionAgingResponse,
)


class CustomerAdminPortfolioService:
    IMPACT_DIMENSIONS = {
        "schedule": DimensionName.SCHEDULE,
        "quality": DimensionName.QUALITY,
        "finance": DimensionName.FINANCE,
        "people": DimensionName.PEOPLE_DELIVERY,
    }

    def __init__(self, session: Session) -> None:
        self._session = session
        self._bus = BusinessUnitRepository(session)
        self._accounts = AccountRepository(session)
        self._project_repo = ProjectRepository(session)

    @staticmethod
    def _require_customer_admin(user: User) -> None:
        if user.role.code != RoleCode.CEO:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customer Admin role required",
            )

    def _all_projects(self) -> list[Project]:
        return self._project_repo.list_all()

    def _all_accounts(self) -> list[Account]:
        stmt = (
            select(Account)
            .options(joinedload(Account.business_unit).joinedload(BusinessUnit.delivery_head))
            .where(Account.deleted_at.is_(None))
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def _accounts_by_bu(self) -> dict[uuid.UUID, list[Account]]:
        grouped: dict[uuid.UUID, list[Account]] = defaultdict(list)
        for account in self._all_accounts():
            grouped[account.business_unit_id].append(account)
        return grouped

    def _submissions(self) -> list[Submission]:
        stmt = (
            select(Submission)
            .options(
                joinedload(Submission.project).joinedload(Project.account),
                joinedload(Submission.status),
            )
            .where(Submission.deleted_at.is_(None))
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def _health_by_submission(self) -> dict[uuid.UUID, HealthScore]:
        rows = self._session.execute(select(HealthScore)).scalars().all()
        return {h.submission_id: h for h in rows}

    def _dimension_scores_by_submission(self) -> dict[uuid.UUID, list[DimensionScore]]:
        rows = self._session.execute(select(DimensionScore)).scalars().all()
        grouped: dict[uuid.UUID, list[DimensionScore]] = defaultdict(list)
        for row in rows:
            grouped[row.submission_id].append(row)
        return grouped

    def _bu_id_for_project(self, project: Project) -> uuid.UUID | None:
        if project.account is None:
            account = self._accounts.get_by_id(project.account_id)
            return account.business_unit_id if account else None
        return project.account.business_unit_id

    def _delivery_head_names(self, accounts: list[Account]) -> str | None:
        names: list[str] = []
        seen: set[uuid.UUID] = set()
        for account in accounts:
            bu = account.business_unit
            if bu and bu.delivery_head_user_id and bu.delivery_head_user_id not in seen:
                dh = bu.delivery_head
                if dh and dh.full_name:
                    names.append(dh.full_name)
                    seen.add(bu.delivery_head_user_id)
        if not names:
            return None
        return ", ".join(sorted(names))

    @staticmethod
    def _rag_counts(
        submission_ids: list[uuid.UUID],
        health_by_submission: dict[uuid.UUID, HealthScore],
    ) -> tuple[int, int, int]:
        green = amber = red = 0
        for sid in submission_ids:
            health = health_by_submission.get(sid)
            if health is None:
                continue
            if health.rag_status == RagStatus.GREEN:
                green += 1
            elif health.rag_status == RagStatus.AMBER:
                amber += 1
            elif health.rag_status == RagStatus.RED:
                red += 1
        return green, amber, red

    @staticmethod
    def _health_percent(
        submission_ids: list[uuid.UUID],
        health_by_submission: dict[uuid.UUID, HealthScore],
    ) -> float | None:
        scores: list[float] = []
        for sid in submission_ids:
            health = health_by_submission.get(sid)
            if health is not None:
                scores.append(float(health.overall_score))
        if not scores:
            return None
        return round(sum(scores) / len(scores), 1)

    def _submissions_for_bu(
        self,
        bu_id: uuid.UUID,
        projects: list[Project],
        submissions: list[Submission],
    ) -> list[Submission]:
        project_ids = {p.id for p in projects if self._bu_id_for_project(p) == bu_id}
        return [s for s in submissions if s.project_id in project_ids]

    @staticmethod
    def _latest_submissions_only(submissions: list[Submission]) -> list[Submission]:
        latest_by_project = {}
        for s in submissions:
            pid = s.project_id
            if pid not in latest_by_project:
                latest_by_project[pid] = s
            else:
                if s.created_at and latest_by_project[pid].created_at:
                    if s.created_at > latest_by_project[pid].created_at:
                        latest_by_project[pid] = s
                elif s.created_at:
                    latest_by_project[pid] = s
        return list(latest_by_project.values())

    def portfolio_summary(self, user: User) -> PortfolioSummaryResponse:
        self._require_customer_admin(user)
        bus = self._bus.list_all()
        projects = self._all_projects()
        submissions = self._submissions()
        health_by_submission = self._health_by_submission()

        # Use QPM RAG first (approved plans), fall back to governance health
        from app.models.kpi_plan import KpiPlan, KpiPlanMetric
        from app.models.kpi_measurement import KpiMeasurement
        from sqlalchemy import select as sa_select

        qpm_rag_by_project: dict[uuid.UUID, str] = {}
        plans = self._session.execute(
            sa_select(KpiPlan).where(KpiPlan.qpm_status == "APPROVED")
        ).scalars().all()
        for plan in plans:
            metric_ids = [
                m.id for m in self._session.execute(
                    sa_select(KpiPlanMetric).where(KpiPlanMetric.kpi_plan_id == plan.id, KpiPlanMetric.is_active == True)
                ).scalars().all()
            ]
            if not metric_ids:
                continue
            measurements = self._session.execute(
                sa_select(KpiMeasurement).where(KpiMeasurement.plan_metric_id.in_(metric_ids))
            ).scalars().all()
            rags = [m.rag_status for m in measurements if m.rag_status]
            if not rags:
                continue
            if "RED" in rags:
                qpm_rag_by_project[plan.project_id] = "RED"
            elif "AMBER" in rags:
                qpm_rag_by_project[plan.project_id] = "AMBER"
            else:
                qpm_rag_by_project[plan.project_id] = "GREEN"

        latest_subs = self._latest_submissions_only(submissions)
        green = amber = red = 0

        for project in projects:
            if project.id in qpm_rag_by_project:
                rag = qpm_rag_by_project[project.id]
                if rag == "GREEN": green += 1
                elif rag == "AMBER": amber += 1
                elif rag == "RED": red += 1
            else:
                latest_sub = next((s for s in latest_subs if s.project_id == project.id), None)
                if latest_sub:
                    health = health_by_submission.get(latest_sub.id)
                    if health:
                        if health.rag_status == RagStatus.GREEN: green += 1
                        elif health.rag_status == RagStatus.AMBER: amber += 1
                        elif health.rag_status == RagStatus.RED: red += 1

        return PortfolioSummaryResponse(
            total_business_units=len(bus),
            total_projects=len(projects),
            total_submissions=len(submissions),
            green_count=green,
            amber_count=amber,
            red_count=red,
        )

    def business_unit_health(self, user: User) -> list[BusinessUnitHealthRow]:
        self._require_customer_admin(user)
        bus = self._bus.list_all()
        projects = self._all_projects()
        submissions = self._submissions()
        health_by_submission = self._health_by_submission()
        accounts_by_bu = self._accounts_by_bu()

        # Build QPM RAG per project (use approved KPI plan if available)
        from app.models.kpi_plan import KpiPlan, KpiPlanMetric
        from app.models.kpi_measurement import KpiMeasurement
        from sqlalchemy import select as sa_select
        qpm_rag_by_project: dict[uuid.UUID, str] = {}
        plans = self._session.execute(
            sa_select(KpiPlan).where(KpiPlan.qpm_status == "APPROVED")
        ).scalars().all()
        for plan in plans:
            # Get latest RAG from measurements
            metric_ids = [
                m.id for m in self._session.execute(
                    sa_select(KpiPlanMetric).where(KpiPlanMetric.kpi_plan_id == plan.id, KpiPlanMetric.is_active == True)
                ).scalars().all()
            ]
            if not metric_ids:
                continue
            measurements = self._session.execute(
                sa_select(KpiMeasurement).where(KpiMeasurement.plan_metric_id.in_(metric_ids))
            ).scalars().all()
            rags = [m.rag_status for m in measurements if m.rag_status]
            if not rags:
                continue
            # Overall RAG: any RED → RED, any AMBER → AMBER, else GREEN
            if "RED" in rags:
                overall = "RED"
            elif "AMBER" in rags:
                overall = "AMBER"
            else:
                overall = "GREEN"
            qpm_rag_by_project[plan.project_id] = overall

        projects_by_bu: dict[uuid.UUID, list[Project]] = defaultdict(list)
        for project in projects:
            bu_id = self._bu_id_for_project(project)
            if bu_id:
                projects_by_bu[bu_id].append(project)

        rows: list[BusinessUnitHealthRow] = []
        for bu in bus:
            bu_projects = projects_by_bu.get(bu.id, [])
            bu_subs = self._submissions_for_bu(bu.id, bu_projects, submissions)
            latest_bu_subs = self._latest_submissions_only(bu_subs)

            green = amber = red = 0
            for proj in bu_projects:
                if proj.id in qpm_rag_by_project:
                    # Use QPM RAG (more current)
                    rag = qpm_rag_by_project[proj.id]
                    if rag == "GREEN": green += 1
                    elif rag == "AMBER": amber += 1
                    elif rag == "RED": red += 1
                else:
                    # Fall back to governance submission health
                    latest_sub = next((s for s in latest_bu_subs if s.project_id == proj.id), None)
                    if latest_sub:
                        h = health_by_submission.get(latest_sub.id)
                        if h:
                            if h.rag_status == RagStatus.GREEN: green += 1
                            elif h.rag_status == RagStatus.AMBER: amber += 1
                            elif h.rag_status == RagStatus.RED: red += 1

            # Health percent: QPM-based or submission-based
            scored_projects = [p for p in bu_projects if p.id in qpm_rag_by_project]
            if scored_projects:
                rag_to_score = {"GREEN": 90.0, "AMBER": 65.0, "RED": 40.0}
                scores = [rag_to_score.get(qpm_rag_by_project[p.id], 65.0) for p in scored_projects]
                health_pct: float | None = round(sum(scores) / len(scores), 1)
            else:
                sub_ids = [s.id for s in latest_bu_subs]
                health_pct = self._health_percent(sub_ids, health_by_submission)

            rows.append(
                BusinessUnitHealthRow(
                    business_unit_id=bu.id,
                    business_unit_name=bu.name,
                    business_unit_code=bu.code,
                    delivery_head_name=self._delivery_head_names(accounts_by_bu.get(bu.id, [])),
                    project_count=len(bu_projects),
                    green_count=green,
                    amber_count=amber,
                    red_count=red,
                    health_percent=health_pct,
                    submission_count=len(bu_subs),
                )
            )
        return rows

    def submission_aging(self, user: User) -> SubmissionAgingResponse:
        self._require_customer_admin(user)
        today = date.today()
        buckets = {"0_2": 0, "3_4": 0, "5_8": 0, "8_plus": 0}
        projects_0_2 = []
        projects_3_4 = []
        projects_5_8 = []
        projects_8_plus = []

        stmt = (
            select(Submission)
            .options(
                joinedload(Submission.project).joinedload(Project.account).joinedload(Account.business_unit).joinedload(BusinessUnit.delivery_head),
                joinedload(Submission.health_score),
            )
            .where(Submission.deleted_at.is_(None))
        )
        submissions = list(self._session.execute(stmt).unique().scalars().all())
        latest_subs = self._latest_submissions_only(submissions)

        for sub in latest_subs:
            if sub.rag_start_date is None:
                continue
            days = (today - sub.rag_start_date).days
            weeks = days / 7.0

            project_name = sub.project.project_name
            bu_name = sub.project.account.business_unit.name if sub.project.account and sub.project.account.business_unit else "—"
            dh_name = sub.project.account.business_unit.delivery_head.full_name if sub.project.account and sub.project.account.business_unit and sub.project.account.business_unit.delivery_head else "—"
            rag_status = sub.health_score.rag_status if sub.health_score else "—"

            detail = {
                "project_id": sub.project_id,
                "project_name": project_name,
                "business_unit_name": bu_name,
                "delivery_head_name": dh_name,
                "rag_status": rag_status,
                "weeks_count": round(weeks, 1),
            }

            if weeks <= 2:
                buckets["0_2"] += 1
                projects_0_2.append(detail)
            elif weeks <= 4:
                buckets["3_4"] += 1
                projects_3_4.append(detail)
            elif weeks <= 8:
                buckets["5_8"] += 1
                projects_5_8.append(detail)
            else:
                buckets["8_plus"] += 1
                projects_8_plus.append(detail)

        return SubmissionAgingResponse(
            weeks_0_2=buckets["0_2"],
            weeks_3_4=buckets["3_4"],
            weeks_5_8=buckets["5_8"],
            weeks_8_plus=buckets["8_plus"],
            projects_0_2=projects_0_2,
            projects_3_4=projects_3_4,
            projects_5_8=projects_5_8,
            projects_8_plus=projects_8_plus,
        )

    def impact_matrix(self, user: User) -> list[ImpactMatrixRow]:
        self._require_customer_admin(user)
        bus = self._bus.list_all()
        projects = self._all_projects()
        submissions = self._submissions()
        dim_by_sub = self._dimension_scores_by_submission()

        # QPM category → governance dimension mapping
        QPM_CAT_TO_DIM = {
            "Time & Speed": "schedule",
            "Efficiency": "schedule",
            "Internal Quality": "quality",
            "Delivered Quality": "quality",
            "Non-functional-Performance": "quality",
            "Non-functional-Security": "quality",
            "Non-functional-Usability": "quality",
            "Non-functional-Maintainability": "quality",
            "Scope": "schedule",
            "Financial": "finance",
            "Stakeholder Perception": "people",
        }

        # QPM red dimensions per project
        from app.models.kpi_plan import KpiPlan, KpiPlanMetric
        from app.models.kpi_measurement import KpiMeasurement
        from sqlalchemy import select as sa_select
        qpm_red_dims_by_project: dict[uuid.UUID, set[str]] = {}
        plans = self._session.execute(
            sa_select(KpiPlan).where(KpiPlan.qpm_status == "APPROVED")
        ).scalars().all()
        for plan in plans:
            metrics_with_cat = self._session.execute(
                sa_select(KpiPlanMetric).where(KpiPlanMetric.kpi_plan_id == plan.id, KpiPlanMetric.is_active == True)
            ).scalars().all()
            metric_cat_map = {m.id: m.metric_category for m in metrics_with_cat}
            if not metric_cat_map:
                continue
            measurements = self._session.execute(
                sa_select(KpiMeasurement).where(KpiMeasurement.plan_metric_id.in_(list(metric_cat_map.keys())))
            ).scalars().all()
            red_dims: set[str] = set()
            for meas in measurements:
                if meas.rag_status == "RED":
                    cat = metric_cat_map.get(meas.plan_metric_id)
                    dim = QPM_CAT_TO_DIM.get(cat or "", "")
                    if dim:
                        red_dims.add(dim)
            qpm_red_dims_by_project[plan.project_id] = red_dims

        projects_by_bu: dict[uuid.UUID, list[Project]] = defaultdict(list)
        for project in projects:
            bu_id = self._bu_id_for_project(project)
            if bu_id:
                projects_by_bu[bu_id].append(project)

        rows: list[ImpactMatrixRow] = []
        for bu in bus:
            bu_subs = self._submissions_for_bu(bu.id, projects, submissions)
            latest_bu_subs = self._latest_submissions_only(bu_subs)
            counts = {k: 0 for k in self.IMPACT_DIMENSIONS}

            bu_projects = projects_by_bu.get(bu.id, [])
            for proj in bu_projects:
                if proj.id in qpm_red_dims_by_project:
                    # Use QPM red dimensions
                    for dim_key in qpm_red_dims_by_project[proj.id]:
                        if dim_key in counts:
                            counts[dim_key] += 1
                else:
                    # Fall back to governance dimension scores
                    latest_sub = next((s for s in latest_bu_subs if s.project_id == proj.id), None)
                    if latest_sub:
                        for dim in dim_by_sub.get(latest_sub.id, []):
                            if dim.rag_status != RagStatus.RED:
                                continue
                            for key, name in self.IMPACT_DIMENSIONS.items():
                                if dim.dimension_name == name:
                                    counts[key] += 1

            rows.append(
                ImpactMatrixRow(
                    business_unit_id=bu.id,
                    business_unit_name=bu.name,
                    schedule_impact=counts["schedule"],
                    quality_impact=counts["quality"],
                    finance_impact=counts["finance"],
                    people_impact=counts["people"],
                )
            )
        return rows

    def business_unit_detail(self, user: User, bu_id: uuid.UUID) -> BusinessUnitDetailResponse:
        self._require_customer_admin(user)
        bu = self._bus.get_by_id(bu_id)
        if bu is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business unit not found")

        projects = self._all_projects()
        submissions = self._submissions()
        health_by_submission = self._health_by_submission()
        accounts_by_bu = self._accounts_by_bu()

        # QPM RAG override
        from app.models.kpi_plan import KpiPlan, KpiPlanMetric
        from app.models.kpi_measurement import KpiMeasurement
        from sqlalchemy import select as sa_select
        qpm_rag_by_project: dict[uuid.UUID, str] = {}
        plans = self._session.execute(
            sa_select(KpiPlan).where(KpiPlan.qpm_status == "APPROVED")
        ).scalars().all()
        for plan in plans:
            metric_ids = [
                m.id for m in self._session.execute(
                    sa_select(KpiPlanMetric).where(KpiPlanMetric.kpi_plan_id == plan.id, KpiPlanMetric.is_active == True)
                ).scalars().all()
            ]
            if not metric_ids:
                continue
            measurements = self._session.execute(
                sa_select(KpiMeasurement).where(KpiMeasurement.plan_metric_id.in_(metric_ids))
            ).scalars().all()
            rags = [m.rag_status for m in measurements if m.rag_status]
            if not rags:
                continue
            if "RED" in rags:
                qpm_rag_by_project[plan.project_id] = "RED"
            elif "AMBER" in rags:
                qpm_rag_by_project[plan.project_id] = "AMBER"
            else:
                qpm_rag_by_project[plan.project_id] = "GREEN"

        bu_projects = [p for p in projects if self._bu_id_for_project(p) == bu_id]
        bu_subs = self._submissions_for_bu(bu_id, bu_projects, submissions)
        latest_bu_subs = self._latest_submissions_only(bu_subs)

        # RAG counts preferring QPM
        green = amber = red = 0
        for proj in bu_projects:
            if proj.id in qpm_rag_by_project:
                rag = qpm_rag_by_project[proj.id]
                if rag == "GREEN": green += 1
                elif rag == "AMBER": amber += 1
                elif rag == "RED": red += 1
            else:
                latest_sub = next((s for s in latest_bu_subs if s.project_id == proj.id), None)
                if latest_sub:
                    h = health_by_submission.get(latest_sub.id)
                    if h:
                        if h.rag_status == RagStatus.GREEN: green += 1
                        elif h.rag_status == RagStatus.AMBER: amber += 1
                        elif h.rag_status == RagStatus.RED: red += 1

        # Health percent
        scored_projects = [p for p in bu_projects if p.id in qpm_rag_by_project]
        if scored_projects:
            rag_to_score = {"GREEN": 90.0, "AMBER": 65.0, "RED": 40.0}
            scores = [rag_to_score.get(qpm_rag_by_project[p.id], 65.0) for p in scored_projects]
            health_pct: float | None = round(sum(scores) / len(scores), 1)
        else:
            sub_ids = [s.id for s in latest_bu_subs]
            health_pct = self._health_percent(sub_ids, health_by_submission)

        project_summaries: list[BusinessUnitProjectSummary] = []
        subs_by_project: dict[uuid.UUID, list[Submission]] = defaultdict(list)
        for s in bu_subs:
            subs_by_project[s.project_id].append(s)

        # Fetch QPM plans for all BU projects
        from app.models.kpi_plan import KpiPlan as KpiPlanModel
        bu_project_ids = {p.id for p in bu_projects}
        qpm_plans_list = self._session.execute(
            sa_select(KpiPlanModel).where(KpiPlanModel.project_id.in_(list(bu_project_ids)))
        ).scalars().all()
        qpm_by_project = {p.project_id: p for p in qpm_plans_list}

        for project in sorted(bu_projects, key=lambda p: p.project_code):
            account_name = project.account.name if project.account else ""
            project_summaries.append(
                BusinessUnitProjectSummary(
                    id=project.id,
                    project_code=project.project_code,
                    project_name=project.project_name,
                    account_name=account_name,
                    status=project.status,
                    submission_count=len(subs_by_project.get(project.id, [])),
                    kpi_plan_status=qpm_by_project.get(project.id, None) and qpm_by_project[project.id].qpm_status or None,
                    kpi_plan_rag=qpm_rag_by_project.get(project.id),
                )
            )

        # Recent submissions — include QPM plan approvals as virtual submission entries
        recent: list[BusinessUnitSubmissionSummary] = []

        # qpm_by_project already built above

        # Add QPM-based "submission" entries (as virtual records)
        for proj in bu_projects:
            qplan = qpm_by_project.get(proj.id)
            if qplan:
                rag = qpm_rag_by_project.get(proj.id)
                recent.append(
                    BusinessUnitSubmissionSummary(
                        id=qplan.id,  # use plan id as record id
                        project_name=proj.project_name,
                        status_code=f"KPI_{qplan.qpm_status}",
                        overall_score=None,
                        rag_status=rag,
                        submission_date=qplan.qpm_submitted_at,
                        created_at=qplan.qpm_submitted_at or qplan.created_at,
                    )
                )

        # Also add any governance submissions (sorted by most recent)
        for sub in sorted(bu_subs, key=lambda s: s.created_at, reverse=True)[:5]:
            health = health_by_submission.get(sub.id)
            project_name = sub.project.project_name if sub.project else ""
            rag_override = qpm_rag_by_project.get(sub.project_id)
            recent.append(
                BusinessUnitSubmissionSummary(
                    id=sub.id,
                    project_name=project_name,
                    status_code=sub.status.code,
                    overall_score=float(health.overall_score) if health else None,
                    rag_status=rag_override or (health.rag_status if health else None),
                    submission_date=sub.submission_date,
                    created_at=sub.created_at,
                )
            )

        # Sort by most recent, deduplicate by project (keep first/latest)
        seen_projects: set = set()
        deduped: list[BusinessUnitSubmissionSummary] = []
        for r in sorted(recent, key=lambda x: x.created_at or datetime.min.replace(tzinfo=None), reverse=True):
            if r.project_name not in seen_projects:
                seen_projects.add(r.project_name)
                deduped.append(r)
        recent = deduped[:10]

        dh_names: list[str] = []
        if bu.delivery_head and bu.delivery_head.full_name:
            dh_names.append(bu.delivery_head.full_name)

        return BusinessUnitDetailResponse(
            business_unit_id=bu.id,
            business_unit_name=bu.name,
            business_unit_code=bu.code,
            description=bu.description,
            delivery_head_names=sorted(dh_names),
            project_count=len(bu_projects),
            submission_count=len(bu_subs),
            green_count=green,
            amber_count=amber,
            red_count=red,
            health_percent=health_pct,
            projects=project_summaries,
            recent_submissions=recent,
        )

    def trend_summary(self, user: User, bu_id: uuid.UUID):
        from app.schemas.customer_admin_portfolio import (
            BUTrendSummaryResponse,
            HealthChangeRow,
            RedProjectMovementRow,
            AgingChangeRow,
        )
        self._require_customer_admin(user)
        bu = self._bus.get_by_id(bu_id)
        if bu is None:
            raise HTTPException(status_code=404, detail="Business unit not found")

        projects = self._all_projects()
        submissions = self._submissions()
        health_by_sub = self._health_by_submission()

        bu_projects = [p for p in projects if self._bu_id_for_project(p) == bu_id]
        bu_subs = self._submissions_for_bu(bu_id, bu_projects, submissions)

        # 1. Recent submissions
        recent = []
        for sub in sorted(bu_subs, key=lambda s: s.created_at, reverse=True)[:10]:
            health = health_by_sub.get(sub.id)
            recent.append(
                BusinessUnitSubmissionSummary(
                    id=sub.id,
                    project_name=sub.project.project_name if sub.project else "",
                    status_code=sub.status.code,
                    overall_score=float(health.overall_score) if health else None,
                    rag_status=health.rag_status if health else None,
                    submission_date=sub.submission_date,
                    created_at=sub.created_at,
                )
            )

        # 2. Health changes (last 2 submissions per project)
        health_changes = []
        subs_by_proj = defaultdict(list)
        for s in bu_subs:
            subs_by_proj[s.project_id].append(s)

        for p_id, p_subs in subs_by_proj.items():
            ordered = sorted(p_subs, key=lambda s: s.created_at, reverse=True)
            if len(ordered) < 2:
                continue
            curr_sub = ordered[0]
            prev_sub = ordered[1]
            curr_h = health_by_sub.get(curr_sub.id)
            prev_h = health_by_sub.get(prev_sub.id)
            
            curr_score = float(curr_h.overall_score) if curr_h else None
            prev_score = float(prev_h.overall_score) if prev_h else None

            trend = "stable"
            if curr_score is not None and prev_score is not None:
                diff = curr_score - prev_score
                if diff > 10:
                    trend = "improving"
                elif diff < -10:
                    trend = "declining"
            
            project_name = curr_sub.project.project_name if curr_sub.project else ""
            health_changes.append(HealthChangeRow(
                project_name=project_name,
                previous_score=prev_score,
                current_score=curr_score,
                trend=trend
            ))

        # 3. Red project movement
        # Track number of red projects by rag_start_date (just as a simple timeline)
        red_counts_by_date = defaultdict(int)
        for sub in bu_subs:
            h = health_by_sub.get(sub.id)
            if h and h.rag_status == RagStatus.RED and sub.rag_start_date:
                # Group by month or just the date
                # Let's use the rag_start_date as datetime
                dt = datetime.combine(sub.rag_start_date, datetime.min.time())
                red_counts_by_date[dt] += 1
        
        red_movement = []
        for d, count in sorted(red_counts_by_date.items()):
            red_movement.append(RedProjectMovementRow(date=d, red_count=count))

        # 4. Aging changes
        today = date.today()
        buckets = {"0_2": 0, "3_4": 0, "5_8": 0, "8_plus": 0}
        for sub in bu_subs:
            if sub.rag_start_date is None:
                continue
            days = (today - sub.rag_start_date).days
            weeks = days / 7.0
            if weeks <= 2:
                buckets["0_2"] += 1
            elif weeks <= 4:
                buckets["3_4"] += 1
            elif weeks <= 8:
                buckets["5_8"] += 1
            else:
                buckets["8_plus"] += 1
                
        aging = [
            AgingChangeRow(category="0-2 Weeks", count=buckets["0_2"]),
            AgingChangeRow(category="3-4 Weeks", count=buckets["3_4"]),
            AgingChangeRow(category="5-8 Weeks", count=buckets["5_8"]),
            AgingChangeRow(category="8+ Weeks", count=buckets["8_plus"]),
        ]

        return BUTrendSummaryResponse(
            recent_submissions=recent,
            health_changes=health_changes,
            red_project_movement=red_movement,
            aging_changes=aging,
        )
