"""Platform Admin governance aggregations (read-only, Phase 10)."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.constants import RoleCode
from app.core.governance_constants import RagStatus
from app.models.account import Account
from app.models.business_unit import BusinessUnit
from app.models.excel_import_batch import ExcelImportBatch
from app.models.health_score import HealthScore
from app.models.project import Project
from app.models.submission import Submission
from app.models.user import User
from app.repositories.account_repository import AccountRepository
from app.repositories.business_unit_repository import BusinessUnitRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.platform_governance import (
    PlatformApprovalLatencyRow,
    PlatformBUAnalysisResponse,
    PlatformOverviewResponse,
    PlatformRecentApproval,
    PlatformRiskSummaryRow,
    PlatformSubmissionTrend,
    PlatformTemplateAdoptionRow,
)

HIGH_RISK_RED_PERCENT = 20.0


class PlatformGovernanceService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._bus = BusinessUnitRepository(session)
        self._accounts = AccountRepository(session)
        self._project_repo = ProjectRepository(session)

    @staticmethod
    def _require_platform_admin(user: User) -> None:
        if user.role.code != RoleCode.PLATFORM_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Platform Admin role required",
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

    def _excel_submission_ids(self) -> set[uuid.UUID]:
        stmt = select(ExcelImportBatch.submission_id).where(
            ExcelImportBatch.submission_id.isnot(None)
        )
        return {row for row in self._session.execute(stmt).scalars().all() if row is not None}

    def _qpm_rag_by_project(self) -> dict[uuid.UUID, str]:
        """Return QPM-based overall RAG per project for approved KPI plans."""
        from app.models.kpi_plan import KpiPlan, KpiPlanMetric
        from app.models.kpi_measurement import KpiMeasurement
        qpm_rag: dict[uuid.UUID, str] = {}
        plans = self._session.execute(
            select(KpiPlan).where(KpiPlan.qpm_status == "APPROVED")
        ).scalars().all()
        for plan in plans:
            metric_ids = [
                m.id for m in self._session.execute(
                    select(KpiPlanMetric).where(
                        KpiPlanMetric.kpi_plan_id == plan.id,
                        KpiPlanMetric.is_active == True
                    )
                ).scalars().all()
            ]
            if not metric_ids:
                continue
            measurements = self._session.execute(
                select(KpiMeasurement).where(KpiMeasurement.plan_metric_id.in_(metric_ids))
            ).scalars().all()
            rags = [m.rag_status for m in measurements if m.rag_status]
            if not rags:
                continue
            if "RED" in rags:
                qpm_rag[plan.project_id] = "RED"
            elif "AMBER" in rags:
                qpm_rag[plan.project_id] = "AMBER"
            else:
                qpm_rag[plan.project_id] = "GREEN"
        return qpm_rag

    @staticmethod
    def _bu_id_for_project(project: Project) -> uuid.UUID | None:
        if project.account is None:
            return None
        return project.account.business_unit_id

    def _projects_by_bu(self, projects: list[Project]) -> dict[uuid.UUID, list[Project]]:
        grouped: dict[uuid.UUID, list[Project]] = defaultdict(list)
        for project in projects:
            bu_id = self._bu_id_for_project(project)
            if bu_id:
                grouped[bu_id].append(project)
        return grouped

    def _submissions_for_bu(
        self,
        bu_id: uuid.UUID,
        projects: list[Project],
        submissions: list[Submission],
    ) -> list[Submission]:
        project_ids = {p.id for p in projects if self._bu_id_for_project(p) == bu_id}
        return [s for s in submissions if s.project_id in project_ids]

    @staticmethod
    def _delivery_head_names(accounts: list[Account]) -> str | None:
        names: list[str] = []
        seen: set[uuid.UUID] = set()
        for account in accounts:
            bu = account.business_unit
            if bu and bu.delivery_head_user_id and bu.delivery_head_user_id not in seen:
                dh = bu.delivery_head
                if dh and dh.full_name:
                    names.append(dh.full_name)
                    seen.add(bu.delivery_head_user_id)
        return ", ".join(sorted(names)) if names else None

    @staticmethod
    def _latest_health_by_project(
        submissions: list[Submission],
        health_by_submission: dict[uuid.UUID, HealthScore],
    ) -> dict[uuid.UUID, HealthScore]:
        latest: dict[uuid.UUID, HealthScore] = {}
        for sub in sorted(submissions, key=lambda s: s.updated_at):
            health = health_by_submission.get(sub.id)
            if health is not None:
                latest[sub.project_id] = health
        return latest

    @staticmethod
    def _rag_percentages(
        health_rows: list[HealthScore],
    ) -> tuple[float, float, float, int, int, int]:
        if not health_rows:
            return 0.0, 0.0, 0.0, 0, 0, 0
        green = amber = red = 0
        for h in health_rows:
            if h.rag_status == RagStatus.GREEN:
                green += 1
            elif h.rag_status == RagStatus.AMBER:
                amber += 1
            elif h.rag_status == RagStatus.RED:
                red += 1
        total = len(health_rows)
        return (
            round(green / total * 100, 1),
            round(amber / total * 100, 1),
            round(red / total * 100, 1),
            green,
            amber,
            red,
        )

    def overview(self, user: User) -> PlatformOverviewResponse:
        self._require_platform_admin(user)
        bus = self._bus.list_all()
        accounts = self._all_accounts()
        projects = self._all_projects()
        submissions = self._submissions()
        health_by_sub = self._health_by_submission()

        # QPM RAG per project (approved plans take precedence)
        qpm_rag = self._qpm_rag_by_project()

        # Tally RAG from QPM first, then governance fallback
        g = a = r = 0
        for proj in projects:
            if proj.id in qpm_rag:
                rag = qpm_rag[proj.id]
            else:
                latest_sub = next(
                    (s for s in sorted(submissions, key=lambda s: s.updated_at, reverse=True)
                     if s.project_id == proj.id), None
                )
                h = health_by_sub.get(latest_sub.id) if latest_sub else None
                rag = h.rag_status if h else None

            if rag == RagStatus.GREEN: g += 1
            elif rag == RagStatus.AMBER: a += 1
            elif rag == RagStatus.RED: r += 1

        total = len(projects) or 1
        return PlatformOverviewResponse(
            total_customers=len(accounts),
            total_business_units=len(bus),
            total_projects=len(projects),
            total_submissions=len(submissions),
            green_percent=round(g / total * 100, 1),
            amber_percent=round(a / total * 100, 1),
            red_percent=round(r / total * 100, 1),
            green_count=g,
            amber_count=a,
            red_count=r,
        )

    def risk_summary(self, user: User) -> list[PlatformRiskSummaryRow]:
        self._require_platform_admin(user)
        bus = self._bus.list_all()
        projects = self._all_projects()
        submissions = self._submissions()
        health_by_sub = self._health_by_submission()
        accounts_by_bu = self._accounts_by_bu()
        projects_by_bu = self._projects_by_bu(projects)
        qpm_rag = self._qpm_rag_by_project()

        rows: list[PlatformRiskSummaryRow] = []
        for bu in bus:
            bu_projects = projects_by_bu.get(bu.id, [])
            bu_subs = self._submissions_for_bu(bu.id, bu_projects, submissions)
            latest = self._latest_health_by_project(bu_subs, health_by_sub)

            # Count red projects — QPM first, then governance fallback
            red_projects = 0
            for proj in bu_projects:
                if proj.id in qpm_rag:
                    if qpm_rag[proj.id] == "RED":
                        red_projects += 1
                else:
                    h = latest.get(proj.id)
                    if h and h.rag_status == RagStatus.RED:
                        red_projects += 1

            project_count = len(bu_projects)
            red_pct = round(red_projects / project_count * 100, 1) if project_count else 0.0
            rows.append(
                PlatformRiskSummaryRow(
                    business_unit_id=bu.id,
                    business_unit_name=bu.name,
                    delivery_head_name=self._delivery_head_names(accounts_by_bu.get(bu.id, [])),
                    project_count=project_count,
                    red_projects=red_projects,
                    red_percent=red_pct,
                    escalation_flag=red_pct > HIGH_RISK_RED_PERCENT,
                )
            )
        return rows

    def approval_latency(self, user: User) -> list[PlatformApprovalLatencyRow]:
        self._require_platform_admin(user)
        bus = self._bus.list_all()
        projects = self._all_projects()
        submissions = self._submissions()
        projects_by_bu = self._projects_by_bu(projects)

        rows: list[PlatformApprovalLatencyRow] = []
        for bu in bus:
            bu_subs = self._submissions_for_bu(bu.id, projects, submissions)
            days_list: list[int] = []
            for sub in bu_subs:
                if sub.submission_date and sub.approval_date:
                    delta = sub.approval_date - sub.submission_date
                    days_list.append(max(0, delta.days))
            if days_list:
                rows.append(
                    PlatformApprovalLatencyRow(
                        business_unit_id=bu.id,
                        business_unit_name=bu.name,
                        average_approval_days=round(sum(days_list) / len(days_list), 1),
                        min_approval_days=min(days_list),
                        max_approval_days=max(days_list),
                        sample_count=len(days_list),
                    )
                )
            else:
                rows.append(
                    PlatformApprovalLatencyRow(
                        business_unit_id=bu.id,
                        business_unit_name=bu.name,
                        average_approval_days=None,
                        min_approval_days=None,
                        max_approval_days=None,
                        sample_count=0,
                    )
                )
        return rows

    def template_adoption(self, user: User) -> list[PlatformTemplateAdoptionRow]:
        self._require_platform_admin(user)
        bus = self._bus.list_all()
        projects = self._all_projects()
        submissions = self._submissions()
        excel_ids = self._excel_submission_ids()
        projects_by_bu = self._projects_by_bu(projects)

        rows: list[PlatformTemplateAdoptionRow] = []
        for bu in bus:
            bu_subs = self._submissions_for_bu(bu.id, projects, submissions)
            excel_count = sum(1 for s in bu_subs if s.id in excel_ids)
            manual_count = len(bu_subs) - excel_count
            total = excel_count + manual_count
            adoption = round(excel_count / total * 100, 1) if total else None
            rows.append(
                PlatformTemplateAdoptionRow(
                    business_unit_id=bu.id,
                    business_unit_name=bu.name,
                    manual_submissions=manual_count,
                    excel_submissions=excel_count,
                    adoption_percent=adoption,
                )
            )
        return rows

    def bu_analysis(self, user: User, bu_id: uuid.UUID) -> PlatformBUAnalysisResponse:
        self._require_platform_admin(user)
        bu = self._bus.get_by_id(bu_id)
        if bu is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business unit not found")

        projects = self._all_projects()
        submissions = self._submissions()
        health_by_sub = self._health_by_submission()
        accounts_by_bu = self._accounts_by_bu()
        qpm_rag = self._qpm_rag_by_project()

        bu_projects = [p for p in projects if self._bu_id_for_project(p) == bu_id]
        bu_subs = self._submissions_for_bu(bu_id, bu_projects, submissions)

        green = amber = red = 0
        scores: list[float] = []
        rag_to_score = {"GREEN": 90.0, "AMBER": 65.0, "RED": 40.0}
        for proj in bu_projects:
            if proj.id in qpm_rag:
                rag = qpm_rag[proj.id]
                if rag == "GREEN": green += 1
                elif rag == "AMBER": amber += 1
                elif rag == "RED": red += 1
                scores.append(rag_to_score.get(rag, 65.0))
            else:
                for sub in bu_subs:
                    if sub.project_id != proj.id:
                        continue
                    health = health_by_sub.get(sub.id)
                    if health is None:
                        continue
                    scores.append(float(health.overall_score))
                    if health.rag_status == RagStatus.GREEN: green += 1
                    elif health.rag_status == RagStatus.AMBER: amber += 1
                    elif health.rag_status == RagStatus.RED: red += 1

        trend_counts: dict[str, int] = defaultdict(int)
        for sub in bu_subs:
            trend_counts[sub.status.code] += 1
        trends = [
            PlatformSubmissionTrend(status_code=code, count=count)
            for code, count in sorted(trend_counts.items())
        ]

        recent: list[PlatformRecentApproval] = []
        approved_subs = [
            s for s in bu_subs
            if s.status.code in ("APPROVED", "LOCKED") and s.approval_date is not None
        ]
        epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
        for sub in sorted(approved_subs, key=lambda s: s.approval_date or epoch, reverse=True)[:10]:
            health = health_by_sub.get(sub.id)
            rag_override = qpm_rag.get(sub.project_id)
            recent.append(
                PlatformRecentApproval(
                    submission_id=sub.id,
                    project_name=sub.project.project_name if sub.project else "",
                    status_code=sub.status.code,
                    approval_date=sub.approval_date,
                    overall_score=float(health.overall_score) if health else None,
                    rag_status=rag_override or (health.rag_status if health else None),
                )
            )

        dh_names: list[str] = []
        for account in accounts_by_bu.get(bu_id, []):
            bu_obj = account.business_unit
            if bu_obj and bu_obj.delivery_head and bu_obj.delivery_head.full_name:
                name = bu_obj.delivery_head.full_name
                if name not in dh_names:
                    dh_names.append(name)

        return PlatformBUAnalysisResponse(
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
            health_percent=round(sum(scores) / len(scores), 1) if scores else None,
            submission_trends=trends,
            recent_approvals=recent,
        )
