"""Phase 3 tests: governance periods + submission lifecycle (no metrics)."""

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
from app.models.submission_lifecycle_audit import SubmissionLifecycleAudit
from app.models.submission_status import SubmissionStatus
from app.repositories.user_repository import UserRepository

PM_EMAIL = "phase3.pm@deliverypulse.ai"
DH_EMAIL = "phase3.dh@deliverypulse.ai"
CUSTOMER_ADMIN_EMAIL = "phase3.ca@deliverypulse.ai"
PASSWORD = "Phase3@123"


def _login(client: TestClient, email: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _ensure_statuses(db: Session) -> None:
    # Minimal status seed for tests if scripts weren't run.
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
        existing = db.execute(select(SubmissionStatus).where(SubmissionStatus.code == code)).scalar_one_or_none()
        if existing:
            continue
        db.add(
            SubmissionStatus(
                id=sid,
                code=code,
                name=code.title().replace("_", " "),
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
        .where(GovernancePeriod.period_end == end)
        .where(GovernancePeriod.deleted_at.is_(None))
    ).scalar_one_or_none()
    if existing:
        return existing
    period = GovernancePeriod(
        name=f"Monthly {start.strftime('%Y-%m')}",
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
    role_dh = db_session.execute(select(Role).where(Role.code == RoleCode.BU_HEAD)).scalar_one()
    role_ca = db_session.execute(select(Role).where(Role.code == RoleCode.CEO)).scalar_one()

    repo = UserRepository(db_session)
    pm = repo.get_by_email(PM_EMAIL)
    if pm is None:
        pm = repo.create_user(
            email=PM_EMAIL,
            password_hash=hash_password(PASSWORD),
            full_name="Phase3 PM",
            role_id=role_pm.id,
        )
    dh = repo.get_by_email(DH_EMAIL)
    if dh is None:
        dh = repo.create_user(
            email=DH_EMAIL,
            password_hash=hash_password(PASSWORD),
            full_name="Phase3 DH",
            role_id=role_dh.id,
        )
    ca = repo.get_by_email(CUSTOMER_ADMIN_EMAIL)
    if ca is None:
        ca = repo.create_user(
            email=CUSTOMER_ADMIN_EMAIL,
            password_hash=hash_password(PASSWORD),
            full_name="Phase3 Customer Admin",
            role_id=role_ca.id,
        )
    db_session.commit()
    return {"pm": pm.id, "dh": dh.id, "ca": ca.id}


def test_pm_create_submit_dh_approve_lock_and_reopen(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    period = _ensure_period(db_session)

    # Customer Admin creates BU and Account with DH assigned, DH creates project with PM assigned.
    ca_token = _login(client, CUSTOMER_ADMIN_EMAIL, PASSWORD)
    bu_code = f"P3_BU_{uuid.uuid4().hex[:6].upper()}"
    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": bu_code,
            "name": "Phase3 BU",
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
            "code": f"P3_AC_{uuid.uuid4().hex[:6].upper()}",
            "name": "Phase3 Account",
        },
    )
    assert acct.status_code == 201, acct.text
    account_id = acct.json()["id"]

    dh_token = _login(client, DH_EMAIL, PASSWORD)
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": account_id,
            "project_code": f"P3_PRJ_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Phase3 Project",
            "project_manager_id": str(seeded_users["pm"]),
        },
    )
    assert proj.status_code == 201, proj.text
    project_id = proj.json()["id"]

    # PM creates draft
    pm_token = _login(client, PM_EMAIL, PASSWORD)
    draft = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": project_id, "governance_period_id": str(period.id)},
    )
    assert draft.status_code == 201, draft.text
    assert draft.json()["status_code"] == "DRAFT"
    submission_id = draft.json()["id"]

    # PM submit (DRAFT -> SUBMITTED -> UNDER_REVIEW)
    submitted = client.post(
        f"/api/v1/submissions/{submission_id}/submit",
        headers=_auth(pm_token),
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status_code"] == "UNDER_REVIEW"

    # PM cannot approve
    pm_approve = client.post(
        f"/api/v1/submissions/{submission_id}/approve",
        headers=_auth(pm_token),
    )
    assert pm_approve.status_code == 403

    # DH approve
    approved = client.post(
        f"/api/v1/submissions/{submission_id}/approve",
        headers=_auth(dh_token),
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status_code"] == "APPROVED"

    # Lock
    locked = client.post(
        f"/api/v1/submissions/{submission_id}/lock",
        headers=_auth(dh_token),
    )
    assert locked.status_code == 200, locked.text
    assert locked.json()["status_code"] == "LOCKED"

    # Reopen from LOCKED should be blocked by our state machine (only APPROVED -> REOPENED).
    reopen_locked = client.post(
        f"/api/v1/submissions/{submission_id}/reopen",
        headers=_auth(dh_token),
        json={"review_comments": "Need correction"},
    )
    assert reopen_locked.status_code == 400

    # No further mutations while LOCKED
    dh_reject = client.post(
        f"/api/v1/submissions/{submission_id}/reject",
        headers=_auth(dh_token),
        json={"review_comments": "Try reject"},
    )
    assert dh_reject.status_code == 400
    dh_lock_again = client.post(
        f"/api/v1/submissions/{submission_id}/lock",
        headers=_auth(dh_token),
    )
    assert dh_lock_again.status_code == 400


def test_invalid_transition_blocked(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    period = _ensure_period(db_session)
    pm_token = _login(client, PM_EMAIL, PASSWORD)

    # Need a project assigned to PM; create minimal hierarchy.
    ca_token = _login(client, CUSTOMER_ADMIN_EMAIL, PASSWORD)
    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"P3_BUX_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU",
            "delivery_head_user_id": str(seeded_users["dh"]),
        },
    ).json()
    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"P3_ACX_{uuid.uuid4().hex[:6].upper()}",
            "name": "Account",
        },
    ).json()
    dh_token = _login(client, DH_EMAIL, PASSWORD)
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct["id"],
            "project_code": f"P3_PRJX_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Project",
            "project_manager_id": str(seeded_users["pm"]),
        },
    ).json()

    draft = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": proj["id"], "governance_period_id": str(period.id)},
    ).json()

    # Attempt approve while DRAFT
    dh_approve = client.post(
        f"/api/v1/submissions/{draft['id']}/approve",
        headers=_auth(dh_token),
    )
    assert dh_approve.status_code == 400


