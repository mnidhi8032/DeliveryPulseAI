"""Phase 3: governance periods + submission lifecycle tables.

Revision ID: ea80e85d7f10
Revises: 003_org_structure
Create Date: 2026-05-20

IMPORTANT:
- This migration must only add Phase 3 tables.
- It must not modify existing org/auth tables or their indexes.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "ea80e85d7f10"
down_revision = "003_org_structure"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "governance_periods",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("period_type", sa.String(length=20), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_governance_periods"),
    )
    op.create_index("idx_governance_periods_deleted_at", "governance_periods", ["deleted_at"], unique=False)
    op.create_index("idx_governance_periods_period_type", "governance_periods", ["period_type"], unique=False)
    op.create_index("idx_governance_periods_dates", "governance_periods", ["period_start", "period_end"], unique=False)

    op.create_table(
        "submission_statuses",
        sa.Column("id", sa.SmallInteger(), nullable=False),
        sa.Column("code", sa.String(length=30), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("allows_editing", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_terminal", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_submission_statuses"),
        sa.UniqueConstraint("code", name="uq_submission_statuses_code"),
    )

    op.create_table(
        "submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("governance_period_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status_id", sa.SmallInteger(), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewed_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("submission_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approval_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rag_start_date", sa.Date(), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_comments", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name="fk_submissions_project_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["governance_period_id"], ["governance_periods.id"], name="fk_submissions_governance_period_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["status_id"], ["submission_statuses.id"], name="fk_submissions_status_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], name="fk_submissions_created_by_user_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], name="fk_submissions_reviewed_by_user_id", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_submissions"),
    )
    op.create_index("idx_submissions_deleted_at", "submissions", ["deleted_at"], unique=False)
    op.create_index("idx_submissions_project_id", "submissions", ["project_id"], unique=False)
    op.create_index("idx_submissions_governance_period_id", "submissions", ["governance_period_id"], unique=False)
    op.create_index("idx_submissions_status_id", "submissions", ["status_id"], unique=False)
    op.create_index("idx_submissions_created_by_user_id", "submissions", ["created_by_user_id"], unique=False)


def downgrade():
    op.drop_index("idx_submissions_created_by_user_id", table_name="submissions")
    op.drop_index("idx_submissions_status_id", table_name="submissions")
    op.drop_index("idx_submissions_governance_period_id", table_name="submissions")
    op.drop_index("idx_submissions_project_id", table_name="submissions")
    op.drop_index("idx_submissions_deleted_at", table_name="submissions")
    op.drop_table("submissions")

    op.drop_table("submission_statuses")

    op.drop_index("idx_governance_periods_dates", table_name="governance_periods")
    op.drop_index("idx_governance_periods_period_type", table_name="governance_periods")
    op.drop_index("idx_governance_periods_deleted_at", table_name="governance_periods")
    op.drop_table("governance_periods")
