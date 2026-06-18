"""Unit tests for Phase 1 auth foundation (no HTTP login route)."""

import uuid
from datetime import timedelta

import jwt
import pytest

from app.auth.jwt_handler import TokenError, generate_access_token, verify_token
from app.auth.password import hash_password, verify_password
from app.core.settings import settings


def test_hash_and_verify_password():
    hashed = hash_password("secret-password")
    assert hashed != "secret-password"
    assert verify_password("secret-password", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_generate_and_verify_access_token():
    user_id = uuid.uuid4()
    token = generate_access_token(
        user_id=user_id,
        email="pm@example.com",
        role_code="PM",
    )
    payload = verify_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["email"] == "pm@example.com"
    assert payload["role_code"] == "PM"
    assert payload["type"] == "access"


def test_verify_token_rejects_wrong_type():
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "type": "refresh",
            "exp": now + timedelta(minutes=5),
            "iat": now,
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(TokenError):
        verify_token(token)