def test_pm_update_draft_and_blocked_after_submit(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, CUSTOMER_ADMIN_EMAIL, PASSWORD)
    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"P3_BUD_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU",
            "delivery_head_user_id": str(seeded_users["dh"]),
        },
    ).json()
    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"P3_ACD_{uuid.uuid4().hex[:6].upper()}",
            "name": "Account",
        },
    ).json()
    dh_token = _login(client, DH_EMAIL, PASSWORD)
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct["id"],
            "project_code": f"P3_PRJD_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Project",
            "project_manager_id": str(seeded_users["pm"]),
        },
    ).json()
    pm_token = _login(client, PM_EMAIL, PASSWORD)
    draft = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": proj["id"], "governance_period_id": str(period.id)},
    ).json()
    sid = draft["id"]

    patched = client.patch(
        f"/api/v1/submissions/{sid}",
        headers=_auth(pm_token),
        json={"review_comments": "PM notes before submit"},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["review_comments"] == "PM notes before submit"

    assert (
        client.post(f"/api/v1/submissions/{sid}/submit", headers=_auth(pm_token)).status_code == 200
    )

    blocked = client.patch(
        f"/api/v1/submissions/{sid}",
        headers=_auth(pm_token),
        json={"review_comments": "Should fail"},
    )
    assert blocked.status_code == 403


def test_double_submit_blocked(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, CUSTOMER_ADMIN_EMAIL, PASSWORD)
    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"P3_BUS_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU",
            "delivery_head_user_id": str(seeded_users["dh"]),
        },
    ).json()
    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"P3_ACS_{uuid.uuid4().hex[:6].upper()}",
            "name": "Account",
        },
    ).json()
    dh_token = _login(client, DH_EMAIL, PASSWORD)
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct["id"],
            "project_code": f"P3_PRJS_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Project",
            "project_manager_id": str(seeded_users["pm"]),
        },
    ).json()
    pm_token = _login(client, PM_EMAIL, PASSWORD)
    draft = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": proj["id"], "governance_period_id": str(period.id)},
    ).json()
    sid = draft["id"]
    assert client.post(f"/api/v1/submissions/{sid}/submit", headers=_auth(pm_token)).status_code == 200
    again = client.post(f"/api/v1/submissions/{sid}/submit", headers=_auth(pm_token))
    assert again.status_code == 400


