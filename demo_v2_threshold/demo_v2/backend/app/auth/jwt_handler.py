"""JWT access token creation and verification."""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import jwt
from jwt.exceptions import InvalidTokenError

from app.core.settings import settings


class TokenError(Exception):
    """Raised when a token is invalid or expired."""


def generate_access_token(
    *,
    user_id: UUID | str,
    email: str,
    role_code: str,
) -> str:
    """Build and sign a JWT access token using application settings."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role_code": role_code,
        "iat": now,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def verify_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT access token.

    Returns the token payload on success.
    Raises TokenError on invalid or expired tokens.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except InvalidTokenError as exc:
        raise TokenError("Invalid or expired token") from exc

    if payload.get("type") != "access":
        raise TokenError("Invalid token type")

    return payload
