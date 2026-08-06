"""Seed all 83 QPM catalog metrics from the extracted JSON catalog."""
import sys, json, uuid
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from app.models.qpm_catalog_metric import QPMCatalogMetric
from database.database import SessionLocal

CATALOG_FILE = Path(__file__).parent / "metrics_catalog.json"

def main():
    with open(CATALOG_FILE, encoding="utf-8") as f:
        metrics = json.load(f)

    with SessionLocal() as session:
        existing_names = {
            r.name for r in session.execute(select(QPMCatalogMetric)).scalars().all()
        }
        created = 0
        skipped = 0
        for m in metrics:
            if m["name"] in existing_names:
                skipped += 1
                continue
            session.add(QPMCatalogMetric(
                id=uuid.uuid4(),
                category=m["category"],
                name=m["name"],
                objective_type=m.get("objective_type") or None,
                org_goal=m.get("org_goal") or None,
                higher_objective=m.get("higher_objective") or None,
                formula=m.get("formula") or None,
                uom=m.get("uom") or None,
                metrics_type=m.get("metrics_type") or None,
                intent=m.get("intent") or None,
                project_type=m.get("project_type") or None,
                delivery_model=m.get("delivery_model") or None,
                project_category=m.get("project_category") or None,
                data_elements=m.get("data_elements") or None,
                data_source=m.get("data_source") or None,
                frequency=m.get("frequency") or None,
                analytic_technique=m.get("analytic_technique") or None,
                compliance=m.get("compliance") or None,
                dashboard=m.get("dashboard") or None,
                governance_level=m.get("governance_level") or None,
                directive_inputs=m.get("directive_inputs") or None,
                default_target=m.get("target"),
                default_lsl=m.get("lsl"),
                default_usl=m.get("usl"),
                size_dependent=m.get("size_dependent") or None,
                computation_type=m.get("computation_type") or None,
                metrics_adaption_status=m.get("metrics_adaption_status") or None,
                is_active=True,
            ))
            created += 1
        session.commit()
        print(f"Done. Created: {created}, Skipped: {skipped}")

if __name__ == "__main__":
    main()
