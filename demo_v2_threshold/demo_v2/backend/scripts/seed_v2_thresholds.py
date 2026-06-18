"""
Seed V2 governance thresholds into metric_definitions.

Implements the four RAG logic types from QPM Plan Excel (RAG-Calculation-Logic sheet):

  Intent            | Direction Type  | G            | A                  | R
  ──────────────────┼─────────────────┼──────────────┼────────────────────┼────────────
  Higher the better | MORE_IS_BETTER  | >= Target    | >LSL & <Target     | <= LSL
  Lower the better  | LESS_IS_BETTER  | <= Target    | >Target & <USL     | >= USL
  Nominal the best  | NOMINAL_BEST    | == Target±   | inside LSL/USL     | >USL or <LSL
  Within the Limits | WITHIN_LIMITS   | inside LSL/U | —                  | >USL or <LSL

Threshold field mapping per direction:
  MORE_IS_BETTER:
      green_threshold    = Target    (>= this → GREEN)
      red_threshold      = LSL       (< this  → RED)
      critical_threshold = hard floor (< this → CRITICAL, below LSL floor)
      amber_threshold    = None

  LESS_IS_BETTER:
      green_threshold    = Target    (<= this → GREEN)
      red_threshold      = USL       (> this  → RED)
      critical_threshold = hard ceil (> this  → CRITICAL, above USL ceiling)
      amber_threshold    = None

  NOMINAL_BEST:
      green_threshold    = Target    (ideal value)
      amber_threshold    = tolerance (±band; actual within Target±tolerance → GREEN)
      red_threshold      = LSL       (below → RED)
      critical_threshold = USL       (above → RED)

  WITHIN_LIMITS:
      red_threshold      = LSL       (below → RED)
      critical_threshold = USL       (above → RED)
      green_threshold    = None
      amber_threshold    = None

Run:
    python scripts/seed_v2_thresholds.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from app.models.metric_definition import MetricDefinition
from database.database import SessionLocal

# ---------------------------------------------------------------------------
# Threshold definitions — aligned to QPM Plan Excel logic
# ---------------------------------------------------------------------------

THRESHOLDS = [
    # ── Schedule ──────────────────────────────────────────────────────────
    # actual_progress_percent: evaluated as SCHEDULE_VARIANCE
    #   variance = actual_progress - planned_progress
    #   Excel intent: "Lower the better" on variance (negative = behind schedule)
    #   Here we use MORE_IS_BETTER on variance:
    #     variance >= -2  → GREEN  (within 2% of plan)
    #     variance <  -15 → RED
    #     variance <  -25 → CRITICAL
    {
        "code":             "actual_progress_percent",
        "direction_type":   "SCHEDULE_VARIANCE",  # pre-computes variance, then MORE_IS_BETTER
        "green_threshold":  -2.0,    # variance >= -2% → on track (GREEN)
        "amber_threshold":  None,
        "red_threshold":    -15.0,   # variance < -15% → RED
        "critical_threshold": -25.0, # variance < -25% → CRITICAL
    },
    {
        # Excel: Lower the better
        "code":             "dependency_delay_count",
        "direction_type":   "LESS_IS_BETTER",
        "green_threshold":  0.0,     # 0 delays → GREEN
        "amber_threshold":  None,
        "red_threshold":    3.0,     # > 3 → RED
        "critical_threshold": 6.0,  # > 6 → CRITICAL
    },

    # ── Quality ───────────────────────────────────────────────────────────
    {
        # Excel: Lower the better
        "code":             "critical_defects",
        "direction_type":   "LESS_IS_BETTER",
        "green_threshold":  0.0,
        "amber_threshold":  None,
        "red_threshold":    3.0,
        "critical_threshold": 8.0,
    },
    {
        # Excel: Higher the better  (Target=95, LSL=80)
        "code":             "test_pass_rate",
        "direction_type":   "MORE_IS_BETTER",
        "green_threshold":  95.0,    # >= 95% → GREEN
        "amber_threshold":  None,
        "red_threshold":    80.0,    # < 80% → RED
        "critical_threshold": 60.0, # < 60% → CRITICAL
    },
    {
        # Excel: Lower the better
        "code":             "prod_incidents",
        "direction_type":   "LESS_IS_BETTER",
        "green_threshold":  0.0,
        "amber_threshold":  None,
        "red_threshold":    2.0,
        "critical_threshold": 5.0,
    },

    # ── Scope ─────────────────────────────────────────────────────────────
    {
        # Excel: Lower the better
        "code":             "scope_change_requests",
        "direction_type":   "LESS_IS_BETTER",
        "green_threshold":  1.0,
        "amber_threshold":  None,
        "red_threshold":    4.0,
        "critical_threshold": 7.0,
    },
    {
        # Excel: Higher the better  (Target=90, LSL=75)
        "code":             "requirement_stability_percent",
        "direction_type":   "MORE_IS_BETTER",
        "green_threshold":  90.0,
        "amber_threshold":  None,
        "red_threshold":    75.0,
        "critical_threshold": 60.0,
    },

    # ── Finance ───────────────────────────────────────────────────────────
    # budget_used: pre-processed as utilization% = (budget_used / planned_budget)*100
    # Excel intent: Within the Limits — utilization must stay inside LSL/USL
    # LSL=85% (shouldn't be way under-spent), USL=100% (shouldn't overrun)
    # RED if overrun >115%, CRITICAL if >130%
    {
        "code":             "budget_used",
        "direction_type":   "LESS_IS_BETTER",   # utilization% — lower overrun is better
        "green_threshold":  100.0,   # <= 100% utilization → GREEN
        "amber_threshold":  None,
        "red_threshold":    115.0,   # > 115% → RED
        "critical_threshold": 130.0, # > 130% → CRITICAL
    },
    {
        # Excel: Lower the better
        "code":             "billing_delay_days",
        "direction_type":   "LESS_IS_BETTER",
        "green_threshold":  7.0,
        "amber_threshold":  None,
        "red_threshold":    20.0,
        "critical_threshold": 35.0,
    },

    # ── People & Delivery ─────────────────────────────────────────────────
    {
        # Excel: Higher the better  (Target=90, LSL=75)
        "code":             "resource_availability",
        "direction_type":   "MORE_IS_BETTER",
        "green_threshold":  90.0,
        "amber_threshold":  None,
        "red_threshold":    75.0,
        "critical_threshold": 60.0,
    },
    {
        # Excel: Lower the better
        "code":             "team_attrition",
        "direction_type":   "LESS_IS_BETTER",
        "green_threshold":  0.0,
        "amber_threshold":  None,
        "red_threshold":    2.0,
        "critical_threshold": 5.0,
    },

    # ── Reference-only (no thresholds) ───────────────────────────────────
    {
        "code":             "planned_progress_percent",
        "direction_type":   None,
        "green_threshold":  None,
        "amber_threshold":  None,
        "red_threshold":    None,
        "critical_threshold": None,
    },
    {
        "code":             "planned_budget",
        "direction_type":   None,
        "green_threshold":  None,
        "amber_threshold":  None,
        "red_threshold":    None,
        "critical_threshold": None,
    },
]


def main() -> None:
    session = SessionLocal()
    updated = 0
    skipped = 0
    try:
        for spec in THRESHOLDS:
            row = session.execute(
                select(MetricDefinition).where(MetricDefinition.code == spec["code"])
            ).scalar_one_or_none()

            if row is None:
                print(f"  SKIP (not found): {spec['code']}")
                skipped += 1
                continue

            row.direction_type     = spec["direction_type"]
            row.green_threshold    = spec["green_threshold"]
            row.amber_threshold    = spec["amber_threshold"]
            row.red_threshold      = spec["red_threshold"]
            row.critical_threshold = spec["critical_threshold"]
            updated += 1
            print(f"  OK: {spec['code']:45s}  dir={spec['direction_type']}")

        session.commit()
        print(f"\nDone. Updated {updated} metrics, skipped {skipped}.")
    except Exception as e:
        session.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
