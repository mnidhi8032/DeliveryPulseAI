"""
Surgical DB cleanup: Reduce complexity to exactly 6 BUs, 6 Accounts, and 8 Projects.
Preserves all realistic governance history (submissions, scores, metrics, audits)
while deleting polluted test data, duplicates, and test structures.

Safe to rerun.
"""

from __future__ import annotations

import sys
from pathlib import Path
from datetime import datetime, timezone
import uuid

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.auth.password import hash_password
from app.core.constants import RoleCode
from app.models.business_unit import BusinessUnit
from app.models.account import Account
from app.models.project import Project
from app.models.user import User
from app.models.role import Role
from app.models.submission import Submission
from app.models.submission_status import SubmissionStatus
from app.models.submission_lifecycle_audit import SubmissionLifecycleAudit
from app.models.metric_value import MetricValue
from app.models.dimension_score import DimensionScore
from app.models.health_score import HealthScore
from app.models.excel_import_batch import ExcelImportBatch
from app.models.excel_import_row import ExcelImportRow
from database.database import SessionLocal

DEFAULT_PASSWORD = "Demo@12345"

# Define target BUs and their DH configurations
TARGET_BUS_CONFIG = [
    {"code": "BFSI", "name": "BFSI", "desc": "Banking, Financial Services, and Insurance vertical", "dh_email": "priya.dh@deliverypulse.ai", "dh_name": "Priya (Delivery Head)"},
    {"code": "HEALTHCARE_LS", "name": "Healthcare", "desc": "Healthcare and Life Sciences vertical", "dh_email": "amit.dh@deliverypulse.ai", "dh_name": "Amit (Delivery Head)"},
    {"code": "RETAIL", "name": "Retail", "desc": "Retail and E-commerce vertical", "dh_email": "rajesh.dh@deliverypulse.ai", "dh_name": "Rajesh (Delivery Head)"},
    {"code": "TMT", "name": "Technology & Telecom", "desc": "Technology, Media, and Telecommunications vertical", "dh_email": "kiran.dh@deliverypulse.ai", "dh_name": "Kiran (Delivery Head)"},
    {"code": "ENERGY", "name": "Energy", "desc": "Energy, Utilities, and Resources vertical", "dh_email": "sanjay.dh@deliverypulse.ai", "dh_name": "Sanjay (Delivery Head)"},
    {"code": "PUBLIC_SECTOR", "name": "Public Sector", "desc": "Government and Public Sector vertical", "dh_email": "vikram.dh@deliverypulse.ai", "dh_name": "Vikram (Delivery Head)"},
]

# Define target Accounts mapping to BUs
TARGET_ACCOUNTS_CONFIG = [
    {"code": "BFSI_AC1", "name": "Apex Banking", "bu_code": "BFSI", "dh_email": "priya.dh@deliverypulse.ai"},
    {"code": "HEALTHCARE_AC1", "name": "St. Jude Health", "bu_code": "HEALTHCARE_LS", "dh_email": "amit.dh@deliverypulse.ai"},
    {"code": "RETAIL_AC1", "name": "SwiftMart Retail", "bu_code": "RETAIL", "dh_email": "rajesh.dh@deliverypulse.ai"},
    {"code": "TMT_AC1", "name": "Telco Prime", "bu_code": "TMT", "dh_email": "kiran.dh@deliverypulse.ai"},
    {"code": "ENERGY_AC1", "name": "Nexus Energy", "bu_code": "ENERGY", "dh_email": "sanjay.dh@deliverypulse.ai"},
    {"code": "PUBLIC_SECTOR_AC1", "name": "State Registry Account", "bu_code": "PUBLIC_SECTOR", "dh_email": "vikram.dh@deliverypulse.ai"},
]

