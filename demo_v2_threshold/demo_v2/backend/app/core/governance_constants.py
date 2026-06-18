"""Governance dimensions and status constants (V2 Governance-Based Engine)."""

from enum import StrEnum


class DimensionName(StrEnum):
    SCHEDULE = "Schedule"
    QUALITY = "Quality"
    SCOPE = "Scope"
    FINANCE = "Finance"
    PEOPLE_DELIVERY = "People & Delivery"


class GovernanceStatus(StrEnum):
    """Four-tier governance status used at metric, dimension, and project level."""
    GREEN    = "GREEN"
    AMBER    = "AMBER"
    RED      = "RED"
    CRITICAL = "CRITICAL"


# Kept for backward-compat with any code that still imports RagStatus
class RagStatus(StrEnum):
    GREEN    = "GREEN"
    AMBER    = "AMBER"
    RED      = "RED"
    CRITICAL = "CRITICAL"


# Direction types for threshold evaluation
class DirectionType(StrEnum):
    MORE_IS_BETTER     = "MORE_IS_BETTER"
    LESS_IS_BETTER     = "LESS_IS_BETTER"
    SCHEDULE_VARIANCE  = "SCHEDULE_VARIANCE"
    NOMINAL_BEST       = "NOMINAL_BEST"    # target is ideal; LSL/USL are limits
    WITHIN_LIMITS      = "WITHIN_LIMITS"   # no target; just must stay inside LSL/USL


# Status severity order (higher index = worse)
STATUS_SEVERITY: dict[str, int] = {
    GovernanceStatus.GREEN:    0,
    GovernanceStatus.AMBER:    1,
    GovernanceStatus.RED:      2,
    GovernanceStatus.CRITICAL: 3,
}

# Legacy — kept so existing imports don't break; not used by V2 engine
DIMENSION_WEIGHTS: dict[str, float] = {
    DimensionName.SCHEDULE:       25.0,
    DimensionName.QUALITY:        25.0,
    DimensionName.SCOPE:          15.0,
    DimensionName.FINANCE:        20.0,
    DimensionName.PEOPLE_DELIVERY: 15.0,
}

# Legacy numeric thresholds — not used by V2 engine
RAG_GREEN_MIN   = 80.0
RAG_AMBER_MIN   = 50.0
RED_DIMENSION_CAP = 79.0
