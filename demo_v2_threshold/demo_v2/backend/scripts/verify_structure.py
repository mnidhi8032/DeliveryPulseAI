"""Quick verification of the seeded org structure."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from database.database import SessionLocal

with SessionLocal() as s:
    print("=== ROLES ===")
    for r in s.execute(text("SELECT code, name FROM roles ORDER BY code")).fetchall():
        print(f"  {r[0]:<25} {r[1]}")

    print("\n=== USERS BY ROLE ===")
    for r in s.execute(text(
        "SELECT r.code, u.email FROM users u JOIN roles r ON u.role_id=r.id "
        "WHERE r.code != 'PLATFORM_ADMIN' ORDER BY r.code, u.email"
    )).fetchall():
        print(f"  {r[0]:<25} {r[1]}")

    print("\n=== BUs with DH ===")
    for r in s.execute(text(
        "SELECT bu.code, bu.name, u.email as dh "
        "FROM business_units bu LEFT JOIN users u ON bu.bu_head_user_id=u.id "
        "ORDER BY bu.code"
    )).fetchall():
        print(f"  {r[0]:<20} {r[1]:<30} DH: {r[2]}")

    print("\n=== ACCOUNTS with DM ===")
    for r in s.execute(text(
        "SELECT a.code, a.name, bu.code as bu, u.email as dm "
        "FROM accounts a "
        "JOIN business_units bu ON a.business_unit_id=bu.id "
        "LEFT JOIN users u ON a.delivery_manager_user_id=u.id "
        "ORDER BY bu.code, a.code"
    )).fetchall():
        print(f"  {r[0]:<15} {r[1]:<20} BU: {r[2]:<20} DM: {r[3]}")

    print("\n=== PROJECTS ===")
    for r in s.execute(text(
        "SELECT p.project_code, p.project_name, a.code as account, u.email as pm "
        "FROM projects p "
        "JOIN accounts a ON p.account_id=a.id "
        "LEFT JOIN users u ON p.project_manager_id=u.id "
        "ORDER BY p.project_code"
    )).fetchall():
        print(f"  {r[0]:<12} {r[1]:<35} {r[2]:<15} PM: {r[3]}")
