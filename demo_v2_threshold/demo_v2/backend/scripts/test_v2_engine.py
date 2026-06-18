"""
Quick smoke test for the V2 governance health engine.
Tests all five example scenarios from the spec document.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.health_engine.health_calculator import calculate_health_v2

SEP = "-" * 60

def run(label, metrics):
    project_status, dim_statuses, metric_statuses, explanations = calculate_health_v2(metrics)
    print(f"\n{SEP}")
    print(f"Scenario: {label}")
    print(f"  Metric statuses:")
    for k, v in metric_statuses.items():
        print(f"    {k:<40} {v}")
    print(f"  Dimension statuses:")
    for k, v in dim_statuses.items():
        print(f"    {k:<25} {v}")
    print(f"  PROJECT STATUS: {project_status}")
    print(f"  Explanation:")
    for line in explanations:
        print(f"    {line}")

# Scenario 1 — All healthy (expect GREEN)
run("All GREEN", {
    "planned_progress_percent": 50,
    "actual_progress_percent":  50,   # variance = 0 → GREEN
    "dependency_delay_count":   0,
    "critical_defects":         0,
    "test_pass_rate":           97,
    "prod_incidents":           0,
    "scope_change_requests":    1,
    "requirement_stability_percent": 95,
    "budget_used":              90000,
    "planned_budget":           100000,  # utilization 90% → GREEN
    "billing_delay_days":       5,
    "resource_availability":    92,
    "team_attrition":           0,
})

# Scenario 2 — One CRITICAL metric (expect CRITICAL project)
run("Critical Defects = CRITICAL → Project CRITICAL", {
    "planned_progress_percent": 50,
    "actual_progress_percent":  50,
    "dependency_delay_count":   0,
    "critical_defects":         10,   # >8 → CRITICAL
    "test_pass_rate":           97,
    "prod_incidents":           0,
    "scope_change_requests":    1,
    "requirement_stability_percent": 95,
    "budget_used":              90000,
    "planned_budget":           100000,
    "billing_delay_days":       5,
    "resource_availability":    92,
    "team_attrition":           0,
})

# Scenario 3 — Two RED dimensions (expect RED project)
run("Schedule RED + Finance RED → Project RED", {
    "planned_progress_percent": 60,
    "actual_progress_percent":  40,   # variance = -20 → RED
    "dependency_delay_count":   5,    # >3 → RED
    "critical_defects":         0,
    "test_pass_rate":           97,
    "prod_incidents":           0,
    "scope_change_requests":    1,
    "requirement_stability_percent": 95,
    "budget_used":              125000,  # 125% utilization → RED
    "planned_budget":           100000,
    "billing_delay_days":       25,   # >20 → RED
    "resource_availability":    92,
    "team_attrition":           0,
})

# Scenario 4 — One RED dimension (expect AMBER project)
run("One RED dimension → Project AMBER", {
    "planned_progress_percent": 60,
    "actual_progress_percent":  44,   # variance = -16 → RED
    "dependency_delay_count":   0,
    "critical_defects":         0,
    "test_pass_rate":           97,
    "prod_incidents":           0,
    "scope_change_requests":    1,
    "requirement_stability_percent": 95,
    "budget_used":              90000,
    "planned_budget":           100000,
    "billing_delay_days":       5,
    "resource_availability":    92,
    "team_attrition":           0,
})

# Scenario 5 — AMBER metrics only (expect AMBER project)
run("AMBER metrics only → Project AMBER", {
    "planned_progress_percent": 60,
    "actual_progress_percent":  55,   # variance = -5 → AMBER
    "dependency_delay_count":   2,    # >0 but <=3 → AMBER
    "critical_defects":         1,    # >0 but <=3 → AMBER
    "test_pass_rate":           85,   # <95 but >=80 → AMBER
    "prod_incidents":           1,    # >0 but <=2 → AMBER
    "scope_change_requests":    2,    # >1 but <=4 → AMBER
    "requirement_stability_percent": 80,  # <90 but >=75 → AMBER
    "budget_used":              105000,   # 105% → AMBER
    "planned_budget":           100000,
    "billing_delay_days":       12,   # >7 but <=20 → AMBER
    "resource_availability":    80,   # <90 but >=75 → AMBER
    "team_attrition":           1,    # >0 but <=2 → AMBER
})

print(f"\n{SEP}")
print("Smoke test complete.")
