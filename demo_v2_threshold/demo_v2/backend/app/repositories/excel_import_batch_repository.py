"""Excel import batch data access."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.excel_import_batch import ExcelImportBatch
from app.models.excel_import_row import ExcelImportRow


class ExcelImportBatchRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(
        self,
        *,
        uploaded_by_user_id: uuid.UUID,
        filename: str,
        status: str,
        submission_id: uuid.UUID | None = None,
    ) -> ExcelImportBatch:
        batch = ExcelImportBatch(
            uploaded_by_user_id=uploaded_by_user_id,
            submission_id=submission_id,
            filename=filename,
            status=status,
            uploaded_at=datetime.now(timezone.utc),
        )
        self._session.add(batch)
        self._session.flush()
        return batch

    def get_by_id(self, batch_id: uuid.UUID) -> ExcelImportBatch | None:
        stmt = (
            select(ExcelImportBatch)
            .options(joinedload(ExcelImportBatch.rows))
            .where(ExcelImportBatch.id == batch_id)
        )
        return self._session.execute(stmt).unique().scalar_one_or_none()

    def update_status(
        self,
        batch: ExcelImportBatch,
        *,
        status: str,
        validation_summary: dict | None = None,
        submission_id: uuid.UUID | None = None,
    ) -> ExcelImportBatch:
        batch.status = status
        if validation_summary is not None:
            batch.validation_summary = validation_summary
        if submission_id is not None:
            batch.submission_id = submission_id
        self._session.flush()
        return batch

    def add_rows(self, rows: list[ExcelImportRow]) -> None:
        self._session.add_all(rows)
        self._session.flush()
