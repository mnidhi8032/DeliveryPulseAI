"""Test the full measure entry + compute flow via HTTP."""
import sys, json, urllib.parse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx

BASE = "http://localhost:8000/api/v1"

# Login
r = httpx.post(f"{BASE}/auth/login", json={"email": "pm1@deliverypulse.ai", "password": "Demo@12345"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Logged in OK")

# Get plan
r = httpx.get(f"{BASE}/qpm/plans/by-project/d2c54157-f727-4b8c-ac0e-1ac220564e73", headers=headers)
plan = r.json()
print(f"Plan: status={plan['qpm_status']} metrics={len(plan['metrics'])}")

if not plan["metrics"]:
    print("No metrics in plan!")
    sys.exit(1)

# Pick first metric
pm = plan["metrics"][0]
print(f"Using metric: {pm['metric_name']} id={pm['id']}")

# Get required measures
encoded_name = urllib.parse.quote(pm["metric_name"])
r = httpx.get(f"{BASE}/qpm/catalog/measures/{encoded_name}", headers=headers)
print(f"Measures endpoint: {r.status_code}")
measures_data = r.json()
print(f"Required measures: {measures_data}")
measures = measures_data.get("required_measures", [pm["metric_name"]])

# Try adding measure entries
frequency_name = "Test-API-June2026"
for i, m in enumerate(measures):
    payload = {
        "plan_metric_id": pm["id"],
        "measure_name": m,
        "actual_value": 10.0 + i * 3,
        "frequency": "Monthly",
        "frequency_name": frequency_name,
        "from_date": "2026-06-01",
        "to_date": "2026-06-30"
    }
    r = httpx.post(f"{BASE}/qpm/measure-entries", json=payload, headers=headers)
    print(f"  Add '{m}': {r.status_code} -> {r.text[:200]}")

# Compute
compute_payload = {
    "frequency_name": frequency_name,
    "from_date": "2026-06-01",
    "to_date": "2026-06-30"
}
r = httpx.post(f"{BASE}/qpm/compute/{pm['id']}", json=compute_payload, headers=headers)
print(f"Compute: {r.status_code} -> {r.text[:400]}")

# Cleanup
import httpx as hx
from database.database import SessionLocal
from app.models.kpi_measurement import KpiMeasureEntry, KpiMeasurement
from sqlalchemy import delete, select
from uuid import UUID

db = SessionLocal()
pm_uuid = UUID(pm["id"])
db.execute(delete(KpiMeasureEntry).where(
    KpiMeasureEntry.plan_metric_id == pm_uuid,
    KpiMeasureEntry.frequency_name == frequency_name
))
db.execute(delete(KpiMeasurement).where(
    KpiMeasurement.plan_metric_id == pm_uuid,
    KpiMeasurement.frequency_name == frequency_name
))
db.commit()
db.close()
print("Cleanup done")
