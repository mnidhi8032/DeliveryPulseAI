"""Create engagement_model_metric_mappings table.

Associates catalog metrics with engagement model items.
DE/Platform Admin uses this to control which metrics belong to each
Project Type, Delivery Model, Project Category, Work Size Unit, or Dimension.

Revision ID: u3v4w5x6y7z8
Revises: t2u3v4w5x6y7
Create Date: 2026-08-05
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "u3v4w5x6y7z8"
down_revision = "t2u3v4w5x6y7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "engagement_model_metric_mappings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("engagement_model_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "catalog_metric_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("qpm_catalog_metrics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # When True, this metric is treated as mandatory for projects with this engagement item
        sa.Column("is_mandatory", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "engagement_item_id", "catalog_metric_id",
            name="uq_emmm_item_metric",
        ),
    )
    op.create_index(
        "ix_emmm_item",
        "engagement_model_metric_mappings",
        ["engagement_item_id"],
    )
    op.create_index(
        "ix_emmm_metric",
        "engagement_model_metric_mappings",
        ["catalog_metric_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_emmm_metric", table_name="engagement_model_metric_mappings")
    op.drop_index("ix_emmm_item", table_name="engagement_model_metric_mappings")
    op.drop_table("engagement_model_metric_mappings")
