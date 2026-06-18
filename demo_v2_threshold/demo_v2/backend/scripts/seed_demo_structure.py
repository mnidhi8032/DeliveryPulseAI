"""
Seed demo organizational hierarchy with new role model.

Roles:
  PLATFORM_ADMIN  -- creates BUs/accounts, manages system
  CEO             -- read-only all BUs (ceo@deliverypulse.ai)
  BU_HEAD         -- read-only own BU (buhead1@, buhead2@)
  PM              -- creates/manages projects (pm1@, pm2@)

Business Units: DIGITAL_SERVICES, CLOUD_INFRA
BU Heads: Rajesh (DIGITAL_SERVICES), Priya (CLOUD_INFRA)
Accounts: ACME_CORP, GLOBEX
Projects: PRJ001 (Banking Portal), PRJ002 (Cloud Migration)

Usage (from backend/ with venv active):
    python scripts/seed_roles.py
    python scripts/seed_admin.py
    python scripts/seed_demo_structure.py
"""

from __future__ import annotations
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select
from app.auth.password import hash_password, verify_password
from app.core.constants import RoleCode
from app.models.account import Account
from app.models.business_unit import BusinessUnit
from app.models.role import Role
from app.repositories.account_repository import AccountRepository
from app.repositories.business_unit_repository import BusinessUnitRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository
from database.database import SessionLocal

CEO_EMAIL     = "ceo@deliverypulse.ai"
BU_HEAD1_EMAIL = "buhead1@deliverypulse.ai"
BU_HEAD2_EMAIL = "buhead2@deliverypulse.ai"
PM1_EMAIL     = "pm1@deliverypulse.ai"
PM2_EMAIL     = "pm2@deliverypulse.ai"
DEFAULT_PASSWORD = "Demo@12345"

BUSINESS_UNITS = [
    {"code": "DIGITAL_SERVICES", "name": "Digital Services",      "description": "Digital delivery practice"},
    {"code": "CLOUD_INFRA",      "name": "Cloud Infrastructure",  "description": "Cloud and infrastructure practice"},
]

ACCOUNTS = [
    {"code": "ACME_CORP", "name": "Acme Corp", "bu_code": "DIGITAL_SERVICES"},
    {"code": "GLOBEX",    "name": "Globex",    "bu_code": "CLOUD_INFRA"},
]

PROJECTS = [
    {"project_code": "PRJ001", "project_name": "Banking Portal",  "account_code": "ACME_CORP", "bu_code": "DIGITAL_SERVICES", "pm_num": 1},
    {"project_code": "PRJ002", "project_name": "Cloud Migration", "account_code": "GLOBEX",    "bu_code": "CLOUD_INFRA",      "pm_num": 2},
]


def _upsert_user(user_repo, email, full_name, role_id, password=DEFAULT_PASSWORD):
    user = user_repo.get_by_email(email)
    if user is None:
        user = user_repo.create_user(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role_id=role_id,
        )
        print(f"  Created: {email}")
    elif not verify_password(password, user.password_hash):
        user.password_hash = hash_password(password)
        print(f"  Reset password: {email}")
    else:
        print(f"  Exists: {email}")
    return user


