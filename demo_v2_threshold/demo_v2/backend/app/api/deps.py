"""Shared FastAPI dependencies."""

from collections.abc import Generator

from fastapi import Depends
from sqlalchemy.orm import Session

from database.database import get_db as _get_db


def get_db() -> Generator[Session, None, None]:
    """Database session per request."""
    yield from _get_db()
