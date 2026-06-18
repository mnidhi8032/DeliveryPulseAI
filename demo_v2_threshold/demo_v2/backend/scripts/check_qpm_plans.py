"""Check QPM plans state."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database.database import SessionLocal
from app.models.kpi_plan import KpiPlan, KpiPlanMetric
from app.models.kpi_measurement import KpiMeasurement
from sqlalchemy import select

db = SessionLocal()
plans = db.execute(select(KpiPlan)).scalars().all()
print(f"KPI Plans: {len(plans)}")
for p in plans:
    metrics = db.execute(select(KpiPlanMetric).where(KpiPlanMetric.kpi_plan_id == p.id)).scalars().all()
    meas = db.execute(select(KpiMeasurement).where(
        KpiMeasurement.plan_metric_id.in_([m.id for m in metrics])
    )).scalars().all()
    print(f"  Plan: {p.id}")
    print(f"    project_id: {p.project_id}")
    print(f"    qpm_status: {p.qpm_status}")
    print(f"    qpm_submitted_at: {p.qpm_submitted_at}")
    print(f"    qpm_approved_at: {p.qpm_approved_at}")
    print(f"    metrics: {len(metrics)}, measurements: {len(meas)}")
    rags = [m.rag_status for m in meas if m.rag_status]
    print(f"    RAGs: {set(rags)}")
db.close()
