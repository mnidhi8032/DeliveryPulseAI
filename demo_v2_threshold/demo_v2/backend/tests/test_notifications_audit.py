"""Integration tests for Notifications and Audit Trail system."""

import uuid
from datetime import date, timedelta
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
from app.models.notification import Notification
from app.models.audit_event import AuditEvent
from app.repositories.user_repository import UserRepository

TEST_PM_EMAIL = "test.pm@deliverypulse.ai"
TEST_DH_EMAIL = "test.dh@deliverypulse.ai"
TEST_CA_EMAIL = "test.ca@deliverypulse.ai"
TEST_PA_EMAIL = "test.pa@deliverypulse.ai"
TEST_PASSWORD = "Notification@123"

GREEN_METRICS = {
    "planned_progress_percent": 90,
    "actual_progress_percent": 90,
    "dependency_delay_count": 0,
    "critical_defects": 0,
    "test_pass_rate": 98,
    "prod_incidents": 0,
    "scope_change_requests": 0,
    "requirement_stability_percent": 98,
    "budget_used": 50000,
    "planned_budget": 100000,
    "billing_delay_days": 0,
    "resource_availability": 100,
    "team_attrition": 0,
}

RED_METRICS = {
    "planned_progress_percent": 100,
    "actual_progress_percent": 20,  # Extreme schedule delay
    "dependency_delay_count": 10,
    "critical_defects": 15,         # Extreme defect counts
    "test_pass_rate": 30,
    "prod_incidents": 5,
    "scope_change_requests": 8,
    "requirement_stability_percent": 40,
    "budget_used": 150000,
    "planned_budget": 100000,
    "billing_delay_days": 45,
    "resource_availability": 50,
    "team_attrition": 40,
}


def _login(client: TestClient, email: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _ensure_statuses(db: Session) -> None:
    statuses = [
        (1, "DRAFT", True),
        (2, "SUBMITTED", False),
        (3, "UNDER_REVIEW", False),
        (4, "APPROVED", False),
        (5, "REJECTED", False),
        (6, "REOPENED", False),
        (7, "LOCKED", False),
    ]
    for sid, code, allows in statuses:
        if db.get(SubmissionStatus, sid) is None:
            db.add(
                SubmissionStatus(
                    id=sid,
                    code=code,
                    name=code,
                    allows_editing=allows,
                    is_terminal=(code == "LOCKED"),
                )
            )
    db.commit()


def _ensure_period(db: Session, offset_months: int = 0) -> GovernancePeriod:
    today = date.today()
    # Apply offset
    year = today.year
    month = today.month + offset_months
    while month > 12:
        month -= 12
        year += 1
    while month < 1:
        month += 12
        year -= 1

    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)

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
def notify_users(db_session: Session) -> dict[str, uuid.UUID]:
    _ensure_statuses(db_session)
    _seed_metric_definitions(db_session)
    role_pm = db_session.execute(select(Role).where(Role.code == RoleCode.PM)).scalar_one()
    role_dh = db_session.execute(select(Role).where(Role.code == RoleCode.DELIVERY_HEAD)).scalar_one()
    role_ca = db_session.execute(select(Role).where(Role.code == RoleCode.CEO)).scalar_one()
    role_pa = db_session.execute(select(Role).where(Role.code == RoleCode.PLATFORM_ADMIN)).scalar_one()

    repo = UserRepository(db_session)
    users = {}
    for email, role, name in [
        (TEST_PM_EMAIL, role_pm, "Test PM"),
        (TEST_DH_EMAIL, role_dh, "Test DH"),
        (TEST_CA_EMAIL, role_ca, "Test Customer Admin"),
        (TEST_PA_EMAIL, role_pa, "Test Platform Admin"),
    ]:
        u = repo.get_by_email(email)
        if u is None:
            u = repo.create_user(email=email, password_hash=hash_password(TEST_PASSWORD), full_name=name, role_id=role.id)
        users[email] = u.id
    db_session.commit()
    return {
        "pm": users[TEST_PM_EMAIL],
        "dh": users[TEST_DH_EMAIL],
        "ca": users[TEST_CA_EMAIL],
        "pa": users[TEST_PA_EMAIL],
    }


