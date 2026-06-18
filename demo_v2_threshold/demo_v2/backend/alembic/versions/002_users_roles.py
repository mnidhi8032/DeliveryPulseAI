"""Create roles and users tables.

Revision ID: 002_users_roles
Revises: 001_initial
Create Date: 2026-05-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_users_roles"
down_revision: Union[str, Sequence[str], None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_roles"),
    )
    op.create_index("idx_roles_deleted_at", "roles", ["deleted_at"], unique=False)
    op.create_index(
        "uq_roles_code_active",
        "roles",
        ["code"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_unit_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], name="fk_users_role_id", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index("idx_users_role_id", "users", ["role_id"], unique=False)
    op.create_index("idx_users_business_unit_id", "users", ["business_unit_id"], unique=False)
    op.create_index("idx_users_is_active", "users", ["is_active"], unique=False)
    op.create_index("idx_users_deleted_at", "users", ["deleted_at"], unique=False)
    op.create_index(
        "uq_users_email_active",
        "users",
        ["email"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_users_email_active", table_name="users")
    op.drop_index("idx_users_deleted_at", table_name="users")
    op.drop_index("idx_users_is_active", table_name="users")
    op.drop_index("idx_users_business_unit_id", table_name="users")
    op.drop_index("idx_users_role_id", table_name="users")
    op.drop_table("users")
    op.drop_index("uq_roles_code_active", table_name="roles")
    op.drop_index("idx_roles_deleted_at", table_name="roles")
    op.drop_table("roles")
