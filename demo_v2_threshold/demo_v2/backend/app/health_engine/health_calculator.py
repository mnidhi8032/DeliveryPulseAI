"""
V2 Governance-Based Project Health Calculator.

Project status is determined by the same governance decision matrix applied
to the five dimension statuses.  No numeric scores, no weighted averages.

Decision Matrix (applied in priority order)
-------------------------------------------
Rule 1: ANY dimension is CRITICAL       → Project = CRITICAL
Rule 2: RED count >= 2                  → Project = RED
Rule 3: RED count == 1                  → Project = AMBER
Rule 4: AMBER count >= 1                → Project = AMBER
Rule 5: all dimensions GREEN            → Project = GREEN

Return value
------------
calculate_health() returns a 4-tuple:
    (
        project_status: str,                    # GovernanceStatus
        dimension_statuses: dict[str, str],     # { dim_name: GovernanceStatus }
        metric_statuses: dict[str, str],        # { metric_code: GovernanceStatus }
        explanation_parts: list[str],           # human-readable root-cause lines
    )

The numeric overall_score stored in health_scores is set to a sentinel
value derived from the governance status so existing DB columns and API
contracts remain intact:
    CRITICAL → 25.0
    RED      → 40.0
    AMBER    → 65.0
    GREEN    → 90.0
"""

from decimal import Decimal

from app.core.governance_constants import GovernanceStatus
from app.health_engine.dimension_calculator import calculate_dimension_statuses


# ---------------------------------------------------------------------------
# Status → sentinel numeric score (for DB backward-compat)
# ---------------------------------------------------------------------------

STATUS_SCORE: dict[str, float] = {
    GovernanceStatus.GREEN:    90.0,
    GovernanceStatus.AMBER:    65.0,
    GovernanceStatus.RED:      40.0,
    GovernanceStatus.CRITICAL: 25.0,
}


# ---------------------------------------------------------------------------
# Project-level decision matrix (identical logic to dimension matrix)
# ---------------------------------------------------------------------------

def _project_decision_matrix(dim_statuses: list[str]) -> str:
    critical_count = dim_statuses.count(GovernanceStatus.CRITICAL)
    red_count      = dim_statuses.count(GovernanceStatus.RED)
    amber_count    = dim_statuses.count(GovernanceStatus.AMBER)

    if critical_count >= 1:
        return GovernanceStatus.CRITICAL
    if red_count >= 2:
        return GovernanceStatus.RED
    if red_count == 1:
        return GovernanceStatus.AMBER
    if amber_count >= 1:
        return GovernanceStatus.AMBER
    return GovernanceStatus.GREEN


# ---------------------------------------------------------------------------
# Explanation builder
# ---------------------------------------------------------------------------

def _build_explanation(
    project_status: str,
    dimension_statuses: dict[str, str],
    metric_statuses: dict[str, str],
) -> list[str]:
    """
    Build a list of human-readable explanation lines describing why the
    project received its governance status.
    """
    lines: list[str] = []

    # Identify failing dimensions
    critical_dims = [d for d, s in dimension_statuses.items() if s == GovernanceStatus.CRITICAL]
    red_dims      = [d for d, s in dimension_statuses.items() if s == GovernanceStatus.RED]
    amber_dims    = [d for d, s in dimension_statuses.items() if s == GovernanceStatus.AMBER]

    if project_status == GovernanceStatus.CRITICAL:
        lines.append(
            f"Project is CRITICAL. "
            f"Critical dimension(s): {', '.join(critical_dims)}."
        )
    elif project_status == GovernanceStatus.RED:
        lines.append(
            f"Project is RED. "
            f"Multiple failing dimensions: {', '.join(red_dims)}."
        )
    elif project_status == GovernanceStatus.AMBER:
        at_risk = red_dims + amber_dims
        lines.append(
            f"Project is AMBER. "
            f"At-risk dimension(s): {', '.join(at_risk)}."
        )
    else:
        lines.append("Project is GREEN. All dimensions are within governance thresholds.")
        return lines

    # Contributing metrics
    bad_metrics = [
        f"{code} = {status}"
        for code, status in metric_statuses.items()
        if status in (GovernanceStatus.RED, GovernanceStatus.CRITICAL)
    ]
    if bad_metrics:
        lines.append("Contributing metrics: " + ", ".join(bad_metrics) + ".")

    return lines


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_health(
    metrics: dict[str, Decimal | float],
) -> tuple[float, dict[str, float], list[str]]:
    """
    V2 governance health calculation.

    Returns the same 3-tuple signature as V1 so all callers remain unchanged:
        (overall_score: float, dimension_scores: dict[str, float], explanations: list[str])

    In V2:
    - overall_score is a sentinel float derived from the project governance status.
    - dimension_scores values are sentinel floats derived from each dimension status.
    - The real governance statuses are accessible via calculate_health_v2().
    """
    project_status, dimension_statuses, metric_statuses_map, explanations = calculate_health_v2(metrics)

    # Convert statuses to sentinel scores for backward-compat
    overall_score = STATUS_SCORE[project_status]
    dimension_scores = {
        dim: STATUS_SCORE[status]
        for dim, status in dimension_statuses.items()
    }

    return overall_score, dimension_scores, explanations


def calculate_health_v2(
    metrics: dict[str, Decimal | float],
) -> tuple[str, dict[str, str], dict[str, str], list[str]]:
    """
    Full V2 governance health calculation.

    Returns:
        project_status:      GovernanceStatus string
        dimension_statuses:  { dimension_name: GovernanceStatus }
        metric_statuses:     { metric_code: GovernanceStatus }
        explanations:        list of human-readable explanation lines
    """
    full_result = calculate_dimension_statuses(metrics)

    # Separate the injected _metric_statuses key from real dimension statuses
    metric_statuses_map: dict[str, str] = full_result.pop("_metric_statuses", {})  # type: ignore[arg-type]
    dimension_statuses: dict[str, str] = full_result

    project_status = _project_decision_matrix(list(dimension_statuses.values()))
    explanations   = _build_explanation(project_status, dimension_statuses, metric_statuses_map)

    return project_status, dimension_statuses, metric_statuses_map, explanations
