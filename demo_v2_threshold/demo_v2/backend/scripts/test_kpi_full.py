# -*- coding: utf-8 -*-
"""Full test suite for compute_kpi_value after the UOM + operator fix."""
import sys
sys.path.insert(0, ".")
from app.services.qpm_service import compute_kpi_value

tests = [
    # Ratio metrics (no x100)
    ("Code Review Delivery Rate",       {"Effort spent for Code Review": 1.0,  "Total Size": 2.0},                                                     "Person-hours/Size Unit",       0.5),
    ("Overall Delivery Rate",           {"Total Actual Effort in Person-hours": 200.0, "Delivered and Accepted Size": 100.0},                          "Person-hour per Size Unit",    2.0),
    ("Coding Delivery Rate",            {"Effort spent for Coding": 3.0, "Total Size": 2.0},                                                           "Person-hours/Size Unit",       1.5),
    ("Design Delivery Rate",            {"Effort spent for Design": 1.2, "Total Size": 2.0},                                                           "Person-hours/Size Unit",       0.6),
    ("Testing Defect Density",          {"Total weighted defects from Testing": 6.0, "Size Tested": 2.0},                                              "Weighted Defects per Size Unit", 3.0),
    ("Review Defect Density",           {"Total weighted Review defects": 4.0, "Total Size reviewed": 2.0},                                            "Weighted Defects per Size Unit", 2.0),
    ("Cost Performance Index",          {"Earned Value": 950.0, "Actual Cost": 1000.0},                                                                "Number",                       0.95),
    ("Schedule Performance Index",      {"Earned Value": 900.0, "Planned Value": 1000.0},                                                              "Number",                       0.9),
    ("Productivity",                    {"Delivered and Accepted Size": 50.0, "Total Actual Effort in Person day": 10.0},                              "Size Unit per Person day",     5.0),
    ("Review Efficiency",               {"Total weighted Review defects": 6.0, "Review Effort in Person day": 2.0},                                    "Weighted Defects per Person-day", 3.0),
    ("Test Design Productivity",        {"Total Size": 20.0, "Effort spent for Test Design in Person-days": 4.0},                                      "Size Unit/ Person-day",        5.0),
    ("Test Execution Productivity",     {"Total Size": 40.0, "Effort spent for Test Execution in Person-days": 4.0},                                   "Size Unit/ Person-day",        10.0),
    ("Backlog Management Index",        {"Number of tickets closed in a month": 95.0, "Number of tickets reported in a month": 100.0},                 "Number",                       0.95),
    # Percentage metrics (x100)
    ("Defect Detection Efficiency %",   {"Number of defects reported from testing": 90.0, "Number of defects reported by customer or business": 10.0}, "%",                            90.0),
    ("First Time Fit  %",               {"# of tickets resolved right first time": 95.0, "# of tickets resolved": 100.0},                             "%",                            95.0),
    ("Effort Variance",                 {"Actual Effort for the Work till date": 100.0, "Remaining Effort for completing the pending work": 20.0, "Planned Effort": 100.0}, "%", 20.0),
    ("Rework %",                        {"Rework Effort": 5.0, "Total Effort": 100.0},                                                                 "%",                            5.0),
    ("Reuse Saving %",                  {"Actual Effort saving through Re-use": 20.0, "Planned Effort": 100.0},                                        "%",                            20.0),
    ("Review Coverage %",               {"Size of code that is reviewed": 80.0, "Delivered and Accepted Size": 100.0},                                 "%",                            80.0),
    ("Unit Test Coverage %",            {"Size of code that is unit tested": 75.0, "Delivered and Accepted Size": 100.0},                              "%",                            75.0),
    ("Test Automation %",               {"Number of test cases automated": 90.0, "Total number of automatable test cases": 100.0},                     "%",                            90.0),
    ("Test Coverage %",                 {"Number of test cases executed in a build or cycle": 98.0, "Total number of Test cases planned for execution": 100.0}, "%",                  98.0),
    ("Commitment to Delivery %",        {"Delivered and Accepted Size": 97.0, "Size of Items committed": 100.0},                                       "%",                            97.0),
    ("Percentage Code Review Effort",   {"Effort spent on Code or Script Reviews": 15.0, "Total Engineering Effort": 100.0},                           "%",                            15.0),
    ("First time Test Case Pass %",     {"Number of Test Cases passed first time": 85.0, "Number of test cases executed": 100.0},                      "%",                            85.0),
    ("Defect Leakage  %",               {"Number of defects reported by customer or business": 3.0, "Number of defects reported from testing": 97.0},  "%",                            3.0),
    ("% of Customer Rejected Candidates", {"Number of resources rejected by customer for a position": 3.0, "Number of resource profiles qualfied internally for the same position": 60.0}, "%", 5.0),
    ("Ontime completion",               {"# of items completed ontime": 95.0, "# items planned for completion": 100.0},                               "%",                            95.0),
]

passed = failed = 0
for desc, measures, uom, expected in tests:
    result = compute_kpi_value(desc, measures, uom=uom)
    ok = result is not None and abs(result - expected) < 0.01
    status = "PASS" if ok else "FAIL"
    if ok:
        passed += 1
    else:
        failed += 1
    print(f"[{status}] {desc}: got {round(result,4) if result is not None else None}, expected {expected}")

print(f"\n{passed}/{passed+failed} tests passed")
if failed:
    print("FAILURES NEED FIXING")
else:
    print("All correct!")
