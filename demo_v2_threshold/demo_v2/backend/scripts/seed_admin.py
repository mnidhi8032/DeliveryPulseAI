"""
Seed platform admin test user (safe to rerun).

Email:    admin@deliverypulse.ai
Password: Admin@123
Role:     PLATFORM_ADMIN

Usage (from backend/ with venv active):

    python scripts/seed_admin.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from app.auth.password import hash_password
from app.core.constants import RoleCode
from app.models.role import Role
from app.models.user import User
from app.repositories.user_repository import UserRepository
from database.database import SessionLocal

ADMIN_EMAIL = "admin@deliverypulse.ai"
ADMIN_PASSWORD = "Admin@123"
ADMIN_FULL_NAME = "Platform Administrator"


def seed_admin() -> int:
    with SessionLocal() as session:
        existing = UserRepository(session).get_by_email(ADMIN_EMAIL)
        if existing is not None:
            print(f"Skip (exists): {ADMIN_EMAIL}")
            return 0

        role = session.execute(
            select(Role).where(Role.code == RoleCode.PLATFORM_ADMIN)
        ).scalar_one_or_none()

        if role is None:
            print("Error: PLATFORM_ADMIN role not found. Run: python scripts/seed_roles.py")
            return 1

        UserRepository(session).create_user(
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            full_name=ADMIN_FULL_NAME,
            role_id=role.id,
            is_active=True,
        )
        session.commit()
        print(f"Created admin user: {ADMIN_EMAIL}")
    return 0


if __name__ == "__main__":
    raise SystemExit(seed_admin())
