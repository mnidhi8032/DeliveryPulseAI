"""Period Measures Service — unified parameter entry for a project+period."""
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.kpi_measurement import KpiMeasureEntry, KpiMeasurement
from app.models.kpi_plan import KpiPlan, KpiPlanMetric
from app.models.project import Project
from app.models.project_period_measure import ProjectPeriodMeasure
from app.models.user import User
from app.schemas.period_measures import (
    AllMeasuresForPeriodResponse,
    MetricComputeResult,
    PeriodMeasureResponse,
    PeriodMeasureSaveRequest,
    PeriodSaveResponse,
)
from app.services.access_control_service import AccessControlService
from app.services.qpm_service import get_required_measures, compute_kpi_value


class PeriodMeasuresService:
    def __init__(self, session: Session) -> None:
        self._s = session
        self._access = AccessControlService(session)

    def _require_pm(self, user: User) -> None:
        if not self._access.is_pm(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Project Manager role required",
            )

    def _get_plan_or_404(self, plan_id: uuid.UUID) -> KpiPlan:
        plan = self._s.get(KpiPlan, plan_id)
        if plan is None:
            raise HTTPException(status_code=404, detail="KPI plan not found")
        return plan

    # ── Build all measures info for a plan ────────────────────────────────────

    def get_all_measures(
        self,
        user: User,
        project_id: uuid.UUID,
        period_label: str,
    ) -> AllMeasuresForPeriodResponse:
        """Return unified parameters view for the project+period."""
        project = self._s.get(Project, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        self._access.require_can_view_project(user, project)

        # Get KPI plan
        plan = self._s.execute(
            select(KpiPlan).where(KpiPlan.project_id == project_id)
        ).scalar_one_or_none()
        if plan is None:
            raise HTTPException(status_code=404, detail="KPI plan not found")

        # All active plan metrics
        active_metrics = self._s.execute(
            select(KpiPlanMetric)
            .where(KpiPlanMetric.kpi_plan_id == plan.id, KpiPlanMetric.is_active == True)
            .order_by(KpiPlanMetric.metric_category, KpiPlanMetric.metric_name)
        ).scalars().all()

        # Build measure → [metric names] map
        measure_to_metrics: dict[str, list[str]] = {}
        metric_info_list: list[dict] = []
        for m in active_metrics:
            required = get_required_measures(m.metric_name)
            for measure in required:
                if measure not in measure_to_metrics:
                    measure_to_metrics[measure] = []
                measure_to_metrics[measure].append(m.metric_name)

            # Get last used thresholds: latest KpiMeasurement for this metric
            last_meas = self._s.execute(
                select(KpiMeasurement)
                .where(KpiMeasurement.plan_metric_id == m.id)
                .order_by(KpiMeasurement.submitted_date.desc().nullslast(),
                          KpiMeasurement.updated_at.desc())
                .limit(1)
            ).scalar_one_or_none()

            # Priority: last used thresholds > plan metric defaults
            eff_lsl    = float(last_meas.lsl)    if last_meas and last_meas.lsl    is not None else (float(m.lsl)    if m.lsl    is not None else None)
            eff_target = float(last_meas.target) if last_meas and last_meas.target is not None else (float(m.target) if m.target is not None else None)
            eff_usl    = float(last_meas.usl)    if last_meas and last_meas.usl    is not None else (float(m.usl)    if m.usl    is not None else None)

            metric_info_list.append({
                "plan_metric_id": str(m.id),
                "metric_name": m.metric_name,
                "metric_category": m.metric_category,
                "lsl":    eff_lsl,
                "target": eff_target,
                "usl":    eff_usl,
                "required_measures": get_required_measures(m.metric_name),
                "frequency": m.frequency,
                "uom": m.uom,
                "intent": m.intent,
            })

        # Fetch saved values for this project+period from the shared store
        saved = self._s.execute(
            select(ProjectPeriodMeasure).where(
                ProjectPeriodMeasure.project_id == project_id,
                func.lower(ProjectPeriodMeasure.period_label) == func.lower(period_label),
            )
        ).scalars().all()
        saved_map: dict[str, Decimal | None] = {row.measure_name: row.actual_value for row in saved}

        # Build measures list ordered by most used desc
        measures_list = []
        for measure_name, using_metrics in sorted(
            measure_to_metrics.items(), key=lambda x: -len(x[1])
        ):
            measures_list.append({
                "measure_name": measure_name,
                "actual_value": float(saved_map[measure_name]) if measure_name in saved_map and saved_map[measure_name] is not None else None,
                "metrics_using": using_metrics,
                "metrics_count": len(using_metrics),
            })

        # Fetch history — all KpiMeasurement rows for all active metrics, newest first
        metric_ids = [m.id for m in active_metrics]
        history_rows: list[dict] = []
        if metric_ids:
            measurements = self._s.execute(
                select(KpiMeasurement, KpiPlanMetric)
                .join(KpiPlanMetric, KpiMeasurement.plan_metric_id == KpiPlanMetric.id)
                .where(KpiMeasurement.plan_metric_id.in_(metric_ids))
                .order_by(KpiMeasurement.submitted_date.desc().nullslast(), KpiMeasurement.updated_at.desc())
            ).all()
            for meas, pm in measurements:
                # Build inputs string from measure1..4
                inputs_parts = []
                for i in range(1, 5):
                    mv = getattr(meas, f"measure{i}_value")
                    if mv is not None:
                        inputs_parts.append(str(float(mv)))
                inputs_str = " / ".join(inputs_parts) if inputs_parts else "—"
                history_rows.append({
                    "measurement_id": str(meas.id),
                    "plan_metric_id": str(meas.plan_metric_id),
                    "metric_name": pm.metric_name,
                    "metric_category": pm.metric_category,
                    "frequency_name": meas.frequency_name,
                    "from_date": meas.from_date.isoformat() if meas.from_date else None,
                    "to_date": meas.to_date.isoformat() if meas.to_date else None,
                    "actual_value": float(meas.actual_value) if meas.actual_value is not None else None,
                    "inputs_str": inputs_str,
                    "lsl": float(meas.lsl) if meas.lsl is not None else None,
                    "target": float(meas.target) if meas.target is not None else None,
                    "usl": float(meas.usl) if meas.usl is not None else None,
                    "rag_status": meas.rag_status,
                    "submitted_date": meas.submitted_date.isoformat() if meas.submitted_date else None,
                    "updated_at": meas.updated_at.isoformat() if meas.updated_at else None,
                    "analysis_comments": meas.analysis_comments,
                })

        return AllMeasuresForPeriodResponse(
            period_label=period_label,
            measures=measures_list,
            metrics=metric_info_list,
            history=history_rows,
        )

    # ── Save parameters + auto-compute metrics ────────────────────────────────

    def save_and_compute(
        self,
        user: User,
        project_id: uuid.UUID,
        body: PeriodMeasureSaveRequest,
    ) -> PeriodSaveResponse:
        """
        Save all provided parameters for the project+period, then auto-compute
        every metric that now has all its required measures filled.
        """
        self._require_pm(user)

        project = self._s.get(Project, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        self._access.require_can_view_project(user, project)

        plan = self._get_plan_or_404(body.plan_id)
        if plan.project_id != project_id:
            raise HTTPException(status_code=400, detail="Plan does not belong to this project")

        now = datetime.now(timezone.utc)

        # Upsert each measure into the shared store
        saved_measures: list[PeriodMeasureResponse] = []
        for item in body.measures:
            existing = self._s.execute(
                select(ProjectPeriodMeasure).where(
                    ProjectPeriodMeasure.project_id == project_id,
                    func.lower(ProjectPeriodMeasure.period_label) == func.lower(body.period_label),
                    ProjectPeriodMeasure.measure_name == item.measure_name,
                )
            ).scalar_one_or_none()

            if existing:
                existing.actual_value = item.actual_value
                existing.frequency = body.frequency
                existing.from_date = body.from_date
                existing.to_date = body.to_date
                existing.entered_by_user_id = user.id
                existing.updated_at = now
                row = existing
            else:
                row = ProjectPeriodMeasure(
                    id=uuid.uuid4(),
                    project_id=project_id,
                    kpi_plan_id=body.plan_id,
                    period_label=body.period_label,
                    frequency=body.frequency,
                    from_date=body.from_date,
                    to_date=body.to_date,
                    measure_name=item.measure_name,
                    actual_value=item.actual_value,
                    entered_by_user_id=user.id,
                )
                self._s.add(row)

            saved_measures.append(PeriodMeasureResponse(
                measure_name=item.measure_name,
                actual_value=item.actual_value,
                updated_at=now,
            ))

        self._s.flush()

        # Apply PM-edited thresholds to plan metrics (persists for future loads)
        if body.thresholds:
            for metric_id_str, t in body.thresholds.items():
                try:
                    pm_id = uuid.UUID(metric_id_str)
                    pm_row = self._s.get(KpiPlanMetric, pm_id)
                    if pm_row:
                        if "lsl" in t:
                            pm_row.lsl = Decimal(str(t["lsl"])) if t["lsl"] is not None else None
                        if "target" in t:
                            pm_row.target = Decimal(str(t["target"])) if t["target"] is not None else None
                        if "usl" in t:
                            pm_row.usl = Decimal(str(t["usl"])) if t["usl"] is not None else None
                except Exception:
                    pass
            self._s.flush()

        # Reload all saved values for this project+period
        all_saved = self._s.execute(
            select(ProjectPeriodMeasure).where(
                ProjectPeriodMeasure.project_id == project_id,
                func.lower(ProjectPeriodMeasure.period_label) == func.lower(body.period_label),
            )
        ).scalars().all()
        measure_values_map: dict[str, float] = {
            r.measure_name: float(r.actual_value)
            for r in all_saved
            if r.actual_value is not None
        }

        # Auto-compute each active metric that has complete inputs
        active_metrics = self._s.execute(
            select(KpiPlanMetric)
            .where(KpiPlanMetric.kpi_plan_id == body.plan_id, KpiPlanMetric.is_active == True)
        ).scalars().all()

        computed_results: list[MetricComputeResult] = []
        for pm in active_metrics:
            required = get_required_measures(pm.metric_name)
            missing = [m for m in required if m not in measure_values_map]

            if missing:
                # Can't compute — missing some parameters
                computed_results.append(MetricComputeResult(
                    plan_metric_id=pm.id,
                    metric_name=pm.metric_name,
                    metric_category=pm.metric_category,
                    frequency_name=body.period_label,
                    actual_value=None,
                    rag_status=None,
                    target=Decimal(str(pm.target)) if pm.target is not None else None,
                    lsl=Decimal(str(pm.lsl)) if pm.lsl is not None else None,
                    usl=Decimal(str(pm.usl)) if pm.usl is not None else None,
                    complete=False,
                    missing_measures=missing,
                ))
                continue

            # Compute KPI value
            from app.models.qpm_catalog_metric import QPMCatalogMetric
            catalog = self._s.execute(
                select(QPMCatalogMetric).where(QPMCatalogMetric.name == pm.metric_name)
            ).scalar_one_or_none()
            metric_uom = catalog.uom if catalog else pm.uom

            raw_value = compute_kpi_value(pm.metric_name, measure_values_map, uom=metric_uom)
            actual_val = Decimal(str(round(raw_value, 4))) if raw_value is not None else None

            effective_target = Decimal(str(pm.target)) if pm.target is not None else None
            effective_lsl = Decimal(str(pm.lsl)) if pm.lsl is not None else None
            effective_usl = Decimal(str(pm.usl)) if pm.usl is not None else None

            # Compute RAG
            from app.services.qpm_service import _compute_rag
            rag = _compute_rag(actual_val, pm.intent, effective_target, effective_lsl, effective_usl)

            # Also sync back to kpi_measure_entries (for backward compat with tracker/summary)
            for measure_name in required:
                val = measure_values_map.get(measure_name)
                existing_entry = self._s.execute(
                    select(KpiMeasureEntry).where(
                        KpiMeasureEntry.plan_metric_id == pm.id,
                        KpiMeasureEntry.measure_name == measure_name,
                        func.lower(KpiMeasureEntry.frequency_name) == func.lower(body.period_label),
                    )
                ).scalar_one_or_none()
                if existing_entry:
                    existing_entry.actual_value = Decimal(str(val)) if val is not None else None
                    existing_entry.updated_at = now
                else:
                    self._s.add(KpiMeasureEntry(
                        id=uuid.uuid4(),
                        plan_metric_id=pm.id,
                        entered_by_user_id=user.id,
                        measure_name=measure_name,
                        actual_value=Decimal(str(val)) if val is not None else None,
                        uom=pm.uom,
                        frequency=body.frequency,
                        frequency_name=body.period_label,
                        from_date=body.from_date,
                        to_date=body.to_date,
                    ))

            # Build measure snapshot (up to 4)
            measure_snapshot: dict[str, float | None] = {}
            for i, mname in enumerate(required[:4], 1):
                measure_snapshot[f"measure{i}_name"] = mname
                measure_snapshot[f"measure{i}_value"] = measure_values_map.get(mname)

            # Always insert a new KpiMeasurement row (each save = one chart data point)
            # This allows the chart to show the full history of all saves
            meas_row = KpiMeasurement(
                id=uuid.uuid4(),
                plan_metric_id=pm.id,
                entered_by_user_id=user.id,
                frequency=body.frequency,
                frequency_name=body.period_label,
                from_date=body.from_date,
                to_date=body.to_date,
                actual_value=actual_val,
                target=effective_target,
                lsl=effective_lsl,
                usl=effective_usl,
                rag_status=rag,
                submitted_by=user.full_name,
                submitted_date=now,
            )
            for k, v in measure_snapshot.items():
                setattr(meas_row, k, v)
            self._s.add(meas_row)

            computed_results.append(MetricComputeResult(
                plan_metric_id=pm.id,
                metric_name=pm.metric_name,
                metric_category=pm.metric_category,
                frequency_name=body.period_label,
                actual_value=actual_val,
                rag_status=rag,
                target=effective_target,
                lsl=effective_lsl,
                usl=effective_usl,
                complete=True,
                missing_measures=[],
            ))

        self._s.commit()

        return PeriodSaveResponse(
            period_label=body.period_label,
            saved_measures=saved_measures,
            computed_metrics=computed_results,
        )
