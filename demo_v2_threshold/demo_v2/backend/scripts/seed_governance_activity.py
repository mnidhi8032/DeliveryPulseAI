"""
Seed realistic governance activity and submission history.
"""

from __future__ import annotations

import sys
import random
import uuid
from datetime import datetime, timedelta, timezone, date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select, delete, update
from sqlalchemy.orm import joinedload

from app.models.project import Project
from app.models.submission import Submission
from app.models.submission_status import SubmissionStatus
from app.models.metric_definition import MetricDefinition
from app.models.metric_value import MetricValue
from app.models.health_score import HealthScore
from app.models.dimension_score import DimensionScore
from app.models.governance_period import GovernancePeriod
from app.models.submission_lifecycle_audit import SubmissionLifecycleAudit
from app.models.excel_import_batch import ExcelImportBatch
from app.models.excel_import_row import ExcelImportRow
from app.health_engine import calculate_health, score_to_rag
from database.database import SessionLocal

def clean_existing_activity(session):
    print("Cleaning existing governance activity...")
    session.execute(delete(SubmissionLifecycleAudit))
    session.execute(delete(HealthScore))
    session.execute(delete(DimensionScore))
    session.execute(delete(MetricValue))
    session.execute(delete(ExcelImportRow))
    session.execute(delete(ExcelImportBatch))
    session.execute(delete(Submission))
    session.flush()

def ensure_periods(session, dates):
    periods = []
    for d in dates:
        start_date = d - timedelta(days=d.weekday())
        end_date = start_date + timedelta(days=6)
        name = f"Weekly {start_date.isoformat()}"
        
        period = session.execute(
            select(GovernancePeriod)
            .where(GovernancePeriod.period_start == start_date)
            .where(GovernancePeriod.period_type == "WEEKLY")
        ).scalar_one_or_none()
        
        if not period:
            period = GovernancePeriod(
                name=name,
                period_type="WEEKLY",
                period_start=start_date,
                period_end=end_date,
                is_active=True
            )
            session.add(period)
            session.flush()
        periods.append(period)
    return periods

def get_metric_profiles():
    return [
        {   # Green (Healthy)
            "planned_progress_percent": 50.0,
            "actual_progress_percent": 52.0,
            "dependency_delay_count": 0,
            "critical_defects": 0,
            "test_pass_rate": 98.0,
            "prod_incidents": 0,
            "scope_change_requests": 0,
            "requirement_stability_percent": 100.0,
            "budget_used": 50000.0,
            "planned_budget": 50000.0,
            "billing_delay_days": 5,
            "resource_availability": 100.0,
            "team_attrition": 0
        },
        {   # Amber (Moderate)
            "planned_progress_percent": 60.0,
            "actual_progress_percent": 50.0,
            "dependency_delay_count": 2,
            "critical_defects": 2,
            "test_pass_rate": 85.0,
            "prod_incidents": 1,
            "scope_change_requests": 2,
            "requirement_stability_percent": 80.0,
            "budget_used": 60000.0,
            "planned_budget": 55000.0,
            "billing_delay_days": 20,
            "resource_availability": 80.0,
            "team_attrition": 1
        },
        {   # Red (High-risk)
            "planned_progress_percent": 70.0,
            "actual_progress_percent": 40.0,
            "dependency_delay_count": 5,
            "critical_defects": 8,
            "test_pass_rate": 60.0,
            "prod_incidents": 4,
            "scope_change_requests": 5,
            "requirement_stability_percent": 50.0,
            "budget_used": 80000.0,
            "planned_budget": 50000.0,
            "billing_delay_days": 45,
            "resource_availability": 60.0,
            "team_attrition": 3
        }
    ]

