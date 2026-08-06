"""add_catalog_metric_metadata

Adds data_elements, data_source, analytic_technique, governance_level,
directive_inputs, size_dependent, computation_type, metrics_adaption_status,
and dashboard columns to qpm_catalog_metrics to align with all fields
defined in the QPM Plan CSV (OM-DEV-TM-71-QPM-Plan MetricsDefinition).

Revision ID: v4w5x6y7z8a9
Revises: u3v4w5x6y7z8
Create Date: 2026-08-05
"""
from alembic import op
import sqlalchemy as sa

revision = 'v4w5x6y7z8a9'
down_revision = 'u3v4w5x6y7z8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("qpm_catalog_metrics",
        sa.Column("data_elements", sa.Text(), nullable=True))
    op.add_column("qpm_catalog_metrics",
        sa.Column("data_source", sa.Text(), nullable=True))
    op.add_column("qpm_catalog_metrics",
        sa.Column("analytic_technique", sa.String(length=100), nullable=True))
    op.add_column("qpm_catalog_metrics",
        sa.Column("governance_level", sa.String(length=50), nullable=True))
    op.add_column("qpm_catalog_metrics",
        sa.Column("directive_inputs", sa.Text(), nullable=True))
    op.add_column("qpm_catalog_metrics",
        sa.Column("size_dependent", sa.String(length=5), nullable=True))
    op.add_column("qpm_catalog_metrics",
        sa.Column("computation_type", sa.String(length=5), nullable=True))
    op.add_column("qpm_catalog_metrics",
        sa.Column("metrics_adaption_status", sa.String(length=50), nullable=True))
    op.add_column("qpm_catalog_metrics",
        sa.Column("dashboard", sa.String(length=10), nullable=True))
    # Widen frequency column from String(100) to String(200) to fit long values
    op.alter_column("qpm_catalog_metrics", "frequency",
        type_=sa.String(length=200), existing_nullable=True)


def downgrade():
    op.drop_column("qpm_catalog_metrics", "dashboard")
    op.drop_column("qpm_catalog_metrics", "metrics_adaption_status")
    op.drop_column("qpm_catalog_metrics", "computation_type")
    op.drop_column("qpm_catalog_metrics", "size_dependent")
    op.drop_column("qpm_catalog_metrics", "directive_inputs")
    op.drop_column("qpm_catalog_metrics", "governance_level")
    op.drop_column("qpm_catalog_metrics", "analytic_technique")
    op.drop_column("qpm_catalog_metrics", "data_source")
    op.drop_column("qpm_catalog_metrics", "data_elements")
    op.alter_column("qpm_catalog_metrics", "frequency",
        type_=sa.String(length=100), existing_nullable=True)
