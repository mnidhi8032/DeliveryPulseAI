"""
Seed submission statuses (Phase 3 lifecycle).

Safe to rerun — upserts by code.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from app.models.submission_status import SubmissionStatus
from database.database import SessionLocal

STATUSES = [
    {"id": 1, "code": "DRAFT", "name": "Draft", "allows_editing": True, "is_terminal": False},
    {"id": 2, "code": "SUBMITTED", "name": "Submitted", "allows_editing": False, "is_terminal": False},
    {"id": 3, "code": "UNDER_REVIEW", "name": "Under review", "allows_editing": False, "is_terminal": False},
    {"id": 4, "code": "APPROVED", "name": "Approved", "allows_editing": False, "is_terminal": False},
    {"id": 5, "code": "REJECTED", "name": "Rejected", "allows_editing": False, "is_terminal": False},
    {"id": 6, "code": "REOPENED", "name": "Reopened", "allows_editing": False, "is_terminal": False},
    {"id": 7, "code": "LOCKED", "name": "Locked", "allows_editing": False, "is_terminal": True},
]


def seed() -> int:
    with SessionLocal() as session:
        for row in STATUSES:
            existing = session.execute(
                select(SubmissionStatus).where(SubmissionStatus.code == row["code"])
            ).scalar_one_or_none()
            if existing:
                # Keep ids stable; update fields if changed.
                existing.name = row["name"]
                existing.allows_editing = row["allows_editing"]
                existing.is_terminal = row["is_terminal"]
                print(f"Skip (exists): {row['code']}")
                continue

            session.add(
                SubmissionStatus(
                    id=row["id"],
                    code=row["code"],
                    name=row["name"],
                    allows_editing=row["allows_editing"],
                    is_terminal=row["is_terminal"],
                )
            )
            print(f"Created: {row['code']}")
        session.commit()
    return 0


if __name__ == "__main__":
    raise SystemExit(seed())

