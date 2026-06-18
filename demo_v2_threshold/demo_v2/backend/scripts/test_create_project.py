"""Test project creation as Customer Admin."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx

BASE = "http://localhost:8000/api/v1"

# Login as Customer Admin
r = httpx.post(f"{BASE}/auth/login", json={"email": "customer.admin@deliverypulse.ai", "password": "Demo@12345"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Login:", r.status_code)

# Get accounts
r2 = httpx.get(f"{BASE}/accounts", headers=headers, timeout=10)
accounts = r2.json()
print(f"Accounts: {[(a['id'], a['name']) for a in accounts]}")

if not accounts:
    print("NO ACCOUNTS FOUND — cannot create project")
    exit()

account_id = accounts[0]["id"]
print(f"Using account: {accounts[0]['name']} ({account_id})")

# Try creating a project
payload = {
    "account_id": account_id,
    "project_code": "TEST001",
    "project_name": "Test Project",
    "project_manager_id": None,
    "description": "Test",
    "status": "ACTIVE"
}
r3 = httpx.post(f"{BASE}/projects", json=payload, headers=headers, timeout=10)
print(f"Create project: {r3.status_code}")
print(f"Response: {r3.text}")
