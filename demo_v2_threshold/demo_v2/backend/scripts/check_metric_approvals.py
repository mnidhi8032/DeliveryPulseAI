"""Check the metric_approval_requests endpoint for PM role."""
import sys, os, uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.core.settings import settings
from app.models.user import User

engine = create_engine(settings.sqlalchemy_database_uri)

with Session(engine) as session:
    # 1. Check table exists
    exists = session.execute(text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'metric_approval_requests')"
    )).scalar()
    print(f"metric_approval_requests table exists: {exists}")

    # 2. Check the route handler
    try:
        from app.api.v1 import metric_approval_requests as mar_module
        print("metric_approval_requests module imports OK")
    except Exception as e:
        print(f"metric_approval_requests module IMPORT ERROR: {e}")
        import traceback; traceback.print_exc()

    # 3. Try calling the list function directly with a PM user
    pm_row = session.execute(
        text("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'PM' LIMIT 1")
    ).fetchone()
    if pm_row:
        user_obj = session.get(User, pm_row[0])
        print(f"\nPM user: {user_obj.email!r}, role: {user_obj.role.code!r}")
        try:
            from app.services.metric_approval_service import MetricApprovalService
            svc = MetricApprovalService(session)
            results = svc.list_requests(user_obj)
            print(f"list_requests returned {len(results)} items — OK")
        except Exception as e:
            print(f"list_requests ERROR: {e}")
            import traceback; traceback.print_exc()
    else:
        print("No PM user found")
