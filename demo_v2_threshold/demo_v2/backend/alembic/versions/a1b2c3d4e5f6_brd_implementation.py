"""brd_implementation: project_phases, action_items, governance_reviews, multi-tier review fields

Revision ID: a1b2c3d4e5f6
Revises: f3a4b5c6d7e8
Create Date: 2026-06-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'a1b2c3d4e5f6'
down_revision = 'f3a4b5c6d7e8'
branch_labels = None
depends_on = None


def upgrade():
    # ── project_phases ────────────────────────────────────────────────────────
    op.create_table(
        "project_phases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("phase_type", sa.String(50), nullable=False, server_default="SPRINT"),
        sa.Column("phase_name", sa.String(200), nullable=False),
        sa.Column("planned_start_date", sa.Date, nullable=True),
        sa.Column("planned_end_date", sa.Date, nullable=True),
        sa.Column("actual_start_date", sa.Date, nullable=True),
        sa.Column("actual_end_date", sa.Date, nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="PLANNED"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_phases_project_id", "project_phases", ["project_id"])

    # ── action_items ──────────────────────────────────────────────────────────
    op.create_table(
        "action_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("submission_id", UUID(as_uuid=True), sa.ForeignKey("submissions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("metric_name", sa.String(200), nullable=True),
        sa.Column("rag_status_at_creation", sa.String(10), nullable=True),
        sa.Column("root_cause", sa.Text, nullable=False),
        sa.Column("corrective_action", sa.Text, nullable=False),
        sa.Column("owner_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("owner_name", sa.String(200), nullable=True),
        sa.Column("target_closure_date", sa.Date, nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("action_status", sa.String(20), nullable=False, server_default="OPEN"),
        sa.Column("created_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_action_items_project_id", "action_items", ["project_id"])
    op.create_index("ix_action_items_submission_id", "action_items", ["submission_id"])

    # ── governance_reviews ────────────────────────────────────────────────────
    op.create_table(
        "governance_reviews",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("review_level", sa.String(20), nullable=False),
        sa.Column("business_unit_id", UUID(as_uuid=True), sa.ForeignKey("business_units.id", ondelete="SET NULL"), nullable=True),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("review_date", sa.Date, nullable=False),
        sa.Column("review_title", sa.String(300), nullable=False),
        sa.Column("outcome_comments", sa.Text, nullable=True),
        sa.Column("conducted_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="SCHEDULED"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_governance_reviews_project_id", "governance_reviews", ["project_id"])

    # ── projects: add BRD fields ───────────────────────────────────────────────
    op.add_column("projects", sa.Column("project_type", sa.String(50), nullable=True))
    op.add_column("projects", sa.Column("delivery_model", sa.String(50), nullable=True))
    op.add_column("projects", sa.Column("engagement_model", sa.String(50), nullable=True))
    op.add_column("projects", sa.Column("work_size_unit", sa.String(50), nullable=True))
    op.add_column("projects", sa.Column("pm_perception_rag", sa.String(10), nullable=True))
    op.add_column("projects", sa.Column("pm_rag_comments", sa.Text, nullable=True))

    # ── submissions: multi-tier review + PM perception RAG ────────────────────
    op.add_column("submissions", sa.Column("pm_perception_rag", sa.Text, nullable=True))
    op.add_column("submissions", sa.Column("pm_rag_comments", sa.Text, nullable=True))
    op.add_column("submissions", sa.Column("dm_comments", sa.Text, nullable=True))
    op.add_column("submissions", sa.Column("dm_review_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("submissions", sa.Column("dm_review_status", sa.Text, nullable=True))
    op.add_column("submissions", sa.Column("dd_comments", sa.Text, nullable=True))
    op.add_column("submissions", sa.Column("dd_review_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("submissions", sa.Column("dd_review_status", sa.Text, nullable=True))


def downgrade():
    # submissions
    op.drop_column("submissions", "dd_review_status")
    op.drop_column("submissions", "dd_review_date")
    op.drop_column("submissions", "dd_comments")
    op.drop_column("submissions", "dm_review_status")
    op.drop_column("submissions", "dm_review_date")
    op.drop_column("submissions", "dm_comments")
    op.drop_column("submissions", "pm_rag_comments")
    op.drop_column("submissions", "pm_perception_rag")
    # projects
    op.drop_column("projects", "pm_rag_comments")
    op.drop_column("projects", "pm_perception_rag")
    op.drop_column("projects", "work_size_unit")
    op.drop_column("projects", "engagement_model")
    op.drop_column("projects", "delivery_model")
    op.drop_column("projects", "project_type")
    # tables
    op.drop_index("ix_governance_reviews_project_id", "governance_reviews")
    op.drop_table("governance_reviews")
    op.drop_index("ix_action_items_submission_id", "action_items")
    op.drop_index("ix_action_items_project_id", "action_items")
    op.drop_table("action_items")
    op.drop_index("ix_project_phases_project_id", "project_phases")
    op.drop_table("project_phases")
