"""Authentication use cases."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth.jwt_handler import generate_access_token
from app.auth.password import verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginResponse, UserResponse


class AuthService:
    def __init__(self, session: Session) -> None:
        self._users = UserRepository(session)
        self._session = session

    def authenticate_user(self, email: str, password: str) -> User | None:
        """
        Validate credentials and return the user, or None if invalid.

        Rejects soft-deleted users. Inactive users are returned so login()
        can emit a distinct error message.
        """
        user = self._users.get_by_email(email)
        if user is None:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def login(self, email: str, password: str) -> LoginResponse:
        user = self.authenticate_user(email, password)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        token = generate_access_token(
            user_id=user.id,
            email=user.email,
            role_code=user.role.code,
        )
        self._users.update_last_login(user.id)
        self._session.commit()

        return LoginResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role_code=user.role.code,
            ),
        )

    @staticmethod
    def to_user_response(user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role_code=user.role.code,
        )
