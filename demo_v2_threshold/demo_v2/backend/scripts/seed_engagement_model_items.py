"""Seed engagement_model_items from the existing hardcoded frontend arrays.

Populates all 5 dropdown types so the frontend can switch from static arrays
to API-driven dropdowns without losing any existing values.

Safe to re-run — skips (item_type, value) pairs that already exist.

Run from backend/:
    python scripts/seed_engagement_model_items.py
"""
from __future__ import annotations
import sys, os, uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session
from app.core.settings import settings
from app.models.engagement_model_item import EngagementModelItem

# ── Source data (mirrors frontend/src/types/qpm.ts) ──────────────────────────
SEED_DATA: list[tuple[str, list[str]]] = [
    ("PROJECT_TYPE", [
        "Fresh Development", "Maintenance & Support", "Testing",
        "Infrastructure Management Services", "Re-Engineering", "Migration",
        "Package Rollout", "Package implementation", "Production Support",
        "Application Build", "Helpdesk Services", "Upgrade",
        "Professional Services", "Custom Enhancements",
    ]),
    ("DELIVERY_MODEL", [
        "Waterfall", "Iterative", "Incremental", "Agile-Scrum", "Agile-Kanban",
        "Sure Step", "Agile Sure Step", "ASAP", "Oracle AIM",
        "ITIL based Service Delivery", "Traditional Maintenance & Support", "Staffing",
    ]),
    ("PROJECT_CATEGORY", [
        "Time & Material", "Fixed Price", "Time & Material With Cap",
        "Fixed Capacity", "Outcome based Fee", "Cost-Plus",
    ]),
    ("WORK_SIZE_UNIT", [
        "Story Point-SP", "Function Point-FP", "Complexity Point-CP",
        "Use Case Point-UCP", "Person-days", "Number of tickets", "KLOC",
    ]),
    ("DIMENSION", [
        "Time & Speed", "Efficiency", "Delivered Quality", "Internal Quality",
        "Scope", "Financial", "Stakeholder Perception",
        "Non-functional-Performance", "Non-functional-Security",
        "Non-functional-Usability", "Non-functional-Maintainability",
    ]),
]


def seed(session: Session) -> None:
    inserted = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    for item_type, values in SEED_DATA:
        print(f"\n── {item_type} ({len(values)} values)")
        for idx, value in enumerate(values):
            existing = session.execute(
                select(EngagementModelItem).where(
                    EngagementModelItem.item_type == item_type,
                    EngagementModelItem.value == value,
                )
            ).scalar_one_or_none()

            if existing:
                print(f"   – already exists: {value!r}")
                skipped += 1
                continue

            session.add(EngagementModelItem(
                id=uuid.uuid4(),
                item_type=item_type,
                value=value,
                description=None,
                is_active=True,
                sort_order=idx,
                min_mandatory_count=0,
                created_by_user_id=None,
                created_at=now,
                updated_at=now,
            ))
            print(f"   ✓ inserted: {value!r}")
            inserted += 1

    session.commit()
    print(f"\n{'='*55}")
    print(f"  Inserted  : {inserted}")
    print(f"  Skipped   : {skipped}")
    print(f"{'='*55}")


if __name__ == "__main__":
    engine = create_engine(settings.sqlalchemy_database_uri)
    with Session(engine) as session:
        seed(session)
