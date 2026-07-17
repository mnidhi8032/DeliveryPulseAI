"""Add metric_recommendations table — Spec 14.

Revision ID: q1r2s3t4u5v6
Revises: p0q1r2s3t4u5
Create Date: 2026-07-17
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "q1r2s3t4u5v6"
down_revision = "p0q1r2s3t4u5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "metric_recommendations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("metric_name", sa.String(200), nullable=False),
        sa.Column("breach_type", sa.String(50), nullable=False),
        sa.Column("recommendation_text", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("metric_name", "breach_type", name="uq_metric_breach"),
    )
    op.create_index("ix_metric_recommendations_metric_name", "metric_recommendations", ["metric_name"])


def downgrade() -> None:
    op.drop_index("ix_metric_recommendations_metric_name")
    op.drop_table("metric_recommendations")