# Define target 8 Projects mapping to Accounts and PMs
TARGET_PROJECTS_CONFIG = [
    # BFSI (2 projects)
    {"find_pattern": "BFSI%Initiative 1", "new_code": "BFSI_P1", "new_name": "Mobile Banking Portal", "acct_code": "BFSI_AC1", "pm_email": "pm1@deliverypulse.ai"},
    {"find_pattern": "BFSI%Initiative 2", "new_code": "BFSI_P2", "new_name": "Credit Card Analytics", "acct_code": "BFSI_AC1", "pm_email": "pm2@deliverypulse.ai"},
    
    # Healthcare (2 projects)
    {"find_pattern": "Healthcare%Initiative 1", "new_code": "HEALTHCARE_P1", "new_name": "Patient Portal Upgrade", "acct_code": "HEALTHCARE_AC1", "pm_email": "pm1@deliverypulse.ai"},
    {"find_pattern": "Healthcare%Initiative 2", "new_code": "HEALTHCARE_P2", "new_name": "Pharmacy Supply Chain", "acct_code": "HEALTHCARE_AC1", "pm_email": "pm2@deliverypulse.ai"},
    
    # Retail (2 projects)
    {"find_pattern": "Retail%Initiative 2", "new_code": "RETAIL_P1", "new_name": "E-commerce Platform Redesign", "acct_code": "RETAIL_AC1", "pm_email": "pm1@deliverypulse.ai"},
    {"find_pattern": "Retail%Initiative %", "new_code": "RETAIL_P2", "new_name": "POS Integration", "acct_code": "RETAIL_AC1", "pm_email": "pm2@deliverypulse.ai"}, # Fallback Retail%Initiative 3 or 1
    
    # TMT (1 project)
    {"find_pattern": "Tech%Initiative 1", "new_code": "TMT_P1", "new_name": "5G Core Cloud Migration", "acct_code": "TMT_AC1", "pm_email": "pm1@deliverypulse.ai"},
    
    # Energy (1 project re-mapped from Cybersecurity)
    {"find_pattern": "Cybersecurity%Initiative 1", "new_code": "ENERGY_P1", "new_name": "Smart Grid Analytics", "acct_code": "ENERGY_AC1", "pm_email": "pm2@deliverypulse.ai"},
]


