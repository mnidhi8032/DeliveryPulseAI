"""Seed engagement_model_presets with evidence-based mandatory metric lists.

Each preset was derived from real client project files:
  - JNJ Asset Management R5.0        → Testing / Agile-Scrum
  - JNJ Platform Support             → Maintenance / ITIL based Service Delivery
  - JNJ JJCC Hybris                  → Fresh Development / Agile-Scrum

Run from the backend directory:
    python -m scripts.seed_engagement_presets
or:
    python scripts/seed_engagement_presets.py

Safe to re-run: skips any (project_type, delivery_model, metric_name) triple that
already exists, so it won't duplicate rows on repeated runs.
"""
from __future__ import annotations

import sys
import os
import uuid
from datetime import datetime, timezone

# Make sure the app package is importable when run as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.models.engagement_model_preset import EngagementModelPreset

# ---------------------------------------------------------------------------
# Preset definitions — DO NOT rename or add/remove metrics without re-checking
# against the actual catalog. Every name here was verified as a case-sensitive
# exact match in qpm_catalog_metrics before this script was written.
# ---------------------------------------------------------------------------
PRESETS: list[tuple[str, str, list[str], str]] = [
    (
        "Testing",
        "Agile-Scrum",
        [
            "Defect Detection Efficiency %",
            "Test Execution Productivity",
            "Percentage of valid defects %",
            "Reuse Saving %",
            "Test Coverage %",
            "Schedule Variance",
            "Test Automation %",
        ],
        "JNJ AM R5.0",
    ),
    (
        "Maintenance",
        "ITIL based Service Delivery",
        [
            "First Time Fit  %",           # note: double-space — matches catalog exactly
            "Backlog Management Index",
            "SLA Adherance % - P3 Resolution",
            "SLA Adherance % - P3 Response",
            "SLA Adherance % - P4 Resolution",
            "SLA Adherance % - P4 Response",
        ],
        "JNJ Platform Support",
    ),
    (
        "Fresh Development",
        "Agile-Scrum",
        [
            "Gross Margin%",
            "Customer Satisfaction Index",
            "Overall Delivery Rate",
            "Delivered Defect Density",
            "Velocity",
            "Commitment to Delivery %",
            "Coding Delivery Rate",
            "Code Review Delivery Rate",
            "Review Defect Density",
        ],
        "JNJ JJCC Hybris",
    ),
]


def seed(session: Session) -> None:
    # Build a set of all catalog metric names for exact-match validation
    catalog_names: set[str] = set(
        row[0] for row in session.execute(
            text("SELECT name FROM qpm_catalog_metrics")
        ).fetchall()
    )

    inserted = 0
    skipped_missing: list[str] = []
    skipped_existing = 0

    now = datetime.now(timezone.utc)

    for project_type, delivery_model, metric_names, source_ref in PRESETS:
        print(f"\n── Preset: {project_type!r} / {delivery_model!r}  (source: {source_ref})")

        for metric_name in metric_names:
            # 1. Validate against catalog (case-sensitive)
            if metric_name not in catalog_names:
                print(f"   ⚠  WARNING: {metric_name!r} not found in qpm_catalog_metrics — skipping")
                skipped_missing.append(metric_name)
                continue

            # 2. Idempotency check — skip if this exact triple already exists
            existing = session.execute(
                select(EngagementModelPreset).where(
                    EngagementModelPreset.project_type == project_type,
                    EngagementModelPreset.delivery_model == delivery_model,
                    EngagementModelPreset.metric_name == metric_name,
                )
            ).scalar_one_or_none()

            if existing is not None:
                print(f"   –  already exists: {metric_name!r}")
                skipped_existing += 1
                continue

            # 3. Insert
            session.add(EngagementModelPreset(
                id=uuid.uuid4(),
                project_type=project_type,
                delivery_model=delivery_model,
                metric_name=metric_name,
                source_reference=source_ref,
                created_at=now,
            ))
            print(f"   ✓  inserted: {metric_name!r}")
            inserted += 1

    session.commit()

    print(f"\n{'='*55}")
    print(f"  Inserted : {inserted}")
    print(f"  Already existed (skipped) : {skipped_existing}")
    if skipped_missing:
        print(f"  ⚠  Catalog mismatches (skipped): {len(skipped_missing)}")
        for m in skipped_missing:
            print(f"      - {m!r}")
    else:
        print(f"  Catalog mismatches : 0")
    print(f"{'='*55}")


def main() -> None:
    engine = create_engine(settings.sqlalchemy_database_uri)
    with Session(engine) as session:
        seed(session)


if __name__ == "__main__":
    main()
