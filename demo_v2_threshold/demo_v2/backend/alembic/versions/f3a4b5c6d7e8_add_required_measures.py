"""add_required_measures_to_kpi_plan_metrics

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-06-05
"""
from alembic import op
import sqlalchemy as sa

revision = 'f3a4b5c6d7e8'
down_revision = 'e2f3a4b5c6d7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("kpi_plan_metrics", sa.Column("required_measures", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("kpi_plan_metrics", "required_measures")
