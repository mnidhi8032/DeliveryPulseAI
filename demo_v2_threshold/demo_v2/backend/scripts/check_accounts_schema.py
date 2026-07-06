from database.database import SessionLocal
from sqlalchemy import text

with SessionLocal() as s:
    cols = s.execute(text(
        "SELECT column_name, data_type FROM information_schema.columns "
        "WHERE table_name = 'accounts' ORDER BY ordinal_position"
    )).fetchall()
    print("=== accounts columns ===")
    for c in cols:
        print(c[0], "|", c[1])
