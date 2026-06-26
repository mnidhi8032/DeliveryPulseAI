"""Add metric_approval_requests table.

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'i3j4k5l6m7n8'
down_revision = 'h2i3j4k5l6m7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'metric_approval_requests',
        sa.Column('id',                   UUID(as_uuid=True), primary_key=True),
        sa.Column('kpi_plan_id',          UUID(as_uuid=True), sa.ForeignKey('kpi_plans.id',  ondelete='CASCADE'),    nullable=False),
        sa.Column('requested_by_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id',      ondelete='CASCADE'),    nullable=False),
        sa.Column('reviewed_by_user_id',  UUID(as_uuid=True), sa.ForeignKey('users.id',      ondelete='SET NULL'),   nullable=True),
        sa.Column('metric_name',     sa.String(300), nullable=False),
        sa.Column('metric_category', sa.String(100), nullable=True),
        sa.Column('formula',         sa.Text,        nullable=True),
        sa.Column('uom',             sa.String(100), nullable=True),
        sa.Column('intent',          sa.String(100), nullable=True),
        sa.Column('frequency',       sa.String(200), nullable=True),
        sa.Column('priority',        sa.String(20),  nullable=True),
        sa.Column('justification',   sa.Text,        nullable=False),
        sa.Column('status',          sa.String(20),  nullable=False, server_default='PENDING'),
        sa.Column('review_comments', sa.Text,        nullable=True),
        sa.Column('reviewed_at',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at',      sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at',      sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_metric_approval_requests_kpi_plan_id', 'metric_approval_requests', ['kpi_plan_id'])
    op.create_index('ix_metric_approval_requests_status', 'metric_approval_requests', ['status'])


def downgrade() -> None:
    op.drop_table('metric_approval_requests')
