from app.core.settings import settings
from sqlalchemy import create_engine, text
engine = create_engine(settings.sqlalchemy_database_uri)
with engine.connect() as conn:
    items = conn.execute(text(
        "SELECT value, is_active FROM engagement_model_items WHERE item_type='PROJECT_TYPE' ORDER BY value"
    )).fetchall()
    print('PROJECT_TYPE items in DB:')
    for r in items:
        status = "active" if r[1] else "inactive"
        ai = " <-- CUSTOM" if "AI" in r[0] or "Ganesh" in r[0] else ""
        print(f"  {r[0]!r} ({status}){ai}")
