"""Test the 3-path metric selection logic without creating a real project."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.settings import settings
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session
from app.models.engagement_model_preset import EngagementModelPreset
from app.models.engagement_model_item import EngagementModelItem
from app.models.engagement_model_metric_mapping import EngagementModelMetricMapping
from app.models.qpm_catalog_metric import QPMCatalogMetric

STANDARD_PROJECT_TYPES = {
    "Fresh Development", "Maintenance & Support", "Testing",
    "Infrastructure Management Services", "Re-Engineering", "Migration",
    "Package Rollout", "Package implementation", "Production Support",
    "Application Build", "Helpdesk Services", "Upgrade",
    "Professional Services", "Custom Enhancements",
}
STANDARD_DELIVERY_MODELS = {
    "Waterfall", "Iterative", "Incremental", "Agile-Scrum", "Agile-Kanban",
    "Sure Step", "Agile Sure Step", "ASAP", "Oracle AIM",
    "ITIL based Service Delivery", "Traditional Maintenance & Support", "Staffing",
}


def simulate(session: Session, project_type: str, delivery_model: str, project_category: str = None, work_size_unit: str = None):
    print(f"\n{'='*60}")
    print(f"Simulating: {project_type!r} / {delivery_model!r}")

    # Path 1
    preset_names = list(session.execute(
        select(EngagementModelPreset.metric_name).where(
            EngagementModelPreset.project_type == project_type,
            EngagementModelPreset.delivery_model == delivery_model,
        )
    ).scalars().all())

    if preset_names:
        print(f"  PATH 1 (Preset): {len(preset_names)} metrics")
        for n in preset_names:
            print(f"    [M] {n}")
        return

    # Path 2
    pt_is_custom = project_type not in STANDARD_PROJECT_TYPES
    dm_is_custom = delivery_model not in STANDARD_DELIVERY_MODELS
    use_mapping = pt_is_custom or dm_is_custom
    print(f"  Path 2 check: project_type custom={pt_is_custom}, delivery_model custom={dm_is_custom}, use_mapping={use_mapping}")

    item_ids = []
    if use_mapping:
        for item_type, value in [("PROJECT_TYPE", project_type if pt_is_custom else None), ("DELIVERY_MODEL", delivery_model if dm_is_custom else None)]:
            if not value:
                continue
            item_id = session.execute(
                select(EngagementModelItem.id).where(
                    EngagementModelItem.item_type == item_type,
                    EngagementModelItem.value == value,
                    EngagementModelItem.is_active == True,
                )
            ).scalar_one_or_none()
            if item_id:
                item_ids.append(str(item_id))
                print(f"    Found [{item_type}] {value!r} -> id={str(item_id)[:8]}...")

    if item_ids:
        mapping_rows = list(session.execute(
            select(EngagementModelMetricMapping).where(
                EngagementModelMetricMapping.engagement_item_id.in_(item_ids)
            )
        ).scalars().all())
        if mapping_rows:
            import uuid as _uuid
            unique_ids = list({str(r.catalog_metric_id) for r in mapping_rows})
            mandatory_ids = {str(r.catalog_metric_id) for r in mapping_rows if r.is_mandatory}
            metrics = session.execute(
                select(QPMCatalogMetric).where(
                    QPMCatalogMetric.is_active == True,
                    QPMCatalogMetric.id.in_([_uuid.UUID(m) for m in unique_ids]),
                )
            ).scalars().all()
            m_count = sum(1 for m in metrics if str(m.id) in mandatory_ids)
            o_count = len(metrics) - m_count
            print(f"  PATH 2 (Mappings): {len(metrics)} metrics ({m_count}M + {o_count}O)")
            return

    # Path 3
    stmt = select(QPMCatalogMetric).where(
        QPMCatalogMetric.is_active == True,
        QPMCatalogMetric.compliance == "M",
    )
    if project_type:
        stmt = stmt.where(QPMCatalogMetric.project_type.ilike(f"%{project_type}%"))
    if delivery_model:
        stmt = stmt.where(QPMCatalogMetric.delivery_model.ilike(f"%{delivery_model}%"))
    metrics = session.execute(stmt).scalars().all()
    print(f"  PATH 3 (ILIKE fallback): {len(metrics)} mandatory metrics from catalog")


if __name__ == "__main__":
    engine = create_engine(settings.sqlalchemy_database_uri)
    with Session(engine) as session:
        # Test cases
        simulate(session, "Testing", "Agile-Scrum")                         # -> Path 1 (preset: 7)
        simulate(session, "Fresh Development", "Agile-Scrum")               # -> Path 1 (preset: 9)
        simulate(session, "Maintenance", "ITIL based Service Delivery")     # -> Path 1 (preset: 6)
        simulate(session, "AI-Development", "Agile-AI")                     # -> Path 2 (custom: ~15)
        simulate(session, "AI-Development", "Incremental")                  # -> Path 2 (AI-Dev custom, Incremental standard: only AI-Dev mappings = 15)
        simulate(session, "Fresh Development", "Incremental")               # -> Path 3 (ILIKE: standard combo)
        simulate(session, "Fresh Development", "Waterfall")                 # -> Path 3 (ILIKE: standard combo)
