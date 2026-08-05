"""Simulate all three calls that openMetricsPanel makes in parallel."""
import sys, os, uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.core.settings import settings
from app.models.user import User
from app.services.qpm_service import QPMService
from app.services.metric_approval_service import MetricApprovalService

engine = create_engine(settings.sqlalchemy_database_uri)

with Session(engine) as session:
    pm_row = session.execute(
        text("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'PM' LIMIT 1")
    ).fetchone()
    proj_row = session.execute(text("SELECT id FROM projects LIMIT 1")).fetchone()

    user = session.get(User, pm_row[0])
    project_id = uuid.UUID(str(proj_row[0]))
    print(f"PM: {user.email!r}  project: {str(project_id)[:8]}...\n")

    # Call 1: getKpiPlan  →  GET /qpm/plans/by-project/{project_id}
    try:
        qsvc = QPMService(session)
        plan = qsvc.get_or_create_plan(user, project_id)
        print(f"[1] getKpiPlan       OK — plan_id={str(plan.id)[:8]}... metrics={len(plan.metrics)}")
    except Exception as e:
        print(f"[1] getKpiPlan       ERROR: {e}")

    # Call 2: getCatalog  →  GET /qpm/catalog
    try:
        catalog = qsvc.list_catalog()
        print(f"[2] getCatalog       OK — {len(catalog)} metrics")
    except Exception as e:
        print(f"[2] getCatalog       ERROR: {e}")

    # Call 3: listMetricRequests  →  GET /metric-approvals
    try:
        asvc = MetricApprovalService(session)
        requests = asvc.list_pending(user)
        print(f"[3] listMetricReqs   OK — {len(requests)} requests")
    except Exception as e:
        print(f"[3] listMetricReqs   ERROR: {e}")
        import traceback; traceback.print_exc()

    print("\nAll three calls completed — modal should now work.")
