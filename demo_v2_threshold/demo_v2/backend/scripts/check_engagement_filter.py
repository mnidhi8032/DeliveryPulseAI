"""Show how engagement model filters mandatory metrics."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1]))

from database.database import SessionLocal
from sqlalchemy import text

with SessionLocal() as s:
    print("=== TOTAL MANDATORY METRICS IN CATALOG ===")
    total = s.execute(text("SELECT COUNT(*) FROM qpm_catalog_metrics WHERE compliance='M' AND is_active=true")).scalar()
    print(f"Total M metrics: {total}")

    tests = [
        ("Fresh Development", "Agile-Scrum"),
        ("Fresh Development", "Waterfall"),
        ("Application Build", "Waterfall"),
        ("Production Support", "ITIL based Service Delivery"),
        ("Testing", "Agile-Scrum"),
        ("Maintenance & Support", "Traditional Maintenance & Support"),
    ]

    for pt, dm in tests:
        rows = s.execute(text("""
            SELECT name, category FROM qpm_catalog_metrics
            WHERE compliance='M' AND is_active=true
            AND project_type ILIKE :pt
            AND delivery_model ILIKE :dm
            ORDER BY category, name
        """), {"pt": f"%{pt}%", "dm": f"%{dm}%"}).fetchall()
        print(f"\n=== [{len(rows)} mandatory] Project Type: {pt!r} | Delivery Model: {dm!r} ===")
        for r in rows:
            print(f"  {r[1]:35s}  {r[0]}")
