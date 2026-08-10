"""
Set up a complete 'AI Development' engagement model example.

Creates/verifies:
- Project Type:     AI-Development
- Delivery Model:   Agile-AI (new)
- Project Category: Time & Material (existing)
- Work Size Unit:   Story Point-SP (existing)

Maps these catalog metrics to the engagement items:
Mandatory (M): Velocity, Commitment to Delivery %, Delivered Defect Density,
               Gross Margin%, Customer Satisfaction Index, Overall Delivery Rate,
               Code Review Delivery Rate
Optional (O):  Productivity, Schedule Variance, Review Defect Density,
               Test Automation %, Coding Delivery Rate, Effort Variance,
               Technical Debt, OWASP Compliance %

Then creates project T8 in the first available account under BFSI BU.
"""
import sys, os, uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session
from app.core.settings import settings
from app.models.engagement_model_item import EngagementModelItem
from app.models.engagement_model_metric_mapping import EngagementModelMetricMapping
from app.models.qpm_catalog_metric import QPMCatalogMetric

# ── Metrics to map for AI Development ────────────────────────────────────────
MANDATORY_METRICS = [
    "Velocity",
    "Commitment to Delivery %",
    "Delivered Defect Density",
    "Gross Margin%",
    "Customer Satisfaction Index",
    "Overall Delivery Rate",
    "Code Review Delivery Rate",
]

OPTIONAL_METRICS = [
    "Productivity",
    "Schedule Variance",
    "Review Defect Density",
    "Test Automation %",
    "Coding Delivery Rate",
    "Effort Variance",
    "Technical Debt",
    "OWASP Compliance %",
]


def get_or_create_item(session: Session, item_type: str, value: str) -> EngagementModelItem:
    now = datetime.now(timezone.utc)
    existing = session.execute(
        select(EngagementModelItem).where(
            EngagementModelItem.item_type == item_type,
            EngagementModelItem.value == value,
        )
    ).scalar_one_or_none()
    if existing:
        print(f"  EXISTS  [{item_type}] {value!r}")
        if not existing.is_active:
            existing.is_active = True
            existing.updated_at = now
        return existing
    item = EngagementModelItem(
        id=uuid.uuid4(), item_type=item_type, value=value,
        description=None, is_active=True, sort_order=99,
        min_mandatory_count=0, created_by_user_id=None,
        created_at=now, updated_at=now,
    )
    session.add(item)
    print(f"  CREATED [{item_type}] {value!r}")
    return item


def map_metric(session: Session, item: EngagementModelItem, metric: QPMCatalogMetric, is_mandatory: bool) -> None:
    now = datetime.now(timezone.utc)
    existing = session.execute(
        select(EngagementModelMetricMapping).where(
            EngagementModelMetricMapping.engagement_item_id == item.id,
            EngagementModelMetricMapping.catalog_metric_id == metric.id,
        )
    ).scalar_one_or_none()
    flag = "M" if is_mandatory else "O"
    if existing:
        if existing.is_mandatory != is_mandatory:
            existing.is_mandatory = is_mandatory
            print(f"  UPDATED mapping [{flag}] {metric.name!r}")
        else:
            print(f"  EXISTS  mapping [{flag}] {metric.name!r}")
        return
    session.add(EngagementModelMetricMapping(
        id=uuid.uuid4(),
        engagement_item_id=item.id,
        catalog_metric_id=metric.id,
        is_mandatory=is_mandatory,
        created_at=now,
    ))
    print(f"  MAPPED  [{flag}] {metric.name!r}")


def main():
    engine = create_engine(settings.sqlalchemy_database_uri)
    with Session(engine) as session:
        # ── Step 1: Create engagement model items ──────────────────────────
        print("\n=== STEP 1: Engagement Model Items ===")
        ai_project_type = get_or_create_item(session, "PROJECT_TYPE", "AI-Development")
        agile_ai_model  = get_or_create_item(session, "DELIVERY_MODEL", "Agile-AI")
        fixed_cat       = get_or_create_item(session, "PROJECT_CATEGORY", "Fixed Price")
        story_unit      = get_or_create_item(session, "WORK_SIZE_UNIT", "Story Point-SP")
        session.flush()

        # ── Step 2: Map metrics to AI-Development project type ─────────────
        print("\n=== STEP 2: Map metrics to AI-Development (PROJECT_TYPE) ===")
        
        # Load all catalog metrics we want to map
        all_target_names = MANDATORY_METRICS + OPTIONAL_METRICS
        catalog_map: dict[str, QPMCatalogMetric] = {}
        for name in all_target_names:
            m = session.execute(
                select(QPMCatalogMetric).where(QPMCatalogMetric.name == name)
            ).scalar_one_or_none()
            if m:
                catalog_map[name] = m
            else:
                print(f"  WARNING: Catalog metric not found: {name!r}")

        for name in MANDATORY_METRICS:
            if name in catalog_map:
                map_metric(session, ai_project_type, catalog_map[name], is_mandatory=True)

        for name in OPTIONAL_METRICS:
            if name in catalog_map:
                map_metric(session, ai_project_type, catalog_map[name], is_mandatory=False)

        # ── Step 3: Map same metrics to Agile-AI delivery model ────────────
        print("\n=== STEP 3: Map metrics to Agile-AI (DELIVERY_MODEL) ===")
        for name in MANDATORY_METRICS:
            if name in catalog_map:
                map_metric(session, agile_ai_model, catalog_map[name], is_mandatory=True)
        for name in OPTIONAL_METRICS:
            if name in catalog_map:
                map_metric(session, agile_ai_model, catalog_map[name], is_mandatory=False)

        session.commit()
        print("\n=== Engagement model setup complete ===")

        # ── Step 4: Show summary ────────────────────────────────────────────
        print("\n=== SUMMARY ===")
        print("Engagement model for AI Development:")
        print(f"  Project Type:     AI-Development")
        print(f"  Delivery Model:   Agile-AI")
        print(f"  Project Category: Fixed Price")
        print(f"  Work Size Unit:   Story Point-SP")
        print(f"  Mandatory metrics ({len(MANDATORY_METRICS)}): {', '.join(MANDATORY_METRICS)}")
        print(f"  Optional metrics  ({len(OPTIONAL_METRICS)}): {', '.join(OPTIONAL_METRICS)}")
        print(f"\nTotal: {len(MANDATORY_METRICS) + len(OPTIONAL_METRICS)} metrics mapped")
        print("\nNow create project T8 with:")
        print("  Project Type     = AI-Development")
        print("  Delivery Model   = Agile-AI")
        print("  Project Category = Fixed Price")
        print("  Work Size Unit   = Story Point-SP")
        print("  -> System will auto-add 15 metrics (7 Mandatory + 8 Optional)")


if __name__ == "__main__":
    main()
