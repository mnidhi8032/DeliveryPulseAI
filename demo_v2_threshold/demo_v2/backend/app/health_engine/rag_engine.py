"""
V2 Governance Status utilities.

score_to_rag() is kept for backward-compat with any code that still calls it.
In V2 the engine returns GovernanceStatus strings directly — no numeric
score-to-RAG mapping is needed.  This module now maps governance statuses
to the legacy RAG strings used in the DB and API.
"""

from app.core.governance_constants import GovernanceStatus


def score_to_rag(score: float) -> str:
    """
    Legacy helper — maps a sentinel score back to a governance status string.

    Sentinel values (from health_calculator.STATUS_SCORE):
        90.0 → GREEN
        65.0 → AMBER
        40.0 → RED
        25.0 → CRITICAL

    Any other value falls back to the nearest band.
    """
    if score >= 80.0:
        return GovernanceStatus.GREEN
    if score >= 50.0:
        return GovernanceStatus.AMBER
    if score >= 30.0:
        return GovernanceStatus.RED
    return GovernanceStatus.CRITICAL


def governance_status_to_rag(status: str) -> str:
    """
    Direct pass-through — governance status IS the RAG status in V2.
    CRITICAL maps to RED for any legacy code that only understands 3 bands.
    """
    if status == GovernanceStatus.CRITICAL:
        return GovernanceStatus.CRITICAL
    return status
