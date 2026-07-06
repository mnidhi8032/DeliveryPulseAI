"""QPM Service — KPI Plan, Measure Entry, KPI Computation, Tracker, Summary, Doc Info."""
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.models.kpi_measurement import KpiMeasureEntry, KpiMeasurement
from app.models.kpi_plan import KpiDocInfo, KpiDocVersionHistory, KpiPlan, KpiPlanMetric
from app.models.qpm_catalog_metric import QPMCatalogMetric
from app.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.schemas.qpm import (
    KpiDocInfoRequest, KpiDocInfoResponse,
    KpiDocVersionHistoryRequest, KpiDocVersionHistoryResponse,
    KpiMeasureEntryCreateRequest, KpiMeasureEntryResponse,
    KpiMeasurementCreateRequest, KpiMeasurementResponse, KpiMeasurementUpdateRequest,
    KpiPlanCreateRequest, KpiPlanMetricCreateRequest, KpiPlanMetricResponse,
    KpiPlanMetricUpdateRequest, KpiPlanResponse, KpiPlanUpdateRequest,
    KpiSummaryMetric, KpiSummaryResponse, KpiTrackerRowResponse,
    QPMCatalogMetricResponse,
)
from app.services.access_control_service import AccessControlService
from app.core.constants import RoleCode

# Load measure mapping
_MAPPING_FILE = Path(__file__).resolve().parents[2] / "scripts" / "measure_mapping.json"
_MEASURE_MAP: dict[str, list[dict]] = {}

def _load_measure_map():
    global _MEASURE_MAP
    if _MEASURE_MAP:
        return
    try:
        with open(_MAPPING_FILE, encoding="utf-8") as f:
            data = json.load(f)
        for row in data:
            metric = row["metric"]
            if metric not in _MEASURE_MAP:
                _MEASURE_MAP[metric] = []
            _MEASURE_MAP[metric].append(row)
    except Exception:
        _MEASURE_MAP = {}

_load_measure_map()


def get_required_measures(metric_name: str) -> list[str]:
    """Return ordered list of measure names required to compute a metric."""
    rows = _MEASURE_MAP.get(metric_name, [])
    # Direct metrics (D): single measure = KPI directly
    # Computed metrics (C): multiple measures
    numerators = sorted([r for r in rows if r.get("n_seq")], key=lambda x: x["n_seq"])
    denominators = sorted([r for r in rows if r.get("d_seq") and not r.get("n_seq")], key=lambda x: x["d_seq"])
    all_measures = numerators + denominators
    if not all_measures:
        return [metric_name]  # fallback: single direct measure same name as metric
    return [r["measure"] for r in all_measures]


def compute_kpi_value(metric_name: str, measure_values: dict[str, float], uom: str | None = None) -> float | None:
    """
    Compute KPI value from component measure values.
    measure_values: {measure_name: value}
    uom: unit of measure — only metrics with UOM=% get multiplied by 100.
         Ratio metrics (Person-hours/Size Unit, Number, etc.) are plain division.
    Returns computed float or None if cannot compute.
    """
    rows = _MEASURE_MAP.get(metric_name, [])
    if not rows:
        # Direct: single measure same name
        return measure_values.get(metric_name)

    comp_type = rows[0].get("comp_type", "D")

    if comp_type == "D":
        # Direct — first measure IS the value
        measure = rows[0]["measure"]
        return measure_values.get(measure)

    # Computed (C): build numerator and denominator from measure inputs.
    # Only multiply by 100 for percentage metrics (UOM == "%").
    numerators  = sorted([r for r in rows if r.get("n_seq")],                              key=lambda x: x["n_seq"])
    denominators = sorted([r for r in rows if r.get("d_seq")],                             key=lambda x: x["d_seq"])

    if not numerators:
        return None

    # Build numerator.
    # CONVENTION: n_op on row N is the operator used to combine row N+1 into the total
    # (look-ahead). So when processing row i, apply the n_op from row i-1.
    num_val: float | None = None
    prev_n_op: str = "+"
    for r in numerators:
        v = measure_values.get(r["measure"])
        if v is None:
            continue
        if num_val is None:
            num_val = v              # first item — just set, no operator
        else:
            op = (prev_n_op or "+").strip() or "+"
            if op == "+":
                num_val += v
            elif op == "-":
                num_val -= v
            elif op == "*":
                num_val *= v
        # save this row's n_op for the next iteration
        prev_n_op = (r.get("n_op") or "+").strip() or "+"

    if num_val is None:
        return None

    if not denominators:
        return num_val

    # Build denominator.
    # Same look-ahead convention: d_op on row N is the operator for row N+1.
    denom_val: float | None = None
    prev_d_op: str = "+"
    for r in denominators:
        v = measure_values.get(r["measure"])
        if v is None:
            continue
        if denom_val is None:
            denom_val = v
        else:
            op = (prev_d_op or "+").strip() or "+"
            if op == "+":
                denom_val += v
            elif op == "-":
                denom_val -= v
        prev_d_op = (r.get("d_op") or "+").strip() or "+"

    if not denom_val:
        return None

    result = num_val / denom_val

    # Only scale to percentage when UOM is explicitly "%"
    # Ratio/delivery-rate metrics (Person-hours/Size Unit, Number, etc.) stay as plain ratio
    is_percent = (uom or "").strip() == "%"
    if is_percent:
        result = result * 100

    return result


