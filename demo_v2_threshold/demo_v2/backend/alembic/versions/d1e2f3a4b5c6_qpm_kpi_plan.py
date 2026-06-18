"""qpm_kpi_plan_tables

Revision ID: d1e2f3a4b5c6
Revises: c1d2e3f4a5b6
Create Date: 2026-06-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'd1e2f3a4b5c6'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade():
    # QPM Catalog Metrics (83 metrics from Excel)
    op.create_table(
        "qpm_catalog_metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("objective_type", sa.String(100), nullable=True),
        sa.Column("org_goal", sa.String(300), nullable=True),
        sa.Column("higher_objective", sa.String(300), nullable=True),
        sa.Column("formula", sa.Text(), nullable=True),
        sa.Column("uom", sa.String(100), nullable=True),
        sa.Column("metrics_type", sa.String(30), nullable=True),
        sa.Column("intent", sa.String(50), nullable=True),
        sa.Column("project_type", sa.Text(), nullable=True),
        sa.Column("delivery_model", sa.Text(), nullable=True),
        sa.Column("project_category", sa.Text(), nullable=True),
        sa.Column("frequency", sa.String(100), nullable=True),
        sa.Column("compliance", sa.String(10), nullable=True),
        sa.Column("default_target", sa.Numeric(12, 4), nullable=True),
        sa.Column("default_lsl", sa.Numeric(12, 4), nullable=True),
        sa.Column("default_usl", sa.Numeric(12, 4), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_qpm_catalog_category", "qpm_catalog_metrics", ["category"])

    # KPI Plans (one per project)
    op.create_table(
        "kpi_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("project_type", sa.String(100), nullable=True),
        sa.Column("delivery_process_model", sa.String(100), nullable=True),
        sa.Column("project_category", sa.String(100), nullable=True),
        sa.Column("work_size_unit", sa.String(50), nullable=True),
        sa.Column("is_finalized", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("project_id", name="uq_kpi_plans_project"),
    )
    op.create_index("idx_kpi_plans_project_id", "kpi_plans", ["project_id"])

    # KPI Plan Metrics (selected metrics within a plan)
    op.create_table(
        "kpi_plan_metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("kpi_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("kpi_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("catalog_metric_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("qpm_catalog_metrics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("metric_name", sa.String(300), nullable=False),
        sa.Column("metric_category", sa.String(100), nullable=True),
        sa.Column("formula", sa.Text(), nullable=True),
        sa.Column("uom", sa.String(100), nullable=True),
        sa.Column("intent", sa.String(50), nullable=True),
        sa.Column("frequency", sa.String(100), nullable=True),
        sa.Column("priority", sa.String(20), nullable=True),
        sa.Column("target", sa.Numeric(12, 4), nullable=True),
        sa.Column("lsl", sa.Numeric(12, 4), nullable=True),
        sa.Column("usl", sa.Numeric(12, 4), nullable=True),
        sa.Column("is_custom", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("tailoring_reason", sa.Text(), nullable=True),
        sa.Column("reported_to_customer", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("data_source", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_kpi_plan_metrics_plan_id", "kpi_plan_metrics", ["kpi_plan_id"])

    # KPI Measurements (actual data entry rows)
    op.create_table(
        "kpi_measurements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_metric_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("kpi_plan_metrics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entered_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("frequency", sa.String(50), nullable=True),
        sa.Column("frequency_name", sa.String(100), nullable=True),
        sa.Column("from_date", sa.Date(), nullable=True),
        sa.Column("to_date", sa.Date(), nullable=True),
        sa.Column("actual_value", sa.Numeric(18, 4), nullable=True),
        sa.Column("target", sa.Numeric(12, 4), nullable=True),
        sa.Column("lsl", sa.Numeric(12, 4), nullable=True),
        sa.Column("usl", sa.Numeric(12, 4), nullable=True),
        sa.Column("analysis_comments", sa.Text(), nullable=True),
        sa.Column("action_taken", sa.Text(), nullable=True),
        sa.Column("responsibility", sa.String(200), nullable=True),
        sa.Column("action_status", sa.String(50), nullable=True),
        sa.Column("updated_by", sa.String(200), nullable=True),
        sa.Column("rag_status", sa.String(10), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_kpi_measurements_plan_metric_id", "kpi_measurements", ["plan_metric_id"])


def downgrade():
    op.drop_index("idx_kpi_measurements_plan_metric_id", table_name="kpi_measurements")
    op.drop_table("kpi_measurements")
    op.drop_index("idx_kpi_plan_metrics_plan_id", table_name="kpi_plan_metrics")
    op.drop_table("kpi_plan_metrics")
    op.drop_index("idx_kpi_plans_project_id", table_name="kpi_plans")
    op.drop_table("kpi_plans")
    op.drop_index("idx_qpm_catalog_category", table_name="qpm_catalog_metrics")
    op.drop_table("qpm_catalog_metrics")
