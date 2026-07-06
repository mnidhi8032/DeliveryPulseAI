import os
import sys
import uuid
import json
from pathlib import Path

# Add backend directory to sys.path so we can import app modules
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from database.database import SessionLocal
from app.models.project import Project
from app.models.kpi_plan import KpiPlan, KpiPlanMetric
from app.models.qpm_catalog_metric import QPMCatalogMetric
from app.services.qpm_service import get_required_measures

def main():
    db = SessionLocal()
    
    # Get all projects
    projects = db.query(Project).all()
    
    for proj in projects:
        # Get or create KPI Plan
        plan = db.query(KpiPlan).filter(KpiPlan.project_id == proj.id).first()
        if not plan:
            plan = KpiPlan(
                id=uuid.uuid4(), 
                project_id=proj.id,
                project_type=proj.project_type,
                delivery_process_model=proj.delivery_model,
                project_category="Software Development", # default
                work_size_unit=proj.work_size_unit
            )
            db.add(plan)
            db.flush()
        
        # Sync KpiPlan with Project fields if they were None
        updated = False
        if not plan.project_type and proj.project_type:
            plan.project_type = proj.project_type
            updated = True
        if not plan.delivery_process_model and proj.delivery_model:
            plan.delivery_process_model = proj.delivery_model
            updated = True
        if updated:
            db.flush()

        # Check if plan already has metrics
        metrics_count = db.query(KpiPlanMetric).filter(KpiPlanMetric.kpi_plan_id == plan.id).count()
        if metrics_count > 0:
            print(f"Project {proj.project_name} already has {metrics_count} metrics. Skipping.")
            continue
            
        print(f"Processing Project {proj.project_name} ...")
        
        ptype = plan.project_type
        dmodel = plan.delivery_process_model
        pcat = plan.project_category
        
        # Build catalog query
        query = db.query(QPMCatalogMetric).filter(
            QPMCatalogMetric.is_active == True,
            QPMCatalogMetric.compliance == 'M'
        )
        if ptype:
            query = query.filter(QPMCatalogMetric.project_type.ilike(f"%{ptype}%"))
        if dmodel:
            query = query.filter(QPMCatalogMetric.delivery_model.ilike(f"%{dmodel}%"))
        # Some catalogs might filter on project_category as well
        if pcat:
            query = query.filter(QPMCatalogMetric.project_category.ilike(f"%{pcat}%"))
            
        mandatory_metrics = query.all()
        
        # If filtering is too strict and returns 0, try without project_category just in case
        if len(mandatory_metrics) == 0 and pcat:
            query_loose = db.query(QPMCatalogMetric).filter(
                QPMCatalogMetric.is_active == True,
                QPMCatalogMetric.compliance == 'M'
            )
            if ptype:
                query_loose = query_loose.filter(QPMCatalogMetric.project_type.ilike(f"%{ptype}%"))
            if dmodel:
                query_loose = query_loose.filter(QPMCatalogMetric.delivery_model.ilike(f"%{dmodel}%"))
            mandatory_metrics = query_loose.all()

        added = 0
        for m in mandatory_metrics:
            req_measures = get_required_measures(m.name)
            pm = KpiPlanMetric(
                id=uuid.uuid4(),
                kpi_plan_id=plan.id,
                catalog_metric_id=m.id,
                metric_name=m.name,
                metric_category=m.category,
                formula=m.formula,
                uom=m.uom,
                intent=m.intent,
                frequency=m.frequency or "Monthly",
                priority=m.compliance or "M",
                target=float(m.default_target) if m.default_target is not None else None,
                lsl=float(m.default_lsl) if m.default_lsl is not None else None,
                usl=float(m.default_usl) if m.default_usl is not None else None,
                is_custom=False,
                reported_to_customer=False,
                required_measures=json.dumps(req_measures)
            )
            db.add(pm)
            added += 1
            
        print(f"  Added {added} mandatory metrics.")
        db.commit()

    db.close()
    print("Done!")

if __name__ == "__main__":
    main()
