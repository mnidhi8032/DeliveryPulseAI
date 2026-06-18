"""Phase 5: Excel import batches and rows.

Revision ID: b7c8d9e0f1a2
Revises: a6b7c8d9e0f1
Create Date: 2026-05-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b7c8d9e0f1a2"
down_revision = "a6b7c8d9e0f1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "excel_import_batches",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("uploaded_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("validation_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["uploaded_by_user_id"],
            ["users.id"],
            name="fk_excel_import_batches_uploaded_by",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["submissions.id"],
            name="fk_excel_import_batches_submission",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_excel_import_batches"),
    )
    op.create_index("idx_excel_import_batches_status", "excel_import_batches", ["status"], unique=False)
    op.create_index("idx_excel_import_batches_submission_id", "excel_import_batches", ["submission_id"], unique=False)

    op.create_table(
        "excel_import_rows",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("metric_code", sa.String(length=80), nullable=False),
        sa.Column("raw_value", sa.Text(), nullable=True),
        sa.Column("parsed_value", sa.Numeric(18, 4), nullable=True),
        sa.Column("validation_errors", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["batch_id"],
            ["excel_import_batches.id"],
            name="fk_excel_import_rows_batch",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_excel_import_rows"),
    )
    op.create_index("idx_excel_import_rows_batch_id", "excel_import_rows", ["batch_id"], unique=False)


def downgrade():
    op.drop_index("idx_excel_import_rows_batch_id", table_name="excel_import_rows")
    op.drop_table("excel_import_rows")
    op.drop_index("idx_excel_import_batches_submission_id", table_name="excel_import_batches")
    op.drop_index("idx_excel_import_batches_status", table_name="excel_import_batches")
    op.drop_table("excel_import_batches")
