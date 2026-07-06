import sys; sys.path.insert(0, ".")
from database.database import SessionLocal
from sqlalchemy import text

with SessionLocal() as s:
    # Projects with their engagement model
    projects = s.execute(text("""
        SELECT p.id, p.project_code, p.project_name, p.status,
               k.id as plan_id, k.project_type, k.delivery_process_model,
               COUNT(km.id) as metric_count
        FROM projects p
        LEFT JOIN kpi_plans k ON k.project_id = p.id
        LEFT JOIN kpi_plan_metrics km ON km.kpi_plan_id = k.id AND km.is_active = true
        GROUP BY p.id, p.project_code, p.project_name, p.status, k.id, k.project_type, k.delivery_process_model
        ORDER BY p.project_code
    """)).fetchall()
    
    print("=== PROJECTS + PLANS ===")
    for r in projects:
        print(f"  {r[1]} | {r[2]} | plan={r[4] is not None} | type={r[5]} | model={r[6]} | metrics={r[7]}")
