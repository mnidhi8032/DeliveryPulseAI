"""add_measures_thresholds_to_metric_approval

Revision ID: c48e6e0e1286
Revises: s2t3u4v5w6x7
Create Date: 2026-07-30 14:39:04.520115

"""
from alembic import op
import sqlalchemy as sa

revision = 'c48e6e0e1286'
down_revision = 's2t3u4v5w6x7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('metric_approval_requests',
        sa.Column('default_target', sa.Numeric(12, 4), nullable=True))
    op.add_column('metric_approval_requests',
        sa.Column('default_lsl', sa.Numeric(12, 4), nullable=True))
    op.add_column('metric_approval_requests',
        sa.Column('default_usl', sa.Numeric(12, 4), nullable=True))
    op.add_column('metric_approval_requests',
        sa.Column('measures_json', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('metric_approval_requests', 'measures_json')
    op.drop_column('metric_approval_requests', 'default_usl')
    op.drop_column('metric_approval_requests', 'default_lsl')
    op.drop_column('metric_approval_requests', 'default_target')
