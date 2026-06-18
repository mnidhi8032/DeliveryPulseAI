import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.database import SessionLocal
from app.models.project import Project
from app.models.user import User
from app.models.submission import Submission
from app.models.submission_status import SubmissionStatus
from app.models.business_unit import BusinessUnit
from sqlalchemy import select

db = SessionLocal()

# Check rajesh
rajesh = db.execute(select(User).where(User.email == 'rajesh.dh@deliverypulse.ai')).scalar_one_or_none()
print('Rajesh ID:', rajesh.id if rajesh else 'NOT FOUND')

# Check BUs assigned to rajesh
bus = db.execute(select(BusinessUnit).where(BusinessUnit.delivery_head_user_id == rajesh.id)).scalars().all()
print('BUs assigned to Rajesh:', [(b.name, str(b.id)) for b in bus])

# Check projects with delivery_head_user_id = rajesh
projects = db.execute(select(Project).where(Project.delivery_head_user_id == rajesh.id)).scalars().all()
print('Projects with delivery_head = Rajesh:', [(p.project_name, str(p.id)) for p in projects])

# Check ALL projects
all_projects = db.execute(select(Project)).scalars().all()
print('\nAll projects:')
for p in all_projects:
    print(f'  {p.project_name} | delivery_head_user_id={p.delivery_head_user_id}')

# Check ALL submissions
print('\nAll submissions:')
subs = db.execute(select(Submission)).scalars().all()
for s in subs:
    status = db.execute(select(SubmissionStatus).where(SubmissionStatus.id == s.status_id)).scalar_one_or_none()
    code = status.code if status else 'unknown'
    print(f'  project_id={s.project_id} status={code} created_by={s.created_by_user_id}')

db.close()
