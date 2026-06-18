"""
V2 Governance-Based Metric Evaluator.

Implements all four RAG logic types from the QPM Plan Excel specification:

  RAG-Calculation-Logic sheet:
  ┌─────────────────────┬──────────────┬────────────────────┬────────────────────┬─────────────────┐
  │ Metric Intent       │ R            │ A                  │ G                  │ Direction Type  │
  ├─────────────────────┼──────────────┼────────────────────┼────────────────────┼─────────────────┤
  │ Higher the better   │ <= LSL       │ >LSL & <Target     │ >= Target          │ MORE_IS_BETTER  │
  │ Lower the better    │ >= USL       │ >Target & <USL     │ <= Target          │ LESS_IS_BETTER  │
  │ Nominal the best    │ >USL or <LSL │ <=USL AND >=LSL    │ == Target          │ NOMINAL_BEST    │
  │                     │              │ AND <> Target      │                    │                 │
  │ Within the Limits   │ >USL or <LSL │ —                  │ <=USL AND >=LSL    │ WITHIN_LIMITS   │
  └─────────────────────┴──────────────┴────────────────────┴────────────────────┴─────────────────┘

  SCHEDULE_VARIANCE is a computed variant of MORE_IS_BETTER:
      variance = actual_progress_percent − planned_progress_percent
      Then evaluated as MORE_IS_BETTER on the variance.

Threshold field mapping (metric_definitions columns):
  MORE_IS_BETTER / LESS_IS_BETTER:
      green_threshold    = Target
      red_threshold      = LSL (for MORE) or USL (for LESS)
      critical_threshold = hard floor (for MORE) or hard ceiling (for LESS)
      amber_threshold    = optional explicit boundary (usually None)

  NOMINAL_BEST:
      green_threshold    = Target (exact match gives GREEN; tolerance ±amber_threshold)
      amber_threshold    = tolerance band around target (±value) for AMBER
      red_threshold      = LSL  (below this → RED)
      critical_threshold = USL  (above this → RED; stored in critical_threshold slot)

  WITHIN_LIMITS:
      red_threshold      = LSL  (below this → RED)
      critical_threshold = USL  (above this → RED)
      green_threshold    = None  (anything inside limits → GREEN)
      amber_threshold    = None
"""

from decimal import Decimal
from sqlalchemy import select

from app.core.governance_constants import GovernanceStatus, DirectionType
from database.database import SessionLocal
from app.models.metric_definition import MetricDefinition


# ---------------------------------------------------------------------------
# Reference-only metrics — never evaluated for health status
# ---------------------------------------------------------------------------
REFERENCE_ONLY_METRICS: frozenset[str] = frozenset(
    {"planned_progress_percent", "planned_budget"}
)


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_metric_definitions_dict() -> dict[str, dict]:
    """
    Load all active metric definitions from the database.
    Returns a dict keyed by metric code with threshold and direction data.
    """
    with SessionLocal() as session:
        defs = session.execute(
            select(MetricDefinition).where(MetricDefinition.is_active == True)
        ).scalars().all()
        return {
            d.code: {
                "direction_type":     d.direction_type,
                "green_threshold":    float(d.green_threshold)    if d.green_threshold    is not None else None,
                "amber_threshold":    float(d.amber_threshold)    if d.amber_threshold    is not None else None,
                "red_threshold":      float(d.red_threshold)      if d.red_threshold      is not None else None,
                "critical_threshold": float(d.critical_threshold) if d.critical_threshold is not None else None,
            }
            for d in defs
        }


# ---------------------------------------------------------------------------
# Core threshold evaluator
# ---------------------------------------------------------------------------

