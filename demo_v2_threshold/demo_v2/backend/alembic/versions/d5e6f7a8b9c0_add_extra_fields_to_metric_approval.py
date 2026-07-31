"""add_extra_fields_to_metric_approval

Revision ID: d5e6f7a8b9c0
Revises: c48e6e0e1286
Create Date: 2026-07-30 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd5e6f7a8b9c0'
down_revision = 'c48e6e0e1286'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('metric_approval_requests',
        sa.Column('metrics_type', sa.String(30), nullable=True))
    op.add_column('metric_approval_requests',
        sa.Column('project_type', sa.Text(), nullable=True))
    op.add_column('metric_approval_requests',
        sa.Column('delivery_model', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('metric_approval_requests', 'delivery_model')
    op.drop_column('metric_approval_requests', 'project_type')
    op.drop_column('metric_approval_requests', 'metrics_type')
