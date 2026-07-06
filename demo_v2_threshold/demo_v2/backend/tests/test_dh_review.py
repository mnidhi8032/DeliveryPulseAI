"""Phase 8 tests: Delivery Head review scope and lifecycle actions."""

import uuid
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.password import hash_password
from app.core.constants import RoleCode
from app.models.governance_period import GovernancePeriod
from app.models.role import Role
from app.models.submission_status import SubmissionStatus
from app.repositories.user_repository import UserRepository

PM_EMAIL = "phase8.pm@deliverypulse.ai"
DH1_EMAIL = "phase8.dh1@deliverypulse.ai"
DH2_EMAIL = "phase8.dh2@deliverypulse.ai"
CA_EMAIL = "phase8.ca@deliverypulse.ai"
PASSWORD = "Phase8@123"


def _login(client: TestClient, email: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _ensure_statuses(db: Session) -> None:
    want = [
        (1, "DRAFT", True),
        (2, "SUBMITTED", False),
        (3, "UNDER_REVIEW", False),
        (4, "APPROVED", False),
        (5, "REJECTED", False),
        (6, "REOPENED", False),
        (7, "LOCKED", False),
    ]
    for sid, code, allows_editing in want:
        if db.get(SubmissionStatus, sid) is None:
            db.add(
                SubmissionStatus(
                    id=sid,
                    code=code,
                    name=code,
                    allows_editing=allows_editing,
                    is_terminal=(code == "LOCKED"),
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


@pytest.fixture
def seeded_users(db_session: Session) -> dict[str, uuid.UUID]:
    _ensure_statuses(db_session)
    role_pm = db_session.execute(select(Role).where(Role.code == RoleCode.PM)).scalar_one()
    role_dh = db_session.execute(select(Role).where(Role.code == RoleCode.DELIVERY_HEAD)).scalar_one()
    role_ca = db_session.execute(select(Role).where(Role.code == RoleCode.CEO)).scalar_one()
    repo = UserRepository(db_session)

    users: dict[str, uuid.UUID] = {}
    for key, email, name, role in [
        ("pm", PM_EMAIL, "Phase8 PM", role_pm),
        ("dh1", DH1_EMAIL, "Phase8 DH One", role_dh),
        ("dh2", DH2_EMAIL, "Phase8 DH Two", role_dh),
        ("ca", CA_EMAIL, "Phase8 CA", role_ca),
    ]:
        u = repo.get_by_email(email)
        if u is None:
            u = repo.create_user(
                email=email,
                password_hash=hash_password(PASSWORD),
                full_name=name,
                role_id=role.id,
            )
        users[key] = u.id
    db_session.commit()
    return users


def _hierarchy_for_dh(
    client: TestClient,
    ca_token: str,
    dh_token: str,
    dh_user_id: uuid.UUID,
    pm_user_id: uuid.UUID,
    suffix: str,
) -> tuple[str, str]:
    uniq = uuid.uuid4().hex[:6].upper()
    bu_resp = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"P8_BU_{suffix}_{uniq}",
            "name": f"BU {suffix}",
            "delivery_head_user_id": str(dh_user_id),
        },
    )
    assert bu_resp.status_code == 201, bu_resp.text
    bu = bu_resp.json()
    
    acct_resp = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"P8_AC_{suffix}_{uniq}",
            "name": f"Account {suffix}",
        },
    )
    assert acct_resp.status_code == 201, acct_resp.text
    acct = acct_resp.json()
    
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct["id"],
            "project_code": f"P8_PRJ_{suffix}_{uniq}",
            "project_name": f"Project {suffix}",
            "project_manager_id": str(pm_user_id),
        },
    )
    assert proj.status_code == 201, proj.text
    return proj.json()["id"], acct["id"]


def _pm_submit(
    client: TestClient,
    pm_token: str,
    project_id: str,
    period_id: str,
) -> str:
    draft = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": project_id, "governance_period_id": period_id},
    )
    assert draft.status_code == 201, draft.text
    sid = draft.json()["id"]
    submitted = client.post(f"/api/v1/submissions/{sid}/submit", headers=_auth(pm_token))
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status_code"] == "UNDER_REVIEW"
    return sid


