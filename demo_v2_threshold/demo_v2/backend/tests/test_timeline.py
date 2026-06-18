"""Tests for timeline and trend logic."""

import uuid
from datetime import datetime

import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.constants import RoleCode
from app.models.role import Role
from app.models.user import User
from app.models.submission import Submission
from app.models.health_score import HealthScore

def get_token(client, email):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "Demo@12345"})
    if res.status_code != 200:
        res = client.post("/api/v1/auth/login", json={"email": email, "password": "Admin@123"})
    return res.json()["access_token"]


@pytest.fixture
def timeline_project(db_session):
    from app.models.business_unit import BusinessUnit
    from app.models.account import Account
    from app.models.project import Project
    
    # We will use existing seed users instead of creating new ones since DB is already seeded.
    # PM: pm1@deliverypulse.ai, DH: priya.dh@deliverypulse.ai
    pm = db_session.execute(select(User).where(User.email == "pm1@deliverypulse.ai")).scalar_one()
    dh = db_session.execute(select(User).where(User.email == "priya.dh@deliverypulse.ai")).scalar_one()

    unique_code = str(uuid.uuid4())[:8]
    bu = BusinessUnit(code=f"BU_{unique_code}", name="Timeline BU", is_active=True, delivery_head_user_id=dh.id)
    db_session.add(bu)
    db_session.flush()

    acct = Account(business_unit_id=bu.id, code=f"A_{unique_code}", name="Acct 99", is_active=True)
    db_session.add(acct)
    db_session.flush()

    proj = Project(
        account_id=acct.id,
        project_code="P99",
        project_name="Timeline Project",
        project_manager_id=pm.id,
        delivery_head_user_id=dh.id,
        status="ACTIVE"
    )
    db_session.add(proj)
    db_session.commit()
    return proj

@pytest.fixture
def timeline_submissions(db_session, timeline_project):
    from app.models.governance_period import GovernancePeriod
    from app.models.submission_status import SubmissionStatus
    
    from datetime import date
    gp1 = GovernancePeriod(name="GP91", period_type="MONTHLY", period_start=date(2026, 1, 1), period_end=date(2026, 1, 31))
    gp2 = GovernancePeriod(name="GP92", period_type="MONTHLY", period_start=date(2026, 2, 1), period_end=date(2026, 2, 28))
    gp3 = GovernancePeriod(name="GP93", period_type="MONTHLY", period_start=date(2026, 3, 1), period_end=date(2026, 3, 31))
    db_session.add_all([gp1, gp2, gp3])
    db_session.flush()
    
    st_sub = db_session.query(SubmissionStatus).filter_by(code="SUBMITTED").first()
    pm = db_session.execute(select(User).where(User.email == "pm1@deliverypulse.ai")).scalar_one()
    
    sub1 = Submission(
        project_id=timeline_project.id,
        governance_period_id=gp1.id,
        status_id=st_sub.id,
        created_by_user_id=pm.id,
        created_at=datetime(2026, 1, 1),
        submission_date=datetime(2026, 1, 2)
    )
    sub2 = Submission(
        project_id=timeline_project.id,
        governance_period_id=gp2.id,
        status_id=st_sub.id,
        created_by_user_id=pm.id,
        created_at=datetime(2026, 2, 1),
        submission_date=datetime(2026, 2, 2)
    )
    sub3 = Submission(
        project_id=timeline_project.id,
        governance_period_id=gp3.id,
        status_id=st_sub.id,
        created_by_user_id=pm.id,
        created_at=datetime(2026, 3, 1),
        submission_date=datetime(2026, 3, 2)
    )
    db_session.add_all([sub1, sub2, sub3])
    db_session.flush()

    hs1 = HealthScore(submission_id=sub1.id, overall_score=50, rag_status="AMBER", created_at=datetime(2026, 1, 1))
    hs2 = HealthScore(submission_id=sub2.id, overall_score=65, rag_status="AMBER", created_at=datetime(2026, 2, 1))
    hs3 = HealthScore(submission_id=sub3.id, overall_score=50, rag_status="AMBER", created_at=datetime(2026, 3, 1))
    db_session.add_all([hs1, hs2, hs3])
    db_session.commit()
    
    return [sub1, sub2, sub3]


def test_submission_timeline_ordering_and_trends(client: TestClient, timeline_project, timeline_submissions):
    token = get_token(client, "pm1@deliverypulse.ai")
    res = client.get(f"/api/v1/projects/{timeline_project.id}/submission-timeline", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 3
    
    # Ordering
    assert data[0]["submission_id"] == str(timeline_submissions[0].id)
    assert data[1]["submission_id"] == str(timeline_submissions[1].id)
    assert data[2]["submission_id"] == str(timeline_submissions[2].id)

    # Trends
    # sub1: 50 -> "none"
    # sub2: 65 -> diff +15 -> "improving"
    # sub3: 50 -> diff -15 -> "declining"
    assert data[0]["trend"] == "none"
    assert data[1]["trend"] == "improving"
    assert data[2]["trend"] == "declining"

    # Actor Info
    assert data[0]["actor_role"] == "Project Manager"


def test_timeline_permissions(client: TestClient, timeline_project, timeline_submissions):
    # A DH from another BU should not be able to view timeline
    # A PM from another project should not be able to view timeline
    token_pm2 = get_token(client, "pm2@deliverypulse.ai")
    res = client.get(f"/api/v1/projects/{timeline_project.id}/submission-timeline", headers={"Authorization": f"Bearer {token_pm2}"})
    assert res.status_code == 403

    token_ca = get_token(client, "customer.admin@deliverypulse.ai")
    res = client.get(f"/api/v1/projects/{timeline_project.id}/submission-timeline", headers={"Authorization": f"Bearer {token_ca}"})
    assert res.status_code == 200
    
    # Test BU Trend API
    res = client.get(f"/api/v1/customer-admin/business-units/{timeline_project.account.business_unit_id}/trends", headers={"Authorization": f"Bearer {token_ca}"})
    assert res.status_code == 200
    bu_data = res.json()
    assert len(bu_data["recent_submissions"]) == 3
    assert len(bu_data["health_changes"]) == 1 # 1 project
    assert bu_data["health_changes"][0]["trend"] == "declining" # 65 -> 50
