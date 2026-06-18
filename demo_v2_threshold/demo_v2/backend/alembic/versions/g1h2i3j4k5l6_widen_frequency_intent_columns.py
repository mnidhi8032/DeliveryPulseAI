"""Widen frequency and intent columns that are too short for catalog values.

kpi_measure_entries.frequency: VARCHAR(50) → VARCHAR(200)
kpi_measurements.frequency:    VARCHAR(50) → VARCHAR(200)
kpi_plan_metrics.frequency:    VARCHAR(100) → VARCHAR(200)
kpi_plan_metrics.intent:       VARCHAR(50) → VARCHAR(100)

Revision ID: g1h2i3j4k5l6
Revises: f3a4b5c6d7e8
Create Date: 2026-06-11
"""
from alembic import op
import sqlalchemy as sa

revision = 'g1h2i3j4k5l6'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # kpi_measure_entries.frequency: 50 → 200
    op.alter_column(
        'kpi_measure_entries', 'frequency',
        existing_type=sa.String(50),
        type_=sa.String(200),
        existing_nullable=True,
    )
    # kpi_measurements.frequency: 50 → 200
    op.alter_column(
        'kpi_measurements', 'frequency',
        existing_type=sa.String(50),
        type_=sa.String(200),
        existing_nullable=True,
    )
    # kpi_plan_metrics.frequency: 100 → 200
    op.alter_column(
        'kpi_plan_metrics', 'frequency',
        existing_type=sa.String(100),
        type_=sa.String(200),
        existing_nullable=True,
    )
    # kpi_plan_metrics.intent: 50 → 100
    op.alter_column(
        'kpi_plan_metrics', 'intent',
        existing_type=sa.String(50),
        type_=sa.String(100),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        'kpi_measure_entries', 'frequency',
        existing_type=sa.String(200),
        type_=sa.String(50),
        existing_nullable=True,
    )
    op.alter_column(
        'kpi_measurements', 'frequency',
        existing_type=sa.String(200),
        type_=sa.String(50),
        existing_nullable=True,
    )
    op.alter_column(
        'kpi_plan_metrics', 'frequency',
        existing_type=sa.String(200),
        type_=sa.String(100),
        existing_nullable=True,
    )
    op.alter_column(
        'kpi_plan_metrics', 'intent',
        existing_type=sa.String(100),
        type_=sa.String(50),
        existing_nullable=True,
    )
