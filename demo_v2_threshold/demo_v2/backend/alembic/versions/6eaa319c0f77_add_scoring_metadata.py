"""add_scoring_metadata

Revision ID: 6eaa319c0f77
Revises: 63f06e1c3d53
Create Date: 2026-05-26 09:34:02.020156

"""
from alembic import op
import sqlalchemy as sa

revision = '6eaa319c0f77'
down_revision = '63f06e1c3d53'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("metric_definitions", sa.Column("target_value", sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column("metric_definitions", sa.Column("fail_value", sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column("metric_definitions", sa.Column("calculation_model", sa.String(length=50), nullable=True))
    op.add_column("metric_definitions", sa.Column("direction_type", sa.String(length=50), nullable=True))
    op.add_column("metric_definitions", sa.Column("step_configuration", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("metric_definitions", "step_configuration")
    op.drop_column("metric_definitions", "direction_type")
    op.drop_column("metric_definitions", "calculation_model")
    op.drop_column("metric_definitions", "fail_value")
    op.drop_column("metric_definitions", "target_value")
