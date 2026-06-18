"""
SQLAlchemy engine and session lifecycle.

Connection lifecycle (sync):
- Engine: process-wide connection pool (lazy connections until first use).
- Session: one ``Session`` per request (FastAPI ``Depends(get_db)``) — short-lived,
  commits/rollbacks handled by the caller (services) once business logic exists.
- ``pool_pre_ping=True``: stale connections are detected before use.

This module does not create or migrate databases; use PostgreSQL ``CREATE DATABASE``
and Alembic for schema. Only connects to the URL in settings.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import settings

engine = create_engine(
    settings.sqlalchemy_database_uri,
    pool_pre_ping=True,
    echo=settings.SQL_ECHO,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for request-scoped use (FastAPI dependency)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