def test_dh_sees_only_own_bu_submissions(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, CA_EMAIL)
    dh1_token = _login(client, DH1_EMAIL)
    dh2_token = _login(client, DH2_EMAIL)
    pm_token = _login(client, PM_EMAIL)

    proj1, _ = _hierarchy_for_dh(
        client, ca_token, dh1_token, seeded_users["dh1"], seeded_users["pm"], "A"
    )
    proj2, _ = _hierarchy_for_dh(
        client, ca_token, dh2_token, seeded_users["dh2"], seeded_users["pm"], "B"
    )

    sid1 = _pm_submit(client, pm_token, proj1, str(period.id))
    sid2 = _pm_submit(client, pm_token, proj2, str(period.id))

    dh1_list = client.get("/api/v1/submissions", headers=_auth(dh1_token))
    assert dh1_list.status_code == 200, dh1_list.text
    dh1_ids = {s["id"] for s in dh1_list.json()}
    assert sid1 in dh1_ids
    assert sid2 not in dh1_ids

    dh2_list = client.get("/api/v1/submissions", headers=_auth(dh2_token))
    assert dh2_list.status_code == 200
    dh2_ids = {s["id"] for s in dh2_list.json()}
    assert sid2 in dh2_ids
    assert sid1 not in dh2_ids


def test_dh_approve_works(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, CA_EMAIL)
    dh1_token = _login(client, DH1_EMAIL)
    pm_token = _login(client, PM_EMAIL)
    proj, _ = _hierarchy_for_dh(
        client, ca_token, dh1_token, seeded_users["dh1"], seeded_users["pm"], "APR"
    )
    sid = _pm_submit(client, pm_token, proj, str(period.id))

    approved = client.post(f"/api/v1/submissions/{sid}/approve", headers=_auth(dh1_token))
    assert approved.status_code == 200, approved.text
    assert approved.json()["status_code"] == "APPROVED"


def test_reject_requires_comment(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, CA_EMAIL)
    dh1_token = _login(client, DH1_EMAIL)
    pm_token = _login(client, PM_EMAIL)
    proj, _ = _hierarchy_for_dh(
        client, ca_token, dh1_token, seeded_users["dh1"], seeded_users["pm"], "REJ"
    )
    sid = _pm_submit(client, pm_token, proj, str(period.id))

    empty = client.post(
        f"/api/v1/submissions/{sid}/reject",
        headers=_auth(dh1_token),
        json={"review_comments": ""},
    )
    assert empty.status_code == 422

    missing = client.post(
        f"/api/v1/submissions/{sid}/reject",
        headers=_auth(dh1_token),
        json={},
    )
    assert missing.status_code == 422

    ok = client.post(
        f"/api/v1/submissions/{sid}/reject",
        headers=_auth(dh1_token),
        json={"review_comments": "Incomplete metrics"},
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["status_code"] == "REJECTED"
    assert ok.json()["review_comments"] == "Incomplete metrics"


def test_dh_cannot_review_outside_bu(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, CA_EMAIL)
    dh2_token = _login(client, DH2_EMAIL)
    pm_token = _login(client, PM_EMAIL)

    dh1_token = _login(client, DH1_EMAIL)
    proj, _ = _hierarchy_for_dh(
        client, ca_token, dh1_token, seeded_users["dh1"], seeded_users["pm"], "OUT"
    )
    sid = _pm_submit(client, pm_token, proj, str(period.id))

    approve = client.post(f"/api/v1/submissions/{sid}/approve", headers=_auth(dh2_token))
    assert approve.status_code == 403

    get_sub = client.get(f"/api/v1/submissions/{sid}", headers=_auth(dh2_token))
    assert get_sub.status_code == 403


def test_pm_cannot_access_dh_review_actions(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, CA_EMAIL)
    dh1_token = _login(client, DH1_EMAIL)
    pm_token = _login(client, PM_EMAIL)
    proj, _ = _hierarchy_for_dh(
        client, ca_token, dh1_token, seeded_users["dh1"], seeded_users["pm"], "PMX"
    )
    sid = _pm_submit(client, pm_token, proj, str(period.id))

    for path in ("approve", "reject", "reopen", "lock"):
        if path == "reject":
            body = {"review_comments": "nope"}
        elif path == "reopen":
            body = {"review_comments": "nope"}
        else:
            body = None
        r = client.post(
            f"/api/v1/submissions/{sid}/{path}",
            headers=_auth(pm_token),
            json=body,
        )
        assert r.status_code == 403, (path, r.text)
