"""Seed all governance metric definitions (idempotent by code)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.governance_constants import DimensionName
from sqlalchemy import select

from app.models.metric_definition import MetricDefinition
from database.database import SessionLocal

METRICS = [
    {
        "code": "planned_progress_percent",
        "name": "Planned Progress %",
        "dimension": DimensionName.SCHEDULE,
        "data_type": "decimal",
        "weight": 0.40,
        "validation_rules": {"min": 0, "max": 100},
        "target_value": None,
        "fail_value": None,
        "calculation_model": None,
        "direction_type": None,
        "step_configuration": None,
    },
    {
        "code": "actual_progress_percent",
        "name": "Actual Progress %",
        "dimension": DimensionName.SCHEDULE,
        "data_type": "decimal",
        "weight": 0.40,
        "validation_rules": {"min": 0, "max": 100},
        "target_value": 0.0,
        "fail_value": -15.0,
        "calculation_model": "LINEAR_NORMALIZED",
        "direction_type": "SCHEDULE_VARIANCE",
        "step_configuration": None,
    },
    {
        "code": "dependency_delay_count",
        "name": "Dependency Delay Count",
        "dimension": DimensionName.SCHEDULE,
        "data_type": "integer",
        "weight": 0.25,
        "validation_rules": {"min": 0},
        "target_value": 0.0,
        "fail_value": 5.0,
        "calculation_model": "GRANULAR_STEP",
        "direction_type": "LESS_IS_BETTER",
        "step_configuration": '[{"threshold": 0, "score": 100}, {"threshold": 2, "score": 70}, {"threshold": 5, "score": 40}, {"threshold": 6, "score": 10}]',
    },
    {
        "code": "critical_defects",
        "name": "Critical Defects",
        "dimension": DimensionName.QUALITY,
        "data_type": "integer",
        "weight": 0.40,
        "validation_rules": {"min": 0},
        "target_value": 0.0,
        "fail_value": 4.0,
        "calculation_model": "GRANULAR_STEP",
        "direction_type": "LESS_IS_BETTER",
        "step_configuration": '[{"threshold": 0, "score": 100}, {"threshold": 1, "score": 75}, {"threshold": 2, "score": 50}, {"threshold": 3, "score": 25}, {"threshold": 4, "score": 0}]',
    },
    {
        "code": "test_pass_rate",
        "name": "Test Pass Rate %",
        "dimension": DimensionName.QUALITY,
        "data_type": "decimal",
        "weight": 0.35,
        "validation_rules": {"min": 0, "max": 100},
        "target_value": 95.0,
        "fail_value": 70.0,
        "calculation_model": "LINEAR_NORMALIZED",
        "direction_type": "MORE_IS_BETTER",
        "step_configuration": None,
    },
    {
        "code": "prod_incidents",
        "name": "Production Incidents",
        "dimension": DimensionName.QUALITY,
        "data_type": "integer",
        "weight": 0.25,
        "validation_rules": {"min": 0},
        "target_value": 0.0,
        "fail_value": 4.0,
        "calculation_model": "GRANULAR_STEP",
        "direction_type": "LESS_IS_BETTER",
        "step_configuration": '[{"threshold": 0, "score": 100}, {"threshold": 1, "score": 75}, {"threshold": 2, "score": 45}, {"threshold": 4, "score": 10}]',
    },
    {
        "code": "scope_change_requests",
        "name": "Scope Change Requests",
        "dimension": DimensionName.SCOPE,
        "data_type": "integer",
        "weight": 0.50,
        "validation_rules": {"min": 0},
        "target_value": 1.0,
        "fail_value": 6.0,
        "calculation_model": "GRANULAR_STEP",
        "direction_type": "LESS_IS_BETTER",
        "step_configuration": '[{"threshold": 1, "score": 100}, {"threshold": 3, "score": 70}, {"threshold": 6, "score": 40}, {"threshold": 7, "score": 15}]',
    },
    {
        "code": "requirement_stability_percent",
        "name": "Requirement Stability %",
        "dimension": DimensionName.SCOPE,
        "data_type": "decimal",
        "weight": 0.50,
        "validation_rules": {"min": 0, "max": 100},
        "target_value": 90.0,
        "fail_value": 70.0,
        "calculation_model": "LINEAR_NORMALIZED",
        "direction_type": "MORE_IS_BETTER",
        "step_configuration": None,
    },
    {
        "code": "budget_used",
        "name": "Budget Used",
        "dimension": DimensionName.FINANCE,
        "data_type": "currency",
        "weight": 0.50,
        "validation_rules": {"min": 0},
        "target_value": 100.0, # Will represent planned_budget comparison base utilization target
        "fail_value": 115.0,
        "calculation_model": "LINEAR_NORMALIZED",
        "direction_type": "ASYMMETRIC_BUDGET",
        "step_configuration": None,
    },
    {
        "code": "planned_budget",
        "name": "Planned Budget",
        "dimension": DimensionName.FINANCE,
        "data_type": "currency",
        "weight": 0.50,
        "validation_rules": {"min": 0, "min_exclusive": True},
        "target_value": None,
        "fail_value": None,
        "calculation_model": None,
        "direction_type": None,
        "step_configuration": None,
    },
    {
        "code": "billing_delay_days",
        "name": "Billing Delay (days)",
        "dimension": DimensionName.FINANCE,
        "data_type": "integer",
        "weight": 0.50,
        "validation_rules": {"min": 0},
        "target_value": 7.0,
        "fail_value": 30.0,
        "calculation_model": "LINEAR_NORMALIZED",
        "direction_type": "LESS_IS_BETTER",
        "step_configuration": None,
    },
    {
        "code": "resource_availability",
        "name": "Resource Availability %",
        "dimension": DimensionName.PEOPLE_DELIVERY,
        "data_type": "decimal",
        "weight": 0.55,
        "validation_rules": {"min": 0, "max": 100},
        "target_value": 90.0,
        "fail_value": 70.0,
        "calculation_model": "LINEAR_NORMALIZED",
        "direction_type": "MORE_IS_BETTER",
        "step_configuration": None,
    },
    {
        "code": "team_attrition",
        "name": "Team Attrition (12m)",
        "dimension": DimensionName.PEOPLE_DELIVERY,
        "data_type": "integer",
        "weight": 0.45,
        "validation_rules": {"min": 0},
        "target_value": 0.0,
        "fail_value": 3.0,
        "calculation_model": "GRANULAR_STEP",
        "direction_type": "LESS_IS_BETTER",
        "step_configuration": '[{"threshold": 0, "score": 100}, {"threshold": 1, "score": 80}, {"threshold": 2, "score": 50}, {"threshold": 3, "score": 20}]',
    },
]


def main() -> None:
    session = SessionLocal()
    try:
        for spec in METRICS:
            existing = session.execute(
                select(MetricDefinition).where(MetricDefinition.code == spec["code"])
            ).scalar_one_or_none()
            if existing:
                existing.name = spec["name"]
                existing.dimension = spec["dimension"]
                existing.data_type = spec["data_type"]
                existing.weight = spec["weight"]
                existing.validation_rules = spec["validation_rules"]
                existing.is_active = True
                # Bind new metadata fields
                existing.target_value = spec["target_value"]
                existing.fail_value = spec["fail_value"]
                existing.calculation_model = spec["calculation_model"]
                existing.direction_type = spec["direction_type"]
                existing.step_configuration = spec["step_configuration"]
            else:
                session.add(
                    MetricDefinition(
                        code=spec["code"],
                        name=spec["name"],
                        dimension=spec["dimension"],
                        description=None,
                        data_type=spec["data_type"],
                        weight=spec["weight"],
                        validation_rules=spec["validation_rules"],
                        is_active=True,
                        target_value=spec["target_value"],
                        fail_value=spec["fail_value"],
                        calculation_model=spec["calculation_model"],
                        direction_type=spec["direction_type"],
                        step_configuration=spec["step_configuration"],
                    )
                )
        session.commit()
        print(f"Seeded {len(METRICS)} metric definitions with revised scoring metadata successfully.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