def evaluate_metric_status(
    actual: float,
    direction: str,
    green_threshold: float | None,
    amber_threshold: float | None,
    red_threshold: float | None,
    critical_threshold: float | None,
) -> str:
    """
    Evaluate a single metric value against its governance thresholds.

    MORE_IS_BETTER  (Higher the better — Excel QPM spec)
    ────────────────────────────────────────────────────
    actual >= green_threshold (Target)   → GREEN
    actual <  critical_threshold         → CRITICAL  (hard floor, below LSL floor)
    actual <  red_threshold (LSL)        → RED
    otherwise                            → AMBER

    LESS_IS_BETTER  (Lower the better — Excel QPM spec)
    ────────────────────────────────────────────────────
    actual <= green_threshold (Target)   → GREEN
    actual >  critical_threshold         → CRITICAL  (hard ceiling, above USL ceiling)
    actual >  red_threshold (USL)        → RED
    otherwise                            → AMBER

    NOMINAL_BEST  (Nominal the best — Excel QPM spec)
    ──────────────────────────────────────────────────
    Threshold field usage:
        green_threshold    = Target (ideal value)
        amber_threshold    = tolerance band (±) around target for GREEN/AMBER boundary
        red_threshold      = LSL (lower spec limit)
        critical_threshold = USL (upper spec limit)

    actual == green_threshold (exactly)  → GREEN
    actual is within ±amber_threshold    → GREEN  (tolerance band)
    actual > critical_threshold (USL)    → RED
    actual < red_threshold (LSL)         → RED
    otherwise (inside limits, off-target)→ AMBER

    WITHIN_LIMITS  (Within the Limits — Excel QPM spec)
    ────────────────────────────────────────────────────
    Threshold field usage:
        red_threshold      = LSL (lower spec limit)
        critical_threshold = USL (upper spec limit)

    actual > critical_threshold (USL)    → RED
    actual < red_threshold (LSL)         → RED
    otherwise (inside limits)            → GREEN
    (no AMBER band for this type)

    SCHEDULE_VARIANCE  (computed variant of MORE_IS_BETTER)
    ───────────────────────────────────────────────────────
    Caller pre-computes: variance = actual_progress - planned_progress
    Then delegates to MORE_IS_BETTER logic on the variance value.

    Missing thresholds fall back to GREEN (safe default).
    """

    # ── MORE_IS_BETTER ────────────────────────────────────────────────────
    if direction == DirectionType.MORE_IS_BETTER:
        if green_threshold is not None and actual >= green_threshold:
            return GovernanceStatus.GREEN
        if critical_threshold is not None and actual < critical_threshold:
            return GovernanceStatus.CRITICAL
        if red_threshold is not None and actual < red_threshold:
            return GovernanceStatus.RED
        return GovernanceStatus.AMBER

    # ── LESS_IS_BETTER ────────────────────────────────────────────────────
    elif direction == DirectionType.LESS_IS_BETTER:
        if green_threshold is not None and actual <= green_threshold:
            return GovernanceStatus.GREEN
        if critical_threshold is not None and actual > critical_threshold:
            return GovernanceStatus.CRITICAL
        if red_threshold is not None and actual > red_threshold:
            return GovernanceStatus.RED
        return GovernanceStatus.AMBER

    # ── NOMINAL_BEST ─────────────────────────────────────────────────────
    # green_threshold = Target, amber_threshold = ± tolerance,
    # red_threshold = LSL, critical_threshold = USL
    elif direction == DirectionType.NOMINAL_BEST:
        target = green_threshold
        tolerance = amber_threshold  # ± band around target for GREEN
        lsl = red_threshold
        usl = critical_threshold

        # Outside limits → RED
        if usl is not None and actual > usl:
            return GovernanceStatus.RED
        if lsl is not None and actual < lsl:
            return GovernanceStatus.RED

        # Within tolerance of target → GREEN
        if target is not None:
            if tolerance is not None:
                if abs(actual - target) <= tolerance:
                    return GovernanceStatus.GREEN
            else:
                # No tolerance defined — exact match only for GREEN
                if actual == target:
                    return GovernanceStatus.GREEN

        # Inside limits but off-target → AMBER
        return GovernanceStatus.AMBER

    # ── WITHIN_LIMITS ─────────────────────────────────────────────────────
    # red_threshold = LSL, critical_threshold = USL
    elif direction == DirectionType.WITHIN_LIMITS:
        lsl = red_threshold
        usl = critical_threshold

        if usl is not None and actual > usl:
            return GovernanceStatus.RED
        if lsl is not None and actual < lsl:
            return GovernanceStatus.RED
        return GovernanceStatus.GREEN

    # Unknown direction — default to GREEN (safe)
    return GovernanceStatus.GREEN


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def metric_statuses(
    metrics: dict[str, Decimal | float],
) -> dict[str, str]:
    """
    Evaluate all submitted metrics and return a dict of
    { metric_code: GovernanceStatus }.

    Reference-only metrics (planned_progress_percent, planned_budget) are
    excluded from evaluation but used as inputs where needed.

    Special pre-processing cases:
    - SCHEDULE_VARIANCE: variance = actual_progress - planned_progress,
      then evaluated as MORE_IS_BETTER on the variance.
    - budget_used: converted to utilization % = (budget_used / planned_budget) * 100,
      then evaluated with its configured direction type.
    """
    raw = {k: float(v) for k, v in metrics.items()}
    config = get_metric_definitions_dict()

    planned_progress = raw.get("planned_progress_percent", 0.0)

    result: dict[str, str] = {}

    for code, spec in config.items():
        if code in REFERENCE_ONLY_METRICS:
            continue

        direction = spec["direction_type"]
        if not direction:
            # No direction configured — skip evaluation
            continue

        # ── Pre-processing: determine eval_value and eval_direction ──────
        if code == "actual_progress_percent" and direction == DirectionType.SCHEDULE_VARIANCE:
            # Compute schedule variance: actual − planned
            actual_val = raw.get("actual_progress_percent", 0.0)
            eval_value = actual_val - planned_progress
            eval_direction = DirectionType.MORE_IS_BETTER  # variance evaluated as more-is-better

        elif code == "budget_used":
            # Evaluate as budget utilization % = (budget_used / planned_budget) * 100
            planned_budget = raw.get("planned_budget", 0.0)
            if planned_budget > 0:
                eval_value = (raw.get("budget_used", 0.0) / planned_budget) * 100.0
            else:
                eval_value = 0.0
            eval_direction = direction

        else:
            eval_value = raw.get(code, 0.0)
            eval_direction = direction

        result[code] = evaluate_metric_status(
            actual=eval_value,
            direction=eval_direction,
            green_threshold=spec["green_threshold"],
            amber_threshold=spec["amber_threshold"],
            red_threshold=spec["red_threshold"],
            critical_threshold=spec["critical_threshold"],
        )

    return result
