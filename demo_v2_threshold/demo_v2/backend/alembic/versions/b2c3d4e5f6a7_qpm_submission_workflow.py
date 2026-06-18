"""qpm_submission_workflow: add qpm_status, pm_perception_rag to kpi_plans

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("kpi_plans", sa.Column("qpm_status", sa.String(20), nullable=False, server_default="DRAFT"))
    op.add_column("kpi_plans", sa.Column("qpm_submitted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("kpi_plans", sa.Column("qpm_approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("kpi_plans", sa.Column("qpm_reviewed_by_user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("kpi_plans", sa.Column("qpm_review_comments", sa.Text, nullable=True))
    op.add_column("kpi_plans", sa.Column("pm_perception_rag", sa.String(10), nullable=True))
    op.add_column("kpi_plans", sa.Column("pm_rag_comments", sa.Text, nullable=True))


def downgrade():
    op.drop_column("kpi_plans", "pm_rag_comments")
    op.drop_column("kpi_plans", "pm_perception_rag")
    op.drop_column("kpi_plans", "qpm_review_comments")
    op.drop_column("kpi_plans", "qpm_reviewed_by_user_id")
    op.drop_column("kpi_plans", "qpm_approved_at")
    op.drop_column("kpi_plans", "qpm_submitted_at")
    op.drop_column("kpi_plans", "qpm_status")
