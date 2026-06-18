"""restructure ownership

Revision ID: 794242bf5adc
Revises: 6eaa319c0f77
Create Date: 2026-05-26 11:00:04.984259

"""
from alembic import op
import sqlalchemy as sa

revision = '794242bf5adc'
down_revision = '6eaa319c0f77'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Drop foreign key constraint on users.business_unit_id and drop the column
    op.drop_constraint("fk_users_business_unit_id", "users", type_="foreignkey")
    op.drop_column("users", "business_unit_id")

    # 2. Drop foreign key constraint on accounts.delivery_head_user_id and drop the column
    op.drop_constraint("fk_accounts_delivery_head_user_id", "accounts", type_="foreignkey")
    op.drop_column("accounts", "delivery_head_user_id")

    # 3. Add delivery_head_user_id to business_units with FK to users.id
    op.add_column("business_units", sa.Column("delivery_head_user_id", sa.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_business_units_delivery_head_user_id",
        "business_units",
        "users",
        ["delivery_head_user_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("idx_business_units_delivery_head_user_id", "business_units", ["delivery_head_user_id"], unique=False)

    # 4. Add delivery_head_user_id to projects with FK to users.id
    op.add_column("projects", sa.Column("delivery_head_user_id", sa.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_projects_delivery_head_user_id",
        "projects",
        "users",
        ["delivery_head_user_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("idx_projects_delivery_head_user_id", "projects", ["delivery_head_user_id"], unique=False)


def downgrade():
    # 1. Remove projects.delivery_head_user_id
    op.drop_index("idx_projects_delivery_head_user_id", table_name="projects")
    op.drop_constraint("fk_projects_delivery_head_user_id", "projects", type_="foreignkey")
    op.drop_column("projects", "delivery_head_user_id")

    # 2. Remove business_units.delivery_head_user_id
    op.drop_index("idx_business_units_delivery_head_user_id", table_name="business_units")
    op.drop_constraint("fk_business_units_delivery_head_user_id", "business_units", type_="foreignkey")
    op.drop_column("business_units", "delivery_head_user_id")

    # 3. Restore accounts.delivery_head_user_id
    op.add_column("accounts", sa.Column("delivery_head_user_id", sa.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_accounts_delivery_head_user_id",
        "accounts",
        "users",
        ["delivery_head_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 4. Restore users.business_unit_id
    op.add_column("users", sa.Column("business_unit_id", sa.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_users_business_unit_id",
        "users",
        "business_units",
        ["business_unit_id"],
        ["id"],
        ondelete="SET NULL",
    )

