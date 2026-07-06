"""Add DELIVERY_MANAGER role.

Delivery Manager/Director — reviews PM submissions, adds commentary and
action items. Single role covers both titles.

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2026-07-01
"""
from alembic import op

revision = 'k5l6m7n8o9p0'
down_revision = 'j4k5l6m7n8o9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO roles (id, code, name, description, is_system, created_at, updated_at)
        SELECT gen_random_uuid(), 'DELIVERY_MANAGER', 'Delivery Manager',
               'Reviews PM submissions for assigned accounts. Adds commentary and creates action items. Does not approve or reject.',
               true, now(), now()
        WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'DELIVERY_MANAGER')
    """)


def downgrade() -> None:
    op.execute("DELETE FROM roles WHERE code = 'DELIVERY_MANAGER'")
