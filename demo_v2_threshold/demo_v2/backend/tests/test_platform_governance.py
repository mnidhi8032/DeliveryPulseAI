"""Phase 10 tests: Platform Admin governance aggregations."""

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.password import hash_password
from app.core.constants import RoleCode
from app.core.governance_constants import RagStatus
from app.models.governance_period import GovernancePeriod
from app.models.health_score import HealthScore
from app.models.project import Project
from app.models.role import Role
from app.models.submission import Submission
from app.models.submission_status import SubmissionStatus
from app.repositories.user_repository import UserRepository

ADMIN_EMAIL = "phase10.admin@deliverypulse.ai"
CA_EMAIL = "phase10.ca@deliverypulse.ai"
DH_EMAIL = "phase10.dh@deliverypulse.ai"
PM_EMAIL = "phase10.pm@deliverypulse.ai"
PASSWORD = "Phase10@123"


def _login(client: TestClient, email: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _ensure_statuses(db: Session) -> None:
    for sid, code, allows in [
        (1, "DRAFT", True),
        (2, "SUBMITTED", False),
        (3, "UNDER_REVIEW", False),
        (4, "APPROVED", False),
    ]:
        if db.get(SubmissionStatus, sid) is None:
            db.add(
                SubmissionStatus(
                    id=sid,
                    code=code,
                    name=code,
                    allows_editing=allows,
                    is_terminal=False,
                )
            )
    db.commit()


@pytest.fixture
def seeded_users(db_session: Session) -> dict[str, uuid.UUID]:
    _ensure_statuses(db_session)
    roles = {
        c: db_session.execute(select(Role).where(Role.code == c)).scalar_one()
        for c in [
            RoleCode.PLATFORM_ADMIN,
            RoleCode.CEO,
            RoleCode.BU_HEAD,
            RoleCode.PM,
        ]
    }
    repo = UserRepository(db_session)
    out: dict[str, uuid.UUID] = {}
    for key, email, name, role in [
        ("admin", ADMIN_EMAIL, "Phase10 Admin", roles[RoleCode.PLATFORM_ADMIN]),
        ("ca", CA_EMAIL, "Phase10 CA", roles[RoleCode.CEO]),
        ("dh", DH_EMAIL, "Phase10 DH", roles[RoleCode.BU_HEAD]),
        ("pm", PM_EMAIL, "Phase10 PM", roles[RoleCode.PM]),
    ]:
        u = repo.get_by_email(email)
        if u is None:
            u = repo.create_user(
                email=email,
                password_hash=hash_password(PASSWORD),
                full_name=name,
                role_id=role.id,
            )
        out[key] = u.id
    db_session.commit()
    return out


@pytest.fixture
def risk_bu_setup(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> dict[str, str]:
    """BU with 5 projects: 2 RED health (40%) -> HIGH RISK."""
    today = date.today()
    start = today.replace(day=1)
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    period = db_session.execute(
        select(GovernancePeriod).where(GovernancePeriod.period_start == start)
    ).scalar_one_or_none()
    if period is None:
        period = GovernancePeriod(
            name=f"M {start:%Y-%m}",
            period_type="MONTHLY",
            period_start=start,
            period_end=end,
            is_active=True,
        )
        db_session.add(period)
        db_session.commit()

    ca_token = _login(client, CA_EMAIL)
    suffix = uuid.uuid4().hex[:6].upper()
    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"P10_BU_{suffix}",
            "name": "Phase10 Risk BU",
            "delivery_head_user_id": str(seeded_users["dh"]),
        },
    ).json()
    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"P10_AC_{suffix}",
            "name": "Phase10 Account",
        },
    ).json()
    dh_token = _login(client, DH_EMAIL)
    pm_token = _login(client, PM_EMAIL)
    project_ids: list[str] = []
    for i in range(5):
        proj = client.post(
            "/api/v1/projects",
            headers=_auth(dh_token),
            json={
                "account_id": acct["id"],
                "project_code": f"P10_P{i}_{suffix}",
                "project_name": f"Project {i}",
                "project_manager_id": str(seeded_users["pm"]),
            },
        ).json()
        project_ids.append(proj["id"])

    status_draft = db_session.get(SubmissionStatus, 1)
    for idx, project_id in enumerate(project_ids):
        sub = Submission(
            project_id=uuid.UUID(project_id),
            governance_period_id=period.id,
            status_id=status_draft.id,
            created_by_user_id=seeded_users["pm"],
            submission_date=datetime.now(timezone.utc) - timedelta(days=5),
            approval_date=datetime.now(timezone.utc) - timedelta(days=2),
        )
        db_session.add(sub)
        db_session.flush()
        rag = RagStatus.RED if idx < 2 else RagStatus.GREEN
        db_session.add(
            HealthScore(
                submission_id=sub.id,
                overall_score=Decimal("40.00") if rag == RagStatus.RED else Decimal("90.00"),
                rag_status=rag,
                explanation=None,
                created_at=datetime.now(timezone.utc),
            )
        )
    db_session.commit()
    return {"bu_id": bu["id"], "bu_name": bu["name"]}


def test_platform_admin_sees_overview(
    client: TestClient,
    seeded_users: dict[str, uuid.UUID],
    risk_bu_setup: dict[str, str],
) -> None:
    token = _login(client, ADMIN_EMAIL)
    r = client.get("/api/v1/platform/overview", headers=_auth(token))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_business_units"] >= 1
    assert "green_percent" in data


def test_risk_calculation_high_risk_flag(
    client: TestClient,
    risk_bu_setup: dict[str, str],
) -> None:
    token = _login(client, ADMIN_EMAIL)
    rows = client.get("/api/v1/platform/risk-summary", headers=_auth(token)).json()
    row = next(r for r in rows if r["business_unit_id"] == risk_bu_setup["bu_id"])
    assert row["project_count"] == 5
    assert row["red_projects"] == 2
    assert row["red_percent"] == 40.0
    assert row["escalation_flag"] is True


def test_customer_admin_blocked_from_platform(
    client: TestClient,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    token = _login(client, CA_EMAIL)
    for path in (
        "/api/v1/platform/overview",
        "/api/v1/platform/risk-summary",
        "/api/v1/platform/approval-latency",
        "/api/v1/platform/template-adoption",
    ):
        assert client.get(path, headers=_auth(token)).status_code == 403


def test_pm_and_dh_blocked_from_platform(
    client: TestClient,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    for email in (PM_EMAIL, DH_EMAIL):
        token = _login(client, email)
        assert client.get("/api/v1/platform/overview", headers=_auth(token)).status_code == 403