def test_notifications_and_audit_trail_lifecycle(
    client: TestClient,
    db_session: Session,
    notify_users: dict,
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, TEST_CA_EMAIL)
    
    # 1. Setup organizational hierarchy
    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"T_BU_{uuid.uuid4().hex[:6].upper()}",
            "name": "Test Notification BU",
            "delivery_head_user_id": str(notify_users["dh"]),
        },
    ).json()
    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"T_AC_{uuid.uuid4().hex[:6].upper()}",
            "name": "Test Notification Acct",
        },
    ).json()
    
    dh_token = _login(client, TEST_DH_EMAIL)
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct["id"],
            "project_code": f"T_PRJ_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Test Notification Proj",
            "project_manager_id": str(notify_users["pm"]),
        },
    ).json()
    project_id = proj["id"]

    # 2. PM creates draft (Audit check: DRAFT_CREATED)
    pm_token = _login(client, TEST_PM_EMAIL)
    draft = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": project_id, "governance_period_id": str(period.id)},
    )
    assert draft.status_code == 201
    submission_id = draft.json()["id"]

    # Verify DRAFT_CREATED audit event
    db_session.expire_all()
    events = db_session.execute(
        select(AuditEvent).where(AuditEvent.entity_id == uuid.UUID(submission_id)).order_by(AuditEvent.created_at.asc())
    ).scalars().all()
    assert len(events) == 1
    assert events[0].event_type == "DRAFT_CREATED"
    assert events[0].new_value == {"status": "DRAFT"}

    # 3. PM upserts metrics (Audit check: METRICS_UPDATED with state delta)
    metrics_payload = {
        "submission_id": submission_id,
        "metrics": [{"metric_code": k, "value": v} for k, v in GREEN_METRICS.items()],
    }
    saved_metrics = client.post("/api/v1/metrics", headers=_auth(pm_token), json=metrics_payload)
    assert saved_metrics.status_code == 200

    db_session.expire_all()
    events = db_session.execute(
        select(AuditEvent).where(AuditEvent.entity_id == uuid.UUID(submission_id)).order_by(AuditEvent.created_at.asc())
    ).scalars().all()
    assert len(events) == 2
    assert events[1].event_type == "METRICS_UPDATED"
    # State delta should display the modified metric codes
    assert "planned_progress_percent" in events[1].new_value
    assert events[1].old_value.get("planned_progress_percent") is None
    
    # 4. PM submits (Audit check: SUBMITTED, Notification check: SUBMISSION_SUBMITTED)
    submitted = client.post(f"/api/v1/submissions/{submission_id}/submit", headers=_auth(pm_token))
    assert submitted.status_code == 200

    # Verify SUBMITTED audit event
    db_session.expire_all()
    events = db_session.execute(
        select(AuditEvent).where(AuditEvent.entity_id == uuid.UUID(submission_id)).order_by(AuditEvent.created_at.asc())
    ).scalars().all()
    assert len(events) == 3
    assert events[2].event_type == "SUBMITTED"
    assert events[2].old_value == {"status": "DRAFT"}
    assert events[2].new_value == {"status": "UNDER_REVIEW"}

    # Verify DH notification sent
    dh_notifs = client.get("/api/v1/notifications", headers=_auth(dh_token)).json()
    assert len(dh_notifs) >= 1
    submit_notif = next(n for n in dh_notifs if n["type"] == "SUBMISSION_SUBMITTED")
    assert submit_notif["category"] == "WORKFLOW"
    assert "submitted" in submit_notif["message"]

    # Verify unread count badge endpoint
    unread_res = client.get("/api/v1/notifications/unread-count", headers=_auth(dh_token)).json()
    assert unread_res["unread_count"] >= 1

    # 5. DH approves (Audit check: APPROVED, Notification check: SUBMISSION_APPROVED)
    approved = client.post(f"/api/v1/submissions/{submission_id}/approve", headers=_auth(dh_token))
    assert approved.status_code == 200

    # Verify APPROVED audit event
    db_session.expire_all()
    events = db_session.execute(
        select(AuditEvent).where(AuditEvent.entity_id == uuid.UUID(submission_id)).order_by(AuditEvent.created_at.asc())
    ).scalars().all()
    assert events[-1].event_type == "APPROVED"
    assert events[-1].old_value == {"status": "UNDER_REVIEW"}
    assert events[-1].new_value == {"status": "APPROVED"}

    # Verify PM notification
    pm_notifs = client.get("/api/v1/notifications", headers=_auth(pm_token)).json()
    approve_notif = next(n for n in pm_notifs if n["type"] == "SUBMISSION_APPROVED")
    assert approve_notif["category"] == "APPROVAL"

    # Mark PM notification read
    read_res = client.post(f"/api/v1/notifications/{approve_notif['id']}/read", headers=_auth(pm_token))
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    # 6. DH reopens (Audit check: REOPENED, Notification check: SUBMISSION_REOPENED)
    reopened = client.post(
        f"/api/v1/submissions/{submission_id}/reopen",
        headers=_auth(dh_token),
        json={"review_comments": "Please correct scope"},
    )
    assert reopened.status_code == 200

    # Verify REOPENED audit event
    db_session.expire_all()
    events = db_session.execute(
        select(AuditEvent).where(AuditEvent.entity_id == uuid.UUID(submission_id)).order_by(AuditEvent.created_at.asc())
    ).scalars().all()
    assert events[-1].event_type == "REOPENED"
    assert events[-1].old_value == {"status": "APPROVED"}
    assert events[-1].new_value == {"status": "DRAFT"}

    # Verify PM notification
    pm_notifs = client.get("/api/v1/notifications", headers=_auth(pm_token)).json()
    reopen_notif = next(n for n in pm_notifs if n["type"] == "SUBMISSION_REOPENED")
    assert reopen_notif["category"] == "APPROVAL"
    assert "reopened" in reopen_notif["message"]