def seed_governance_activity():
    with SessionLocal() as session:
        clean_existing_activity(session)

        now = datetime.now(timezone.utc)
        offsets = [0, 7, 15, 30, 45, 90]
        dates = [(now - timedelta(days=o)).date() for o in offsets]
        datetimes = [now - timedelta(days=o) for o in offsets]
        
        periods = ensure_periods(session, dates)
        
        statuses = {s.code: s for s in session.execute(select(SubmissionStatus)).scalars()}
        metrics_defs = {m.code: m for m in session.execute(select(MetricDefinition)).scalars()}
        
        projects = session.execute(
            select(Project)
            .options(joinedload(Project.account))
            .where(Project.deleted_at.is_(None))
        ).scalars().all()
        
        profiles = get_metric_profiles()
        profile_weights = [0.60, 0.25, 0.15]
        
        state_choices = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "LOCKED", "REOPENED"]
        state_weights = [0.10, 0.15, 0.25, 0.35, 0.10, 0.05]
        
        summary = {
            "projects_used": len(projects),
            "submissions": 0,
            "status_counts": {s: 0 for s in state_choices},
            "rag_counts": {"Green": 0, "Amber": 0, "Red": 0},
            "approval_latency": []
        }
        
        for project in projects:
            state_code = random.choices(state_choices, state_weights)[0]
            summary["status_counts"][state_code] += 1
            
            if state_code in ["LOCKED", "APPROVED"]:
                offset_idx = random.choices([2, 3, 4, 5], [0.2, 0.4, 0.2, 0.2])[0]
            elif state_code == "REOPENED":
                offset_idx = random.choices([1, 2, 3], [0.3, 0.4, 0.3])[0]
            else:
                offset_idx = random.choices([0, 1], [0.7, 0.3])[0]
                
            base_date = datetimes[offset_idx]
            period = periods[offset_idx]
            
            pm_id = project.project_manager_id
            dh_id = project.account.delivery_head_user_id
            
            sub = Submission(
                project_id=project.id,
                governance_period_id=period.id,
                status_id=statuses[state_code].id,
                created_by_user_id=pm_id,
                created_at=base_date
            )
            
            if state_code in ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "LOCKED", "REOPENED"]:
                sub.submission_date = base_date + timedelta(hours=2)
                sub.rag_start_date = base_date.date()
                
            if state_code in ["APPROVED", "LOCKED", "REOPENED"]:
                latency_hours = random.randint(4, 72)
                sub.approval_date = sub.submission_date + timedelta(hours=latency_hours)
                sub.reviewed_by_user_id = dh_id
                if state_code in ["APPROVED", "LOCKED"]:
                    summary["approval_latency"].append(latency_hours)
                
            if state_code == "LOCKED":
                sub.locked_at = sub.approval_date + timedelta(days=5)
                
            session.add(sub)
            session.flush()
            summary["submissions"] += 1
            
            prof_idx = random.choices([0, 1, 2], profile_weights)[0]
            prof_data = profiles[prof_idx]
            
            metrics_dict_by_code = {}
            for code, val in prof_data.items():
                mdef = metrics_defs[code]
                session.add(MetricValue(
                    submission_id=sub.id,
                    metric_definition_id=mdef.id,
                    value=val
                ))
                metrics_dict_by_code[code] = val
                
            if prof_idx == 2:
                sub.review_comments = "Critical resource shortage and budget overruns. Escalation required."
                
            if state_code != "DRAFT":
                try:
                    overall_score, dimension_scores, explanations = calculate_health(metrics_dict_by_code)
                    rag_band = score_to_rag(overall_score)
                    
                    from app.core.governance_constants import DIMENSION_WEIGHTS
                    for dim_name, d_score in dimension_scores.items():
                        session.add(DimensionScore(
                            submission_id=sub.id,
                            dimension_name=dim_name,
                            score=d_score,
                            weight=DIMENSION_WEIGHTS.get(dim_name, 0.20),
                            rag_status=score_to_rag(d_score).value
                        ))
                    
                    hs = HealthScore(
                        submission_id=sub.id,
                        overall_score=overall_score,
                        rag_status=rag_band.value,
                        explanation="\n".join(explanations) if explanations else None,
                        created_at=base_date
                    )
                    session.add(hs)
                    summary["rag_counts"][rag_band.value.capitalize()] += 1
                except Exception as e:
                    print(f"Failed to compute health for sub {sub.id}: {e}")

            session.execute(
                update(Submission)
                .where(Submission.id == sub.id)
                .values(created_at=base_date, updated_at=base_date)
            )

        session.commit()
        
        print("\n=== SEED SUMMARY ===")
        print(f"Projects used: {summary['projects_used']}")
        print(f"Total Submissions: {summary['submissions']}")
        print("\nStatus Counts:")
        for k, v in summary['status_counts'].items():
            print(f"  {k}: {v}")
        print("\nRAG Counts (Excluding DRAFTs):")
        for k, v in summary['rag_counts'].items():
            print(f"  {k}: {v}")
            
        if summary["approval_latency"]:
            min_lat = min(summary["approval_latency"])
            max_lat = max(summary["approval_latency"])
            avg_lat = sum(summary["approval_latency"]) / len(summary["approval_latency"])
            print(f"\nApproval Latency: {min_lat}h - {max_lat}h (Avg: {avg_lat:.1f}h)")

    return 0

if __name__ == "__main__":
    raise SystemExit(seed_governance_activity())
