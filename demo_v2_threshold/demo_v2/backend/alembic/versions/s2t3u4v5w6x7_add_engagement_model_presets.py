"""Add engagement_model_presets table.

Stores evidence-based mandatory metric lists keyed by (project_type, delivery_model).
Used by project_service.create_with_plan to select an exact preset instead of the
broad ILIKE tag-matching fallback.

Revision ID: s2t3u4v5w6x7
Revises: r1s2t3u4v5w6
Create Date: 2026-07-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "s2t3u4v5w6x7"
down_revision = "r1s2t3u4v5w6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "engagement_model_presets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_type", sa.String(100), nullable=False),
        sa.Column("delivery_model", sa.String(100), nullable=False),
        sa.Column("metric_name", sa.String(200), nullable=False),
        sa.Column("source_reference", sa.String(200), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "ix_engagement_preset_lookup",
        "engagement_model_presets",
        ["project_type", "delivery_model"],
    )


def downgrade() -> None:
    op.drop_index("ix_engagement_preset_lookup",
                  table_name="engagement_model_presets")
    op.drop_table("engagement_model_presets")
