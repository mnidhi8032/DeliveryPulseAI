"""Add plan_metric_id override column to project_period_measures.

Enables per-metric parameter overrides: a row with plan_metric_id IS NULL
is the shared default used by every metric; a row with a real plan_metric_id
is an override used only by that specific metric.

Revision ID: r1s2t3u4v5w6
Revises: q1r2s3t4u5v6
Create Date: 2026-07-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "r1s2t3u4v5w6"
down_revision = "q1r2s3t4u5v6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add nullable plan_metric_id column
    op.add_column(
        "project_period_measures",
        sa.Column(
            "plan_metric_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("kpi_plan_metrics.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_ppm_plan_metric_id",
        "project_period_measures",
        ["plan_metric_id"],
    )

    # 2. Drop the old 3-column unique constraint
    op.drop_constraint(
        "uq_ppm_project_period_measure",
        "project_period_measures",
        type_="unique",
    )

    # 3. Add the new 4-column unique constraint
    #    (covers rows WHERE plan_metric_id IS NOT NULL)
    op.create_unique_constraint(
        "uq_ppm_project_period_measure_metric",
        "project_period_measures",
        ["project_id", "period_label", "measure_name", "plan_metric_id"],
    )

    # 4. CRITICAL: partial unique index on shared-default rows
    #    (plan_metric_id IS NULL).  Postgres treats NULL as distinct in regular
    #    unique constraints, so without this a second NULL row could be inserted
    #    for the same (project, period, measure) triple.
    op.execute(
        """
        CREATE UNIQUE INDEX uq_ppm_shared_default
        ON project_period_measures (project_id, period_label, measure_name)
        WHERE plan_metric_id IS NULL
        """
    )


def downgrade() -> None:
    # Reverse in reverse order

    # 4. Drop partial unique index
    op.execute("DROP INDEX IF EXISTS uq_ppm_shared_default")

    # 3. Drop 4-column constraint
    op.drop_constraint(
        "uq_ppm_project_period_measure_metric",
        "project_period_measures",
        type_="unique",
    )

    # 2. Restore the original 3-column constraint
    #    (requires no duplicate rows — downgrade will fail if overrides exist)
    op.create_unique_constraint(
        "uq_ppm_project_period_measure",
        "project_period_measures",
        ["project_id", "period_label", "measure_name"],
    )

    # 1. Drop index and column
    op.drop_index("ix_ppm_plan_metric_id", table_name="project_period_measures")
    op.drop_column("project_period_measures", "plan_metric_id")
