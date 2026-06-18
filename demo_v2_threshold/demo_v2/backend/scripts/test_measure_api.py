"""Test measure entry and compute KPI via the service layer directly."""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.database import SessionLocal
from app.models.kpi_plan import KpiPlan, KpiPlanMetric
from app.models.user import User
from app.services.qpm_service import QPMService, get_required_measures, compute_kpi_value
from app.schemas.qpm import KpiMeasureEntryCreateRequest, KpiComputeRequest
from sqlalchemy import select
from decimal import Decimal

db = SessionLocal()

# Get PM user
pm_user = db.execute(select(User).where(User.email == 'pm1@deliverypulse.ai')).scalar_one_or_none()
print(f"PM user: {pm_user.full_name if pm_user else 'NOT FOUND'}")

# Get first plan metric
pm_metric = db.execute(select(KpiPlanMetric).limit(1)).scalar_one_or_none()
print(f"Plan metric: {pm_metric.metric_name} id={pm_metric.id}")

# Get required measures
measures = get_required_measures(pm_metric.metric_name)
print(f"Required measures: {measures}")

# Test adding measure entries
svc = QPMService(db)
try:
    for i, m in enumerate(measures):
        req = KpiMeasureEntryCreateRequest(
            plan_metric_id=pm_metric.id,
            measure_name=m,
            actual_value=Decimal(str(10 + i * 5)),
            frequency='Monthly',
            frequency_name='Test June 2026',
            from_date=None,
            to_date=None,
        )
        entry = svc.add_measure_entry(pm_user, req)
        print(f"  Added entry: {m} = {entry.actual_value}")

    # Now compute
    result = svc.compute_kpi(pm_user, pm_metric.id, 'Test June 2026', None, None)
    print(f"Computed KPI: {result.actual_value} RAG={result.rag_status}")
    print("SUCCESS")
except Exception as e:
    import traceback
    print(f"ERROR: {e}")
    traceback.print_exc()
finally:
    # Cleanup test data
    from app.models.kpi_measurement import KpiMeasureEntry, KpiMeasurement
    from sqlalchemy import delete
    db.execute(delete(KpiMeasureEntry).where(
        KpiMeasureEntry.plan_metric_id == pm_metric.id,
        KpiMeasureEntry.frequency_name == 'Test June 2026'
    ))
    db.execute(delete(KpiMeasurement).where(
        KpiMeasurement.plan_metric_id == pm_metric.id,
        KpiMeasurement.frequency_name == 'Test June 2026'
    ))
    db.commit()
    db.close()
    print("Cleanup done")
