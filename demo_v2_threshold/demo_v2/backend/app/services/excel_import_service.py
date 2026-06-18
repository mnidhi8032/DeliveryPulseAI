"""Orchestrate Excel upload, preview, and apply-to-draft workflow."""

import uuid
from decimal import Decimal

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.constants import RoleCode
from app.core.excel_constants import ExcelImportBatchStatus
from app.models.excel_import_row import ExcelImportRow
from app.models.user import User
from app.repositories.excel_import_batch_repository import ExcelImportBatchRepository
from app.repositories.metric_definition_repository import MetricDefinitionRepository
from app.repositories.metric_value_repository import MetricValueRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.excel import ExcelApplyRequest, ExcelImportBatchResponse, ExcelImportRowPreview
from app.services.access_control_service import AccessControlService
from app.services.excel_parser_service import ExcelParseError, ExcelParserService
from app.services.excel_validation_service import ExcelValidationService, ValidatedExcelRow
from app.services.health_service import HealthService
from app.services.metric_validation import MetricValidationError, validate_metric_value


class ExcelImportService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._batches = ExcelImportBatchRepository(session)
        self._submissions = SubmissionRepository(session)
        self._definitions = MetricDefinitionRepository(session)
        self._metric_values = MetricValueRepository(session)
        self._access = AccessControlService(session)
        self._parser = ExcelParserService()
        self._validator = ExcelValidationService(session)
        self._health = HealthService(session)

    def _require_pm(self, user: User) -> None:
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PM role required")

    def _to_batch_response(self, batch) -> ExcelImportBatchResponse:
        return ExcelImportBatchResponse(
            id=batch.id,
            filename=batch.filename,
            status=batch.status,
            submission_id=batch.submission_id,
            uploaded_at=batch.uploaded_at,
            validation_summary=batch.validation_summary,
            rows=[
                ExcelImportRowPreview(
                    id=row.id,
                    metric_code=row.metric_code,
                    raw_value=row.raw_value,
                    parsed_value=row.parsed_value,
                    validation_errors=row.validation_errors or [],
                    row_number=row.row_number,
                )
                for row in sorted(batch.rows, key=lambda r: r.row_number)
            ],
        )

    async def upload(
        self,
        user: User,
        file: UploadFile,
        submission_id: uuid.UUID | None = None,
    ) -> ExcelImportBatchResponse:
        self._require_pm(user)

        if submission_id is not None:
            submission = self._submissions.get_by_id(submission_id)
            if submission is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
            if submission.created_by_user_id != user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot upload for another user's submission")
            self._access.require_can_view_project(user, submission.project)
            if not submission.status.allows_editing:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Excel import only allowed for DRAFT submissions",
                )

        filename = file.filename or "upload.xlsx"
        if not filename.lower().endswith((".xlsx", ".xlsm")):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only .xlsx files are supported")

        content = await file.read()
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

        batch = self._batches.create(
            uploaded_by_user_id=user.id,
            filename=filename,
            status=ExcelImportBatchStatus.UPLOADED,
            submission_id=submission_id,
        )

        try:
            parsed = self._parser.parse(content)
            batch.status = ExcelImportBatchStatus.PARSED
            validated = self._validator.validate_rows(parsed)
            summary = ExcelValidationService.build_summary(validated)

            import_rows = [
                ExcelImportRow(
                    batch_id=batch.id,
                    metric_code=v.metric_code,
                    raw_value=v.raw_value,
                    parsed_value=v.parsed_value,
                    validation_errors=v.validation_errors if v.validation_errors else None,
                    row_number=v.row_number,
                )
                for v in validated
            ]
            self._batches.add_rows(import_rows)
            batch.status = ExcelImportBatchStatus.VALIDATED
            batch.validation_summary = summary
        except ExcelParseError as exc:
            batch.status = ExcelImportBatchStatus.FAILED
            batch.validation_summary = {"error": exc.message}
            self._session.commit()
            batch = self._batches.get_by_id(batch.id)
            assert batch is not None
            return self._to_batch_response(batch)

        self._session.commit()
        batch = self._batches.get_by_id(batch.id)
        assert batch is not None
        return self._to_batch_response(batch)

    def get_batch(self, user: User, batch_id: uuid.UUID) -> ExcelImportBatchResponse:
        self._require_pm(user)
        batch = self._batches.get_by_id(batch_id)
        if batch is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import batch not found")
        if batch.uploaded_by_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view another user's import batch")
        return self._to_batch_response(batch)

    def apply(self, user: User, batch_id: uuid.UUID, body: ExcelApplyRequest) -> ExcelImportBatchResponse:
        self._require_pm(user)
        batch = self._batches.get_by_id(batch_id)
        if batch is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import batch not found")
        if batch.uploaded_by_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot apply another user's import batch")
        if batch.status == ExcelImportBatchStatus.APPLIED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Batch already applied")
        if batch.status == ExcelImportBatchStatus.FAILED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot apply a failed import batch")

        submission = self._submissions.get_by_id(body.submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if submission.created_by_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot apply to another user's submission")
        self._access.require_can_view_project(user, submission.project)
        if not submission.status.allows_editing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apply only allowed for DRAFT submissions",
            )

        row_by_code = {r.metric_code: r for r in batch.rows}
        values_to_apply: dict[str, Decimal] = {}
        apply_errors: list[str] = []

        if body.rows:
            for edit in body.rows:
                definition = self._definitions.get_by_code(edit.metric_code)
                if definition is None:
                    apply_errors.append(f"Unknown metric: {edit.metric_code}")
                    continue
                try:
                    values_to_apply[edit.metric_code] = validate_metric_value(definition, edit.value)
                except MetricValidationError as exc:
                    apply_errors.append(f"{edit.metric_code}: {exc.message}")
        else:
            for code, row in row_by_code.items():
                if row.validation_errors:
                    continue
                if row.parsed_value is not None:
                    values_to_apply[code] = row.parsed_value

        if apply_errors:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"errors": apply_errors})
        if not values_to_apply:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid metric values to apply; fix row errors or provide edited rows",
            )

        for code, value in values_to_apply.items():
            definition = self._definitions.get_by_code(code)
            assert definition is not None
            self._metric_values.upsert(
                submission_id=submission.id,
                metric_definition_id=definition.id,
                value=value,
            )

        self._health.compute_and_persist(submission.id)
        self._batches.update_status(
            batch,
            status=ExcelImportBatchStatus.APPLIED,
            submission_id=submission.id,
        )
        self._session.commit()

        batch = self._batches.get_by_id(batch_id)
        assert batch is not None
        return self._to_batch_response(batch)
