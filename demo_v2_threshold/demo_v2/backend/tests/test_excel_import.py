"""Phase 5 tests: Excel template, upload, preview, apply, health recalc."""

import uuid
from datetime import date, timedelta
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.password import hash_password
from app.core.constants import RoleCode
from app.core.excel_constants import ExcelImportBatchStatus
from app.models.governance_period import GovernancePeriod
from app.models.health_score import HealthScore
from app.models.metric_definition import MetricDefinition
from app.models.role import Role
from app.models.submission_status import SubmissionStatus
from app.repositories.user_repository import UserRepository
from app.services.excel_parser_service import ExcelParserService
from app.services.excel_validation_service import ExcelValidationService

PM_EMAIL = "phase5.pm@deliverypulse.ai"
DH_EMAIL = "phase5.dh@deliverypulse.ai"
CA_EMAIL = "phase5.ca@deliverypulse.ai"
PASSWORD = "Phase5@123"

GOOD_METRICS = {
    "planned_progress_percent": 80,
    "actual_progress_percent": 78,
    "dependency_delay_count": 0,
    "critical_defects": 0,
    "test_pass_rate": 96,
    "prod_incidents": 0,
    "scope_change_requests": 1,
    "requirement_stability_percent": 92,
    "budget_used": 50000,
    "planned_budget": 100000,
    "billing_delay_days": 5,
    "resource_availability": 92,
    "team_attrition": 0,
}


def _login(client: TestClient, email: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _build_xlsx(rows: list[tuple[str, object]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(["metric_code", "metric_name", "value", "dimension", "description"])
    for code, value in rows:
        ws.append([code, code, value, "Schedule", ""])
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _ensure_statuses(db: Session) -> None:
    for sid, code, allows in [(1, "DRAFT", True), (2, "SUBMITTED", False)]:
        if db.get(SubmissionStatus, sid) is None:
            db.add(
                SubmissionStatus(id=sid, code=code, name=code, allows_editing=allows, is_terminal=False)
            )
    db.commit()


def _seed_metrics(db: Session) -> None:
    from scripts.seed_metric_definitions import METRICS

    for spec in METRICS:
        if db.execute(select(MetricDefinition).where(MetricDefinition.code == spec["code"])).scalar_one_or_none():
            continue
        db.add(
            MetricDefinition(
                code=spec["code"],
                name=spec["name"],
                dimension=spec["dimension"],
                data_type=spec["data_type"],
                weight=spec["weight"],
                validation_rules=spec["validation_rules"],
                is_active=True,
            )
        )
    db.commit()


def _ensure_period(db: Session) -> GovernancePeriod:
    today = date.today()
    start = today.replace(day=1)
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    existing = db.execute(
        select(GovernancePeriod).where(GovernancePeriod.period_start == start)
    ).scalar_one_or_none()
    if existing:
        return existing
    period = GovernancePeriod(
        name=f"Monthly {start:%Y-%m}",
        period_type="MONTHLY",
        period_start=start,
        period_end=end,
        is_active=True,
    )
    db.add(period)
    db.commit()
    return period


@pytest.fixture
def phase5_users(db_session: Session) -> dict[str, uuid.UUID]:
    _ensure_statuses(db_session)
    _seed_metrics(db_session)
    role_pm = db_session.execute(select(Role).where(Role.code == RoleCode.PM)).scalar_one()
    role_dh = db_session.execute(select(Role).where(Role.code == RoleCode.DELIVERY_HEAD)).scalar_one()
    role_ca = db_session.execute(select(Role).where(Role.code == RoleCode.CEO)).scalar_one()
    repo = UserRepository(db_session)
    out = {}
    for key, email, role, name in [
        ("pm", PM_EMAIL, role_pm, "P5 PM"),
        ("dh", DH_EMAIL, role_dh, "P5 DH"),
        ("ca", CA_EMAIL, role_ca, "P5 CA"),
    ]:
        u = repo.get_by_email(email)
        if u is None:
            u = repo.create_user(email=email, password_hash=hash_password(PASSWORD), full_name=name, role_id=role.id)
        out[key] = u.id
    db_session.commit()
    return out


@pytest.fixture
def draft_submission(client: TestClient, db_session: Session, phase5_users: dict) -> str:
    period = _ensure_period(db_session)
    ca_token = _login(client, CA_EMAIL)
    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"P5_BU_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU",
            "delivery_head_user_id": str(phase5_users["dh"]),
        },
    ).json()
    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"P5_AC_{uuid.uuid4().hex[:6].upper()}",
            "name": "Acct",
        },
    ).json()
    dh_token = _login(client, DH_EMAIL)
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct["id"],
            "project_code": f"P5_PRJ_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Proj",
            "project_manager_id": str(phase5_users["pm"]),
        },
    ).json()
    pm_token = _login(client, PM_EMAIL)
    draft = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": proj["id"], "governance_period_id": str(period.id)},
    )
    assert draft.status_code == 201, draft.text
    return draft.json()["id"]


