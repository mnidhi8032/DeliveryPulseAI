"""Test BU health endpoint returns QPM-based RAG."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx

BASE = "http://localhost:8000/api/v1"

r = httpx.post(f"{BASE}/auth/login", json={"email": "customer.admin@deliverypulse.ai", "password": "Demo@12345"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Login:", r.status_code)

r2 = httpx.get(f"{BASE}/customer-admin/business-unit-health", headers=headers, timeout=10)
print("BU Health status:", r2.status_code)
for row in r2.json():
    print(f"  BU: {row['business_unit_name']} | projects={row['project_count']} | G={row['green_count']} A={row['amber_count']} R={row['red_count']} | health%={row['health_percent']}")

r3 = httpx.get(f"{BASE}/customer-admin/portfolio-summary", headers=headers, timeout=10)
print("\nPortfolio Summary:", r3.json())