def _compute_rag(
    actual: Decimal | None,
    intent: str | None,
    target: Decimal | None,
    lsl: Decimal | None,
    usl: Decimal | None,
) -> str | None:
    if actual is None:
        return None
    a = float(actual)
    t = float(target) if target is not None else None
    lo = float(lsl) if lsl is not None else None
    hi = float(usl) if usl is not None else None
    i = (intent or "").lower()

    if "higher" in i or "more" in i:
        if t is not None and a >= t:       return "GREEN"
        if lo is not None and a < lo:      return "RED"
        return "AMBER"
    if "lower" in i or "less" in i:
        if t is not None and a <= t:       return "GREEN"
        if hi is not None and a > hi:      return "RED"
        return "AMBER"
    if "nominal" in i:
        if hi is not None and a > hi:      return "RED"
        if lo is not None and a < lo:      return "RED"
        if t is not None and abs(a - t) / max(abs(t), 0.001) <= 0.05: return "GREEN"
        return "AMBER"
    if "within" in i or "limit" in i:
        if hi is not None and a > hi:      return "RED"
        if lo is not None and a < lo:      return "RED"
        return "GREEN"
    return None


class QPMService:
    def __init__(self, session: Session) -> None:
        self._s = session
        self._access = AccessControlService(session)
        self._projects = ProjectRepository(session)

    def _proj_check(self, user: User, project_id: uuid.UUID):
        project = self._projects.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        self._access.require_can_view_project(user, project)
        return project

    def _get_plan_or_404(self, plan_id: uuid.UUID) -> KpiPlan:
        plan = self._s.execute(
            select(KpiPlan).options(selectinload(KpiPlan.metrics)).where(KpiPlan.id == plan_id)
        ).scalar_one_or_none()
        if plan is None:
            raise HTTPException(status_code=404, detail="KPI Plan not found")
        return plan

    # ── Catalog ───────────────────────────────────────────────────────────────

    def list_catalog(self, category=None, project_type=None, delivery_model=None):
        stmt = select(QPMCatalogMetric).where(QPMCatalogMetric.is_active == True)
        if category:
            stmt = stmt.where(QPMCatalogMetric.category == category)
        if project_type:
            stmt = stmt.where(QPMCatalogMetric.project_type.ilike(f"%{project_type}%"))
        if delivery_model:
            stmt = stmt.where(QPMCatalogMetric.delivery_model.ilike(f"%{delivery_model}%"))
        rows = self._s.execute(stmt.order_by(QPMCatalogMetric.category, QPMCatalogMetric.name)).scalars().all()
        return [QPMCatalogMetricResponse.model_validate(r) for r in rows]

    def list_catalog_all(self):
        """Return all catalog metrics including inactive ones — for DE admin view."""
        rows = self._s.execute(
            select(QPMCatalogMetric).order_by(QPMCatalogMetric.category, QPMCatalogMetric.name)
        ).scalars().all()
        return [QPMCatalogMetricResponse.model_validate(r) for r in rows]

    def create_catalog_metric(self, user, body) -> QPMCatalogMetricResponse:
        from app.schemas.qpm import QPMCatalogMetricCreateRequest
        existing = self._s.execute(
            select(QPMCatalogMetric).where(QPMCatalogMetric.name == body.name)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail=f"Metric '{body.name}' already exists in the catalog.")
        metric = QPMCatalogMetric(
            id=uuid.uuid4(),
            category=body.category,
            name=body.name,
            formula=body.formula,
            uom=body.uom,
            metrics_type=body.metrics_type,
            intent=body.intent,
            project_type=body.project_type,
            delivery_model=body.delivery_model,
            project_category=body.project_category,
            frequency=body.frequency,
            compliance=body.compliance,
            default_target=body.default_target,
            default_lsl=body.default_lsl,
            default_usl=body.default_usl,
            is_active=True,
        )
        self._s.add(metric)
        self._s.commit()
        self._s.refresh(metric)
        return QPMCatalogMetricResponse.model_validate(metric)

    def update_catalog_metric(self, user, metric_id: uuid.UUID, body) -> QPMCatalogMetricResponse:
        metric = self._s.get(QPMCatalogMetric, metric_id)
        if metric is None:
            raise HTTPException(status_code=404, detail="Catalog metric not found")
        for field, val in body.model_dump(exclude_unset=True).items():
            setattr(metric, field, val)
        metric.updated_at = datetime.now(timezone.utc)
        self._s.commit()
        self._s.refresh(metric)
        return QPMCatalogMetricResponse.model_validate(metric)

    # ── KPI Plan ──────────────────────────────────────────────────────────────

    def get_or_create_plan(self, user: User, project_id: uuid.UUID) -> KpiPlanResponse:
        self._proj_check(user, project_id)
        plan = self._s.execute(
            select(KpiPlan).options(selectinload(KpiPlan.metrics)).where(KpiPlan.project_id == project_id)
        ).scalar_one_or_none()
        if plan is None:
            plan = KpiPlan(id=uuid.uuid4(), project_id=project_id)
            self._s.add(plan)
            self._s.commit()
            self._s.refresh(plan)
        return KpiPlanResponse.model_validate(plan)

    def update_plan(self, user: User, plan_id: uuid.UUID, body: KpiPlanUpdateRequest) -> KpiPlanResponse:
        plan = self._get_plan_or_404(plan_id)
        for field, val in body.model_dump(exclude_unset=True).items():
            setattr(plan, field, val)
        plan.updated_at = datetime.now(timezone.utc)
        self._s.commit()
        self._s.refresh(plan)
        return KpiPlanResponse.model_validate(plan)

    def submit_qpm_plan(self, user: User, plan_id: uuid.UUID, pm_perception_rag: str | None, pm_rag_comments: str | None) -> KpiPlanResponse:
        """PM submits the KPI plan for Delivery Head review (sets status to UNDER_REVIEW)."""
        plan = self._get_plan_or_404(plan_id)

        if plan.qpm_status not in ("DRAFT", "REJECTED"):
            raise HTTPException(status_code=400, detail=f"Cannot submit — current status is {plan.qpm_status}")
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=403, detail="PM role required")

        # Check at least one metric has been computed (has measurements)
        metric_ids = [m.id for m in plan.metrics if m.is_active]
        if not metric_ids:
            raise HTTPException(status_code=400, detail="No metrics in the plan. Add metrics before submitting.")

        from sqlalchemy import select as sa_select
        from app.models.kpi_measurement import KpiMeasurement
        any_measured = self._s.execute(
            sa_select(KpiMeasurement).where(KpiMeasurement.plan_metric_id.in_(metric_ids)).limit(1)
        ).scalar_one_or_none()
        if not any_measured:
            raise HTTPException(status_code=400, detail="No KPI data entered yet. Enter data in Sheet 2 before submitting.")

        now = datetime.now(timezone.utc)
        plan.qpm_status = "UNDER_REVIEW"
        plan.qpm_submitted_at = now
        plan.qpm_approved_at = None
        plan.qpm_reviewed_by_user_id = None
        plan.qpm_review_comments = None
        if pm_perception_rag:
            plan.pm_perception_rag = pm_perception_rag
        if pm_rag_comments:
            plan.pm_rag_comments = pm_rag_comments

        self._s.commit()
        self._s.refresh(plan)
        return KpiPlanResponse.model_validate(plan)

    def review_qpm_plan(self, user: User, plan_id: uuid.UUID, action: str, review_comments: str | None) -> KpiPlanResponse:
        """Delivery Head approves or rejects a submitted KPI Plan (UNDER_REVIEW → APPROVED | REJECTED)."""
        plan = self._get_plan_or_404(plan_id)

        if plan.qpm_status != "UNDER_REVIEW":
            raise HTTPException(status_code=400, detail=f"Plan must be UNDER_REVIEW to review — current status: {plan.qpm_status}")
        if action not in ("APPROVE", "REJECT"):
            raise HTTPException(status_code=400, detail="action must be APPROVE or REJECT")
        if action == "REJECT" and not review_comments:
            raise HTTPException(status_code=400, detail="review_comments required when rejecting")

        now = datetime.now(timezone.utc)
        if action == "APPROVE":
            plan.qpm_status = "APPROVED"
            plan.qpm_approved_at = now
        else:
            plan.qpm_status = "REJECTED"
            plan.qpm_approved_at = None

        plan.qpm_reviewed_by_user_id = user.id
        plan.qpm_review_comments = review_comments
        plan.updated_at = now

        self._s.commit()
        self._s.refresh(plan)
        return KpiPlanResponse.model_validate(plan)

    def reopen_qpm_plan(self, user: User, plan_id: uuid.UUID) -> KpiPlanResponse:
        """PM reopens an APPROVED plan to revise metric data and re-submit."""
        plan = self._get_plan_or_404(plan_id)

        if plan.qpm_status != "APPROVED":
            raise HTTPException(status_code=400, detail=f"Only APPROVED plans can be reopened — current status: {plan.qpm_status}")
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=403, detail="PM role required to reopen")

        plan.qpm_status = "DRAFT"
        plan.qpm_approved_at = None
        plan.qpm_reviewed_by_user_id = None
        plan.qpm_review_comments = None
        plan.updated_at = datetime.now(timezone.utc)
        self._s.commit()
        self._s.refresh(plan)
        return KpiPlanResponse.model_validate(plan)

    def add_metric_to_plan(self, user: User, plan_id: uuid.UUID, body: KpiPlanMetricCreateRequest) -> KpiPlanMetricResponse:
        plan = self._get_plan_or_404(plan_id)
        if plan.is_finalized:
            raise HTTPException(status_code=400, detail="Plan is finalized.")
        catalog = None
        if body.catalog_metric_id:
            catalog = self._s.get(QPMCatalogMetric, body.catalog_metric_id)
        # Get required measures for this metric
        mname = body.metric_name or (catalog.name if catalog else "")
        required = get_required_measures(mname)
        pm = KpiPlanMetric(
            id=uuid.uuid4(),
            kpi_plan_id=plan_id,
            catalog_metric_id=body.catalog_metric_id,
            metric_name=mname,
            metric_category=body.metric_category or (catalog.category if catalog else None),
            formula=body.formula or (catalog.formula if catalog else None),
            uom=body.uom or (catalog.uom if catalog else None),
            intent=body.intent or (catalog.intent if catalog else None),
            frequency=body.frequency or (catalog.frequency if catalog else None),
            priority=body.priority or (catalog.compliance if catalog else None),
            target=float(body.target) if body.target is not None else (catalog.default_target if catalog else None),
            lsl=float(body.lsl) if body.lsl is not None else (catalog.default_lsl if catalog else None),
            usl=float(body.usl) if body.usl is not None else (catalog.default_usl if catalog else None),
            is_custom=body.is_custom,
            tailoring_reason=body.tailoring_reason,
            reported_to_customer=body.reported_to_customer,
            rationale=body.rationale,
            data_source=body.data_source,
            required_measures=json.dumps(required),
        )
        self._s.add(pm)
        self._s.commit()
        self._s.refresh(pm)
        return KpiPlanMetricResponse.model_validate(pm)

    def update_plan_metric(self, user: User, metric_id: uuid.UUID, body: KpiPlanMetricUpdateRequest) -> KpiPlanMetricResponse:
        pm = self._s.get(KpiPlanMetric, metric_id)
        if pm is None:
            raise HTTPException(status_code=404, detail="Plan metric not found")
        for field, val in body.model_dump(exclude_unset=True).items():
            setattr(pm, field, val)
        pm.updated_at = datetime.now(timezone.utc)
        self._s.commit()
        self._s.refresh(pm)
        return KpiPlanMetricResponse.model_validate(pm)

    def remove_plan_metric(self, user: User, metric_id: uuid.UUID) -> None:
        pm = self._s.get(KpiPlanMetric, metric_id)
        if pm is None:
            raise HTTPException(status_code=404, detail="Plan metric not found")
        if pm.priority == "M":
            raise HTTPException(status_code=400, detail="Mandatory metrics cannot be removed from the plan.")
        plan = self._get_plan_or_404(pm.kpi_plan_id)
        if plan.is_finalized:
            raise HTTPException(status_code=400, detail="Plan is finalized.")
        self._s.delete(pm)
        self._s.commit()

    # ── Measure Entry (Sheet 2) ────────────────────────────────────────────────

    def add_measure_entry(self, user: User, body: KpiMeasureEntryCreateRequest) -> KpiMeasureEntryResponse:
        pm = self._s.get(KpiPlanMetric, body.plan_metric_id)
        if pm is None:
            raise HTTPException(status_code=404, detail="Plan metric not found")

        # Upsert: if an entry already exists for the same metric + measure + period,
        # update it instead of inserting a duplicate.
        # Use case-insensitive match on frequency_name (q5 == Q5).
        existing = self._s.execute(
            select(KpiMeasureEntry).where(
                KpiMeasureEntry.plan_metric_id == body.plan_metric_id,
                KpiMeasureEntry.measure_name == body.measure_name,
                func.lower(KpiMeasureEntry.frequency_name) == func.lower(body.frequency_name),
            )
        ).scalar_one_or_none()

        if existing:
            # Normalize: keep the existing casing (Q5 wins over q5)
            existing.actual_value = body.actual_value
            existing.uom = body.uom or pm.uom
            existing.frequency = body.frequency
            existing.from_date = body.from_date
            existing.to_date = body.to_date
            existing.entered_by_user_id = user.id
            existing.updated_at = datetime.now(timezone.utc)
            self._s.commit()
            self._s.refresh(existing)
            return KpiMeasureEntryResponse.model_validate(existing)

        entry = KpiMeasureEntry(
            id=uuid.uuid4(),
            plan_metric_id=body.plan_metric_id,
            entered_by_user_id=user.id,
            measure_name=body.measure_name,
            actual_value=body.actual_value,
            uom=body.uom or pm.uom,
            frequency=body.frequency,
            frequency_name=body.frequency_name,
            from_date=body.from_date,
            to_date=body.to_date,
        )
        self._s.add(entry)
        self._s.commit()
        self._s.refresh(entry)
        return KpiMeasureEntryResponse.model_validate(entry)

    def list_measure_entries(self, plan_metric_id: uuid.UUID, frequency_name: str | None = None) -> list[KpiMeasureEntryResponse]:
        stmt = select(KpiMeasureEntry).where(KpiMeasureEntry.plan_metric_id == plan_metric_id)
        if frequency_name:
            stmt = stmt.where(KpiMeasureEntry.frequency_name == frequency_name)
        rows = self._s.execute(stmt.order_by(KpiMeasureEntry.from_date.desc().nullslast())).scalars().all()
        return [KpiMeasureEntryResponse.model_validate(r) for r in rows]

    # ── Compute KPI from measures ──────────────────────────────────────────────

    def compute_kpi(self, user: User, plan_metric_id: uuid.UUID, frequency_name: str,
                    from_date=None, to_date=None,
                    override_target=None, override_lsl=None, override_usl=None,
                    analysis_comments: str | None = None) -> KpiMeasurementResponse:
        pm = self._s.get(KpiPlanMetric, plan_metric_id)
        if pm is None:
            raise HTTPException(status_code=404, detail="Plan metric not found")

        # Get all measure entries for this period (case-insensitive)
        stmt = select(KpiMeasureEntry).where(
            KpiMeasureEntry.plan_metric_id == plan_metric_id,
            func.lower(KpiMeasureEntry.frequency_name) == func.lower(frequency_name),
        ).order_by(KpiMeasureEntry.updated_at.desc().nullslast(), KpiMeasureEntry.created_at.desc())
        all_entries = self._s.execute(stmt).scalars().all()

        # Deduplicate by measure_name — keep the most recent entry per measure
        # (guards against legacy duplicate rows created before the upsert fix)
        seen: dict[str, KpiMeasureEntry] = {}
        for e in all_entries:
            if e.measure_name not in seen:
                seen[e.measure_name] = e
        entries = list(seen.values())

        measure_values = {e.measure_name: float(e.actual_value) for e in entries if e.actual_value is not None}

        # Get UOM from catalog metric to decide whether to scale by 100
        # Percentage metrics (UOM="%") → multiply by 100; ratio/rate metrics → plain division
        catalog_metric = self._s.execute(
            select(QPMCatalogMetric).where(QPMCatalogMetric.name == pm.metric_name)
        ).scalar_one_or_none()
        metric_uom = catalog_metric.uom if catalog_metric else None

        # Compute KPI value
        computed = compute_kpi_value(pm.metric_name, measure_values, uom=metric_uom)
        actual_val = Decimal(str(round(computed, 4))) if computed is not None else None

        # Use period-level overrides if provided, otherwise fall back to plan metric defaults
        effective_target = Decimal(str(override_target)) if override_target is not None else (Decimal(str(pm.target)) if pm.target is not None else None)
        effective_lsl = Decimal(str(override_lsl)) if override_lsl is not None else (Decimal(str(pm.lsl)) if pm.lsl is not None else None)
        effective_usl = Decimal(str(override_usl)) if override_usl is not None else (Decimal(str(pm.usl)) if pm.usl is not None else None)

        rag = _compute_rag(actual_val, pm.intent, effective_target, effective_lsl, effective_usl)

        # Build measure1..4 columns from deduplicated entries (ordered by measure sequence)
        sorted_entries = sorted(entries, key=lambda e: e.created_at)
        m_cols = {}
        for i, e in enumerate(sorted_entries[:4], 1):
            m_cols[f"measure{i}_name"] = e.measure_name
            m_cols[f"measure{i}_value"] = e.actual_value

        # Find from_date/to_date from entries
        dates = [e.from_date for e in entries if e.from_date]
        dates_to = [e.to_date for e in entries if e.to_date]
        eff_from = from_date or (min(dates) if dates else None)
        eff_to = to_date or (max(dates_to) if dates_to else None)

        # Upsert measurement (case-insensitive period match)
        existing = self._s.execute(
            select(KpiMeasurement).where(
                KpiMeasurement.plan_metric_id == plan_metric_id,
                func.lower(KpiMeasurement.frequency_name) == func.lower(frequency_name),
            )
        ).scalar_one_or_none()

        if existing:
            existing.actual_value = actual_val
            existing.rag_status = rag
            existing.from_date = eff_from
            existing.to_date = eff_to
            existing.submitted_by = user.full_name
            existing.submitted_date = datetime.now(timezone.utc)
            existing.target = effective_target
            existing.lsl = effective_lsl
            existing.usl = effective_usl
            existing.updated_at = datetime.now(timezone.utc)
            # Preserve existing analysis_comments if no new reason given;
            # overwrite if PM provides a modification reason
            if analysis_comments:
                existing.analysis_comments = analysis_comments
            for k, v in m_cols.items():
                setattr(existing, k, v)
            self._s.flush()
            m = existing
        else:
            freq = entries[0].frequency if entries else None
            m = KpiMeasurement(
                id=uuid.uuid4(),
                plan_metric_id=plan_metric_id,
                entered_by_user_id=user.id,
                frequency=freq,
                frequency_name=frequency_name,
                from_date=eff_from,
                to_date=eff_to,
                actual_value=actual_val,
                target=effective_target,
                lsl=effective_lsl,
                usl=effective_usl,
                rag_status=rag,
                submitted_by=user.full_name,
                submitted_date=datetime.now(timezone.utc),
                analysis_comments=analysis_comments,
                **m_cols,
            )
            self._s.add(m)
        self._s.commit()
        self._s.refresh(m)
        return self._to_measurement_response(m)

    def _to_measurement_response(self, m: KpiMeasurement) -> KpiMeasurementResponse:
        pm = m.plan_metric
        return KpiMeasurementResponse(
            id=m.id, plan_metric_id=m.plan_metric_id,
            metric_name=pm.metric_name if pm else None,
            metric_category=pm.metric_category if pm else None,
            uom=pm.uom if pm else None,
            intent=pm.intent if pm else None,
            frequency=m.frequency, frequency_name=m.frequency_name,
            from_date=m.from_date, to_date=m.to_date,
            actual_value=m.actual_value, target=m.target, lsl=m.lsl, usl=m.usl,
            analysis_comments=m.analysis_comments, action_taken=m.action_taken,
            responsibility=m.responsibility, action_status=m.action_status,
            updated_by=m.updated_by, rag_status=m.rag_status,
            submitted_by=m.submitted_by, submitted_date=m.submitted_date,
            measure1_name=m.measure1_name, measure1_value=m.measure1_value,
            measure2_name=m.measure2_name, measure2_value=m.measure2_value,
            measure3_name=m.measure3_name, measure3_value=m.measure3_value,
            measure4_name=m.measure4_name, measure4_value=m.measure4_value,
            created_at=m.created_at, updated_at=m.updated_at,
        )

    # ── KPI Tracker (Sheet 3) ─────────────────────────────────────────────────

    def get_tracker(self, user: User, plan_id: uuid.UUID) -> list[KpiTrackerRowResponse]:
        plan = self._get_plan_or_404(plan_id)
        metric_ids = [pm.id for pm in plan.metrics if pm.is_active]
        if not metric_ids:
            return []
        rows = self._s.execute(
            select(KpiMeasurement)
            .options(selectinload(KpiMeasurement.plan_metric))
            .where(KpiMeasurement.plan_metric_id.in_(metric_ids))
            .order_by(KpiMeasurement.from_date.desc().nullslast(), KpiMeasurement.created_at.desc())
        ).scalars().all()
        return [KpiTrackerRowResponse(
            id=r.id, plan_metric_id=r.plan_metric_id,
            metric=r.plan_metric.metric_name if r.plan_metric else "",
            frequency=r.frequency, frequency_name=r.frequency_name,
            actual_value=r.actual_value, uom=r.plan_metric.uom if r.plan_metric else None,
            target_operator=r.target_operator, target=r.target, lsl=r.lsl, usl=r.usl,
            measure1_name=r.measure1_name, measure1_value=r.measure1_value,
            measure2_name=r.measure2_name, measure2_value=r.measure2_value,
            measure3_name=r.measure3_name, measure3_value=r.measure3_value,
            measure4_name=r.measure4_name, measure4_value=r.measure4_value,
            from_date=r.from_date, to_date=r.to_date,
            submitted_by=r.submitted_by, submitted_date=r.submitted_date,
            rag_status=r.rag_status,
            analysis_comments=r.analysis_comments, action_taken=r.action_taken,
            responsibility=r.responsibility, action_status=r.action_status,
            updated_by=r.updated_by, updated_date=r.updated_at,
        ) for r in rows]

    def update_tracker_row(self, user: User, measurement_id: uuid.UUID, body: KpiMeasurementUpdateRequest) -> KpiMeasurementResponse:
        m = self._s.execute(
            select(KpiMeasurement).options(selectinload(KpiMeasurement.plan_metric)).where(KpiMeasurement.id == measurement_id)
        ).scalar_one_or_none()
        if m is None:
            raise HTTPException(status_code=404, detail="Not found")
        for field, val in body.model_dump(exclude_unset=True).items():
            setattr(m, field, val)
        m.rag_status = _compute_rag(m.actual_value, m.plan_metric.intent if m.plan_metric else None, m.target, m.lsl, m.usl)
        m.updated_by = user.full_name
        m.updated_at = datetime.now(timezone.utc)
        self._s.commit()
        self._s.refresh(m)
        return self._to_measurement_response(m)

    # ── Summary (Sheet 4) ─────────────────────────────────────────────────────

    def get_summary(self, user: User, plan_id: uuid.UUID) -> KpiSummaryResponse:
        plan = self._get_plan_or_404(plan_id)
        project = self._projects.get_by_id(plan.project_id)
        self._access.require_can_view_project(user, project)
        summary_metrics = []
        green = amber = red = no_data = 0

        # Collect RAGs grouped by category for dimension-level aggregation
        category_rags: dict[str, list[str]] = {}

        for pm in plan.metrics:
            if not pm.is_active:
                continue
            measurements = self._s.execute(
                select(KpiMeasurement).where(KpiMeasurement.plan_metric_id == pm.id)
                .order_by(KpiMeasurement.from_date.desc().nullslast(), KpiMeasurement.created_at.desc())
            ).scalars().all()
            latest = measurements[0] if measurements else None
            count = len(measurements)
            trend = "none"
            if count >= 2 and measurements[0].actual_value and measurements[1].actual_value:
                diff = float(measurements[0].actual_value) - float(measurements[1].actual_value)
                i = (pm.intent or "").lower()
                if "lower" in i or "less" in i:
                    trend = "improving" if diff < 0 else ("declining" if diff > 0 else "stable")
                else:
                    trend = "improving" if diff > 0 else ("declining" if diff < 0 else "stable")
            rag = latest.rag_status if latest else None
            if rag == "GREEN":    green += 1
            elif rag == "AMBER":  amber += 1
            elif rag == "RED":    red += 1
            else:                 no_data += 1

            # Accumulate per-category RAGs
            if rag:
                cat = pm.metric_category or "Uncategorized"
                category_rags.setdefault(cat, []).append(rag)

            summary_metrics.append(KpiSummaryMetric(
                plan_metric_id=pm.id, metric_name=pm.metric_name,
                metric_category=pm.metric_category, uom=pm.uom, intent=pm.intent,
                latest_value=latest.actual_value if latest else None,
                target=latest.target if latest else (Decimal(str(pm.target)) if pm.target else None),
                lsl=latest.lsl if latest else (Decimal(str(pm.lsl)) if pm.lsl else None),
                usl=latest.usl if latest else (Decimal(str(pm.usl)) if pm.usl else None),
                rag_status=rag, trend=trend, measurement_count=count,
                last_updated=latest.updated_at if latest else None,
                history=[
                    {
                        "frequency_name": m.frequency_name,
                        "from_date": m.from_date.isoformat() if m.from_date else None,
                        "to_date": m.to_date.isoformat() if m.to_date else None,
                        "actual_value": float(m.actual_value) if m.actual_value is not None else None,
                        "target": float(m.target) if m.target is not None else None,
                        "lsl": float(m.lsl) if m.lsl is not None else None,
                        "usl": float(m.usl) if m.usl is not None else None,
                        "rag_status": m.rag_status,
                        "submitted_date": m.submitted_date.isoformat() if m.submitted_date else None,
                    }
                    # Reverse: oldest first for chart left→right
                    for m in reversed(measurements)
                    if m.actual_value is not None
                ],
            ))

        # ── Category (dimension) RAG aggregation ──────────────────────────────
        # Rule: any RED in category → category=RED, else any AMBER → AMBER, else GREEN
        def _agg_rag(rags: list[str]) -> str:
            if "RED" in rags:   return "RED"
            if "AMBER" in rags: return "AMBER"
            if "GREEN" in rags: return "GREEN"
            return "GREEN"

        category_rag: dict[str, str] = {
            cat: _agg_rag(rags) for cat, rags in category_rags.items()
        }

        # ── Overall project RAG ───────────────────────────────────────────────
        # Rule: any dimension RED → overall RED, else any AMBER → AMBER, else GREEN
        all_dim_rags = list(category_rag.values())
        overall_rag = _agg_rag(all_dim_rags) if all_dim_rags else None

        return KpiSummaryResponse(
            kpi_plan_id=plan.id, project_id=plan.project_id,
            project_type=plan.project_type, delivery_process_model=plan.delivery_process_model,
            is_finalized=plan.is_finalized, total_metrics=len(summary_metrics),
            green_count=green, amber_count=amber, red_count=red, no_data_count=no_data,
            category_rag=category_rag,
            overall_rag=overall_rag,
            metrics=summary_metrics,
        )

    # ── Doc Info (Sheet 5) ────────────────────────────────────────────────────

    def get_metric_trend(self, user: User, plan_metric_id: uuid.UUID):
        """Return full time-series history for a single plan metric (for sparkline/trend chart)."""
        from app.schemas.qpm import KpiMetricTrendResponse, KpiTrendPoint
        pm = self._s.get(KpiPlanMetric, plan_metric_id)
        if pm is None:
            raise HTTPException(status_code=404, detail="Plan metric not found")
        rows = self._s.execute(
            select(KpiMeasurement)
            .where(KpiMeasurement.plan_metric_id == plan_metric_id)
            .order_by(KpiMeasurement.from_date.asc().nullslast(), KpiMeasurement.created_at.asc())
        ).scalars().all()
        return KpiMetricTrendResponse(
            plan_metric_id=pm.id,
            metric_name=pm.metric_name,
            uom=pm.uom,
            intent=pm.intent,
            history=[
                KpiTrendPoint(
                    frequency_name=r.frequency_name,
                    from_date=r.from_date,
                    to_date=r.to_date,
                    actual_value=r.actual_value,
                    target=r.target,
                    lsl=r.lsl,
                    usl=r.usl,
                    rag_status=r.rag_status,
                    submitted_date=r.submitted_date,
                )
                for r in rows if r.actual_value is not None
            ],
        )

    def get_or_create_doc_info(self, user: User, project_id: uuid.UUID) -> KpiDocInfoResponse:
        self._proj_check(user, project_id)
        doc = self._s.execute(
            select(KpiDocInfo).options(selectinload(KpiDocInfo.version_history)).where(KpiDocInfo.project_id == project_id)
        ).scalar_one_or_none()
        if doc is None:
            doc = KpiDocInfo(id=uuid.uuid4(), project_id=project_id)
            self._s.add(doc)
            self._s.commit()
            self._s.refresh(doc)
        return KpiDocInfoResponse.model_validate(doc)

    def save_doc_info(self, user: User, project_id: uuid.UUID, body: KpiDocInfoRequest) -> KpiDocInfoResponse:
        self._proj_check(user, project_id)
        doc = self._s.execute(
            select(KpiDocInfo).options(selectinload(KpiDocInfo.version_history)).where(KpiDocInfo.project_id == project_id)
        ).scalar_one_or_none()
        if doc is None:
            doc = KpiDocInfo(id=uuid.uuid4(), project_id=project_id)
            self._s.add(doc)
        for field, val in body.model_dump(exclude_unset=True).items():
            setattr(doc, field, val)
        doc.updated_at = datetime.now(timezone.utc)
        self._s.commit()
        self._s.refresh(doc)
        return KpiDocInfoResponse.model_validate(doc)

    def add_version_history(self, user: User, doc_info_id: uuid.UUID, body: KpiDocVersionHistoryRequest) -> KpiDocVersionHistoryResponse:
        doc = self._s.get(KpiDocInfo, doc_info_id)
        if doc is None:
            raise HTTPException(status_code=404, detail="Doc info not found")
        row = KpiDocVersionHistory(id=uuid.uuid4(), doc_info_id=doc_info_id, **body.model_dump())
        self._s.add(row)
        self._s.commit()
        self._s.refresh(row)
        return KpiDocVersionHistoryResponse.model_validate(row)
