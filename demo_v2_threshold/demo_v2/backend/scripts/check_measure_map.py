"""Check which plan metrics are in the measure map."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.qpm_service import _MEASURE_MAP, get_required_measures
from database.database import SessionLocal
from app.models.kpi_plan import KpiPlanMetric
from sqlalchemy import select

db = SessionLocal()
metrics = db.execute(select(KpiPlanMetric)).scalars().all()
print(f"Total plan metrics: {len(metrics)}")
print()

not_in_map = []
in_map = []
for m in metrics:
    measures = get_required_measures(m.metric_name)
    if m.metric_name in _MEASURE_MAP:
        in_map.append((m.metric_name, measures))
    else:
        not_in_map.append(m.metric_name)

print(f"In measure map: {len(in_map)}")
print(f"NOT in measure map (will use metric name as measure): {len(not_in_map)}")
print()
print("NOT in map:")
for n in not_in_map[:15]:
    print(f"  - {n!r}")

db.close()
