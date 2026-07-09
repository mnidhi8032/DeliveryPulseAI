"""Add project_period_measures table — shared parameters per project per period.

Instead of storing measure entries per plan_metric_id (which requires re-entry
for shared parameters like "Delivered and Accepted Size" used by 7+ metrics),
this table stores parameters at the project+period level.

When PM saves parameters, the system auto-computes all metrics that have
complete inputs for that period.

Revision ID: o9p0q1r2s3t4
Revises: n8o9p0q1r2s3
Create Date: 2026-07-08
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "o9p0q1r2s3t4"
down_revision = "n8o9p0q1r2s3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_period_measures",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("projects.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("kpi_plan_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("kpi_plans.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("period_label", sa.String(200), nullable=False),
        sa.Column("frequency", sa.String(100), nullable=True),
        sa.Column("from_date", sa.Date, nullable=True),
        sa.Column("to_date", sa.Date, nullable=True),
        sa.Column("measure_name", sa.String(300), nullable=False),
        sa.Column("actual_value", sa.Numeric(18, 4), nullable=True),
        sa.Column("entered_by_user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        # Unique: one value per (project, period, measure)
        sa.UniqueConstraint("project_id", "period_label", "measure_name",
                            name="uq_ppm_project_period_measure"),
    )


def downgrade() -> None:
    op.drop_table("project_period_measures")
