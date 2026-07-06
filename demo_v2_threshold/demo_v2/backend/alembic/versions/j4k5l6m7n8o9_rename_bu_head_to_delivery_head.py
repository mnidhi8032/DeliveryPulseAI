"""Rename BU_HEAD role code to DELIVERY_HEAD and update display name.

The DB column business_units.bu_head_user_id keeps its name (FK constraints
make column renames risky). Only the role code in the roles table is updated.

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-07-01
"""
from alembic import op

revision = 'j4k5l6m7n8o9'
down_revision = 'i3j4k5l6m7n8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename the role code and update display name + description
    op.execute("""
        UPDATE roles
        SET code        = 'DELIVERY_HEAD',
            name        = 'Delivery Head',
            description = 'Responsible for one Business Unit. Reviews submissions, tracks delivery performance, and drives improvements across the BU.'
        WHERE code = 'BU_HEAD'
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE roles
        SET code        = 'BU_HEAD',
            name        = 'BU Head',
            description = 'Read-only view for their assigned Business Unit only.'
        WHERE code = 'DELIVERY_HEAD'
    """)
