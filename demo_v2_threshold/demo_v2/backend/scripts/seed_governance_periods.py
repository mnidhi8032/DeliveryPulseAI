"""
Seed governance periods (WEEKLY + MONTHLY) for the current date.

Safe to rerun — matches by (period_type, period_start, period_end).
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from app.models.governance_period import GovernancePeriod
from database.database import SessionLocal


def _start_of_week(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _end_of_week(d: date) -> date:
    return _start_of_week(d) + timedelta(days=6)


def _start_of_month(d: date) -> date:
    return d.replace(day=1)


def _end_of_month(d: date) -> date:
    next_month = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
    return next_month - timedelta(days=1)


def seed() -> int:
    today = date.today()
    weekly_start = _start_of_week(today)
    weekly_end = _end_of_week(today)
    monthly_start = _start_of_month(today)
    monthly_end = _end_of_month(today)

    rows = [
        {
            "name": f"Weekly {weekly_start.isoformat()}",
            "period_type": "WEEKLY",
            "period_start": weekly_start,
            "period_end": weekly_end,
        },
        {
            "name": f"Monthly {monthly_start.strftime('%Y-%m')}",
            "period_type": "MONTHLY",
            "period_start": monthly_start,
            "period_end": monthly_end,
        },
    ]

    with SessionLocal() as session:
        for row in rows:
            existing = session.execute(
                select(GovernancePeriod)
                .where(GovernancePeriod.period_type == row["period_type"])
                .where(GovernancePeriod.period_start == row["period_start"])
                .where(GovernancePeriod.period_end == row["period_end"])
                .where(GovernancePeriod.deleted_at.is_(None))
            ).scalar_one_or_none()
            if existing:
                print(f"Skip (exists): {row['period_type']} {row['period_start']}..{row['period_end']}")
                continue
            session.add(
                GovernancePeriod(
                    name=row["name"],
                    period_type=row["period_type"],
                    period_start=row["period_start"],
                    period_end=row["period_end"],
                    is_active=True,
                )
            )
            print(f"Created: {row['period_type']} {row['period_start']}..{row['period_end']}")
        session.commit()

    return 0


if __name__ == "__main__":
    raise SystemExit(seed())

