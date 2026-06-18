"""
Replace demo org structure with modernization + industry vertical portfolio.

Soft-deletes existing BUs, accounts, and projects (not submissions/metrics history),
then seeds 14 business units with 2 accounts and 3 projects each.

Usage (from backend/ with venv active):

    python scripts/seed_roles.py
    python scripts/seed_portfolio_structure.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from app.auth.password import hash_password, verify_password
from app.core.constants import RoleCode
from app.models.account import Account
from app.models.business_unit import BusinessUnit
from app.models.project import Project
from app.models.role import Role
from app.repositories.account_repository import AccountRepository
from app.repositories.business_unit_repository import BusinessUnitRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository
from database.database import SessionLocal

CUSTOMER_ADMIN_EMAIL = "customer.admin@deliverypulse.ai"
DH1_EMAIL = "rajesh.dh@deliverypulse.ai"
DH2_EMAIL = "priya.dh@deliverypulse.ai"
PM1_EMAIL = "pm1@deliverypulse.ai"
PM2_EMAIL = "pm2@deliverypulse.ai"
DEFAULT_PASSWORD = "Demo@12345"

CORE_BUSINESS_UNITS = [
    ("CLOUD_MOD", "Cloud Modernization", "Core service line — cloud modernization portfolio"),
    ("MANAGED_CLOUD", "Managed Cloud Services", "Core service line — managed cloud services"),
    ("MS_DYNAMICS", "Microsoft Dynamics Modernization", "Core service line — Dynamics modernization"),
    ("BIZ_AUTOMATION", "Business Automation", "Core service line — business automation"),
    ("CYBERSECURITY", "Cybersecurity", "Core service line — cybersecurity"),
    ("INFRA_SUPPORT", "Infrastructure Support", "Core service line — infrastructure support"),
]

INDUSTRY_BUSINESS_UNITS = [
    ("RETAIL", "Retail", "Industry vertical — retail"),
    ("MANUFACTURING", "Manufacturing", "Industry vertical — manufacturing"),
    ("TRAVEL", "Travel", "Industry vertical — travel"),
    ("BFSI", "BFSI", "Industry vertical — banking, financial services, insurance"),
    ("HEALTHCARE_LS", "Healthcare & Life Sciences", "Industry vertical — healthcare & life sciences"),
    ("TMT", "Technology / Media / Telecom", "Industry vertical — TMT"),
    ("DIST_CONSUMER", "Distribution & Consumer Goods", "Industry vertical — distribution & consumer goods"),
]

PORTFOLIO_BUSINESS_UNITS = [
    *[{"code": c, "name": n, "description": d, "category": "Core"} for c, n, d in CORE_BUSINESS_UNITS],
    *[{"code": c, "name": n, "description": d, "category": "Industry"} for c, n, d in INDUSTRY_BUSINESS_UNITS],
]


def _soft_delete_existing(session) -> None:
    now = datetime.now(timezone.utc)
    for project in session.execute(select(Project).where(Project.deleted_at.is_(None))).scalars():
        project.deleted_at = now
        project.status = "CLOSED"
    for account in session.execute(select(Account).where(Account.deleted_at.is_(None))).scalars():
        account.deleted_at = now
        account.is_active = False
    for bu in session.execute(select(BusinessUnit).where(BusinessUnit.deleted_at.is_(None))).scalars():
        bu.deleted_at = now
        bu.is_active = False
    session.flush()
    print("Soft-deleted previous business units, accounts, and projects.")


def seed_portfolio_structure() -> int:
    with SessionLocal() as session:
        role_by_code = {r.code: r for r in session.execute(select(Role)).scalars().all()}
        missing = [
            c
            for c in [RoleCode.CEO, RoleCode.BU_HEAD, RoleCode.PM]
            if str(c) not in role_by_code
        ]
        if missing:
            print("Error: missing roles. Run: python scripts/seed_roles.py")
            return 1

        user_repo = UserRepository(session)
        # Create Customer Admin
        ca_user = user_repo.get_by_email(CUSTOMER_ADMIN_EMAIL)
        if ca_user is None:
            user_repo.create_user(
                email=CUSTOMER_ADMIN_EMAIL,
                password_hash=hash_password(DEFAULT_PASSWORD),
                full_name="Customer Admin",
                role_id=role_by_code[str(RoleCode.CEO)].id,
            )
            print(f"Created user: {CUSTOMER_ADMIN_EMAIL}")
        elif not verify_password(DEFAULT_PASSWORD, ca_user.password_hash):
            ca_user.password_hash = hash_password(DEFAULT_PASSWORD)
            print(f"Reset password: {CUSTOMER_ADMIN_EMAIL}")

        # PMs
        for email, name in [
            (PM1_EMAIL, "Sarah (PM)"),
            (PM2_EMAIL, "John (PM)"),
        ]:
            user = user_repo.get_by_email(email)
            if user is None:
                user_repo.create_user(
                    email=email,
                    password_hash=hash_password(DEFAULT_PASSWORD),
                    full_name=name,
                    role_id=role_by_code[str(RoleCode.PM)].id,
                )
                print(f"Created PM user: {email}")
            elif not verify_password(DEFAULT_PASSWORD, user.password_hash):
                user.password_hash = hash_password(DEFAULT_PASSWORD)
                print(f"Reset password: {email}")

        pm1 = user_repo.get_by_email(PM1_EMAIL)
        pm2 = user_repo.get_by_email(PM2_EMAIL)
        assert pm1 and pm2

        _soft_delete_existing(session)

        bu_repo = BusinessUnitRepository(session)
        acct_repo = AccountRepository(session)
        proj_repo = ProjectRepository(session)

        pm_users = [pm1, pm2]
        
        # Delivery Heads for specific examples, fallback for others
        dh_names = [
            "Priya", "Rajesh", "Amit", "Vikram", "Neha", "Arjun", "Sanjay", "Anjali",
            "Kiran", "Rohit", "Sneha", "Karthik", "Pooja", "Gaurav"
        ]

        bu_index = 0
        for bu_data in PORTFOLIO_BUSINESS_UNITS:
            # Determine DH details
            dh_first_name = dh_names[bu_index % len(dh_names)]
            # Override for specific requested examples
            if bu_data["code"] == "BFSI":
                dh_first_name = "Priya"
            elif bu_data["code"] == "RETAIL":
                dh_first_name = "Rajesh"
            elif bu_data["code"] == "HEALTHCARE_LS":
                dh_first_name = "Amit"

            dh_email = f"{dh_first_name.lower()}.dh@deliverypulse.ai"
            dh_full_name = f"{dh_first_name} (Delivery Head)"

            dh = user_repo.get_by_email(dh_email)
            if dh is None:
                dh = user_repo.create_user(
                    email=dh_email,
                    password_hash=hash_password(DEFAULT_PASSWORD),
                    full_name=dh_full_name,
                    role_id=role_by_code[str(RoleCode.BU_HEAD)].id,
                )
                print(f"Created DH user: {dh_email}")
            elif not verify_password(DEFAULT_PASSWORD, dh.password_hash):
                dh.password_hash = hash_password(DEFAULT_PASSWORD)

            bu = bu_repo.create(
                code=bu_data["code"],
                name=bu_data["name"],
                description=f"[{bu_data['category']}] {bu_data['description']}",
                is_active=True,
            )
            print(f"Created BU: {bu.name} with DH: {dh.full_name}")

            accounts: list[Account] = []
            for acct_num in (1, 2):
                # Assign the same single DH to all accounts in the BU
                account = acct_repo.create(
                    business_unit_id=bu.id,
                    code=f"{bu_data['code']}_AC{acct_num}",
                    name=f"{bu_data['name']} — Account {acct_num}",
                    delivery_head_user_id=dh.id,
                    is_active=True,
                )
                accounts.append(account)

            for proj_num in (1, 2, 3):
                account = accounts[(proj_num - 1) % 2]
                pm = pm_users[(bu_index + proj_num) % 2]
                proj_repo.create(
                    account_id=account.id,
                    project_code=f"{bu_data['code']}_P{proj_num}",
                    project_name=f"{bu_data['name']} — Initiative {proj_num}",
                    project_manager_id=pm.id,
                    description=f"Portfolio demo project {proj_num} under {bu_data['name']}",
                    status="ACTIVE",
                )

            bu_index += 1

        session.commit()
        print(
            f"Portfolio seed complete: {len(PORTFOLIO_BUSINESS_UNITS)} BUs, "
            f"{len(PORTFOLIO_BUSINESS_UNITS) * 2} accounts, "
            f"{len(PORTFOLIO_BUSINESS_UNITS) * 3} projects."
        )
        print(f"Customer Admin login: {CUSTOMER_ADMIN_EMAIL} / {DEFAULT_PASSWORD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(seed_portfolio_structure())
