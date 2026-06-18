"""Authentication API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> LoginResponse:
    """Authenticate with email and password; returns JWT access token."""
    return AuthService(db).login(body.email, body.password)


@router.get("/me", response_model=UserResponse)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    """Return the currently authenticated user."""
    return AuthService.to_user_response(current_user)


@router.get("/protected-test")
def protected_test(current_user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Smoke endpoint proving JWT protection works."""
    return {
        "message": "You are authenticated",
        "user_id": str(current_user.id),
        "email": current_user.email,
        "role_code": current_user.role.code,
    }
