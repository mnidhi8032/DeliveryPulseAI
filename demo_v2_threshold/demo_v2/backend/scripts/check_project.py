"""Check a project's engagement model and metric breakdown."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
engine = create_engine(__import__('app.core.settings', fromlist=['settings']).settings.sqlalchemy_database_uri)

with engine.connect() as conn:
    project_code = "T9"

    row = conn.execute(text("""
        SELECT p.project_name, p.project_code, kp.project_type,
               kp.delivery_process_model, kp.project_category, kp.work_size_unit,
               kp.id as plan_id
        FROM projects p JOIN kpi_plans kp ON kp.project_id = p.id
        WHERE p.project_code = :code
    """), {"code": project_code}).fetchone()

    if not row:
        print(f"Project {project_code!r} not found")
        sys.exit(0)

    print(f"Project: {row[0]!r} ({row[1]})")
    print(f"  project_type:            {row[2]!r}")
    print(f"  delivery_process_model:  {row[3]!r}")
    print(f"  project_category:        {row[4]!r}")
    print(f"  work_size_unit:          {row[5]!r}")

    # Check which path was taken
    print(f"\n--- Path Analysis ---")

    # Path 1: presets?
    preset_names = conn.execute(text("""
        SELECT metric_name FROM engagement_model_presets
        WHERE project_type = :pt AND delivery_model = :dm
    """), {"pt": row[2], "dm": row[3]}).fetchall()
    print(f"Path 1 (presets for {row[2]!r}/{row[3]!r}): {len(preset_names)} metrics")
    if preset_names:
        for p in preset_names:
            print(f"  - {p[0]!r}")

    # Path 2: engagement_model_metric_mappings?
    for item_type, value in [("PROJECT_TYPE", row[2]), ("DELIVERY_MODEL", row[3])]:
        item = conn.execute(text("""
            SELECT id::text, value FROM engagement_model_items
            WHERE item_type = :t AND value = :v AND is_active = true
        """), {"t": item_type, "v": value}).fetchone()
        if item:
            cnt = conn.execute(text("""
                SELECT COUNT(*) FROM engagement_model_metric_mappings
                WHERE engagement_item_id = :id
            """), {"id": item[0]}).scalar()
            print(f"Path 2 [{item_type}] {value!r}: item found, {cnt} mappings")
        else:
            print(f"Path 2 [{item_type}] {value!r}: NO item in engagement_model_items")

    # Metrics breakdown
    metrics = conn.execute(text("""
        SELECT metric_name, metric_category, priority FROM kpi_plan_metrics
        WHERE kpi_plan_id = :pid AND is_active = true
        ORDER BY priority DESC, metric_category, metric_name
    """), {"pid": row[6]}).fetchall()

    m_count = sum(1 for m in metrics if m[2] == "M")
    o_count = len(metrics) - m_count
    print(f"\nMetrics: {len(metrics)} total ({m_count} Mandatory, {o_count} Optional)")
    for m in metrics:
        flag = "[M]" if m[2] == "M" else "[O]"
        print(f"  {flag} {m[0]!r} ({m[1]}) priority={m[2]!r}")
