"""Create engagement_model_items table.

Stores the allowed values for all engagement model dropdowns (Project Type,
Delivery Model, Project Category, Work Size Unit) and metric Dimensions,
replacing the hardcoded frontend arrays with a database-driven registry.

Also adds min_mandatory_count for DIMENSION-type rows (Spec 18.3).

Revision ID: t2u3v4w5x6y7
Revises: 4e586ca0c465
Create Date: 2026-08-05
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "t2u3v4w5x6y7"
down_revision = "4e586ca0c465"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "engagement_model_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "item_type", sa.String(50), nullable=False,
            comment="PROJECT_TYPE | DELIVERY_MODEL | PROJECT_CATEGORY | WORK_SIZE_UNIT | DIMENSION",
        ),
        sa.Column("value", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default=sa.text("0")),
        # For DIMENSION rows only — minimum number of metrics that must be
        # selected from this category when a PM finalizes their KPI plan (Spec 18.3)
        sa.Column("min_mandatory_count", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("item_type", "value", name="uq_emi_type_value"),
    )
    op.create_index(
        "ix_emi_type_active",
        "engagement_model_items",
        ["item_type", "is_active"],
    )


def downgrade() -> None:
    op.drop_index("ix_emi_type_active", table_name="engagement_model_items")
    op.drop_table("engagement_model_items")
