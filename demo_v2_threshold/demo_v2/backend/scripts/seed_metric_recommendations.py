"""
Seed default metric recommendations — Spec 14.
Run once after applying migration q1r2s3t4u5v6.

Usage:
    cd backend
    python scripts/seed_metric_recommendations.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.database import SessionLocal
from app.services.metric_recommendation_service import MetricRecommendationService

# (metric_name, breach_type, recommendation_text)
SEEDS = [
    # ── Effort Variance ─────────────────────────────────────────────────────
    ("Effort Variance", "over_usl",
     "Actual effort is significantly exceeding the plan. Review recent scope changes and re-baseline the estimate. "
     "Check whether unplanned work was added to the sprint without adjusting capacity."),

    ("Effort Variance", "over_target_amber",
     "Effort is trending above plan. Monitor closely and confirm there is no scope creep. "
     "If the trend continues for two more periods, escalate for re-planning."),

    # ── Schedule Variance ────────────────────────────────────────────────────
    ("Schedule Variance", "under_lsl",
     "Sprint or project delivery is significantly behind schedule. Run an immediate retrospective to identify blockers. "
     "Consider reducing scope for the current iteration to recover the schedule."),

    ("Schedule Variance", "under_target_amber",
     "Delivery is slightly behind schedule. Identify and resolve the current top blocker this week. "
     "Confirm no dependencies are waiting on external teams."),

    # ── Delivered Defect Density ─────────────────────────────────────────────
    ("Delivered Defect Density", "over_usl",
     "Defect rate is critically high. Pause new feature development and focus on quality improvements. "
     "Review testing practices, code review thoroughness, and consider additional test coverage for high-risk modules."),

    ("Delivered Defect Density", "over_target_amber",
     "Defect trend is rising. Review testing practices and code review thoroughness. "
     "Identify the most defect-prone modules and increase unit test coverage there first."),

    # ── First Time Fit % ─────────────────────────────────────────────────────
    ("First Time Fit %", "under_lsl",
     "Too many deliverables are failing initial review. Improve the definition of done and ensure acceptance criteria "
     "are reviewed before development starts — not after."),

    ("First Time Fit %", "under_target_amber",
     "First-pass acceptance rate is below target. Check whether requirements clarity needs improvement. "
     "Consider a brief pre-review checklist before formal handoff."),

    # ── Productivity ─────────────────────────────────────────────────────────
    ("Productivity", "under_lsl",
     "Productivity is critically below the required level. Investigate team capacity issues, blockers, and meeting overhead. "
     "Review sprint planning practices to ensure realistic commitments."),

    ("Productivity", "under_target_amber",
     "Productivity is slightly below target. Confirm the team's focus and remove any distractions. "
     "Check if there are any unresolved impediments raised in standups."),

    # ── Code Review Delivery Rate ────────────────────────────────────────────
    ("Code Review Delivery Rate", "under_lsl",
     "Code review cycle is critically slow. Identify the bottleneck — is it reviewer availability or review complexity? "
     "Consider setting a 24-hour SLA for code review responses."),

    ("Code Review Delivery Rate", "under_target_amber",
     "Code review turnaround is slightly below target. Remind the team of the expected review SLA. "
     "Check if any pull requests have been waiting for more than 2 days."),

    # ── Test Design Review Delivery Rate ────────────────────────────────────
    ("Test Design Review Delivery Rate", "under_lsl",
     "Test design review is significantly delayed. Ensure test design documents are being submitted early enough "
     "to allow reviewer time. Consider parallel test design and development where feasible."),

    ("Test Design Review Delivery Rate", "under_target_amber",
     "Test design review turnaround is below target. Check reviewer availability and prioritise pending reviews."),

    # ── Within-limits metrics (generic advice) ───────────────────────────────
    ("SLA Compliance", "outside_limits",
     "SLA is outside acceptable bounds. Review the last reporting period for any incidents or outages that caused breaches. "
     "Engage with the account team immediately if a client SLA breach is involved."),

    ("Billability %", "outside_limits",
     "Billability is outside the acceptable range. Review timesheet entries for the period and correct any misallocations. "
     "If billability is consistently low, discuss resource utilisation with the Delivery Manager."),
]


def main() -> None:
    with SessionLocal() as session:
        svc = MetricRecommendationService(session)
        added = updated = 0
        for metric_name, breach_type, text in SEEDS:
            existing = svc.get_for(metric_name, breach_type)
            svc.upsert(metric_name, breach_type, text)
            if existing:
                updated += 1
            else:
                added += 1
        print(f"Done. {added} added, {updated} updated.")


if __name__ == "__main__":
    main()
