"""Fix priority on existing KpiPlanMetric rows for preset-covered engagements.

For any project whose (project_type, delivery_process_model) has rows in
engagement_model_presets, only metrics whose names are in the preset should
have priority='M'. All other metrics in the same plan get priority='O'.

For projects NOT covered by any preset, priority is left unchanged.

Safe to re-run.
"""
from __future__ import annotations
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.core.settings import settings


def fix(session: Session) -> None:
    # Get all (project_type, delivery_model) combos that have presets
    preset_combos = session.execute(text("""
        SELECT DISTINCT project_type, delivery_model
        FROM engagement_model_presets
    """)).fetchall()

    print(f"Found {len(preset_combos)} preset combos")

    total_updated_m = 0
    total_updated_o = 0

    for project_type, delivery_model in preset_combos:
        # Get the preset metric names for this combo
        preset_names = [r[0] for r in session.execute(text("""
            SELECT metric_name FROM engagement_model_presets
            WHERE project_type = :pt AND delivery_model = :dm
        """), {"pt": project_type, "dm": delivery_model}).fetchall()]

        print(f"\n  Preset: {project_type!r} / {delivery_model!r} → {len(preset_names)} preset metrics")

        # Find all plans with this engagement combo
        plans = session.execute(text("""
            SELECT kp.id::text, p.project_name
            FROM kpi_plans kp
            JOIN projects p ON p.id = kp.project_id
            WHERE kp.project_type = :pt AND kp.delivery_process_model = :dm
        """), {"pt": project_type, "dm": delivery_model}).fetchall()

        print(f"  Plans to fix: {len(plans)}")

        for plan_id, project_name in plans:
            # Set M for preset metrics
            r1 = session.execute(text("""
                UPDATE kpi_plan_metrics
                SET priority = 'M'
                WHERE kpi_plan_id = :plan_id
                  AND metric_name = ANY(:names)
                  AND priority != 'M'
            """), {"plan_id": plan_id, "names": preset_names})

            # Set O for non-preset metrics
            r2 = session.execute(text("""
                UPDATE kpi_plan_metrics
                SET priority = 'O'
                WHERE kpi_plan_id = :plan_id
                  AND metric_name != ALL(:names)
                  AND (priority = 'M' OR priority IS NULL)
            """), {"plan_id": plan_id, "names": preset_names})

            updated_m = r1.rowcount
            updated_o = r2.rowcount
            if updated_m > 0 or updated_o > 0:
                print(f"    {project_name!r}: set M={updated_m}, O={updated_o}")
            total_updated_m += updated_m
            total_updated_o += updated_o

    session.commit()
    print(f"\n{'='*55}")
    print(f"  Total set to M: {total_updated_m}")
    print(f"  Total set to O: {total_updated_o}")
    print(f"{'='*55}")


if __name__ == "__main__":
    engine = create_engine(settings.sqlalchemy_database_uri)
    with Session(engine) as session:
        fix(session)
