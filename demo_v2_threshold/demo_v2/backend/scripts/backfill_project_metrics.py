# -*- coding: utf-8 -*-
"""
Backfill mandatory metrics for seed projects that were created without
an engagement model or KPI plan.

Assigns a realistic project_type + delivery_process_model to each project,
then creates a KPI plan (if missing) and adds all matching mandatory metrics.

Usage:
    python scripts/backfill_project_metrics.py
"""
from __future__ import annotations
import json, sys, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select
from app.models.kpi_plan import KpiPlan, KpiPlanMetric
from app.models.project import Project
from app.models.qpm_catalog_metric import QPMCatalogMetric
from app.services.qpm_service import get_required_measures
from database.database import SessionLocal

# ── Engagement model per project ──────────────────────────────────────────────
# Each tuple: (project_code, project_type, delivery_model, project_category, work_size_unit)
PROJECT_ENGAGEMENT = {
    "DS-PRJ001": ("Fresh Development",   "Agile-Scrum",   "Fixed Price",         "Story Point-SP"),
    "DS-PRJ002": ("Fresh Development",   "Agile-Scrum",   "Time & Material",     "Story Point-SP"),
    "CI-PRJ001": ("Fresh Development",   "Agile-Scrum",   "Fixed Price",         "Story Point-SP"),
    "CI-PRJ002": ("Fresh Development",   "Agile-Scrum",   "Time & Material",     "Story Point-SP"),
    "BF-PRJ001": ("Fresh Development",   "Waterfall",     "Fixed Price",         "Function Point-FP"),
    "BF-PRJ002": ("Fresh Development",   "Agile-Scrum",   "Time & Material",     "Story Point-SP"),
}


def backfill():
    with SessionLocal() as session:
        # ── Check available mandatory metrics ─────────────────────────────────
        total_catalog = session.execute(
            select(QPMCatalogMetric).where(
                QPMCatalogMetric.is_active == True,
                QPMCatalogMetric.compliance == "M",
            )
        ).scalars().all()
        print(f"Catalog has {len(total_catalog)} total mandatory metrics.")

        # ── Process each project ──────────────────────────────────────────────
        projects = session.execute(select(Project)).scalars().all()
        project_map = {p.project_code: p for p in projects}

        total_added = 0

        for code, (proj_type, delivery_model, proj_category, size_unit) in PROJECT_ENGAGEMENT.items():
            proj = project_map.get(code)
            if proj is None:
                print(f"\n[SKIP] {code} — not found in DB")
                continue

            print(f"\n── {code} | {proj.project_name} ──")

            # Get or create KPI plan
            existing_plan = session.execute(
                select(KpiPlan).where(KpiPlan.project_id == proj.id)
            ).scalar_one_or_none()

            if existing_plan is None:
                plan = KpiPlan(
                    id=uuid.uuid4(),
                    project_id=proj.id,
                    project_type=proj_type,
                    delivery_process_model=delivery_model,
                    project_category=proj_category,
                    work_size_unit=size_unit,
                    is_finalized=False,
                    qpm_status="DRAFT",
                )
                session.add(plan)
                session.flush()
                print(f"  Created new KPI plan")
            else:
                plan = existing_plan
                # Update engagement model on existing plan
                plan.project_type = proj_type
                plan.delivery_process_model = delivery_model
                plan.project_category = proj_category
                plan.work_size_unit = size_unit
                session.flush()
                print(f"  Using existing plan — updated engagement model")

            # Get existing metric names in this plan
            existing_metrics = session.execute(
                select(KpiPlanMetric.metric_name).where(
                    KpiPlanMetric.kpi_plan_id == plan.id,
                    KpiPlanMetric.is_active == True,
                )
            ).scalars().all()
            existing_names = set(existing_metrics)

            # Find matching mandatory metrics from catalog
            stmt = (
                select(QPMCatalogMetric)
                .where(
                    QPMCatalogMetric.is_active == True,
                    QPMCatalogMetric.compliance == "M",
                    QPMCatalogMetric.project_type.ilike(f"%{proj_type}%"),
                    QPMCatalogMetric.delivery_model.ilike(f"%{delivery_model}%"),
                )
            )
            mandatory = session.execute(stmt).scalars().all()

            # If no matches with both filters, try project_type only
            if not mandatory:
                stmt2 = (
                    select(QPMCatalogMetric)
                    .where(
                        QPMCatalogMetric.is_active == True,
                        QPMCatalogMetric.compliance == "M",
                        QPMCatalogMetric.project_type.ilike(f"%{proj_type}%"),
                    )
                )
                mandatory = session.execute(stmt2).scalars().all()
                if mandatory:
                    print(f"  Note: using project_type-only filter (no delivery_model match)")

            # If still nothing, fall back to all mandatory metrics
            if not mandatory:
                mandatory = total_catalog
                print(f"  Note: using ALL mandatory metrics (no type/model match)")

            added = 0
            skipped = 0
            for m in mandatory:
                if m.name in existing_names:
                    skipped += 1
                    continue
                required = get_required_measures(m.name)
                session.add(KpiPlanMetric(
                    id=uuid.uuid4(),
                    kpi_plan_id=plan.id,
                    catalog_metric_id=m.id,
                    metric_name=m.name,
                    metric_category=m.category,
                    formula=m.formula,
                    uom=m.uom,
                    intent=m.intent,
                    frequency=m.frequency,
                    priority=m.compliance,
                    target=float(m.default_target) if m.default_target is not None else None,
                    lsl=float(m.default_lsl)    if m.default_lsl    is not None else None,
                    usl=float(m.default_usl)    if m.default_usl    is not None else None,
                    is_custom=False,
                    reported_to_customer=False,
                    is_active=True,
                    required_measures=json.dumps(required),
                ))
                added += 1

            session.flush()
            print(f"  Added {added} mandatory metrics  |  Skipped {skipped} already present")
            total_added += added

        session.commit()
        print(f"\n✅ Backfill complete. Total metrics added: {total_added}")

        # ── Verification ──────────────────────────────────────────────────────
        print("\n=== VERIFICATION ===")
        for code in PROJECT_ENGAGEMENT:
            proj = project_map.get(code)
            if not proj:
                continue
            plan = session.execute(
                select(KpiPlan).where(KpiPlan.project_id == proj.id)
            ).scalar_one_or_none()
            if not plan:
                print(f"  {code}: NO PLAN")
                continue
            count = session.execute(
                select(KpiPlanMetric).where(
                    KpiPlanMetric.kpi_plan_id == plan.id,
                    KpiPlanMetric.is_active == True,
                )
            ).scalars().all()
            print(f"  {code} | {plan.project_type} / {plan.delivery_process_model} | {len(count)} metrics")


if __name__ == "__main__":
    backfill()