def test_transition_escalations_and_deduplication(
    client: TestClient,
    db_session: Session,
    notify_users: dict,
) -> None:
    # Set up historical period and current period
    p_prev = _ensure_period(db_session, offset_months=-1)
    p_curr = _ensure_period(db_session, offset_months=0)
    
    ca_token = _login(client, TEST_CA_EMAIL)
    pa_token = _login(client, TEST_PA_EMAIL)
    pm_token = _login(client, TEST_PM_EMAIL)
    dh_token = _login(client, TEST_DH_EMAIL)

    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"BU_ESC_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU Escalation Test",
            "delivery_head_user_id": str(notify_users["dh"]),
        },
    ).json()

    # Create 5 Accounts/Projects in this BU
    projects = []
    for i in range(5):
        acct = client.post(
            "/api/v1/accounts",
            headers=_auth(ca_token),
            json={
                "business_unit_id": bu["id"],
                "code": f"AC_ESC_{i}_{uuid.uuid4().hex[:6].upper()}",
                "name": f"Acct {i}",
            },
        ).json()
        proj = client.post(
            "/api/v1/projects",
            headers=_auth(dh_token),
            json={
                "account_id": acct["id"],
                "project_code": f"PRJ_ESC_{i}_{uuid.uuid4().hex[:6].upper()}",
                "project_name": f"Project {i}",
                "project_manager_id": str(notify_users["pm"]),
            },
        ).json()
        projects.append(proj)

    # Clean prior notifications to isolate this test
    db_session.execute(select(Notification)).scalars().all()
    db_session.query(Notification).delete()
    db_session.commit()

    # 1. Project 0: Seed as GREEN in previous month
    sub_prev = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": projects[0]["id"], "governance_period_id": str(p_prev.id)},
    ).json()
    client.post(
        "/api/v1/metrics",
        headers=_auth(pm_token),
        json={"submission_id": sub_prev["id"], "metrics": [{"metric_code": k, "value": v} for k, v in GREEN_METRICS.items()]},
    )

    # 2. Project 0 becomes RED in the current month (transition: non-RED -> RED)
    sub_curr = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": projects[0]["id"], "governance_period_id": str(p_curr.id)},
    ).json()
    client.post(
        "/api/v1/metrics",
        headers=_auth(pm_token),
        json={"submission_id": sub_curr["id"], "metrics": [{"metric_code": k, "value": v} for k, v in RED_METRICS.items()]},
    )

    # Verify Project RED notification is triggered to Customer Admin
    ca_notifs = client.get("/api/v1/notifications", headers=_auth(ca_token)).json()
    red_notifs = [n for n in ca_notifs if n["type"] == "PROJECT_RED" and n["related_submission_id"] == sub_curr["id"]]
    assert len(red_notifs) == 1
    assert red_notifs[0]["category"] == "RISK"

    # 3. BU Red percentage is 20% (1 out of 5 projects RED). This is <= 20%, so no BU warning.
    pa_notifs = client.get("/api/v1/notifications", headers=_auth(pa_token)).json()
    assert len([n for n in pa_notifs if n["type"] == "BU_RED_HIGH"]) == 0

    # 4. Project 1 becomes RED in the current month -> Red percentage becomes 40% (> 20.0% boundary crossed!)
    sub_curr_1 = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": projects[1]["id"], "governance_period_id": str(p_curr.id)},
    ).json()
    client.post(
        "/api/v1/metrics",
        headers=_auth(pm_token),
        json={"submission_id": sub_curr_1["id"], "metrics": [{"metric_code": k, "value": v} for k, v in RED_METRICS.items()]},
    )

    # Verify PROJECT_RED notification is sent to Customer Admin for Project 1 (since it was non-existent previously, transitioning to RED)
    ca_notifs = client.get("/api/v1/notifications", headers=_auth(ca_token)).json()
    red_notifs_1 = [n for n in ca_notifs if n["type"] == "PROJECT_RED" and n["related_submission_id"] == sub_curr_1["id"]]
    assert len(red_notifs_1) == 1

    # Verify BU warning triggered to Platform Admin (crossed <=20% -> >20%!)
    pa_notifs = client.get("/api/v1/notifications", headers=_auth(pa_token)).json()
    bu_warnings = [n for n in pa_notifs if n["type"] == "BU_RED_HIGH"]
    assert len(bu_warnings) == 1
    assert bu_warnings[0]["category"] == "RISK"
    assert "breached" in bu_warnings[0]["message"]

    # 5. Project 2 becomes RED in current month -> Red percentage goes 40% -> 60%.
    # This is already > 20%, so it should NOT trigger a repeated warning!
    sub_curr_2 = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": projects[2]["id"], "governance_period_id": str(p_curr.id)},
    ).json()
    client.post(
        "/api/v1/metrics",
        headers=_auth(pm_token),
        json={"submission_id": sub_curr_2["id"], "metrics": [{"metric_code": k, "value": v} for k, v in RED_METRICS.items()]},
    )

    # Platform Admin notifications should still show ONLY 1 warning! (De-duplication worked)
    pa_notifs = client.get("/api/v1/notifications", headers=_auth(pa_token)).json()
    bu_warnings = [n for n in pa_notifs if n["type"] == "BU_RED_HIGH"]
    assert len(bu_warnings) == 1


