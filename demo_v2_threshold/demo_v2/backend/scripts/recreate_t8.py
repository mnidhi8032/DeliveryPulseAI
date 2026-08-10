"""Delete T8 and recreate with the fixed 3-path logic."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.core.settings import settings
from app.services.project_service import ProjectService
from app.models.user import User
import datetime
from dataclasses import dataclass
from typing import Optional


@dataclass
class CreateBody:
    account_id: str
    project_code: str
    project_name: str
    description: Optional[str]
    start_date: Optional[datetime.date]
    target_end_date: Optional[datetime.date]
    project_type: str
    delivery_process_model: str
    project_category: Optional[str]
    work_size_unit: Optional[str]


def main():
    engine = create_engine(settings.sqlalchemy_database_uri)
    with Session(engine) as session:
        # Delete old T8 in correct FK order
        t8_id = session.execute(text("SELECT id::text FROM projects WHERE project_code = 'T8'")).scalar()
        if t8_id:
            session.execute(text("DELETE FROM kpi_measure_entries WHERE plan_metric_id IN (SELECT id FROM kpi_plan_metrics WHERE kpi_plan_id IN (SELECT id FROM kpi_plans WHERE project_id = :id))"), {"id": t8_id})
            session.execute(text("DELETE FROM kpi_measurements WHERE plan_metric_id IN (SELECT id FROM kpi_plan_metrics WHERE kpi_plan_id IN (SELECT id FROM kpi_plans WHERE project_id = :id))"), {"id": t8_id})
            session.execute(text("DELETE FROM kpi_plan_metrics WHERE kpi_plan_id IN (SELECT id FROM kpi_plans WHERE project_id = :id)"), {"id": t8_id})
            session.execute(text("DELETE FROM kpi_plans WHERE project_id = :id"), {"id": t8_id})
            session.execute(text("DELETE FROM projects WHERE id = :id"), {"id": t8_id})
            session.commit()
            print(f"Deleted old T8 (id={t8_id[:8]}...)")
        else:
            print("No existing T8 found")

        # Get PM and account
        pm_row = session.execute(text(
            "SELECT u.id, u.full_name FROM users u JOIN roles r ON r.id=u.role_id "
            "WHERE r.code='PM' AND u.email LIKE '%bfsi%' LIMIT 1"
        )).fetchone()
        if not pm_row:
            pm_row = session.execute(text(
                "SELECT u.id, u.full_name FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='PM' LIMIT 1"
            )).fetchone()

        account_row = session.execute(text(
            "SELECT a.id, a.name FROM accounts a JOIN business_units b ON b.id=a.business_unit_id "
            "WHERE b.name ILIKE '%Banking%' OR b.name ILIKE '%BFSI%' LIMIT 1"
        )).fetchone()
        if not account_row:
            account_row = session.execute(text("SELECT id, name FROM accounts LIMIT 1")).fetchone()

        print(f"PM: {pm_row[1]}")
        print(f"Account: {account_row[1]}")

        pm_user = session.get(User, pm_row[0])
        body = CreateBody(
            account_id=str(account_row[0]),
            project_code="T8",
            project_name="T8 - AI Development Demo",
            description="AI Development project using custom engagement model (Agile-AI delivery)",
            start_date=datetime.date.today(),
            target_end_date=datetime.date(2026, 12, 31),
            project_type="AI-Development",
            delivery_process_model="Agile-AI",
            project_category="Fixed Price",
            work_size_unit="Story Point-SP",
        )

        result = ProjectService(session).create_with_plan(pm_user, body)
        print(f"\n=== T8 CREATED ===")
        print(f"  Metrics added: {result['mandatory_metrics_added']}")

        # Verify
        metrics = session.execute(text(
            "SELECT metric_name, metric_category, priority "
            "FROM kpi_plan_metrics WHERE kpi_plan_id=:pid AND is_active=true "
            "ORDER BY priority DESC, metric_category, metric_name"
        ), {"pid": result["plan_id"]}).fetchall()

        m_count = sum(1 for m in metrics if m[2] == "M")
        o_count = sum(1 for m in metrics if m[2] != "M")
        print(f"  Total: {len(metrics)} ({m_count} Mandatory, {o_count} Optional)\n")
        for m in metrics:
            flag = "[M] Mandatory" if m[2] == "M" else "[O] Optional "
            print(f"  {flag}  {m[0]!r} ({m[1]})")


if __name__ == "__main__":
    main()
