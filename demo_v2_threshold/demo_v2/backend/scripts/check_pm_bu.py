"""Show all PMs and their project/BU assignments."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1]))

from database.database import SessionLocal
from sqlalchemy import text

with SessionLocal() as s:
    rows = s.execute(text("""
        SELECT u.email, u.full_name, r.code,
               p.project_code, p.project_name,
               acc.name as account_name,
               bu.name as bu_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN projects p ON p.project_manager_id = u.id AND p.deleted_at IS NULL
        LEFT JOIN accounts acc ON p.account_id = acc.id
        LEFT JOIN business_units bu ON acc.business_unit_id = bu.id
        WHERE r.code = 'PM'
        ORDER BY u.email, p.project_name
    """)).fetchall()

    print("=== PM ASSIGNMENTS ===")
    for r in rows:
        proj = f"{r[3]} - {r[4]}" if r[3] else "(no projects)"
        bu   = r[6] or "-"
        print(f"  {r[0]:<40} {r[1]:<22} BU={bu:<25} {proj}")