def test_audit_log_access_permissions(
    client: TestClient,
    db_session: Session,
    notify_users: dict,
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, TEST_CA_EMAIL)
    pa_token = _login(client, TEST_PA_EMAIL)
    pm_token = _login(client, TEST_PM_EMAIL)
    dh_token = _login(client, TEST_DH_EMAIL)

    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"BU_SEC_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU Security Test",
            "delivery_head_user_id": str(notify_users["dh"]),
        },
    ).json()
    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"AC_SEC_{uuid.uuid4().hex[:6].upper()}",
            "name": "Acct Security",
        },
    ).json()
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct["id"],
            "project_code": f"PRJ_SEC_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Project Security",
            "project_manager_id": str(notify_users["pm"]),
        },
    ).json()

    sub = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": proj["id"], "governance_period_id": str(period.id)},
    ).json()
    sub_id = sub["id"]

    # 1. Platform Admin can fetch audit logs for the submission
    pa_audit = client.get(f"/api/v1/audit/entity/SUBMISSION/{sub_id}", headers=_auth(pa_token))
    assert pa_audit.status_code == 200
    assert len(pa_audit.json()) >= 1
    assert pa_audit.json()[0]["performed_by_name"] == "Test PM"

    # 2. Assigned PM can fetch audit logs
    pm_audit = client.get(f"/api/v1/audit/entity/SUBMISSION/{sub_id}", headers=_auth(pm_token))
    assert pm_audit.status_code == 200

    # 3. DH can fetch audit logs
    dh_audit = client.get(f"/api/v1/audit/entity/SUBMISSION/{sub_id}", headers=_auth(dh_token))
    assert dh_audit.status_code == 200

    # 4. Another unrelated PM tries to access the audit log
    # Let's seed an unrelated PM
    unrelated_pm_email = "unrelated.pm@deliverypulse.ai"
    role_pm = db_session.execute(select(Role).where(Role.code == RoleCode.PM)).scalar_one()
    repo = UserRepository(db_session)
    upm = repo.get_by_email(unrelated_pm_email)
    if upm is None:
        upm = repo.create_user(email=unrelated_pm_email, password_hash=hash_password(TEST_PASSWORD), full_name="Unrelated PM", role_id=role_pm.id)
    db_session.commit()

    upm_token = _login(client, unrelated_pm_email)
    unrelated_audit = client.get(f"/api/v1/audit/entity/SUBMISSION/{sub_id}", headers=_auth(upm_token))
    assert unrelated_audit.status_code == 403
