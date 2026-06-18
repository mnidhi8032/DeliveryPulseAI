"""create_system_configurations

Revision ID: 63f06e1c3d53
Revises: 8f0d15d9fc96
Create Date: 2026-05-24 10:25:38.928065

"""
from alembic import op
import sqlalchemy as sa

revision = '63f06e1c3d53'
down_revision = '8f0d15d9fc96'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('system_configurations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('reporting_frequency', sa.String(length=20), nullable=False, server_default='MONTHLY'),
    sa.Column('approval_sla_days', sa.Integer(), nullable=False, server_default='5'),
    sa.Column('auto_lock_days', sa.Integer(), nullable=False, server_default='5'),
    sa.Column('reopen_policy', sa.String(length=50), nullable=False, server_default='DH_AND_PLATFORM_ADMIN'),
    sa.Column('green_threshold_min', sa.Numeric(precision=5, scale=2), nullable=False, server_default='80.00'),
    sa.Column('amber_threshold_min', sa.Numeric(precision=5, scale=2), nullable=False, server_default='50.00'),
    sa.Column('red_threshold_min', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0.00'),
    sa.Column('escalation_rules_enabled', sa.Boolean(), nullable=False, server_default='true'),
    sa.Column('project_red_alerts_enabled', sa.Boolean(), nullable=False, server_default='true'),
    sa.Column('bu_risk_alerts_enabled', sa.Boolean(), nullable=False, server_default='true'),
    sa.Column('approval_reminders_enabled', sa.Boolean(), nullable=False, server_default='true'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('system_configurations')




