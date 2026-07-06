"""
Seed system roles: PM, CEO, BU_HEAD, PLATFORM_ADMIN.
Safe to rerun — skips roles that already exist (matched by code).

Usage (from backend/ with venv active):
    python scripts/seed_roles.py
"""

from __future__ import annotations
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select
from app.models.role import Role
from database.database import SessionLocal

SYSTEM_ROLES: list[dict] = [
    {
        "code": "PM",
        "name": "Project Manager",
        "description": "Creates and manages own projects, fills QPM plan, submits data.",
        "is_system": True,
    },
    {
        "code": "DELIVERY_MANAGER",
        "name": "Delivery Manager",
        "description": "Reviews PM submissions for assigned accounts. Adds commentary and creates action items.",
        "is_system": True,
    },
    {
        "code": "CEO",
        "name": "CEO",
        "description": "Read-only view across all Business Units and projects.",
        "is_system": True,
    },
    {
        "code": "DELIVERY_HEAD",
        "name": "Delivery Head",
        "description": "Responsible for one Business Unit. Reviews submissions, tracks delivery performance, and drives improvements across the BU.",
        "is_system": True,
    },
    {
        "code": "PLATFORM_ADMIN",
        "name": "Platform Admin",
        "description": "Creates BUs and Accounts, manages users and system configuration.",
        "is_system": True,
    },
    {
        "code": "DELIVERY_EXCELLENCE",
        "name": "Delivery Excellence",
        "description": "Manages metric library, catalog, and global configurations.",
        "is_system": True,
    },
]


def seed_roles() -> int:
    created = 0
    skipped = 0

    with SessionLocal() as session:
        for role_data in SYSTEM_ROLES:
            existing = session.execute(
                select(Role).where(Role.code == role_data["code"])
            ).scalar_one_or_none()

            if existing is not None:
                # Update description in case it changed
                existing.name = role_data["name"]
                existing.description = role_data["description"]
                print(f"Updated: {role_data['code']}")
                skipped += 1
                continue

            session.add(Role(**role_data))
            print(f"Created: {role_data['code']}")
            created += 1

        session.commit()

    print(f"Done. created={created}, updated={skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(seed_roles())
