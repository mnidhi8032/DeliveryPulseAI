"""
RAG Explainer — Spec 14.

Generates a plain-English explanation of WHY a metric is Red or Amber,
using the same threshold values that produced the RAG status.

This module contains NO database writes and NO AI calls.
It is pure template logic — deterministic and unit-testable in isolation.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Sequence


# ── Breach type constants ──────────────────────────────────────────────────────

BREACH_UNDER_LSL           = "under_lsl"           # "Higher is better" RED
BREACH_UNDER_TARGET_AMBER  = "under_target_amber"  # "Higher is better" AMBER
BREACH_OVER_USL            = "over_usl"            # "Lower is better" RED
BREACH_OVER_TARGET_AMBER   = "over_target_amber"   # "Lower is better" AMBER
BREACH_OUTSIDE_LIMITS      = "outside_limits"      # "Within limits" RED
BREACH_NOMINAL_ABOVE       = "outside_nominal_above"  # "Nominal" — too high
BREACH_NOMINAL_BELOW       = "outside_nominal_below"  # "Nominal" — too low


def _f(v: float | Decimal | None) -> str:
    """Format a number for display — up to 2 decimal places, strip trailing zeros."""
    if v is None:
        return "—"
    n = float(v)
    if n == int(n):
        return str(int(n))
    return f"{n:.2f}".rstrip("0").rstrip(".")


def _trend_phrase(trend_values: list[float], is_worsening: bool, is_first_breach: bool) -> str:
    """Build a trend sentence suffix."""
    if is_first_breach:
        return " This is the first time this metric has breached the threshold."
    if len(trend_values) < 2:
        return ""
    if is_worsening:
        return f" This has worsened over the last {len(trend_values)} recorded period{'s' if len(trend_values) > 1 else ''}."
    return f" Performance has been inconsistent over the last {len(trend_values)} period{'s' if len(trend_values) > 1 else ''}."


def classify_breach(
    actual: float,
    intent: str,
    target: float | None,
    lsl: float | None,
    usl: float | None,
    rag: str,
) -> str | None:
    """
    Return the breach_type string for a given metric state.
    Returns None if RAG is GREEN or there is no breach to classify.
    """
    i = (intent or "").lower()

    if rag not in ("RED", "AMBER"):
        return None

    if "higher" in i or "more" in i:
        if rag == "RED":
            return BREACH_UNDER_LSL
        return BREACH_UNDER_TARGET_AMBER

    if "lower" in i or "less" in i:
        if rag == "RED":
            return BREACH_OVER_USL
        return BREACH_OVER_TARGET_AMBER

    if "nominal" in i:
        if target is not None:
            if actual > target:
                return BREACH_NOMINAL_ABOVE
            return BREACH_NOMINAL_BELOW
        return BREACH_NOMINAL_ABOVE  # fallback

    if "within" in i or "limit" in i:
        return BREACH_OUTSIDE_LIMITS

    return None


def build_explanation(
    metric_name: str,
    actual: float,
    uom: str | None,
    intent: str | None,
    target: float | None,
    lsl: float | None,
    usl: float | None,
    rag: str,
    breach_type: str | None,
    trend_values: list[float],
    is_worsening: bool,
    is_first_breach: bool,
) -> str | None:
    """
    Generate the plain-English explanation sentence.
    Returns None if RAG is GREEN or no breach can be explained.
    """
    if rag not in ("RED", "AMBER") or breach_type is None:
        return None

    unit = f" {uom}" if uom else ""
    val_str  = _f(actual) + unit
    trend    = _trend_phrase(trend_values, is_worsening, is_first_breach)

    if breach_type == BREACH_UNDER_LSL:
        margin = _f(float(lsl) - actual) if lsl is not None else "—"
        lsl_str = _f(lsl) + unit
        return (
            f"{metric_name} is {val_str}, which is {margin} points below "
            f"the lower acceptable limit of {lsl_str}.{trend}"
        )

    if breach_type == BREACH_UNDER_TARGET_AMBER:
        tgt_str = _f(target) + unit
        return (
            f"{metric_name} is {val_str}, which is below the target of {tgt_str}. "
            f"Performance needs attention.{trend}"
        )

    if breach_type == BREACH_OVER_USL:
        margin = _f(actual - float(usl)) if usl is not None else "—"
        usl_str = _f(usl) + unit
        return (
            f"{metric_name} is {val_str}, which is {margin} points above "
            f"the upper limit of {usl_str}.{trend}"
        )

    if breach_type == BREACH_OVER_TARGET_AMBER:
        tgt_str = _f(target) + unit
        return (
            f"{metric_name} is {val_str}, which is above the target of {tgt_str}. "
            f"Monitor closely.{trend}"
        )

    if breach_type == BREACH_OUTSIDE_LIMITS:
        if lsl is not None and actual < float(lsl):
            lsl_str = _f(lsl) + unit
            return (
                f"{metric_name} is {val_str}, which is below the lower limit of {lsl_str}.{trend}"
            )
        if usl is not None and actual > float(usl):
            usl_str = _f(usl) + unit
            return (
                f"{metric_name} is {val_str}, which is above the upper limit of {usl_str}.{trend}"
            )
        return f"{metric_name} is {val_str}, which is outside the acceptable limits.{trend}"

    if breach_type == BREACH_NOMINAL_ABOVE:
        tgt_str = _f(target) + unit
        margin = _f(actual - float(target)) if target is not None else "—"
        return (
            f"{metric_name} is {val_str}, which is {margin} points above "
            f"the nominal target of {tgt_str}.{trend}"
        )

    if breach_type == BREACH_NOMINAL_BELOW:
        tgt_str = _f(target) + unit
        margin = _f(float(target) - actual) if target is not None else "—"
        return (
            f"{metric_name} is {val_str}, which is {margin} points below "
            f"the nominal target of {tgt_str}.{trend}"
        )

    return None


def extract_and_explain(
    metric_name: str,
    actual: float | Decimal,
    uom: str | None,
    intent: str | None,
    target: float | Decimal | None,
    lsl: float | Decimal | None,
    usl: float | Decimal | None,
    rag: str,
    recent_values: Sequence[float | Decimal] | None = None,
) -> dict:
    """
    Main entry point.

    Given all the facts about a single metric measurement, returns:
    {
        "explanation":   str | None,
        "breach_type":   str | None,
        "is_worsening":  bool,
        "is_first_breach": bool,
        "trend_values":  list[float],
    }

    recent_values: list of actual values from past periods, oldest first,
                   NOT including the current measurement.
    """
    actual_f   = float(actual)
    target_f   = float(target)  if target is not None else None
    lsl_f      = float(lsl)     if lsl    is not None else None
    usl_f      = float(usl)     if usl    is not None else None
    history    = [float(v) for v in (recent_values or [])]

    # Trend analysis
    is_first_breach = len(history) == 0
    is_worsening    = False

    if not is_first_breach and rag in ("RED", "AMBER"):
        # "Worsening" = the most recent previous value was better (closer to target)
        prev = history[-1]
        intent_lower = (intent or "").lower()
        if "higher" in intent_lower or "more" in intent_lower:
            is_worsening = actual_f < prev
        elif "lower" in intent_lower or "less" in intent_lower:
            is_worsening = actual_f > prev
        elif "nominal" in intent_lower and target_f is not None:
            is_worsening = abs(actual_f - target_f) > abs(prev - target_f)
        elif "within" in intent_lower or "limit" in intent_lower:
            # For within-limits, worsening = moving further from centre
            centre = ((lsl_f or 0) + (usl_f or 0)) / 2
            is_worsening = abs(actual_f - centre) > abs(prev - centre)

    trend_values = history[-3:] + [actual_f]  # last 3 + current

    breach_type = classify_breach(actual_f, intent or "", target_f, lsl_f, usl_f, rag)
    explanation = build_explanation(
        metric_name  = metric_name,
        actual       = actual_f,
        uom          = uom,
        intent       = intent,
        target       = target_f,
        lsl          = lsl_f,
        usl          = usl_f,
        rag          = rag,
        breach_type  = breach_type,
        trend_values = trend_values,
        is_worsening = is_worsening,
        is_first_breach = is_first_breach,
    )

    return {
        "explanation":     explanation,
        "breach_type":     breach_type,
        "is_worsening":    is_worsening,
        "is_first_breach": is_first_breach,
        "trend_values":    trend_values,
    }
