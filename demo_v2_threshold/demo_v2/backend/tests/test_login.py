"""Integration tests for login and JWT-protected routes."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt_handler import TokenError, verify_token
from app.auth.password import hash_password
from app.core.constants import RoleCode
from app.models.role import Role
from app.models.user import User
from app.repositories.user_repository import UserRepository

ADMIN_EMAIL = "admin@deliverypulse.ai"
ADMIN_PASSWORD = "Admin@123"
INACTIVE_EMAIL = "inactive@deliverypulse.ai"


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Ensure admin exists for login tests."""
    repo = UserRepository(db_session)
    user = repo.get_by_email(ADMIN_EMAIL)
    if user is not None:
        return user

    role = db_session.execute(
        select(Role).where(Role.code == RoleCode.PLATFORM_ADMIN)
    ).scalar_one()
    user = repo.create_user(
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        full_name="Platform Administrator",
        role_id=role.id,
    )
    db_session.commit()
    return repo.get_by_email(ADMIN_EMAIL)  # type: ignore[return-value]


@pytest.fixture
def inactive_user(db_session: Session) -> User:
    repo = UserRepository(db_session)
    existing = repo.get_by_email(INACTIVE_EMAIL)
    if existing is not None:
        existing.is_active = False
        db_session.commit()
        return repo.get_by_email(INACTIVE_EMAIL)  # type: ignore[return-value]

    role = db_session.execute(select(Role).where(Role.code == RoleCode.PM)).scalar_one()
    user = repo.create_user(
        email=INACTIVE_EMAIL,
        password_hash=hash_password("Inactive@123"),
        full_name="Inactive User",
        role_id=role.id,
        is_active=False,
    )
    db_session.commit()
    return repo.get_by_email(INACTIVE_EMAIL)  # type: ignore[return-value]


def test_login_success(client: TestClient, admin_user: User) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["user"]["email"] == ADMIN_EMAIL
    assert data["user"]["role_code"] == RoleCode.PLATFORM_ADMIN

    payload = verify_token(data["access_token"])
    assert payload["sub"] == str(admin_user.id)
    assert payload["type"] == "access"


def test_login_wrong_password(client: TestClient, admin_user: User) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_inactive_user(client: TestClient, inactive_user: User) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": INACTIVE_EMAIL, "password": "Inactive@123"},
    )
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"].lower()


def test_jwt_validation_rejects_invalid_token() -> None:
    with pytest.raises(TokenError):
        verify_token("not.a.valid.jwt")


def test_protected_route_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/auth/protected-test")
    assert response.status_code == 401


def test_protected_route_with_valid_token(client: TestClient, admin_user: User) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    token = login.json()["access_token"]

    response = client.get(
        "/api/v1/auth/protected-test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == ADMIN_EMAIL
    assert response.json()["role_code"] == RoleCode.PLATFORM_ADMIN


def test_me_returns_current_user(client: TestClient, admin_user: User) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    token = login.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == ADMIN_EMAIL
    assert response.json()["id"] == str(admin_user.id)
