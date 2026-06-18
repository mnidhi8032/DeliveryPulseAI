"""Phase 4 unit tests: metric validation, dimension/health/RAG, red escalation."""

from decimal import Decimal

import pytest

from app.core.governance_constants import RED_DIMENSION_CAP
from app.health_engine.health_calculator import calculate_health
from app.health_engine.metric_calculator import (
    metric_subscores,
    subscore_schedule_variance,
    subscore_test_pass_rate,
)
from app.health_engine.rag_engine import score_to_rag
from app.models.metric_definition import MetricDefinition
from app.services.metric_validation import MetricValidationError, validate_metric_value


def test_metric_validation_percent_range():
    definition = MetricDefinition(
        code="test_pass_rate",
        name="Test",
        dimension="Quality",
        data_type="decimal",
        weight=1,
        validation_rules={"min": 0, "max": 100},
        is_active=True,
    )
    assert validate_metric_value(definition, 95) == Decimal("95")
    with pytest.raises(MetricValidationError):
        validate_metric_value(definition, 101)


def test_metric_validation_integer_only():
    definition = MetricDefinition(
        code="critical_defects",
        name="Defects",
        dimension="Quality",
        data_type="integer",
        weight=1,
        validation_rules={"min": 0},
        is_active=True,
    )
    assert validate_metric_value(definition, 2) == Decimal("2")
    with pytest.raises(MetricValidationError):
        validate_metric_value(definition, 1.5)


def test_metric_validation_planned_budget_positive():
    definition = MetricDefinition(
        code="planned_budget",
        name="Budget",
        dimension="Finance",
        data_type="currency",
        weight=1,
        validation_rules={"min": 0, "min_exclusive": True},
        is_active=True,
    )
    with pytest.raises(MetricValidationError):
        validate_metric_value(definition, 0)


def test_subscore_schedule_variance():
    assert subscore_schedule_variance(5) >= 80
    assert subscore_schedule_variance(-10) < 50


def test_subscore_test_pass_rate_bands():
    assert subscore_test_pass_rate(96) == 100
    assert subscore_test_pass_rate(90) == 70
    assert subscore_test_pass_rate(60) == 15


def test_rag_calculation():
    assert score_to_rag(85) == "GREEN"
    assert score_to_rag(65) == "AMBER"
    assert score_to_rag(40) == "RED"


def test_dimension_and_health_calculation():
    metrics = {
        "planned_progress_percent": 80,
        "actual_progress_percent": 75,
        "dependency_delay_count": 0,
        "critical_defects": 0,
        "test_pass_rate": 96,
        "prod_incidents": 0,
        "scope_change_requests": 1,
        "requirement_stability_percent": 92,
        "budget_used": 50000,
        "planned_budget": 100000,
        "billing_delay_days": 5,
        "resource_availability": 92,
        "team_attrition": 0,
    }
    sub = metric_subscores(metrics)
    assert sub["dependency_delay_count"] == 100
    overall, dimensions, _ = calculate_health(metrics)
    assert 0 <= overall <= 100
    assert len(dimensions) == 5
    assert all(0 <= dimensions[d] <= 100 for d in dimensions)


def test_red_escalation_rule_caps_overall():
    """Strong overall inputs but one red dimension must cap at 79."""
    metrics = {
        "planned_progress_percent": 90,
        "actual_progress_percent": 50,
        "dependency_delay_count": 8,
        "critical_defects": 0,
        "test_pass_rate": 98,
        "prod_incidents": 0,
        "scope_change_requests": 0,
        "requirement_stability_percent": 95,
        "budget_used": 40000,
        "planned_budget": 100000,
        "billing_delay_days": 2,
        "resource_availability": 95,
        "team_attrition": 0,
    }
    overall, dimensions, explanations = calculate_health(metrics)
    assert any(score < 50 for score in dimensions.values())
    assert overall <= RED_DIMENSION_CAP
    assert any("cap" in e.lower() for e in explanations)
