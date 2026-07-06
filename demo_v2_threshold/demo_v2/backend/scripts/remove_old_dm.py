import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from sqlalchemy import text
from database.database import SessionLocal

with SessionLocal() as s:
    r = s.execute(text("DELETE FROM users WHERE email = 'dm@deliverypulse.ai'"))
    s.commit()
    print(f"Deleted {r.rowcount} old dm@ user(s)")
