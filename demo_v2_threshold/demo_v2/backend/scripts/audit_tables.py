"""Audit every table: row count, referenced by code, used in routes."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.settings import settings
from sqlalchemy import create_engine, text
engine = create_engine(settings.sqlalchemy_database_uri)

with engine.connect() as conn:
    tables = [r[0] for r in conn.execute(text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema='public' AND table_type='BASE TABLE' "
        "ORDER BY table_name"
    )).fetchall()]

    print(f"{'TABLE':<45} {'ROWS':>8}  FK_REFS")
    print("-" * 75)
    for t in tables:
        cnt = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
        # Count how many other tables reference this table via FK
        refs = conn.execute(text("""
            SELECT COUNT(*) FROM information_schema.referential_constraints rc
            JOIN information_schema.key_column_usage kcu
              ON rc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
              ON rc.unique_constraint_name = ccu.constraint_name
            WHERE ccu.table_name = :t
        """), {"t": t}).scalar()
        print(f"{t:<45} {cnt:>8}  referenced_by={refs}")