def seed_demo_structure() -> int:
    with SessionLocal() as session:
        user_repo = UserRepository(session)

        role_by_code = {r.code: r for r in session.execute(select(Role)).scalars().all()}
        required = [RoleCode.CEO, RoleCode.BU_HEAD, RoleCode.PM]
        missing = [c for c in required if str(c) not in role_by_code]
        if missing:
            print(f"Error: missing roles {missing}. Run: python scripts/seed_roles.py")
            return 1

        print("\n-- Users --")
        ceo     = _upsert_user(user_repo, CEO_EMAIL,      "CEO (Demo)",          role_by_code[str(RoleCode.CEO)].id)
        buh1    = _upsert_user(user_repo, BU_HEAD1_EMAIL, "Rajesh (BU Head)",    role_by_code[str(RoleCode.BU_HEAD)].id)
        buh2    = _upsert_user(user_repo, BU_HEAD2_EMAIL, "Priya (BU Head)",     role_by_code[str(RoleCode.BU_HEAD)].id)
        pm1     = _upsert_user(user_repo, PM1_EMAIL,      "Sarah (PM)",          role_by_code[str(RoleCode.PM)].id)
        pm2     = _upsert_user(user_repo, PM2_EMAIL,      "John (PM)",           role_by_code[str(RoleCode.PM)].id)

        bu_head_by_bu = {"DIGITAL_SERVICES": buh1.id, "CLOUD_INFRA": buh2.id}

        print("\n-- Business Units --")
        bu_repo = BusinessUnitRepository(session)
        bu_by_code: dict[str, BusinessUnit] = {}
        for bu_data in BUSINESS_UNITS:
            bu = bu_repo.get_by_code(bu_data["code"])
            buh_id = bu_head_by_bu[bu_data["code"]]
            if bu is None:
                bu = bu_repo.create(
                    code=bu_data["code"],
                    name=bu_data["name"],
                    description=bu_data["description"],
                    is_active=True,
                    delivery_head_user_id=None,
                    bu_head_user_id=buh_id,
                )
                print(f"  Created BU: {bu_data['code']}")
            else:
                bu.bu_head_user_id = buh_id
                print(f"  Updated BU: {bu_data['code']}")
            bu_by_code[bu_data["code"]] = bu

        print("\n-- Accounts --")
        acct_repo = AccountRepository(session)
        acct_by_code: dict[str, Account] = {}
        for acct_data in ACCOUNTS:
            bu = bu_by_code[acct_data["bu_code"]]
            account = acct_repo.get_by_bu_and_code(bu.id, acct_data["code"])
            if account is None:
                account = acct_repo.create(business_unit_id=bu.id, code=acct_data["code"], name=acct_data["name"], is_active=True)
                print(f"  Created: {acct_data['name']}")
            else:
                print(f"  Exists: {acct_data['code']}")
            acct_by_code[acct_data["code"]] = account

        print("\n-- Projects --")
        proj_repo = ProjectRepository(session)
        pm_map = {1: pm1.id, 2: pm2.id}
        for proj_data in PROJECTS:
            account = acct_by_code[proj_data["account_code"]]
            pm_id = pm_map[proj_data["pm_num"]]
            project = proj_repo.get_by_account_and_code(account.id, proj_data["project_code"])
            if project is None:
                proj_repo.create(
                    account_id=account.id,
                    project_code=proj_data["project_code"],
                    project_name=proj_data["project_name"],
                    project_manager_id=pm_id,
                    delivery_head_user_id=None,
                    description=f"Demo project {proj_data['project_code']}",
                    status="ACTIVE",
                )
                print(f"  Created: {proj_data['project_code']} -- {proj_data['project_name']}")
            else:
                project.project_manager_id = pm_id
                project.delivery_head_user_id = None
                print(f"  Updated: {proj_data['project_code']}")

        session.commit()
        print("\nDemo structure seed complete.")

    print("\n=== LOGIN CREDENTIALS ===")
    print(f"Platform Admin : admin@deliverypulse.ai       / Admin@123")
    print(f"CEO            : {CEO_EMAIL}   / {DEFAULT_PASSWORD}")
    print(f"BU Head 1      : {BU_HEAD1_EMAIL} / {DEFAULT_PASSWORD}")
    print(f"BU Head 2      : {BU_HEAD2_EMAIL} / {DEFAULT_PASSWORD}")
    print(f"PM 1 (Sarah)   : {PM1_EMAIL}          / {DEFAULT_PASSWORD}")
    print(f"PM 2 (John)    : {PM2_EMAIL}          / {DEFAULT_PASSWORD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(seed_demo_structure())
