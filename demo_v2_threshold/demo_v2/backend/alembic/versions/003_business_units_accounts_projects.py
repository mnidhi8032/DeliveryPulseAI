"""Create business_units, accounts, projects; link users.business_unit_id.

Revision ID: 003_org_structure
Revises: 002_users_roles
Create Date: 2026-05-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003_org_structure"
down_revision: Union[str, Sequence[str], None] = "002_users_roles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "business_units",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
        sa.PrimaryKeyConstraint("id", name="pk_business_units"),
    )
    op.create_index(
        "idx_business_units_deleted_at", "business_units", ["deleted_at"], unique=False
    )
    op.create_index(
        "uq_business_units_code_active",
        "business_units",
        ["code"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_foreign_key(
        "fk_users_business_unit_id",
        "users",
        "business_units",
        ["business_unit_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_unit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("delivery_head_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
        sa.ForeignKeyConstraint(
            ["business_unit_id"],
            ["business_units.id"],
            name="fk_accounts_business_unit_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["delivery_head_user_id"],
            ["users.id"],
            name="fk_accounts_delivery_head_user_id",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_accounts"),
    )
    op.create_index("idx_accounts_business_unit_id", "accounts", ["business_unit_id"], unique=False)
    op.create_index(
        "idx_accounts_delivery_head_user_id", "accounts", ["delivery_head_user_id"], unique=False
    )
    op.create_index("idx_accounts_deleted_at", "accounts", ["deleted_at"], unique=False)
    op.create_index(
        "uq_accounts_bu_code_active",
        "accounts",
        ["business_unit_id", "code"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_code", sa.String(length=50), nullable=False),
        sa.Column("project_name", sa.String(length=200), nullable=False),
        sa.Column("project_manager_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("target_end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ACTIVE"),
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
        sa.ForeignKeyConstraint(
            ["account_id"], ["accounts.id"], name="fk_projects_account_id", ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["project_manager_id"],
            ["users.id"],
            name="fk_projects_project_manager_id",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_projects"),
    )
    op.create_index("idx_projects_account_id", "projects", ["account_id"], unique=False)
    op.create_index(
        "idx_projects_project_manager_id", "projects", ["project_manager_id"], unique=False
    )
    op.create_index("idx_projects_deleted_at", "projects", ["deleted_at"], unique=False)
    op.create_index(
        "uq_projects_account_code_active",
        "projects",
        ["account_id", "project_code"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_projects_account_code_active", table_name="projects")
    op.drop_index("idx_projects_deleted_at", table_name="projects")
    op.drop_index("idx_projects_project_manager_id", table_name="projects")
    op.drop_index("idx_projects_account_id", table_name="projects")
    op.drop_table("projects")

    op.drop_index("uq_accounts_bu_code_active", table_name="accounts")
    op.drop_index("idx_accounts_deleted_at", table_name="accounts")
    op.drop_index("idx_accounts_delivery_head_user_id", table_name="accounts")
    op.drop_index("idx_accounts_business_unit_id", table_name="accounts")
    op.drop_table("accounts")

    op.drop_constraint("fk_users_business_unit_id", "users", type_="foreignkey")

    op.drop_index("uq_business_units_code_active", table_name="business_units")
    op.drop_index("idx_business_units_deleted_at", table_name="business_units")
    op.drop_table("business_units")
