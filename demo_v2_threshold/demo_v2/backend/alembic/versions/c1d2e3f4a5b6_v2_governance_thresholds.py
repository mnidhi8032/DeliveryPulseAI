"""v2_governance_thresholds

Adds four governance threshold columns to metric_definitions and a
governance_status column to dimension_scores for the V2 engine.

Revision ID: c1d2e3f4a5b6
Revises: b7c8d9e0f1a2
Create Date: 2026-06-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c1d2e3f4a5b6'
down_revision = '794242bf5adc'
branch_labels = None
depends_on = None


def upgrade():
    # New V2 threshold columns on metric_definitions
    op.add_column(
        "metric_definitions",
        sa.Column("green_threshold",    sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.add_column(
        "metric_definitions",
        sa.Column("amber_threshold",    sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.add_column(
        "metric_definitions",
        sa.Column("red_threshold",      sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.add_column(
        "metric_definitions",
        sa.Column("critical_threshold", sa.Numeric(precision=10, scale=2), nullable=True),
    )

    # Governance status column on dimension_scores (V2 stores status string)
    op.add_column(
        "dimension_scores",
        sa.Column("governance_status", sa.String(length=10), nullable=True),
    )


def downgrade():
    op.drop_column("dimension_scores", "governance_status")
    op.drop_column("metric_definitions", "critical_threshold")
    op.drop_column("metric_definitions", "red_threshold")
    op.drop_column("metric_definitions", "amber_threshold")
    op.drop_column("metric_definitions", "green_threshold")
