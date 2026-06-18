"""Service for Platform Admin User Management."""

import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.user import User
from app.models.role import Role
from app.auth.password import hash_password
from app.repositories.user_repository import UserRepository
from app.schemas.user_management import (
    UserManagementCreateRequest,
    UserManagementResponse,
    UserManagementUpdateRequest,
)


class UserManagementService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._repo = UserRepository(session)

    def list_users(self) -> list[UserManagementResponse]:
        stmt = (
            select(User)
            .where(User.deleted_at.is_(None))
            .order_by(User.created_at.desc())
        )
        users = list(self._session.execute(stmt).scalars().all())
        return [
            UserManagementResponse(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                role_code=u.role.code,
                is_active=u.is_active,
                last_login_at=u.last_login_at,
                created_at=u.created_at,
                updated_at=u.updated_at,
            )
            for u in users
        ]

    def create_user(self, body: UserManagementCreateRequest) -> UserManagementResponse:
        existing = self._repo.get_by_email(body.email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email already exists: {body.email}",
            )

        # Retrieve designated role
        role = self._session.execute(
            select(Role).where(Role.code == body.role_code.strip())
        ).scalar_one_or_none()
        if role is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Designated role not found: {body.role_code}",
            )

        user = self._repo.create_user(
            email=body.email.strip().lower(),
            password_hash=hash_password(body.password),
            full_name=body.full_name.strip(),
            role_id=role.id,
            is_active=body.is_active,
        )
        self._session.commit()

        return UserManagementResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role_code=user.role.code,
            is_active=user.is_active,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    def update_user(self, user_id: uuid.UUID, body: UserManagementUpdateRequest) -> UserManagementResponse:
        user = self._repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if body.email is not None:
            existing = self._repo.get_by_email(body.email)
            if existing is not None and existing.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email is already taken: {body.email}",
                )
            user.email = body.email.strip().lower()

        if body.full_name is not None:
            user.full_name = body.full_name.strip()

        if body.is_active is not None:
            user.is_active = body.is_active

        if body.role_code is not None:
            role = self._session.execute(
                select(Role).where(Role.code == body.role_code.strip())
            ).scalar_one_or_none()
            if role is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role not found: {body.role_code}",
                )
            user.role_id = role.id

        user.updated_at = datetime.now(timezone.utc)
        self._session.flush()
        self._session.commit()

        # Reload relationship
        self._session.refresh(user, attribute_names=["role"])

        return UserManagementResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role_code=user.role.code,
            is_active=user.is_active,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    def delete_user(self, user_id: uuid.UUID) -> None:
        user = self._repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Soft delete user
        user.deleted_at = datetime.now(timezone.utc)
        user.is_active = False
        self._session.flush()
        self._session.commit()
