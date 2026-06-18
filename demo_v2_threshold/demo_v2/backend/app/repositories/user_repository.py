"""User data access."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.user import User


class UserRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_email(self, email: str) -> User | None:
        """Load active (non-deleted) user by email with role."""
        stmt = (
            select(User)
            .options(joinedload(User.role))
            .where(User.email == email.lower().strip())
            .where(User.deleted_at.is_(None))
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Load active (non-deleted) user by id with role."""
        stmt = (
            select(User)
            .options(joinedload(User.role))
            .where(User.id == user_id)
            .where(User.deleted_at.is_(None))
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def create_user(
        self,
        *,
        email: str,
        password_hash: str,
        full_name: str,
        role_id: uuid.UUID,
        is_active: bool = True,
    ) -> User:
        user = User(
            email=email.lower().strip(),
            password_hash=password_hash,
            full_name=full_name,
            role_id=role_id,
            is_active=is_active,
        )
        self._session.add(user)
        self._session.flush()
        self._session.refresh(user, attribute_names=["role"])
        return user

    def update_last_login(self, user_id: uuid.UUID) -> None:
        user = self._session.get(User, user_id)
        if user is None:
            return
        user.last_login_at = datetime.now(timezone.utc)
        self._session.flush()

    def list_all_active_by_roles(self, role_codes: list[str]) -> list[User]:
        from app.models.role import Role
        stmt = (
            select(User)
            .join(Role)
            .where(Role.code.in_(role_codes))
            .where(User.is_active.is_(True))
            .where(User.deleted_at.is_(None))
            .options(joinedload(User.role))
            .order_by(User.full_name)
        )
        return list(self._session.execute(stmt).scalars().all())

