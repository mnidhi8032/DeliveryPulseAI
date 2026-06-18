"""Check what submissions PM can see."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.database import SessionLocal
from app.models.submission import Submission
from app.models.submission_status import SubmissionStatus
from app.models.user import User
from app.models.project import Project
from app.services.access_control_service import AccessControlService
from app.services.submission_service import SubmissionService
from sqlalchemy import select

db = SessionLocal()

pm = db.execute(select(User).where(User.email == 'pm1@deliverypulse.ai')).scalar_one_or_none()
print(f"PM: {pm.full_name} id={pm.id}")
pm.role  # load role

# All submissions in DB
all_subs = db.execute(select(Submission)).scalars().all()
print(f"\nAll submissions in DB: {len(all_subs)}")
for s in all_subs:
    status = db.execute(select(SubmissionStatus).where(SubmissionStatus.id == s.status_id)).scalar_one_or_none()
    project = db.get(Project, s.project_id)
    print(f"  Sub {s.id} | project={project.project_name if project else '?'} | status={status.code if status else '?'} | deleted={s.deleted_at} | created_by={s.created_by_user_id}")

# What access control returns for PM
print(f"\nProjects accessible to PM:")
access = AccessControlService(db)
projects = access.list_projects_for_user(pm)
for p in projects:
    print(f"  {p.project_name} | pm_id={p.project_manager_id}")

# Simulate what listSubmissions returns for PM
svc = SubmissionService(db)
pm_subs = svc.list(pm)
print(f"\nSubmissions visible to PM via service: {len(pm_subs)}")
for s in pm_subs:
    print(f"  Sub {s.id} | status={s.status_code}")

db.close()