def run_surgical_clean():
    session = SessionLocal()
    try:
        print("Starting surgical database cleanup...")

        # 1. Fetch system roles
        roles = session.execute(select(Role)).scalars().all()
        role_by_code = {r.code: r for r in roles}

        # 2. Setup core users if missing, or update them
        core_users = {}
        
        # Platform Admin & Customer Admin
        for email, full_name, role_code in [
            ("admin@deliverypulse.ai", "Platform Administrator", RoleCode.PLATFORM_ADMIN),
            ("customer.admin@deliverypulse.ai", "Customer Admin", RoleCode.CEO),
            ("pm1@deliverypulse.ai", "Sarah (PM)", RoleCode.PM),
            ("pm2@deliverypulse.ai", "John (PM)", RoleCode.PM),
            ("priya.dh@deliverypulse.ai", "Priya (Delivery Head)", RoleCode.DELIVERY_HEAD),
            ("amit.dh@deliverypulse.ai", "Amit (Delivery Head)", RoleCode.DELIVERY_HEAD),
            ("rajesh.dh@deliverypulse.ai", "Rajesh (Delivery Head)", RoleCode.DELIVERY_HEAD),
            ("kiran.dh@deliverypulse.ai", "Kiran (Delivery Head)", RoleCode.DELIVERY_HEAD),
            ("sanjay.dh@deliverypulse.ai", "Sanjay (Delivery Head)", RoleCode.DELIVERY_HEAD),
            ("vikram.dh@deliverypulse.ai", "Vikram (Delivery Head)", RoleCode.DELIVERY_HEAD),
        ]:
            u = session.execute(select(User).where(User.email == email)).scalars().first()
            if u is None:
                u = User(
                    email=email,
                    password_hash=hash_password(DEFAULT_PASSWORD if "admin" not in email else "Admin@123"),
                    full_name=full_name,
                    role_id=role_by_code[str(role_code)].id,
                    is_active=True
                )
                session.add(u)
                session.flush()
                print(f"Created core user: {email}")
            else:
                u.is_active = True
                u.deleted_at = None
                session.flush()
            core_users[email] = u

        # 3. Identify existing Business Units to keep
        bu_ids_to_keep = set()
        bu_by_target_code = {}
        for config in TARGET_BUS_CONFIG:
            # Try to find BU by exact code
            bu = session.execute(
                select(BusinessUnit)
                .where(BusinessUnit.code == config["code"])
                .order_by(BusinessUnit.deleted_at.isnot(None), BusinessUnit.created_at.desc())
            ).scalars().first()
            
            # If not found by code, try by approximate name
            if bu is None:
                # Custom search terms for telecom/energy/cybersecurity
                if config["code"] == "TMT":
                    search_pattern = "%Technology%"
                elif config["code"] == "ENERGY":
                    search_pattern = "%Cybersecurity%"
                else:
                    search_pattern = f"%{config['name']}%"
                    
                bu = session.execute(
                    select(BusinessUnit)
                    .where(BusinessUnit.name.like(search_pattern))
                    .order_by(BusinessUnit.deleted_at.isnot(None), BusinessUnit.created_at.desc())
                ).scalars().first()
            
            if bu is not None:
                bu_ids_to_keep.add(bu.id)
                bu_by_target_code[config["code"]] = bu
                print(f"Identified BU to keep: '{bu.name}' for target code '{config['code']}'")

        # 4. Identify existing Client Accounts to keep
        account_ids_to_keep = set()
        account_by_target_code = {}
        for config in TARGET_ACCOUNTS_CONFIG:
            # Try by code first
            acct = session.execute(
                select(Account)
                .where(Account.code == config["code"])
                .order_by(Account.deleted_at.isnot(None), Account.created_at.desc())
            ).scalars().first()
            
            # Try by name
            if acct is None:
                acct = session.execute(
                    select(Account)
                    .where(Account.name.like(f"%{config['name']}%"))
                    .order_by(Account.deleted_at.isnot(None), Account.created_at.desc())
                ).scalars().first()
                
            # Try by association with identified BU
            if acct is None and config["bu_code"] in bu_by_target_code:
                bu = bu_by_target_code[config["bu_code"]]
                acct = session.execute(
                    select(Account)
                    .where(Account.business_unit_id == bu.id)
                    .order_by(Account.deleted_at.isnot(None), Account.created_at.desc())
                ).scalars().first()
            
            if acct is not None:
                account_ids_to_keep.add(acct.id)
                account_by_target_code[config["code"]] = acct
                print(f"Identified Account to keep: '{acct.name}' for target code '{config['code']}'")

        # 5. Identify existing Projects to keep
        project_ids_to_keep = set()
        project_by_target_code = {}
        for config in TARGET_PROJECTS_CONFIG:
            # Try by code first
            proj = session.execute(
                select(Project)
                .where(Project.project_code == config["new_code"])
                .order_by(Project.deleted_at.isnot(None), Project.created_at.desc())
            ).scalars().first()
            
            # Try by pattern
            if proj is None:
                proj = session.execute(
                    select(Project)
                    .where(Project.project_name.like(config["find_pattern"]))
                    .order_by(Project.deleted_at.isnot(None), Project.created_at.desc())
                ).scalars().first()
                
            # Try by prefix of vertical code
            if proj is None:
                vertical_prefix = config["new_code"].split("_")[0]
                proj = session.execute(
                    select(Project)
                    .where(Project.project_code.like(f"{vertical_prefix}%"))
                    .order_by(Project.deleted_at.isnot(None), Project.created_at.desc())
                ).scalars().first()
                
            if proj is not None:
                project_ids_to_keep.add(proj.id)
                project_by_target_code[config["new_code"]] = proj
                print(f"Identified Project to keep: '{proj.project_name}' for target code '{config['new_code']}'")

        # 6. Gather all associated submissions and child records for preserved projects
        submissions_to_keep = session.execute(
            select(Submission).where(Submission.project_id.in_(project_ids_to_keep))
        ).scalars().all()
        
        submission_ids_to_keep = {s.id for s in submissions_to_keep}
        print(f"Preserving {len(submission_ids_to_keep)} submissions with rich governance history.")

        # Find Excel import batches associated with preserved submissions
        excel_batches_to_keep = session.execute(
            select(ExcelImportBatch).where(ExcelImportBatch.submission_id.in_(submission_ids_to_keep))
        ).scalars().all()
        excel_batch_ids_to_keep = {b.id for b in excel_batches_to_keep}

        # 7. Identify target users to keep (to prevent deleting PMs, DHs, and Admins)
        user_ids_to_keep = {u.id for u in core_users.values()}
        
        # Also keep any user who created or reviewed target submissions
        for sub in submissions_to_keep:
            if sub.created_by_user_id:
                user_ids_to_keep.add(sub.created_by_user_id)
            if sub.reviewed_by_user_id:
                user_ids_to_keep.add(sub.reviewed_by_user_id)
                
        # 8. Temporarily clear codes of preserved items to prevent unique violations
        print("\nTemporarily clearing codes of preserved items to prevent unique violations...")
        session.execute(text("UPDATE projects SET project_code = project_code || '_temp_' || substring(id::text, 1, 8)"))
        session.execute(text("UPDATE accounts SET code = code || '_temp_' || substring(id::text, 1, 8)"))
        session.execute(text("UPDATE business_units SET code = code || '_temp_' || substring(id::text, 1, 8)"))
        session.flush()

        # Expire session cache to load temporary codes
        session.expire_all()

        # 9. Clean up, update and verify targets are fully restored in Python/DB
        print("\nCanonicalizing portfolio structure and restoring target codes/names/associations...")
        
        # A. Business Units
        bu_by_code = {}
        for config in TARGET_BUS_CONFIG:
            bu = bu_by_target_code.get(config["code"])
            dh = core_users[config["dh_email"]]
            if bu is None:
                # Create a new one
                bu = BusinessUnit(
                    code=config["code"],
                    name=config["name"],
                    description=config["desc"],
                    delivery_head_user_id=dh.id,
                    is_active=True
                )
                session.add(bu)
                session.flush()
                print(f"Created canonical BU: {config['name']}")
            else:
                # Update existing
                bu.code = config["code"]
                bu.name = config["name"]
                bu.description = config["desc"]
                bu.delivery_head_user_id = dh.id
                bu.is_active = True
                bu.deleted_at = None
                session.flush()
                print(f"Updated preserved BU: {bu.name}")
            bu_by_code[config["code"]] = bu

        # B. Accounts
        account_by_code = {}
        for config in TARGET_ACCOUNTS_CONFIG:
            bu = bu_by_code[config["bu_code"]]
            acct = account_by_target_code.get(config["code"])
            if acct is None:
                acct = Account(
                    business_unit_id=bu.id,
                    code=config["code"],
                    name=config["name"],
                    is_active=True
                )
                session.add(acct)
                session.flush()
                print(f"Created canonical Account: {config['name']}")
            else:
                acct.business_unit_id = bu.id
                acct.code = config["code"]
                acct.name = config["name"]
                acct.is_active = True
                acct.deleted_at = None
                session.flush()
                print(f"Updated preserved Account: {acct.name}")
            account_by_code[config["code"]] = acct

        # C. Projects
        for config in TARGET_PROJECTS_CONFIG:
            acct = account_by_code[config["acct_code"]]
            pm = core_users[config["pm_email"]]
            proj = project_by_target_code.get(config["new_code"])
            if proj is None:
                proj = Project(
                    account_id=acct.id,
                    project_code=config["new_code"],
                    project_name=config["new_name"],
                    project_manager_id=pm.id,
                    delivery_head_user_id=acct.business_unit.delivery_head_user_id,
                    description=f"Initiative project {config['new_name']}",
                    status="ACTIVE"
                )
                session.add(proj)
                session.flush()
                print(f"Created canonical Project: {config['new_name']}")
            else:
                proj.account_id = acct.id
                proj.project_code = config["new_code"]
                proj.project_name = config["new_name"]
                proj.project_manager_id = pm.id
                proj.delivery_head_user_id = acct.business_unit.delivery_head_user_id
                proj.status = "ACTIVE"
                proj.deleted_at = None
                session.flush()
                print(f"Updated preserved Project: {proj.project_name}")
        
        # Flush the updates to the DB so the kept items now point to the correct parents
        # and use the clean canonical codes.
        session.flush()

        # 10. Start surgical deletions in reverse dependency order
        print("\nSurgically deleting polluted data...")

        # A. excel_import_rows
        if excel_batch_ids_to_keep:
            del_rows = session.execute(
                text("DELETE FROM excel_import_rows WHERE batch_id NOT IN :batch_ids"),
                {"batch_ids": tuple(excel_batch_ids_to_keep)}
            ).rowcount
        else:
            del_rows = session.execute(text("DELETE FROM excel_import_rows")).rowcount
        print(f"Deleted {del_rows} polluted excel import rows.")

        # B. excel_import_batches
        if excel_batch_ids_to_keep:
            del_batches = session.execute(
                text("DELETE FROM excel_import_batches WHERE id NOT IN :batch_ids"),
                {"batch_ids": tuple(excel_batch_ids_to_keep)}
            ).rowcount
        else:
            del_batches = session.execute(text("DELETE FROM excel_import_batches")).rowcount
        print(f"Deleted {del_batches} polluted excel import batches.")

        # C. submission_lifecycle_audits
        if submission_ids_to_keep:
            del_audits = session.execute(
                text("DELETE FROM submission_lifecycle_audits WHERE submission_id NOT IN :sub_ids"),
                {"sub_ids": tuple(submission_ids_to_keep)}
            ).rowcount
        else:
            del_audits = session.execute(text("DELETE FROM submission_lifecycle_audits")).rowcount
        print(f"Deleted {del_audits} polluted submission lifecycle audits.")

        # D. metric_values
        if submission_ids_to_keep:
            del_metrics = session.execute(
                text("DELETE FROM metric_values WHERE submission_id NOT IN :sub_ids"),
                {"sub_ids": tuple(submission_ids_to_keep)}
            ).rowcount
        else:
            del_metrics = session.execute(text("DELETE FROM metric_values")).rowcount
        print(f"Deleted {del_metrics} polluted metric values.")

        # E. dimension_scores
        if submission_ids_to_keep:
            del_dim_scores = session.execute(
                text("DELETE FROM dimension_scores WHERE submission_id NOT IN :sub_ids"),
                {"sub_ids": tuple(submission_ids_to_keep)}
            ).rowcount
        else:
            del_dim_scores = session.execute(text("DELETE FROM dimension_scores")).rowcount
        print(f"Deleted {del_dim_scores} polluted dimension scores.")

        # F. health_scores
        if submission_ids_to_keep:
            del_health = session.execute(
                text("DELETE FROM health_scores WHERE submission_id NOT IN :sub_ids"),
                {"sub_ids": tuple(submission_ids_to_keep)}
            ).rowcount
        else:
            del_health = session.execute(text("DELETE FROM health_scores")).rowcount
        print(f"Deleted {del_health} polluted health scores.")

        # G. submissions (not associated with kept projects)
        if submission_ids_to_keep:
            del_subs = session.execute(
                text("DELETE FROM submissions WHERE id NOT IN :sub_ids"),
                {"sub_ids": tuple(submission_ids_to_keep)}
            ).rowcount
        else:
            del_subs = session.execute(text("DELETE FROM submissions")).rowcount
        print(f"Deleted {del_subs} polluted submissions.")

        # H. projects (not in target projects)
        if project_ids_to_keep:
            del_projects = session.execute(
                text("DELETE FROM projects WHERE id NOT IN :proj_ids"),
                {"proj_ids": tuple(project_ids_to_keep)}
            ).rowcount
        else:
            del_projects = session.execute(text("DELETE FROM projects")).rowcount
        print(f"Deleted {del_projects} polluted projects.")

        # I. accounts (not in target accounts)
        target_acct_ids = {a.id for a in account_by_code.values()}
        if target_acct_ids:
            del_accts = session.execute(
                text("DELETE FROM accounts WHERE id NOT IN :acct_ids"),
                {"acct_ids": tuple(target_acct_ids)}
            ).rowcount
        else:
            del_accts = session.execute(text("DELETE FROM accounts")).rowcount
        print(f"Deleted {del_accts} polluted accounts.")

        # J. users (not in target users)
        # Keep Platform Admins and Customer Admins as well
        platform_admin_role = role_by_code[str(RoleCode.PLATFORM_ADMIN)]
        customer_admin_role = role_by_code[str(RoleCode.CEO)]
        del_users = session.execute(
            text("DELETE FROM users WHERE id NOT IN :user_ids AND role_id NOT IN (:pa_id, :ca_id)"),
            {
                "user_ids": tuple(user_ids_to_keep),
                "pa_id": platform_admin_role.id,
                "ca_id": customer_admin_role.id
            }
        ).rowcount
        print(f"Deleted {del_users} polluted/test users.")

        # K. business_units (not in target BUs)
        target_bu_ids = {b.id for b in bu_by_code.values()}
        if target_bu_ids:
            del_bus = session.execute(
                text("DELETE FROM business_units WHERE id NOT IN :bu_ids"),
                {"bu_ids": tuple(target_bu_ids)}
            ).rowcount
        else:
            del_bus = session.execute(text("DELETE FROM business_units")).rowcount
        print(f"Deleted {del_bus} polluted business units.")

        session.commit()
        print("\nSurgical cleanup committed successfully!")
        
        # Verify counts in database
        bu_count = session.execute(select(text("COUNT(*)")).select_from(BusinessUnit)).scalar()
        acct_count = session.execute(select(text("COUNT(*)")).select_from(Account)).scalar()
        proj_count = session.execute(select(text("COUNT(*)")).select_from(Project)).scalar()
        sub_count = session.execute(select(text("COUNT(*)")).select_from(Submission)).scalar()
        
        print(f"\nFinal dev database counts:")
        print(f" - Business Units: {bu_count} (Expected: 6)")
        print(f" - Accounts (Total Customers): {acct_count} (Expected: 6)")
        print(f" - Projects: {proj_count} (Expected: 8)")
        print(f" - Submissions (Preserved): {sub_count}")

    except Exception as e:
        session.rollback()
        print(f"Error executing surgical cleanup: {e}")
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    run_surgical_clean()
