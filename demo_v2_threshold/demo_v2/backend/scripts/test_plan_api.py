"""Quick test: simulate get_or_create_plan and getCatalog calls end-to-end."""
import uuid, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.core.settings import settings
from app.services.qpm_service import QPMService
from app.models.user import User

engine = create_engine(settings.sqlalchemy_database_uri)

with Session(engine) as session:
    # Get a real PM user
    row = session.execute(
        text("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'PM' LIMIT 1")
    ).fetchone()
    if not row:
        print("No PM user found — trying any user")
        row = session.execute(text("SELECT id FROM users LIMIT 1")).fetchone()

    project_row = session.execute(text("SELECT id FROM projects LIMIT 1")).fetchone()

    user_obj = session.get(User, row[0])
    project_id = uuid.UUID(str(project_row[0]))

    print(f"Testing with user={user_obj.email!r} project_id={str(project_id)[:8]}...")

    svc = QPMService(session)
    try:
        result = svc.get_or_create_plan(user_obj, project_id)
        print(f"  Plan ID      : {result.id}")
        print(f"  Metrics count: {len(result.metrics)}")
        print("  get_or_create_plan: OK")
    except Exception as e:
        print(f"  get_or_create_plan ERROR: {e}")
        import traceback; traceback.print_exc()

    # Also test getCatalog
    try:
        catalog = svc.get_catalog()
        print(f"  Catalog metrics: {len(catalog)}")
        print("  get_catalog: OK")
    except Exception as e:
        print(f"  get_catalog ERROR: {e}")
        import traceback; traceback.print_exc()
