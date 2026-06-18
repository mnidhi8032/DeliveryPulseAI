"""Excel template download and import API (Phase 5)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import require_roles
from app.core.constants import RoleCode
from app.excel.template_generator import build_template_workbook
from app.models.user import User
from app.schemas.excel import ExcelApplyRequest, ExcelImportBatchResponse
from app.services.excel_import_service import ExcelImportService

router = APIRouter(prefix="/excel", tags=["excel"])


@router.get("/template")
def download_template(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    content = build_template_workbook(db)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="deliverypulse_governance_template.xlsx"'},
    )


@router.post("/upload", response_model=ExcelImportBatchResponse, status_code=201)
async def upload_excel(
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
    submission_id: Annotated[UUID | None, Form()] = None,
) -> ExcelImportBatchResponse:
    return await ExcelImportService(db).upload(current_user, file, submission_id)


@router.get("/batch/{batch_id}", response_model=ExcelImportBatchResponse)
def get_import_batch(
    batch_id: UUID,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> ExcelImportBatchResponse:
    return ExcelImportService(db).get_batch(current_user, batch_id)


@router.post("/batch/{batch_id}/apply", response_model=ExcelImportBatchResponse)
def apply_import_batch(
    batch_id: UUID,
    body: ExcelApplyRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PM))],
    db: Annotated[Session, Depends(get_db)],
) -> ExcelImportBatchResponse:
    return ExcelImportService(db).apply(current_user, batch_id, body)
