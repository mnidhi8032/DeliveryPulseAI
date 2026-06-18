"""Verify PostgreSQL connectivity (run from ``backend/`` with ``.env`` present)."""

from sqlalchemy import text


def test_database_connection():
    from database.database import engine

    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        assert result.scalar_one() == 1
