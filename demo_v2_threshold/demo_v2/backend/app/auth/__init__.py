"""Authentication utilities (password hashing, JWT, dependencies)."""

from app.auth.dependencies import get_current_user, require_roles
from app.auth.jwt_handler import TokenError, generate_access_token, verify_token
from app.auth.password import hash_password, verify_password

__all__ = [
    "TokenError",
    "generate_access_token",
    "verify_token",
    "hash_password",
    "verify_password",
    "get_current_user",
    "require_roles",
]
