# -*- coding: utf-8 -*-
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from database.database import SessionLocal

with SessionLocal() as s:
    print("=== ALL PROJECTS ===")
    rows = s.execute(text("""
        SELECT p.project_code, p.project_name, p.status,
               a.name as account, b.name as bu,
               k.project_type, k.delivery_process_model,
               COUNT(km.id) as metrics,
               COUNT(meas.id) as measurements
        FROM projects p
        LEFT JOIN accounts a ON a.id = p.account_id
        LEFT JOIN business_units b ON b.id = a.business_unit_id
        LEFT JOIN kpi_plans k ON k.project_id = p.id
        LEFT JOIN kpi_plan_metrics km ON km.kpi_plan_id = k.id AND km.is_active = true
        LEFT JOIN kpi_measurements meas ON meas.plan_metric_id = km.id
        GROUP BY p.project_code, p.project_name, p.status, a.name, b.name,
                 k.project_type, k.delivery_process_model
        ORDER BY p.project_code
    """)).fetchall()
    for r in rows:
        print(f"  {r[0]} | {r[1]} | acct={r[3]} | bu={r[4]} | type={r[5]} | metrics={r[7]} | measurements={r[8]}")

    print("\n=== ALL ACCOUNTS ===")
    accts = s.execute(text("SELECT code, name, business_unit_id FROM accounts ORDER BY name")).fetchall()
    for a in accts:
        print(f"  {a[0]} | {a[1]}")

    print("\n=== KPI MEASUREMENTS (entered data) ===")
    meas = s.execute(text("""
        SELECT p.project_name, km.metric_name, m.frequency_name, m.actual_value, m.rag_status
        FROM kpi_measurements m
        JOIN kpi_plan_metrics km ON km.id = m.plan_metric_id
        JOIN kpi_plans k ON k.id = km.kpi_plan_id
        JOIN projects p ON p.id = k.project_id
        ORDER BY p.project_name, km.metric_name
    """)).fetchall()
    if meas:
        for r in meas:
            print(f"  {r[0]} | {r[1]} | period={r[2]} | value={r[3]} | RAG={r[4]}")
    else:
        print("  No measurements found.")
