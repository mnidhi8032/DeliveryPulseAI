"""Test the submissions API for PM."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx

BASE = "http://localhost:8000/api/v1"

# Login as PM
r = httpx.post(f"{BASE}/auth/login", json={"email": "pm1@deliverypulse.ai", "password": "Demo@12345"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("PM login:", r.status_code)

# Get submissions
r2 = httpx.get(f"{BASE}/submissions", headers=headers, timeout=10)
print("GET /submissions status:", r2.status_code)
subs = r2.json()
print(f"Submissions returned: {len(subs)}")
for s in subs:
    print(f"  id={s['id']} status={s['status_code']} project={s['project_id']}")

# Also test projects endpoint
r3 = httpx.get(f"{BASE}/projects", headers=headers, timeout=10)
print(f"\nGET /projects status: {r3.status_code}")
projs = r3.json()
print(f"Projects returned: {len(projs)}")
for p in projs:
    print(f"  id={p['id']} name={p['project_name']}")
