"""New role model: CEO, BU_HEAD replace DELIVERY_HEAD/CUSTOMER_ADMIN.
Add bu_head_user_id to business_units.

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-06-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'h2i3j4k5l6m7'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add bu_head_user_id column to business_units
    op.add_column(
        'business_units',
        sa.Column('bu_head_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=True)
    )

    # Insert new roles if they don't exist
    op.execute("""
        INSERT INTO roles (id, code, name, description, is_system, created_at, updated_at)
        SELECT gen_random_uuid(), 'CEO', 'CEO', 'Read-only view across all Business Units and projects.', true, now(), now()
        WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'CEO')
    """)
    op.execute("""
        INSERT INTO roles (id, code, name, description, is_system, created_at, updated_at)
        SELECT gen_random_uuid(), 'BU_HEAD', 'BU Head', 'Read-only view for their assigned Business Unit only.', true, now(), now()
        WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'BU_HEAD')
    """)


def downgrade() -> None:
    op.drop_column('business_units', 'bu_head_user_id')
    op.execute("DELETE FROM roles WHERE code IN ('CEO', 'BU_HEAD')")
