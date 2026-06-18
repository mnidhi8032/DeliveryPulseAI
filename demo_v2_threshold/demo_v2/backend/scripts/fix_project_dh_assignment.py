"""Fix: assign delivery heads to projects based on BU ownership."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.database import SessionLocal
from app.models.project import Project
from app.models.account import Account
from app.models.business_unit import BusinessUnit
from app.models.user import User
from sqlalchemy import select

db = SessionLocal()

# Get all projects
projects = db.execute(select(Project)).scalars().all()

fixed = 0
for project in projects:
    if project.delivery_head_user_id is not None:
        print(f"  SKIP {project.project_name} — already has DH assigned")
        continue

    # Find DH from BU via account
    account = db.get(Account, project.account_id)
    if not account:
        print(f"  SKIP {project.project_name} — no account found")
        continue

    bu = db.get(BusinessUnit, account.business_unit_id)
    if not bu:
        print(f"  SKIP {project.project_name} — no BU found")
        continue

    if not bu.delivery_head_user_id:
        print(f"  SKIP {project.project_name} — BU has no DH assigned")
        continue

    dh = db.get(User, bu.delivery_head_user_id)
    project.delivery_head_user_id = bu.delivery_head_user_id
    print(f"  FIXED {project.project_name} → DH = {dh.full_name if dh else bu.delivery_head_user_id}")
    fixed += 1

db.commit()
print(f"\nDone. Fixed {fixed} projects.")
db.close()
