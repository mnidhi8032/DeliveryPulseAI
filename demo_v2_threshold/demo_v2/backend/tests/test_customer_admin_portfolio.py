"""Phase 9 tests: Customer Admin portfolio aggregations."""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.password import hash_password
from app.core.constants import RoleCode
from app.core.governance_constants import DimensionName, RagStatus
from app.models.dimension_score import DimensionScore
from app.models.governance_period import GovernancePeriod
from app.models.health_score import HealthScore
from app.models.role import Role
from app.models.submission_status import SubmissionStatus
from app.repositories.user_repository import UserRepository

CA_EMAIL = "phase9.ca@deliverypulse.ai"
DH_EMAIL = "phase9.dh@deliverypulse.ai"
PM_EMAIL = "phase9.pm@deliverypulse.ai"
PASSWORD = "Phase9@123"


def _login(client: TestClient, email: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _ensure_statuses(db: Session) -> None:
    for sid, code in [(1, "DRAFT"), (2, "SUBMITTED"), (3, "UNDER_REVIEW")]:
        if db.get(SubmissionStatus, sid) is None:
            db.add(
                SubmissionStatus(
                    id=sid,
                    code=code,
                    name=code,
                    allows_editing=(code == "DRAFT"),
                    is_terminal=False,
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
def seeded_users(db_session: Session) -> dict[str, uuid.UUID]:
    _ensure_statuses(db_session)
    roles = {
        RoleCode.CEO: db_session.execute(
            select(Role).where(Role.code == RoleCode.CEO)
        ).scalar_one(),
        RoleCode.BU_HEAD: db_session.execute(
            select(Role).where(Role.code == RoleCode.BU_HEAD)
        ).scalar_one(),
        RoleCode.PM: db_session.execute(select(Role).where(Role.code == RoleCode.PM)).scalar_one(),
    }
    repo = UserRepository(db_session)
    out: dict[str, uuid.UUID] = {}
    for key, email, name, role in [
        ("ca", CA_EMAIL, "Phase9 CA", roles[RoleCode.CEO]),
        ("dh", DH_EMAIL, "Phase9 DH", roles[RoleCode.BU_HEAD]),
        ("pm", PM_EMAIL, "Phase9 PM", roles[RoleCode.PM]),
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
def portfolio_hierarchy(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> dict[str, str]:
    """One BU, one project, one submission with GREEN health and rag_start_date."""
    period = _ensure_period(db_session)
    ca_token = _login(client, CA_EMAIL)
    suffix = uuid.uuid4().hex[:6].upper()

    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"P9_BU_{suffix}",
            "name": "Phase9 BU",
            "delivery_head_user_id": str(seeded_users["dh"]),
        },
    )
    assert bu.status_code == 201, bu.text
    bu_id = bu.json()["id"]

    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu_id,
            "code": f"P9_AC_{suffix}",
            "name": "Phase9 Account",
        },
    )
    assert acct.status_code == 201, acct.text

    dh_token = _login(client, DH_EMAIL)
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct.json()["id"],
            "project_code": f"P9_PRJ_{suffix}",
            "project_name": "Phase9 Project",
            "project_manager_id": str(seeded_users["pm"]),
        },
    )
    assert proj.status_code == 201, proj.text
    project_id = proj.json()["id"]

    pm_token = _login(client, PM_EMAIL)
    draft = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": project_id, "governance_period_id": str(period.id)},
    )
    assert draft.status_code == 201, draft.text
    submission_id = draft.json()["id"]

    db_session.add(
        HealthScore(
            submission_id=uuid.UUID(submission_id),
            overall_score=Decimal("85.00"),
            rag_status=RagStatus.GREEN,
            explanation=None,
            created_at=period.period_start,
        )
    )
    db_session.add(
        DimensionScore(
            submission_id=uuid.UUID(submission_id),
            dimension_name=DimensionName.SCHEDULE,
            score=Decimal("90"),
            weight=Decimal("25"),
            rag_status=RagStatus.GREEN,
        )
    )
    from app.models.submission import Submission

    sub = db_session.get(Submission, uuid.UUID(submission_id))
    assert sub is not None
    sub.rag_start_date = date.today() - timedelta(days=7)
    db_session.commit()

    return {
        "bu_id": bu_id,
        "project_id": project_id,
        "submission_id": submission_id,
        "bu_code": f"P9_BU_{suffix}",
    }


def test_customer_admin_sees_all_business_units(
    client: TestClient,
    portfolio_hierarchy: dict[str, str],
) -> None:
    ca_token = _login(client, CA_EMAIL)
    rows = client.get("/api/v1/customer-admin/business-unit-health", headers=_auth(ca_token))
    assert rows.status_code == 200, rows.text
    bu_ids = {r["business_unit_id"] for r in rows.json()}
    assert portfolio_hierarchy["bu_id"] in bu_ids


def test_portfolio_summary_aggregation_counts(
    client: TestClient,
    portfolio_hierarchy: dict[str, str],
) -> None:
    ca_token = _login(client, CA_EMAIL)
    summary = client.get("/api/v1/customer-admin/portfolio-summary", headers=_auth(ca_token))
    assert summary.status_code == 200, summary.text
    data = summary.json()
    assert data["total_business_units"] >= 1
    assert data["total_projects"] >= 1
    assert data["total_submissions"] >= 1
    assert data["green_count"] >= 1

    aging = client.get("/api/v1/customer-admin/aging", headers=_auth(ca_token))
    assert aging.status_code == 200
    assert aging.json()["weeks_0_2"] >= 1

    bu_row = next(
        r
        for r in client.get(
            "/api/v1/customer-admin/business-unit-health", headers=_auth(ca_token)
        ).json()
        if r["business_unit_id"] == portfolio_hierarchy["bu_id"]
    )
    assert bu_row["project_count"] == 1
    assert bu_row["submission_count"] == 1
    assert bu_row["green_count"] == 1
    assert bu_row["health_percent"] == 85.0


def test_dh_cannot_access_customer_admin_routes(
    client: TestClient,
    portfolio_hierarchy: dict[str, str],
) -> None:
    dh_token = _login(client, DH_EMAIL)
    for path in (
        "/api/v1/customer-admin/portfolio-summary",
        "/api/v1/customer-admin/business-unit-health",
        "/api/v1/customer-admin/aging",
        "/api/v1/customer-admin/impact-matrix",
    ):
        r = client.get(path, headers=_auth(dh_token))
        assert r.status_code == 403, path


def test_pm_blocked_from_customer_admin_routes(
    client: TestClient,
    portfolio_hierarchy: dict[str, str],
) -> None:
    pm_token = _login(client, PM_EMAIL)
    r = client.get("/api/v1/customer-admin/portfolio-summary", headers=_auth(pm_token))
    assert r.status_code == 403
