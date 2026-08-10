import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.settings import settings
from sqlalchemy import create_engine, text
engine = create_engine(settings.sqlalchemy_database_uri)
with engine.connect() as conn:
    # Find T9 - might be stored as different code or name
    rows = conn.execute(text(
        "SELECT p.project_name, p.project_code, kp.project_type, kp.delivery_process_model, "
        "COUNT(kpm.id) as metrics, p.created_at "
        "FROM projects p "
        "JOIN kpi_plans kp ON kp.project_id = p.id "
        "LEFT JOIN kpi_plan_metrics kpm ON kpm.kpi_plan_id = kp.id "
        "WHERE p.project_name ILIKE '%T9%' OR p.project_code ILIKE '%T9%' "
        "OR p.created_at > NOW() - INTERVAL '2 hours' "
        "GROUP BY p.project_name, p.project_code, kp.project_type, kp.delivery_process_model, p.created_at "
        "ORDER BY p.created_at DESC LIMIT 10"
    )).fetchall()
    print("Recent / T9 projects:")
    for r in rows:
        print(f"  name={r[0]!r} code={r[1]!r} type={r[2]!r} model={r[3]!r} metrics={r[4]}")
