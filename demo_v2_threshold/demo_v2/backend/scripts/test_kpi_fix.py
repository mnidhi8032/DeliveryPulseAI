# -*- coding: utf-8 -*-
"""Quick sanity tests for the compute_kpi_value UOM fix."""
import sys; sys.path.insert(0, ".")
from app.services.qpm_service import compute_kpi_value

tests = [
    # (description, metric_name, measure_values, uom, expected)
    (
        "Code Review Delivery Rate (ratio)",
        "Code Review Delivery Rate",
        {"Effort spent for Code Review": 1.0, "Total Size": 2.0},
        "Person-hours/Size Unit",
        0.5,
    ),
    (
        "Defect Detection Efficiency % (percent)",
        "Defect Detection Efficiency %",
        {"Number of defects reported from testing": 90.0,
         "Number of defects reported by customer or business": 10.0},
        "%",
        90.0,
    ),
    (
        "Effort Variance % (percent, 3 inputs)",
        "Effort Variance",
        {"Actual Effort for the Work till date": 100.0,
         "Remaining Effort for completing the pending work": 20.0,
         "Planned Effort": 100.0},
        "%",
        20.0,
    ),
    (
        "Overall Delivery Rate (ratio)",
        "Overall Delivery Rate",
        {"Total Actual Effort in Person-hours": 200.0,
         "Delivered and Accepted Size": 100.0},
        "Person-hour per Size Unit",
        2.0,
    ),
    (
        "First Time Fit % (percent)",
        "First Time Fit  %",
        {"# of tickets resolved right first time": 95.0, "# of tickets resolved": 100.0},
        "%",
        95.0,
    ),
    (
        "Testing Defect Density (ratio)",
        "Testing Defect Density",
        {"Total weighted defects from Testing": 6.0, "Size Tested": 2.0},
        "Weighted Defects per Size Unit",
        3.0,
    ),
    (
        "Review Coverage % (percent)",
        "Review Coverage %",
        {"Size of code that is reviewed": 80.0, "Delivered and Accepted Size": 100.0},
        "%",
        80.0,
    ),
]

passed = 0
failed = 0
for desc, metric, measures, uom, expected in tests:
    result = compute_kpi_value(metric, measures, uom=uom)
    ok = result is not None and abs(result - expected) < 0.001
    status = "PASS" if ok else "FAIL"
    if ok:
        passed += 1
    else:
        failed += 1
    print(f"[{status}] {desc}: got {result}, expected {expected}")

print(f"\n{passed}/{passed+failed} tests passed")
if failed:
    print("FIX NEEDED")
else:
    print("All correct!")