def test_template_download(client: TestClient, db_session: Session, phase5_users: dict) -> None:
    _seed_metrics(db_session)
    pm_token = _login(client, PM_EMAIL)
    r = client.get("/api/v1/excel/template", headers=_auth(pm_token))
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers.get("content-type", "")
    assert r.content[:2] == b"PK"


def test_upload_parse_and_row_validation(
    client: TestClient,
    draft_submission: str,
) -> None:
    pm_token = _login(client, PM_EMAIL)
    rows = [(k, v) for k, v in GOOD_METRICS.items() if k != "test_pass_rate"]
    rows.append(("test_pass_rate", 150))
    xlsx = _build_xlsx(rows)
    upload = client.post(
        "/api/v1/excel/upload",
        headers=_auth(pm_token),
        files={"file": ("metrics.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"submission_id": draft_submission},
    )
    assert upload.status_code == 201, upload.text
    body = upload.json()
    assert body["status"] == ExcelImportBatchStatus.VALIDATED
    assert body["validation_summary"]["invalid_rows"] >= 1
    bad = [r for r in body["rows"] if r["metric_code"] == "test_pass_rate"][0]
    assert bad["validation_errors"]


def test_editable_preview_get_batch(
    client: TestClient,
    draft_submission: str,
) -> None:
    pm_token = _login(client, PM_EMAIL)
    xlsx = _build_xlsx(list(GOOD_METRICS.items()))
    upload = client.post(
        "/api/v1/excel/upload",
        headers=_auth(pm_token),
        files={"file": ("metrics.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    batch_id = upload.json()["id"]
    preview = client.get(f"/api/v1/excel/batch/{batch_id}", headers=_auth(pm_token))
    assert preview.status_code == 200
    assert len(preview.json()["rows"]) == len(GOOD_METRICS)


def test_apply_to_draft_and_health_recalculation(
    client: TestClient,
    db_session: Session,
    draft_submission: str,
) -> None:
    pm_token = _login(client, PM_EMAIL)
    xlsx = _build_xlsx(list(GOOD_METRICS.items()))
    upload = client.post(
        "/api/v1/excel/upload",
        headers=_auth(pm_token),
        files={"file": ("metrics.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    batch_id = upload.json()["id"]

    applied = client.post(
        f"/api/v1/excel/batch/{batch_id}/apply",
        headers=_auth(pm_token),
        json={"submission_id": draft_submission},
    )
    assert applied.status_code == 200, applied.text
    assert applied.json()["status"] == ExcelImportBatchStatus.APPLIED

    health = client.get(f"/api/v1/submissions/{draft_submission}/health", headers=_auth(pm_token))
    assert health.status_code == 200
    assert health.json()["overall_score"] is not None

    hs = db_session.execute(
        select(HealthScore).where(HealthScore.submission_id == uuid.UUID(draft_submission))
    ).scalar_one_or_none()
    assert hs is not None


def test_apply_with_pm_edited_values(
    client: TestClient,
    draft_submission: str,
) -> None:
    pm_token = _login(client, PM_EMAIL)
    xlsx = _build_xlsx([("planned_progress_percent", 80), ("test_pass_rate", 150)])
    upload = client.post(
        "/api/v1/excel/upload",
        headers=_auth(pm_token),
        files={"file": ("partial.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    batch_id = upload.json()["id"]
    edited = client.post(
        f"/api/v1/excel/batch/{batch_id}/apply",
        headers=_auth(pm_token),
        json={
            "submission_id": draft_submission,
            "rows": [
                {"metric_code": "planned_progress_percent", "value": 85},
                {"metric_code": "test_pass_rate", "value": 95},
            ],
        },
    )
    assert edited.status_code == 200, edited.text


def test_parser_service_unit() -> None:
    xlsx = _build_xlsx([("planned_progress_percent", 50)])
    rows = ExcelParserService().parse(xlsx)
    assert rows[0].metric_code == "planned_progress_percent"
    assert rows[0].raw_value == "50"


def test_validation_service_row_errors(db_session: Session) -> None:
    _seed_metrics(db_session)
    from app.services.excel_parser_service import ParsedExcelRow

    parsed = [ParsedExcelRow(row_number=2, metric_code="test_pass_rate", raw_value="200")]
    validated = ExcelValidationService(db_session).validate_rows(parsed)
    assert validated[0].validation_errors
    assert validated[0].parsed_value is None
