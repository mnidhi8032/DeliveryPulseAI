"""qpm_measures_docinfo

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-06-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'e2f3a4b5c6d7'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


def upgrade():
    # Raw component measure entries (Sheet 2 data entry)
    op.create_table(
        "kpi_measure_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_metric_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("kpi_plan_metrics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entered_by_user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("measure_name", sa.String(300), nullable=False),
        sa.Column("actual_value", sa.Numeric(18, 4), nullable=True),
        sa.Column("uom", sa.String(100), nullable=True),
        sa.Column("frequency", sa.String(50), nullable=True),
        sa.Column("frequency_name", sa.String(100), nullable=True),
        sa.Column("from_date", sa.Date(), nullable=True),
        sa.Column("to_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_kpi_measure_entries_plan_metric_id", "kpi_measure_entries", ["plan_metric_id"])

    # Add Sheet 3 tracker columns to kpi_measurements
    op.add_column("kpi_measurements", sa.Column("submitted_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("kpi_measurements", sa.Column("submitted_by", sa.String(200), nullable=True))
    op.add_column("kpi_measurements", sa.Column("target_operator", sa.String(10), nullable=True))
    op.add_column("kpi_measurements", sa.Column("measure1_name", sa.String(200), nullable=True))
    op.add_column("kpi_measurements", sa.Column("measure1_value", sa.Numeric(18, 4), nullable=True))
    op.add_column("kpi_measurements", sa.Column("measure2_name", sa.String(200), nullable=True))
    op.add_column("kpi_measurements", sa.Column("measure2_value", sa.Numeric(18, 4), nullable=True))
    op.add_column("kpi_measurements", sa.Column("measure3_name", sa.String(200), nullable=True))
    op.add_column("kpi_measurements", sa.Column("measure3_value", sa.Numeric(18, 4), nullable=True))
    op.add_column("kpi_measurements", sa.Column("measure4_name", sa.String(200), nullable=True))
    op.add_column("kpi_measurements", sa.Column("measure4_value", sa.Numeric(18, 4), nullable=True))

    # Doc Info (Sheet 5)
    op.create_table(
        "kpi_doc_info",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("projects.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("project_name", sa.String(300), nullable=True),
        sa.Column("project_id_code", sa.String(100), nullable=True),
        sa.Column("customer_name", sa.String(300), nullable=True),
        sa.Column("document_title", sa.String(300), nullable=True),
        sa.Column("issue_no", sa.String(50), nullable=True),
        sa.Column("pm_name", sa.String(200), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("prepared_by", sa.String(200), nullable=True),
        sa.Column("preparation_date", sa.Date(), nullable=True),
        sa.Column("reviewed_by", sa.String(200), nullable=True),
        sa.Column("review_date", sa.Date(), nullable=True),
        sa.Column("template_version", sa.String(20), nullable=True, server_default="3.1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("project_id", name="uq_kpi_doc_info_project"),
    )

    # Version History
    op.create_table(
        "kpi_doc_version_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("doc_info_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("kpi_doc_info.id", ondelete="CASCADE"), nullable=False),
        sa.Column("issue_id", sa.String(50), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("prepared_by", sa.String(200), nullable=True),
        sa.Column("reviewed_by", sa.String(200), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_kpi_doc_version_history_doc_info_id", "kpi_doc_version_history", ["doc_info_id"])


def downgrade():
    op.drop_index("idx_kpi_doc_version_history_doc_info_id", table_name="kpi_doc_version_history")
    op.drop_table("kpi_doc_version_history")
    op.drop_table("kpi_doc_info")
    for col in ["measure4_value","measure4_name","measure3_value","measure3_name","measure2_value","measure2_name","measure1_value","measure1_name","target_operator","submitted_by","submitted_date"]:
        op.drop_column("kpi_measurements", col)
    op.drop_index("idx_kpi_measure_entries_plan_metric_id", table_name="kpi_measure_entries")
    op.drop_table("kpi_measure_entries")
