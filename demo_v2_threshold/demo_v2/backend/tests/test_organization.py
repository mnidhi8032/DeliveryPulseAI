"""Integration tests for organizational hierarchy and canonical role restrictions."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.password import hash_password
from app.core.constants import RoleCode
from app.models.role import Role
from app.repositories.user_repository import UserRepository

ADMIN_EMAIL = "admin@deliverypulse.ai"
ADMIN_PASSWORD = "Admin@123"

CUSTOMER_ADMIN_EMAIL = "test.customer.admin@deliverypulse.ai"
CUSTOMER_ADMIN_PASSWORD = "Customer@123"

DH_EMAIL = "dh@deliverypulse.ai"
DH2_EMAIL = "dh2@deliverypulse.ai"

PM_EMAIL = "pm@deliverypulse.ai"
TEST_PASSWORD = "Test@12345"


def _login(client: TestClient, email: str, password: str) -> str:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_token(client: TestClient, db_session: Session) -> str:
    repo = UserRepository(db_session)
    if repo.get_by_email(ADMIN_EMAIL) is None:
        role = db_session.execute(select(Role).where(Role.code == RoleCode.PLATFORM_ADMIN)).scalar_one()
        repo.create_user(
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            full_name="Platform Administrator",
            role_id=role.id,
        )
        db_session.commit()
    return _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture
def customer_admin_token(client: TestClient, db_session: Session) -> str:
    repo = UserRepository(db_session)
    if repo.get_by_email(CUSTOMER_ADMIN_EMAIL) is None:
        role = db_session.execute(select(Role).where(Role.code == RoleCode.CEO)).scalar_one()
        repo.create_user(
            email=CUSTOMER_ADMIN_EMAIL,
            password_hash=hash_password(CUSTOMER_ADMIN_PASSWORD),
            full_name="Customer Admin",
            role_id=role.id,
        )
        db_session.commit()
    return _login(client, CUSTOMER_ADMIN_EMAIL, CUSTOMER_ADMIN_PASSWORD)


@pytest.fixture
def dh_user(db_session: Session) -> uuid.UUID:
    repo = UserRepository(db_session)
    user = repo.get_by_email(DH_EMAIL)
    if user is not None:
        return user.id
    role = db_session.execute(select(Role).where(Role.code == RoleCode.DELIVERY_HEAD)).scalar_one()
    user = repo.create_user(
        email=DH_EMAIL,
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Demo Delivery Head",
        role_id=role.id,
    )
    db_session.commit()
    return user.id


@pytest.fixture
def dh_token(client: TestClient, dh_user: uuid.UUID) -> str:
    return _login(client, DH_EMAIL, TEST_PASSWORD)


@pytest.fixture
def dh2_user(db_session: Session) -> uuid.UUID:
    repo = UserRepository(db_session)
    user = repo.get_by_email(DH2_EMAIL)
    if user is not None:
        return user.id
    role = db_session.execute(select(Role).where(Role.code == RoleCode.DELIVERY_HEAD)).scalar_one()
    user = repo.create_user(
        email=DH2_EMAIL,
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Demo Delivery Head 2",
        role_id=role.id,
    )
    db_session.commit()
    return user.id


@pytest.fixture
def dh2_token(client: TestClient, dh2_user: uuid.UUID) -> str:
    return _login(client, DH2_EMAIL, TEST_PASSWORD)


@pytest.fixture
def pm_user(db_session: Session) -> uuid.UUID:
    repo = UserRepository(db_session)
    user = repo.get_by_email(PM_EMAIL)
    if user is not None:
        return user.id
    role = db_session.execute(select(Role).where(Role.code == RoleCode.PM)).scalar_one()
    user = repo.create_user(
        email=PM_EMAIL,
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Demo Project Manager",
        role_id=role.id,
    )
    db_session.commit()
    return user.id


def test_platform_admin_cannot_create_business_unit(client: TestClient, admin_token: str) -> None:
    code = f"TEST_BU_{uuid.uuid4().hex[:8].upper()}"
    response = client.post(
        "/api/v1/business-units",
        headers=_auth(admin_token),
        json={"code": code, "name": "Test BU", "description": "Test"},
    )
    assert response.status_code == 403


def test_customer_admin_can_create_business_unit(client: TestClient, customer_admin_token: str) -> None:
    code = f"TEST_BU_{uuid.uuid4().hex[:8].upper()}"
    response = client.post(
        "/api/v1/business-units",
        headers=_auth(customer_admin_token),
        json={"code": code, "name": "Test BU", "description": "Test"},
    )
    assert response.status_code == 201
    assert response.json()["code"] == code


def test_customer_admin_can_create_account(
    client: TestClient,
    customer_admin_token: str,
    dh_user: uuid.UUID,
) -> None:
    bu_resp = client.post(
        "/api/v1/business-units",
        headers=_auth(customer_admin_token),
        json={
            "code": f"BU_ACCT_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU for Account",
            "delivery_head_user_id": str(dh_user),
        },
    )
    assert bu_resp.status_code == 201
    bu_id = bu_resp.json()["id"]
    assert bu_resp.json()["delivery_head_user_id"] == str(dh_user)
    response = client.post(
        "/api/v1/accounts",
        headers=_auth(customer_admin_token),
        json={
            "business_unit_id": bu_id,
            "code": f"ACCT_{uuid.uuid4().hex[:6].upper()}",
            "name": "Test Account",
        },
    )
    assert response.status_code == 201
    assert response.json()["business_unit_id"] == bu_id


def test_delivery_head_cannot_create_business_unit(client: TestClient, dh_token: str) -> None:
    response = client.post(
        "/api/v1/business-units",
        headers=_auth(dh_token),
        json={"code": f"BU_FAIL_{uuid.uuid4().hex[:6].upper()}", "name": "Should Fail"},
    )
    assert response.status_code == 403


def test_delivery_head_cannot_create_account(
    client: TestClient,
    customer_admin_token: str,
    dh_token: str,
    dh_user: uuid.UUID,
) -> None:
    bu_resp = client.post(
        "/api/v1/business-units",
        headers=_auth(customer_admin_token),
        json={
            "code": f"BU_X_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU",
            "delivery_head_user_id": str(dh_user),
        },
    )
    bu_id = bu_resp.json()["id"]
    response = client.post(
        "/api/v1/accounts",
        headers=_auth(dh_token),
        json={
            "business_unit_id": bu_id,
            "code": f"AC_FAIL_{uuid.uuid4().hex[:6].upper()}",
            "name": "Should Fail",
        },
    )
    assert response.status_code == 403


def test_delivery_head_can_create_project(
    client: TestClient,
    customer_admin_token: str,
    dh_token: str,
    dh_user: uuid.UUID,
    pm_user: uuid.UUID,
) -> None:
    bu_resp = client.post(
        "/api/v1/business-units",
        headers=_auth(customer_admin_token),
        json={
            "code": f"BU_PRJ_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU for Project",
            "delivery_head_user_id": str(dh_user),
        },
    )
    assert bu_resp.status_code == 201
    bu_id = bu_resp.json()["id"]
    acct_resp = client.post(
        "/api/v1/accounts",
        headers=_auth(customer_admin_token),
        json={
            "business_unit_id": bu_id,
            "code": f"AC_{uuid.uuid4().hex[:6].upper()}",
            "name": "Account for Project",
        },
    )
    assert acct_resp.status_code == 201
    account_id = acct_resp.json()["id"]
    response = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": account_id,
            "project_code": f"PRJ_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Test Project",
            "project_manager_id": str(pm_user),
        },
    )
    assert response.status_code == 201
    assert response.json()["project_manager_id"] == str(pm_user)


def test_delivery_head_cannot_access_other_bu_projects(
    client: TestClient,
    customer_admin_token: str,
    dh_token: str,
    dh_user: uuid.UUID,
    dh2_token: str,
    dh2_user: uuid.UUID,
    pm_user: uuid.UUID,
) -> None:
    # BU1 owned by DH1
    bu1 = client.post(
        "/api/v1/business-units",
        headers=_auth(customer_admin_token),
        json={
            "code": f"BU_A_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU A",
            "delivery_head_user_id": str(dh_user),
        },
    ).json()
    client.post(
        "/api/v1/accounts",
        headers=_auth(customer_admin_token),
        json={
            "business_unit_id": bu1["id"],
            "code": f"AC_A_{uuid.uuid4().hex[:6].upper()}",
            "name": "Account A",
        },
    )

    # BU2 owned by DH2
    bu2 = client.post(
        "/api/v1/business-units",
        headers=_auth(customer_admin_token),
        json={
            "code": f"BU_B_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU B",
            "delivery_head_user_id": str(dh2_user),
        },
    ).json()
    acct2 = client.post(
        "/api/v1/accounts",
        headers=_auth(customer_admin_token),
        json={
            "business_unit_id": bu2["id"],
            "code": f"AC_B_{uuid.uuid4().hex[:6].upper()}",
            "name": "Account B",
        },
    ).json()

    proj = client.post(
        "/api/v1/projects",
        headers=_auth(dh2_token),
        json={
            "account_id": acct2["id"],
            "project_code": f"PRJ_B_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "BU2 Project",
            "project_manager_id": str(pm_user),
        },
    ).json()

    resp = client.get(f"/api/v1/projects/{proj['id']}", headers=_auth(dh_token))
    assert resp.status_code == 403

    resp2 = client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": acct2["id"],
            "project_code": f"PRJ_BAD_{uuid.uuid4().hex[:6].upper()}",
            "project_name": "Should Fail",
        },
    )
    assert resp2.status_code == 403


def test_pm_lists_assigned_projects_only(
    client: TestClient,
    customer_admin_token: str,
    dh_token: str,
    dh_user: uuid.UUID,
    pm_user: uuid.UUID,
) -> None:
    bu_resp = client.post(
        "/api/v1/business-units",
        headers=_auth(customer_admin_token),
        json={
            "code": f"BU_PM_{uuid.uuid4().hex[:6].upper()}",
            "name": "BU PM",
            "delivery_head_user_id": str(dh_user),
        },
    )
    bu_id = bu_resp.json()["id"]
    acct_resp = client.post(
        "/api/v1/accounts",
        headers=_auth(customer_admin_token),
        json={
            "business_unit_id": bu_id,
            "code": f"PM_AC_{uuid.uuid4().hex[:6].upper()}",
            "name": "PM Account",
        },
    )
    account_id = acct_resp.json()["id"]

    proj_code = f"PM_PRJ_{uuid.uuid4().hex[:6].upper()}"
    client.post(
        "/api/v1/projects",
        headers=_auth(dh_token),
        json={
            "account_id": account_id,
            "project_code": proj_code,
            "project_name": "PM Assigned Project",
            "project_manager_id": str(pm_user),
        },
    )

    pm_token = _login(client, PM_EMAIL, TEST_PASSWORD)
    response = client.get("/api/v1/projects", headers=_auth(pm_token))
    assert response.status_code == 200
    codes = [p["project_code"] for p in response.json()]
    assert proj_code in codes
    assert all(p["project_manager_id"] == str(pm_user) for p in response.json())


def test_pm_cannot_list_accounts(client: TestClient, pm_user: uuid.UUID) -> None:
    pm_token = _login(client, PM_EMAIL, TEST_PASSWORD)
    response = client.get("/api/v1/accounts", headers=_auth(pm_token))
    assert response.status_code == 403

