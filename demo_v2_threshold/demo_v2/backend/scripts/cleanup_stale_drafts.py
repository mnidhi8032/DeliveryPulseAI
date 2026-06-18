"""Remove stale DRAFT submissions when the same project already has a newer submission."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.database import SessionLocal
from app.models.submission import Submission
from app.models.submission_status import SubmissionStatus
from app.models.metric_value import MetricValue
from app.models.dimension_score import DimensionScore
from app.models.health_score import HealthScore
from app.models.submission_lifecycle_audit import SubmissionLifecycleAudit
from sqlalchemy import select, delete

db = SessionLocal()

draft_status = db.execute(select(SubmissionStatus).where(SubmissionStatus.code == "DRAFT")).scalar_one_or_none()
if not draft_status:
    print("No DRAFT status found.")
    db.close()
    exit()

drafts = db.execute(select(Submission).where(Submission.status_id == draft_status.id)).scalars().all()
print(f"Found {len(drafts)} DRAFT submission(s)")

removed = 0
for draft in drafts:
    # Check if there's any non-draft submission for the same project
    other = db.execute(
        select(Submission).where(
            Submission.project_id == draft.project_id,
            Submission.id != draft.id,
            Submission.status_id != draft_status.id,
        )
    ).scalar_one_or_none()

    if other:
        print(f"  Removing stale DRAFT {draft.id} (project has active submission {other.id} status={other.status_id})")
        db.execute(delete(MetricValue).where(MetricValue.submission_id == draft.id))
        db.execute(delete(DimensionScore).where(DimensionScore.submission_id == draft.id))
        db.execute(delete(HealthScore).where(HealthScore.submission_id == draft.id))
        db.execute(delete(SubmissionLifecycleAudit).where(SubmissionLifecycleAudit.submission_id == draft.id))
        db.delete(draft)
        removed += 1
    else:
        print(f"  Keeping DRAFT {draft.id} — only submission for project {draft.project_id}")

db.commit()
print(f"\nDone. Removed {removed} stale draft(s).")
db.close()