def test_reopen_creates_audit_event(
    client: TestClient,
    db_session: Session,
    seeded_users: dict[str, uuid.UUID],
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, CUSTOMER_ADMIN_EMAIL, PASSWORD)
    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"P3_BUR_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU",
            "delivery_head_user_id": str(seeded_users["dh"]),
        },
    ).json()
    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"P3_ACR_{uuid.uuid4().hex[:6].upper()}",
            "name": "Account",
        },
    ).json()
    dh_token = _login(client, DH_EMAIL, PASSWORD)
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct["id"],
            "project_code": f"P3_PRJR_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Project",
            "project_manager_id": str(seeded_users["pm"]),
        },
    ).json()
    pm_token = _login(client, PM_EMAIL, PASSWORD)
    draft = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": proj["id"], "governance_period_id": str(period.id)},
    ).json()
    sid = uuid.UUID(draft["id"])
    assert client.post(f"/api/v1/submissions/{sid}/submit", headers=_auth(pm_token)).status_code == 200
    assert client.post(f"/api/v1/submissions/{sid}/approve", headers=_auth(dh_token)).status_code == 200

    pm_patch_approved = client.patch(
        f"/api/v1/submissions/{sid}",
        headers=_auth(pm_token),
        json={"review_comments": "Must not work"},
    )
    assert pm_patch_approved.status_code == 403

    db_session.expire_all()
    before = len(
        db_session.execute(select(SubmissionLifecycleAudit).where(SubmissionLifecycleAudit.submission_id == sid))
        .scalars()
        .all()
    )
    reopen = client.post(
        f"/api/v1/submissions/{sid}/reopen",
        headers=_auth(dh_token),
        json={"review_comments": "Corrections required"},
    )
    assert reopen.status_code == 200, reopen.text
    assert reopen.json()["status_code"] == "DRAFT"

    db_session.expire_all()
    audits = db_session.execute(
        select(SubmissionLifecycleAudit).where(SubmissionLifecycleAudit.submission_id == sid)
    ).scalars().all()
    assert len(audits) == before + 1
    assert audits[-1].event_type == "REOPENED"
    assert audits[-1].detail == "Corrections required"


def test_submission_draft_deletion(
    client: TestClient,
    db_session: Session,
    seeded_users: dict,
) -> None:
    period = _ensure_period(db_session)
    ca_token = _login(client, CUSTOMER_ADMIN_EMAIL, PASSWORD)
    bu = client.post(
        "/api/v1/business-units",
        headers=_auth(ca_token),
        json={
            "code": f"P3_BU_DEL_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU",
            "delivery_head_user_id": str(seeded_users["dh"]),
        },
    ).json()
    acct = client.post(
        "/api/v1/accounts",
        headers=_auth(ca_token),
        json={
            "business_unit_id": bu["id"],
            "code": f"P3_AC_DEL_{uuid.uuid4().hex[:6].upper()}",
            "name": "Account",
        },
    ).json()
    dh_token = _login(client, DH_EMAIL, PASSWORD)
    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct["id"],
            "project_code": f"P3_PRJ_DEL_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Project for delete",
            "project_manager_id": str(seeded_users["pm"]),
        },
    ).json()
    pm_token = _login(client, PM_EMAIL, PASSWORD)
    draft = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": proj["id"], "governance_period_id": str(period.id)},
    ).json()
    sid = uuid.UUID(draft["id"])

    # Verify it exists via GET
    get_res = client.get(f"/api/v1/submissions/{sid}", headers=_auth(pm_token))
    assert get_res.status_code == 200

    # Delete draft
    del_res = client.delete(f"/api/v1/submissions/{sid}", headers=_auth(pm_token))
    assert del_res.status_code == 204

    # Verify it is deleted (GET returns 404)
    get_res_after = client.get(f"/api/v1/submissions/{sid}", headers=_auth(pm_token))
    assert get_res_after.status_code == 404

    # Try deleting a submitted submission
    draft2 = client.post(
        "/api/v1/submissions",
        headers=_auth(pm_token),
        json={"project_id": proj["id"], "governance_period_id": str(period.id)},
    ).json()
    sid2 = uuid.UUID(draft2["id"])

    # Submit
    assert client.post(f"/api/v1/submissions/{sid2}/submit", headers=_auth(pm_token)).status_code == 200

    # Delete submitted should return 400
    del_submitted = client.delete(f"/api/v1/submissions/{sid2}", headers=_auth(pm_token))
    assert del_submitted.status_code == 400


