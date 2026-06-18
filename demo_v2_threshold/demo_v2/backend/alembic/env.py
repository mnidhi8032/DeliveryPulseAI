"""Alembic migration environment (sync SQLAlchemy + app settings)."""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Ensure backend/ is on sys.path (alembic.ini prepend_sys_path = .)
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.settings import settings  # noqa: E402
from app.models import Base  # noqa: E402, F401 — registers Role, User on metadata
import app.models  # noqa: E402, F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# NOTE: We do NOT call config.set_main_option here because alembic's configparser
# chokes on percent-encoded characters (e.g. %40 for @) in the URL.
# The URL is injected directly in run_migrations_online/offline below.

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (SQL script generation)."""
    url = settings.sqlalchemy_database_uri
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (live database)."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = settings.sqlalchemy_database_uri
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
