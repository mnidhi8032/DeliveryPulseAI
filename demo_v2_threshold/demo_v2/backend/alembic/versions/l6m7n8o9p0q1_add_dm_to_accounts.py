"""Add delivery_manager_user_id to accounts table.

Each Account is managed by one Delivery Manager.
DM can manage multiple accounts (across BUs if needed).

Revision ID: l6m7n8o9p0q1
Revises: k5l6m7n8o9p0
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'l6m7n8o9p0q1'
down_revision = 'k5l6m7n8o9p0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'accounts',
        sa.Column(
            'delivery_manager_user_id',
            UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
        )
    )
    op.create_index(
        'ix_accounts_delivery_manager_user_id',
        'accounts',
        ['delivery_manager_user_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_accounts_delivery_manager_user_id', table_name='accounts')
    op.drop_column('accounts', 'delivery_manager_user_id')
