"""
One-time helper: create database ``deliverypulse_ai`` if missing.

Connects only to the built-in ``postgres`` maintenance database, runs
``CREATE DATABASE deliverypulse_ai``, then exits. Does not drop or alter
other databases.

Usage (from ``backend/`` with venv active):

    python scripts/create_database.py

Requires: PostgreSQL reachable with credentials in ``.env`` / ``.env.example``.
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

# backend/ on sys.path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.core.settings import settings  # noqa: E402


def main() -> int:
    url = make_url(settings.sqlalchemy_database_uri)
    if not url.database:
        print("DATABASE_URL must include a database name.", file=sys.stderr)
        return 1

    target_db = url.database
    admin_url = url.set(database="postgres")
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")

    with engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": target_db},
        ).scalar()
        if exists:
            print(f"Database {target_db!r} already exists — nothing to do.")
            return 0

        # Identifier cannot be bound as a parameter in all drivers safely;
        # target_db comes only from our validated settings URL.
        if not all(c.isalnum() or c == "_" for c in target_db):
            print("Refusing unsafe database name.", file=sys.stderr)
            return 1

        conn.execute(text(f"CREATE DATABASE {target_db}"))
        print(f"Created database {target_db!r}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
