"""
V2 Governance-Based Dimension Evaluator.

Dimension status is determined by a governance decision matrix applied to
the statuses of its member metrics.  No weighted averages, no numeric scores.

Decision Matrix (applied in priority order)
-------------------------------------------
Rule 1: ANY metric is CRITICAL          → Dimension = CRITICAL
Rule 2: RED count >= 2                  → Dimension = RED
Rule 3: RED count == 1                  → Dimension = AMBER
Rule 4: AMBER count >= 1                → Dimension = AMBER
Rule 5: all GREEN                       → Dimension = GREEN
"""

from decimal import Decimal

from app.core.governance_constants import DimensionName, GovernanceStatus
from app.health_engine.metric_calculator import metric_statuses


# ---------------------------------------------------------------------------
# Metric → Dimension membership map
# ---------------------------------------------------------------------------

DIMENSION_METRICS: dict[str, list[str]] = {
    DimensionName.SCHEDULE: [
        "actual_progress_percent",   # evaluated as SCHEDULE_VARIANCE
        "dependency_delay_count",
    ],
    DimensionName.QUALITY: [
        "critical_defects",
        "test_pass_rate",
        "prod_incidents",
    ],
    DimensionName.SCOPE: [
        "scope_change_requests",
        "requirement_stability_percent",
    ],
    DimensionName.FINANCE: [
        "budget_used",
        "billing_delay_days",
    ],
    DimensionName.PEOPLE_DELIVERY: [
        "resource_availability",
        "team_attrition",
    ],
}


# ---------------------------------------------------------------------------
# Governance decision matrix
# ---------------------------------------------------------------------------

def _apply_decision_matrix(statuses: list[str]) -> str:
    """
    Apply the governance decision matrix to a list of metric statuses
    and return the resulting dimension status.
    """
    critical_count = statuses.count(GovernanceStatus.CRITICAL)
    red_count      = statuses.count(GovernanceStatus.RED)
    amber_count    = statuses.count(GovernanceStatus.AMBER)

    # Rule 1
    if critical_count >= 1:
        return GovernanceStatus.CRITICAL

    # Rule 2
    if red_count >= 2:
        return GovernanceStatus.RED

    # Rule 3
    if red_count == 1:
        return GovernanceStatus.AMBER

    # Rule 4
    if amber_count >= 1:
        return GovernanceStatus.AMBER

    # Rule 5 — all GREEN
    return GovernanceStatus.GREEN


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_dimension_statuses(
    metrics: dict[str, Decimal | float],
) -> dict[str, str]:
    """
    Evaluate all five dimensions and return a dict of
    { dimension_name: GovernanceStatus }.

    Also returns per-metric statuses embedded in the result under the
    special key "_metric_statuses" for use by the explanation engine.
    """
    per_metric = metric_statuses(metrics)

    dimension_result: dict[str, str] = {}

    for dim_name, metric_codes in DIMENSION_METRICS.items():
        member_statuses = [
            per_metric[code]
            for code in metric_codes
            if code in per_metric
        ]

        if not member_statuses:
            # No evaluated metrics for this dimension — default GREEN
            dimension_result[dim_name] = GovernanceStatus.GREEN
        else:
            dimension_result[dim_name] = _apply_decision_matrix(member_statuses)

    # Attach per-metric statuses for the explanation layer
    dimension_result["_metric_statuses"] = per_metric  # type: ignore[assignment]

    return dimension_result
