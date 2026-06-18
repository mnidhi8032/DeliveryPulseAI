"""Phase 4 API tests: metrics POST/GET and submission health."""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.password import hash_password
from app.core.constants import RoleCode
from app.models.governance_period import GovernancePeriod
from app.models.metric_definition import MetricDefinition
from app.models.role import Role
from app.models.submission_status import SubmissionStatus
from app.repositories.user_repository import UserRepository

PM_EMAIL = "phase4.pm@deliverypulse.ai"
DH_EMAIL = "phase4.dh@deliverypulse.ai"
CA_EMAIL = "phase4.ca@deliverypulse.ai"
PASSWORD = "Phase4@123"

ALL_METRICS = {
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


def _ensure_statuses(db: Session) -> None:
    for sid, code, allows in [(1, "DRAFT", True), (2, "SUBMITTED", False), (3, "UNDER_REVIEW", False)]:
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


def _ensure_period(db: Session) -> GovernancePeriod:
    today = date.today()
    start = today.replace(day=1)
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    existing = db.execute(
        select(GovernancePeriod)
        .where(GovernancePeriod.period_type == "MONTHLY")
        .where(GovernancePeriod.period_start == start)
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


def _seed_metric_definitions(db: Session) -> None:
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


@pytest.fixture
def phase4_users(db_session: Session) -> dict[str, uuid.UUID]:
    _ensure_statuses(db_session)
    _seed_metric_definitions(db_session)
    role_pm = db_session.execute(select(Role).where(Role.code == RoleCode.PM)).scalar_one()
    role_dh = db_session.execute(select(Role).where(Role.code == RoleCode.BU_HEAD)).scalar_one()
    role_ca = db_session.execute(select(Role).where(Role.code == RoleCode.CEO)).scalar_one()
    repo = UserRepository(db_session)
    users = {}
    for email, role, name in [
        (PM_EMAIL, role_pm, "P4 PM"),
        (DH_EMAIL, role_dh, "P4 DH"),
        (CA_EMAIL, role_ca, "P4 CA"),
    ]:
        u = repo.get_by_email(email)
        if u is None:
            u = repo.create_user(email=email, password_hash=hash_password(PASSWORD), full_name=name, role_id=role.id)
        users[email] = u.id
    db_session.commit()
    return {"pm": users[PM_EMAIL], "dh": users[DH_EMAIL], "ca": users[CA_EMAIL]}


@pytest.fixture
def draft_submission(client: TestClient, db_session: Session, phase4_users: dict) -> str:
    period = _ensure_period(db_session)
    ca_token = _login(client, CA_EMAIL)
    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"P4_BU_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU",
            "delivery_head_user_id": str(phase4_users["dh"]),
        },
    ).json()
    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"P4_AC_{uuid.uuid4().hex[:6].upper()}",
            "name": "Acct",
        },
    ).json()
    dh_token = _login(client, DH_EMAIL)
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct["id"],
            "project_code": f"P4_PRJ_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Proj",
            "project_manager_id": str(phase4_users["pm"]),
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


def test_metrics_post_get_and_health(
    client: TestClient,
    draft_submission: str,
) -> None:
    pm_token = _login(client, PM_EMAIL)
    payload = {
        "submission_id": draft_submission,
        "metrics": [{"metric_code": k, "value": v} for k, v in ALL_METRICS.items()],
    }
    saved = client.post("/api/v1/metrics", headers=_auth(pm_token), json=payload)
    assert saved.status_code == 200, saved.text
    assert len(saved.json()) == len(ALL_METRICS)

    listed = client.get(
        "/api/v1/metrics",
        headers=_auth(pm_token),
        params={"submission_id": draft_submission},
    )
    assert listed.status_code == 200
    assert len(listed.json()) == len(ALL_METRICS)

    health = client.get(
        f"/api/v1/submissions/{draft_submission}/health",
        headers=_auth(pm_token),
    )
    assert health.status_code == 200, health.text
    body = health.json()
    assert body["overall_score"] is not None
    assert body["rag_status"] in ("GREEN", "AMBER", "RED")
    assert len(body["dimension_scores"]) == 5


