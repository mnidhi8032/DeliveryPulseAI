import sys; sys.path.insert(0, ".")
from database.database import SessionLocal
from sqlalchemy import text
with SessionLocal() as s:
    rows = s.execute(text("SELECT DISTINCT uom FROM qpm_catalog_metrics WHERE is_active=true ORDER BY uom")).fetchall()
    for r in rows:
        print(repr(r[0]))
