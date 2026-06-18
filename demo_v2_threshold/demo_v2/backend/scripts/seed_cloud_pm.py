"""Create a dedicated PM for Cloud Infrastructure BU."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1]))

from sqlalchemy import select
from app.auth.password import hash_password
from app.models.role import Role
from app.repositories.user_repository import UserRepository
from database.database import SessionLocal

EMAIL    = "pm.cloud@deliverypulse.ai"
PASSWORD = "Demo@12345"

with SessionLocal() as s:
    role = s.execute(select(Role).where(Role.code == "PM")).scalar_one()
    repo = UserRepository(s)
    existing = repo.get_by_email(EMAIL)
    if existing:
        print(f"Already exists: {EMAIL}")
    else:
        user = repo.create_user(
            email=EMAIL,
            password_hash=hash_password(PASSWORD),
            full_name="Cloud PM (Demo)",
            role_id=role.id,
        )
        s.commit()
        print(f"Created: {EMAIL} / {PASSWORD}")
        print(f"  Role: PM")
        print(f"  BU  : Cloud Infrastructure (create a project and assign to Globex account)")