def test_metric_validation_api(client: TestClient, draft_submission: str) -> None:
    pm_token = _login(client, PM_EMAIL)
    bad = client.post(
        "/api/v1/metrics",
        headers=_auth(pm_token),
        json={
            "submission_id": draft_submission,
            "metrics": [{"metric_code": "test_pass_rate", "value": 150}],
        },
    )
    assert bad.status_code == 400


def test_partial_metrics_health_unavailable(
    client: TestClient,
    draft_submission: str,
) -> None:
    pm_token = _login(client, PM_EMAIL)
    # PM enters only 1 metric (Actual Progress % = 67)
    payload = {
        "submission_id": draft_submission,
        "metrics": [{"metric_code": "actual_progress_percent", "value": 67}],
    }
    saved = client.post("/api/v1/metrics", headers=_auth(pm_token), json=payload)
    assert saved.status_code == 200, saved.text

    # Verify that health calculation is unavailable and shows correct numbers
    health = client.get(
        f"/api/v1/submissions/{draft_submission}/health",
        headers=_auth(pm_token),
    )
    assert health.status_code == 200, health.text
    body = health.json()
    assert body["health_available"] is False
    assert body["metrics_completed"] == 1
    assert body["metrics_required"] == 13
    assert body["overall_score"] is None
    assert body["rag_status"] is None
    assert body["dimension_scores"] == []


def test_full_metrics_health_available(
    client: TestClient,
    draft_submission: str,
) -> None:
    pm_token = _login(client, PM_EMAIL)
    # PM enters all 13 metrics
    payload = {
        "submission_id": draft_submission,
        "metrics": [{"metric_code": k, "value": v} for k, v in ALL_METRICS.items()],
    }
    saved = client.post("/api/v1/metrics", headers=_auth(pm_token), json=payload)
    assert saved.status_code == 200, saved.text

    # Verify that health calculation is available and fully populated
    health = client.get(
        f"/api/v1/submissions/{draft_submission}/health",
        headers=_auth(pm_token),
    )
    assert health.status_code == 200, health.text
    body = health.json()
    assert body["health_available"] is True
    assert body["metrics_completed"] == 13
    assert body["metrics_required"] == 13
    assert body["overall_score"] is not None
    assert body["rag_status"] in ("GREEN", "AMBER", "RED")
    assert len(body["dimension_scores"]) == 5


def test_health_deletion_on_partial_downgrade(
    client: TestClient,
    db_session: Session,
    draft_submission: str,
) -> None:
    pm_token = _login(client, PM_EMAIL)
    # 1. Start with full metrics
    payload_full = {
        "submission_id": draft_submission,
        "metrics": [{"metric_code": k, "value": v} for k, v in ALL_METRICS.items()],
    }
    saved_full = client.post("/api/v1/metrics", headers=_auth(pm_token), json=payload_full)
    assert saved_full.status_code == 200, saved_full.text

    # Verify health exists
    health_full = client.get(
        f"/api/v1/submissions/{draft_submission}/health",
        headers=_auth(pm_token),
    )
    assert health_full.status_code == 200
    assert health_full.json()["health_available"] is True

    # 2. Simulate partial downgrade by deleting the other metrics from DB
    partial_keys = ["planned_progress_percent", "actual_progress_percent", "critical_defects"]
    from app.models.metric_value import MetricValue
    db_session.query(MetricValue).filter(
        MetricValue.submission_id == draft_submission,
        ~MetricValue.metric_definition.has(MetricDefinition.code.in_(partial_keys))
    ).delete(synchronize_session=False)
    db_session.commit()

    # Verify health becomes unavailable and scores are deleted/returned as null/empty
    health_partial = client.get(
        f"/api/v1/submissions/{draft_submission}/health",
        headers=_auth(pm_token),
    )
    assert health_partial.status_code == 200
    body = health_partial.json()
    assert body["health_available"] is False
    assert body["metrics_completed"] == 3
    assert body["metrics_required"] == 13
    assert body["overall_score"] is None
    assert body["rag_status"] is None
    assert body["dimension_scores"] == []


