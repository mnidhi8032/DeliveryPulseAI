"""Create project T8 under BFSI BU using the AI-Development engagement model."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.core.settings import settings
from app.services.project_service import ProjectService
from app.models.user import User
from dataclasses import dataclass
from typing import Optional
import datetime


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
        # Find a PM user in BFSI BU
        pm = session.execute(text(
            "SELECT u.id, u.full_name FROM users u JOIN roles r ON r.id=u.role_id "
            "WHERE r.code='PM' AND u.email LIKE '%bfsi%' LIMIT 1"
        )).fetchone()
        if not pm:
            pm = session.execute(text(
                "SELECT u.id, u.full_name FROM users u JOIN roles r ON r.id=u.role_id "
                "WHERE r.code='PM' LIMIT 1"
            )).fetchone()
        
        print(f"Using PM: {pm[1]}")
        pm_user = session.get(User, pm[0])

        # Find an account under BFSI BU
        account = session.execute(text(
            "SELECT a.id, a.name, b.name as bu_name "
            "FROM accounts a JOIN business_units b ON b.id=a.business_unit_id "
            "WHERE b.name ILIKE '%BFSI%' OR b.name ILIKE '%Banking%' "
            "LIMIT 1"
        )).fetchone()
        if not account:
            account = session.execute(text("SELECT id, name, 'Default' FROM accounts LIMIT 1")).fetchone()
        
        print(f"Using account: {account[1]} (BU: {account[2]})")

        # Create T8
        body = CreateBody(
            account_id=str(account[0]),
            project_code="T8",
            project_name="T8 - AI Development Demo",
            description="Demo project showing AI Development engagement model with Agile-AI delivery",
            start_date=datetime.date.today(),
            target_end_date=datetime.date(2026, 12, 31),
            project_type="AI-Development",
            delivery_process_model="Agile-AI",
            project_category="Fixed Price",
            work_size_unit="Story Point-SP",
        )

        try:
            svc = ProjectService(session)
            result = svc.create_with_plan(pm_user, body)
            print(f"\n=== PROJECT T8 CREATED ===")
            print(f"  Project ID:     {result['project_id']}")
            print(f"  Project Code:   T8")
            print(f"  Project Name:   T8 - AI Development Demo")
            print(f"  Plan ID:        {result['plan_id']}")
            print(f"  Metrics added:  {result['mandatory_metrics_added']}")
            print(f"\nVerifying metrics...")
            
            from sqlalchemy import text as t
            metrics = session.execute(t(
                "SELECT metric_name, metric_category, priority "
                "FROM kpi_plan_metrics WHERE kpi_plan_id=:pid AND is_active=true "
                "ORDER BY priority DESC, metric_category, metric_name"
            ), {"pid": result["plan_id"]}).fetchall()
            
            print(f"\nMetrics ({len(metrics)} total):")
            for m in metrics:
                flag = "[M] Mandatory" if m[2] == "M" else "[O] Optional "
                print(f"  {flag}  {m[0]!r} ({m[1]})")

        except Exception as e:
            import traceback
            print(f"ERROR: {e}")
            traceback.print_exc()


if __name__ == "__main__":
    main()
