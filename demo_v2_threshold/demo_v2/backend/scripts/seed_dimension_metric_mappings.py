"""Seed DIMENSION metric mappings from the catalog.

Each catalog metric has a `category` column (e.g. "Efficiency", "Internal Quality").
These category values match DIMENSION items in engagement_model_items.
This script creates engagement_model_metric_mappings rows linking each
DIMENSION item to all catalog metrics that belong to that category.

The `is_mandatory` flag is set based on the metric's compliance column:
  M = mandatory → is_mandatory = True
  anything else → is_mandatory = False

Safe to re-run — skips existing pairs.

Run from backend/:
    python scripts/seed_dimension_metric_mappings.py
"""
from __future__ import annotations
import sys, os, uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session
from app.core.settings import settings
from app.models.engagement_model_item import EngagementModelItem
from app.models.engagement_model_metric_mapping import EngagementModelMetricMapping


def seed(session: Session) -> None:
    now = datetime.now(timezone.utc)
    inserted = 0
    skipped_existing = 0
    skipped_no_dimension = 0

    # Build dimension item lookup: category_value -> item_id
    dimension_items = session.execute(
        select(EngagementModelItem).where(
            EngagementModelItem.item_type == "DIMENSION",
            EngagementModelItem.is_active == True,
        )
    ).scalars().all()

    dim_lookup: dict[str, str] = {item.value: str(item.id) for item in dimension_items}
    print(f"Found {len(dim_lookup)} DIMENSION items: {list(dim_lookup.keys())}")

    # Load all catalog metrics with their category and compliance via raw SQL
    # (avoids ORM model column mismatch issue)
    catalog_rows = session.execute(
        text("SELECT id::text, name, category, compliance FROM qpm_catalog_metrics WHERE is_active = true ORDER BY category, name")
    ).fetchall()
    print(f"Found {len(catalog_rows)} active catalog metrics\n")

    # Load existing mappings to check duplicates
    existing = session.execute(
        text("SELECT engagement_item_id::text, catalog_metric_id::text FROM engagement_model_metric_mappings")
    ).fetchall()
    existing_set: set[tuple[str, str]] = {(str(r[0]), str(r[1])) for r in existing}

    print("Seeding DIMENSION metric mappings:")
    print("-" * 60)

    for metric_id_str, metric_name, category, compliance in catalog_rows:
        dim_item_id = dim_lookup.get(category)
        if not dim_item_id:
            print(f"  ⚠  No DIMENSION item for category: {category!r} (metric: {metric_name!r})")
            skipped_no_dimension += 1
            continue

        pair = (dim_item_id, metric_id_str)
        if pair in existing_set:
            skipped_existing += 1
            continue

        is_mandatory = (compliance == "M")
        session.add(EngagementModelMetricMapping(
            id=uuid.uuid4(),
            engagement_item_id=uuid.UUID(dim_item_id),
            catalog_metric_id=uuid.UUID(metric_id_str),
            is_mandatory=is_mandatory,
            created_at=now,
        ))
        existing_set.add(pair)
        print(f"  ✓  [{category}] {metric_name!r}  (mandatory={is_mandatory})")
        inserted += 1

    session.commit()

    print(f"\n{'='*60}")
    print(f"  Inserted           : {inserted}")
    print(f"  Skipped (existing) : {skipped_existing}")
    print(f"  Skipped (no dim)   : {skipped_no_dimension}")
    print(f"{'='*60}")


if __name__ == "__main__":
    engine = create_engine(settings.sqlalchemy_database_uri)
    with Session(engine) as session:
        seed(session)
