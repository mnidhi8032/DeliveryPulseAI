"""Append-only submission lifecycle audit (REOPENED events).

Revision ID: f1a2b3c4d5e6
Revises: ea80e85d7f10
Create Date: 2026-05-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f1a2b3c4d5e6"
down_revision = "ea80e85d7f10"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "submission_lifecycle_audits",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["submissions.id"],
            name="fk_submission_lifecycle_audits_submission",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            name="fk_submission_lifecycle_audits_actor",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_submission_lifecycle_audits"),
    )
    op.create_index(
        "idx_submission_lifecycle_audits_submission_id",
        "submission_lifecycle_audits",
        ["submission_id"],
        unique=False,
    )


def downgrade():
    op.drop_index("idx_submission_lifecycle_audits_submission_id", table_name="submission_lifecycle_audits")
    op.drop_table("submission_lifecycle_audits")
