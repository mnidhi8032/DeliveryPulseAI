"""Phase 4: metric definitions, values, dimension and health scores.

Revision ID: a6b7c8d9e0f1
Revises: f1a2b3c4d5e6
Create Date: 2026-05-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a6b7c8d9e0f1"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "metric_definitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("dimension", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("data_type", sa.String(length=30), nullable=False),
        sa.Column("weight", sa.Numeric(5, 2), nullable=False, server_default=sa.text("1.00")),
        sa.Column("validation_rules", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_metric_definitions"),
        sa.UniqueConstraint("code", name="uq_metric_definitions_code"),
    )
    op.create_index("idx_metric_definitions_dimension", "metric_definitions", ["dimension"], unique=False)

    op.create_table(
        "metric_values",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("metric_definition_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("value", sa.Numeric(18, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["submissions.id"],
            name="fk_metric_values_submission_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["metric_definition_id"],
            ["metric_definitions.id"],
            name="fk_metric_values_metric_definition_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_metric_values"),
        sa.UniqueConstraint(
            "submission_id",
            "metric_definition_id",
            name="uq_metric_values_submission_metric",
        ),
    )
    op.create_index("idx_metric_values_submission_id", "metric_values", ["submission_id"], unique=False)

    op.create_table(
        "dimension_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dimension_name", sa.String(length=50), nullable=False),
        sa.Column("score", sa.Numeric(5, 2), nullable=False),
        sa.Column("weight", sa.Numeric(5, 2), nullable=False),
        sa.Column("rag_status", sa.String(length=10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["submissions.id"],
            name="fk_dimension_scores_submission_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_dimension_scores"),
        sa.UniqueConstraint(
            "submission_id",
            "dimension_name",
            name="uq_dimension_scores_submission_dimension",
        ),
    )
    op.create_index("idx_dimension_scores_submission_id", "dimension_scores", ["submission_id"], unique=False)

    op.create_table(
        "health_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("overall_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("rag_status", sa.String(length=10), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["submissions.id"],
            name="fk_health_scores_submission_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_health_scores"),
        sa.UniqueConstraint("submission_id", name="uq_health_scores_submission"),
    )
    op.create_index("idx_health_scores_submission_id", "health_scores", ["submission_id"], unique=False)


def downgrade():
    op.drop_index("idx_health_scores_submission_id", table_name="health_scores")
    op.drop_table("health_scores")
    op.drop_index("idx_dimension_scores_submission_id", table_name="dimension_scores")
    op.drop_table("dimension_scores")
    op.drop_index("idx_metric_values_submission_id", table_name="metric_values")
    op.drop_table("metric_values")
    op.drop_index("idx_metric_definitions_dimension", table_name="metric_definitions")
    op.drop_table("metric_definitions")
