"""
Seed demo organizational hierarchy — V2 full structure.

3 BUs × 2 Accounts × 1 DM each = 6 DMs
3 Delivery Heads (one per BU)
3 PMs (one per BU)
6 Projects (2 per BU, one per account)

⚠️  SAFE WIPE: This script only deletes rows belonging to the known demo
    project codes / account codes / BU codes listed in PROJECTS, ACCOUNTS,
    and BUSINESS_UNITS below. It will NEVER touch manually created projects,
    accounts, or entered KPI data. Do NOT add user projects to those lists.

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

from sqlalchemy import select, text
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
from app.repositories.business_unit_repository import BusinessUnitRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository
from database.database import SessionLocal

DEFAULT_PASSWORD = "Demo@12345"

# ── Users ─────────────────────────────────────────────────────────────────────
CEO_EMAIL  = "ceo@deliverypulse.ai"
DE_EMAIL   = "de@deliverypulse.ai"

DH1_EMAIL  = "buhead1@deliverypulse.ai"   # Digital Services
DH2_EMAIL  = "buhead2@deliverypulse.ai"   # Cloud Infrastructure
DH3_EMAIL  = "buhead3@deliverypulse.ai"   # BFSI (new)

DM1_EMAIL  = "dm1@deliverypulse.ai"       # Acme Corp         (Digital Services)
DM2_EMAIL  = "dm2@deliverypulse.ai"       # Tech Nova         (Digital Services)
DM3_EMAIL  = "dm3@deliverypulse.ai"       # Globex            (Cloud Infrastructure)
DM4_EMAIL  = "dm4@deliverypulse.ai"       # Nexus Cloud       (Cloud Infrastructure)
DM5_EMAIL  = "dm5@deliverypulse.ai"       # Apex Bank         (BFSI)
DM6_EMAIL  = "dm6@deliverypulse.ai"       # Sterling Finance  (BFSI)

PM1_EMAIL  = "pm1@deliverypulse.ai"       # Digital Services projects
PM2_EMAIL  = "pm2@deliverypulse.ai"       # Cloud Infrastructure projects
PM3_EMAIL  = "pm3@deliverypulse.ai"       # BFSI projects (new)

# ── Business Units ─────────────────────────────────────────────────────────────
BUSINESS_UNITS = [
    {
        "code": "DIGITAL_SERVICES",
        "name": "Digital Services",
        "description": "Digital delivery practice — web, mobile and enterprise apps.",
        "dh_email": DH1_EMAIL,
        "pm_email": PM1_EMAIL,
    },
    {
        "code": "CLOUD_INFRA",
        "name": "Cloud Infrastructure",
        "description": "Cloud, DevOps and infrastructure practice.",
        "dh_email": DH2_EMAIL,
        "pm_email": PM2_EMAIL,
    },
    {
        "code": "BFSI",
        "name": "Banking & Financial Services",
        "description": "Banking, fintech and financial services delivery practice.",
        "dh_email": DH3_EMAIL,
        "pm_email": PM3_EMAIL,
    },
]

# ── Accounts (2 per BU, each with 1 DM) ──────────────────────────────────────
ACCOUNTS = [
    {"code": "ACME_CORP",     "name": "Acme Corp",         "bu_code": "DIGITAL_SERVICES", "dm_email": DM1_EMAIL},
    {"code": "TECH_NOVA",     "name": "Tech Nova",          "bu_code": "DIGITAL_SERVICES", "dm_email": DM2_EMAIL},
    {"code": "GLOBEX",        "name": "Globex",             "bu_code": "CLOUD_INFRA",      "dm_email": DM3_EMAIL},
    {"code": "NEXUS_CLOUD",   "name": "Nexus Cloud",        "bu_code": "CLOUD_INFRA",      "dm_email": DM4_EMAIL},
    {"code": "APEX_BANK",     "name": "Apex Bank",          "bu_code": "BFSI",             "dm_email": DM5_EMAIL},
    {"code": "STERLING_FIN",  "name": "Sterling Finance",   "bu_code": "BFSI",             "dm_email": DM6_EMAIL},
]

# ── Projects (1 per account = 2 per BU = 6 total) ────────────────────────────
PROJECTS = [
    # Digital Services
    {"code": "DS-PRJ001", "name": "Banking Portal Redesign",  "account_code": "ACME_CORP",    "pm_email": PM1_EMAIL},
    {"code": "DS-PRJ002", "name": "Mobile App Modernization", "account_code": "TECH_NOVA",    "pm_email": PM1_EMAIL},
    # Cloud Infrastructure
    {"code": "CI-PRJ001", "name": "Cloud Migration Phase 1",  "account_code": "GLOBEX",       "pm_email": PM2_EMAIL},
    {"code": "CI-PRJ002", "name": "Telemetry Dashboard",      "account_code": "NEXUS_CLOUD",  "pm_email": PM2_EMAIL},
    # BFSI
    {"code": "BF-PRJ001", "name": "Loan Management System",   "account_code": "APEX_BANK",    "pm_email": PM3_EMAIL},
    {"code": "BF-PRJ002", "name": "Trade Finance Portal",     "account_code": "STERLING_FIN", "pm_email": PM3_EMAIL},
]


def _upsert_user(user_repo, email, full_name, role_id):
    user = user_repo.get_by_email(email)
    if user is None:
        user = user_repo.create_user(
            email=email,
            password_hash=hash_password(DEFAULT_PASSWORD),
            full_name=full_name,
            role_id=role_id,
        )
        print(f"  Created : {email}")
    else:
        # Always keep password in sync
        if not verify_password(DEFAULT_PASSWORD, user.password_hash):
            user.password_hash = hash_password(DEFAULT_PASSWORD)
        user.full_name = full_name
        user.role_id = role_id
        print(f"  Updated : {email}")
    return user


def _wipe_demo_data() -> None:
    """Delete ONLY known demo seed data in safe FK order (children before parents).

    IMPORTANT: This function only deletes rows that belong to the known demo
    project codes / account codes / BU codes defined in this script.
    It will NEVER delete manually created projects, accounts, or user data.
    """
    print("\n-- Wiping known demo data --")

    # Known demo identifiers — only these will be deleted
    demo_project_codes  = tuple(p["code"]         for p in PROJECTS)
    demo_account_codes  = tuple(a["code"]         for a in ACCOUNTS)
    demo_bu_codes       = tuple(b["code"]         for b in BUSINESS_UNITS)

    with SessionLocal() as s:
        try:
            # 1. Get IDs of demo BUs, accounts, projects
            bu_ids = [r[0] for r in s.execute(
                text("SELECT id FROM business_units WHERE code IN :codes"),
                {"codes": demo_bu_codes}
            ).fetchall()] if demo_bu_codes else []

            acct_ids = [r[0] for r in s.execute(
                text("SELECT id FROM accounts WHERE code IN :codes"),
                {"codes": demo_account_codes}
            ).fetchall()] if demo_account_codes else []

            proj_ids = [r[0] for r in s.execute(
                text("SELECT id FROM projects WHERE project_code IN :codes"),
                {"codes": demo_project_codes}
            ).fetchall()] if demo_project_codes else []

            # 2. Get plan IDs for demo projects
            plan_ids = []
            if proj_ids:
                plan_ids = [r[0] for r in s.execute(
                    text("SELECT id FROM kpi_plans WHERE project_id IN :ids"),
                    {"ids": tuple(proj_ids)}
                ).fetchall()]

            # 3. Get plan_metric IDs
            plan_metric_ids = []
            if plan_ids:
                plan_metric_ids = [r[0] for r in s.execute(
                    text("SELECT id FROM kpi_plan_metrics WHERE kpi_plan_id IN :ids"),
                    {"ids": tuple(plan_ids)}
                ).fetchall()]

            # 4. Get submission IDs for demo projects
            submission_ids = []
            if proj_ids:
                submission_ids = [r[0] for r in s.execute(
                    text("SELECT id FROM submissions WHERE project_id IN :ids"),
                    {"ids": tuple(proj_ids)}
                ).fetchall()]

            # 5. Delete in FK order, scoped to demo IDs only
            def _del(table, col, ids):
                if not ids:
                    return 0
                try:
                    r = s.execute(text(f"DELETE FROM {table} WHERE {col} IN :ids"), {"ids": tuple(ids)})
                    s.flush()
                    if r.rowcount:
                        print(f"  Deleted {r.rowcount:>4} rows from {table}")
                    return r.rowcount
                except Exception:
                    s.rollback()
                    return 0

            def _del_all(table):
                """Tables that are fully owned by demo data (no user-created rows possible)."""
                try:
                    r = s.execute(text(f"DELETE FROM {table}"))
                    s.flush()
                    if r.rowcount:
                        print(f"  Deleted {r.rowcount:>4} rows from {table} (full)")
                except Exception:
                    s.rollback()

            # Notifications & audit — delete all (these are ephemeral)
            _del_all("audit_events")
            _del_all("audit_logs")
            _del_all("submission_lifecycle_audits")
            _del_all("notifications")

            # Scoped deletes
            _del("health_scores",           "submission_id",    submission_ids)
            _del("dimension_scores",        "submission_id",    submission_ids)
            _del("metric_values",           "submission_id",    submission_ids)
            _del("excel_import_rows",       "project_id",       proj_ids)
            _del("excel_import_batches",    "project_id",       proj_ids)
            _del("action_items",            "project_id",       proj_ids)
            _del("kpi_measurements",        "plan_metric_id",   plan_metric_ids)
            _del("kpi_measure_entries",     "plan_metric_id",   plan_metric_ids)
            _del("kpi_plan_metrics",        "kpi_plan_id",      plan_ids)
            _del("metric_approval_requests","kpi_plan_id",      plan_ids)
            _del("kpi_plans",               "project_id",       proj_ids)
            _del("kpi_doc_version_history", "project_id",       proj_ids)
            _del("kpi_doc_info",            "project_id",       proj_ids)
            _del("project_phases",          "project_id",       proj_ids)
            _del("governance_reviews",      "project_id",       proj_ids)

            # Submissions + governance periods (wrap in try — schema varies)
            _del("submissions", "project_id", proj_ids)
            try:
                if proj_ids:
                    gp_ids = [r[0] for r in s.execute(
                        text("SELECT id FROM governance_periods WHERE project_id IN :ids"),
                        {"ids": tuple(proj_ids)}
                    ).fetchall()]
                    _del("governance_periods", "id", gp_ids)
            except Exception:
                s.rollback()   # governance_periods may not have project_id col

            # Projects, accounts, BUs — scoped
            _del("projects",        "project_code", list(demo_project_codes))
            _del("accounts",        "code",         list(demo_account_codes))
            _del("business_units",  "code",         list(demo_bu_codes))

            s.commit()
            print("  Wipe complete (demo data only — user projects preserved).")

        except Exception as e:
            s.rollback()
            print(f"  Wipe error: {e}")
            raise


def seed_demo_structure() -> int:
    with SessionLocal() as session:
        user_repo  = UserRepository(session)
        bu_repo    = BusinessUnitRepository(session)
        acct_repo  = AccountRepository(session)
        proj_repo  = ProjectRepository(session)

        # ── Check roles exist ─────────────────────────────────────────────────
        role_by_code = {r.code: r for r in session.execute(select(Role)).scalars().all()}
        required = [
            RoleCode.CEO, RoleCode.DELIVERY_HEAD, RoleCode.DELIVERY_MANAGER,
            RoleCode.PM, RoleCode.DELIVERY_EXCELLENCE,
        ]
        missing = [c for c in required if str(c) not in role_by_code]
        if missing:
            print(f"Error: missing roles {missing}. Run: python scripts/seed_roles.py")
            return 1

        # ── Users ─────────────────────────────────────────────────────────────
        print("\n-- Users --")
        ceo  = _upsert_user(user_repo, CEO_EMAIL, "CEO (Demo)",                  role_by_code[str(RoleCode.CEO)].id)
        de   = _upsert_user(user_repo, DE_EMAIL,  "DE Team (Demo)",              role_by_code[str(RoleCode.DELIVERY_EXCELLENCE)].id)

        dh1  = _upsert_user(user_repo, DH1_EMAIL, "Rajesh Kumar (DH)",           role_by_code[str(RoleCode.DELIVERY_HEAD)].id)
        dh2  = _upsert_user(user_repo, DH2_EMAIL, "Priya Sharma (DH)",           role_by_code[str(RoleCode.DELIVERY_HEAD)].id)
        dh3  = _upsert_user(user_repo, DH3_EMAIL, "Anil Mehta (DH)",             role_by_code[str(RoleCode.DELIVERY_HEAD)].id)

        dm1  = _upsert_user(user_repo, DM1_EMAIL, "Alex Thomas (DM - Acme)",     role_by_code[str(RoleCode.DELIVERY_MANAGER)].id)
        dm2  = _upsert_user(user_repo, DM2_EMAIL, "Riya Patel (DM - TechNova)",  role_by_code[str(RoleCode.DELIVERY_MANAGER)].id)
        dm3  = _upsert_user(user_repo, DM3_EMAIL, "Kevin Dias (DM - Globex)",    role_by_code[str(RoleCode.DELIVERY_MANAGER)].id)
        dm4  = _upsert_user(user_repo, DM4_EMAIL, "Neha Singh (DM - Nexus)",     role_by_code[str(RoleCode.DELIVERY_MANAGER)].id)
        dm5  = _upsert_user(user_repo, DM5_EMAIL, "Vivek Rao (DM - ApexBank)",   role_by_code[str(RoleCode.DELIVERY_MANAGER)].id)
        dm6  = _upsert_user(user_repo, DM6_EMAIL, "Suma Nair (DM - Sterling)",   role_by_code[str(RoleCode.DELIVERY_MANAGER)].id)

        pm1  = _upsert_user(user_repo, PM1_EMAIL, "Sarah Wilson (PM)",           role_by_code[str(RoleCode.PM)].id)
        pm2  = _upsert_user(user_repo, PM2_EMAIL, "John Carter (PM)",            role_by_code[str(RoleCode.PM)].id)
        pm3  = _upsert_user(user_repo, PM3_EMAIL, "Anita Roy (PM)",              role_by_code[str(RoleCode.PM)].id)

        session.flush()

        # Build lookup maps
        dh_by_email  = {DH1_EMAIL: dh1, DH2_EMAIL: dh2, DH3_EMAIL: dh3}
        dm_by_email  = {DM1_EMAIL: dm1, DM2_EMAIL: dm2, DM3_EMAIL: dm3,
                        DM4_EMAIL: dm4, DM5_EMAIL: dm5, DM6_EMAIL: dm6}
        pm_by_email  = {PM1_EMAIL: pm1, PM2_EMAIL: pm2, PM3_EMAIL: pm3}

        # ── Wipe old demo data ────────────────────────────────────────────────
        _wipe_demo_data()

        # ── Business Units ────────────────────────────────────────────────────
        print("\n-- Business Units --")
        bu_by_code: dict[str, BusinessUnit] = {}
        for bd in BUSINESS_UNITS:
            dh = dh_by_email[bd["dh_email"]]
            pm = pm_by_email[bd["pm_email"]]
            bu = bu_repo.create(
                code=bd["code"],
                name=bd["name"],
                description=bd["description"],
                is_active=True,
                delivery_head_user_id=None,   # legacy column — unused
                bu_head_user_id=dh.id,        # active DH assignment
                pm_user_id=pm.id,             # PM assigned to this BU
            )
            bu_by_code[bd["code"]] = bu
            print(f"  Created BU: {bd['code']}  →  DH: {bd['dh_email']}  PM: {bd['pm_email']}")

        session.flush()

        # ── Accounts ──────────────────────────────────────────────────────────
        print("\n-- Accounts --")
        acct_by_code: dict[str, Account] = {}
        for ad in ACCOUNTS:
            bu   = bu_by_code[ad["bu_code"]]
            dm   = dm_by_email[ad["dm_email"]]
            acct = acct_repo.create(
                business_unit_id=bu.id,
                code=ad["code"],
                name=ad["name"],
                is_active=True,
                delivery_manager_user_id=dm.id,
            )
            acct_by_code[ad["code"]] = acct
            print(f"  Created Account: {ad['code']}  ({ad['bu_code']})  →  DM: {ad['dm_email']}")

        session.flush()

        # ── Projects ──────────────────────────────────────────────────────────
        print("\n-- Projects --")
        for pd in PROJECTS:
            acct = acct_by_code[pd["account_code"]]
            pm   = pm_by_email[pd["pm_email"]]
            proj_repo.create(
                account_id=acct.id,
                project_code=pd["code"],
                project_name=pd["name"],
                project_manager_id=pm.id,
                delivery_head_user_id=None,
                description=f"Demo project — {pd['name']}",
                status="ACTIVE",
            )
            print(f"  Created Project: {pd['code']} — {pd['name']}  →  PM: {pd['pm_email']}")

        session.commit()
        print("\n✅ Demo structure seed complete.")

    print("\n=== LOGIN CREDENTIALS ===")
    print(f"Platform Admin    : admin@deliverypulse.ai     / Admin@123")
    print(f"CEO               : {CEO_EMAIL}    / {DEFAULT_PASSWORD}")
    print(f"Delivery Exc.     : {DE_EMAIL}     / {DEFAULT_PASSWORD}")
    print()
    print(f"DH — Digital Svc  : {DH1_EMAIL}   / {DEFAULT_PASSWORD}")
    print(f"DH — Cloud Infra  : {DH2_EMAIL}   / {DEFAULT_PASSWORD}")
    print(f"DH — BFSI         : {DH3_EMAIL}   / {DEFAULT_PASSWORD}")
    print()
    print(f"DM1 — Acme Corp   : {DM1_EMAIL}    / {DEFAULT_PASSWORD}")
    print(f"DM2 — Tech Nova   : {DM2_EMAIL}    / {DEFAULT_PASSWORD}")
    print(f"DM3 — Globex      : {DM3_EMAIL}    / {DEFAULT_PASSWORD}")
    print(f"DM4 — Nexus Cloud : {DM4_EMAIL}    / {DEFAULT_PASSWORD}")
    print(f"DM5 — Apex Bank   : {DM5_EMAIL}    / {DEFAULT_PASSWORD}")
    print(f"DM6 — Sterling    : {DM6_EMAIL}    / {DEFAULT_PASSWORD}")
    print()
    print(f"PM1 — Digital Svc : {PM1_EMAIL}    / {DEFAULT_PASSWORD}")
    print(f"PM2 — Cloud Infra : {PM2_EMAIL}    / {DEFAULT_PASSWORD}")
    print(f"PM3 — BFSI        : {PM3_EMAIL}    / {DEFAULT_PASSWORD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(seed_demo_structure())
