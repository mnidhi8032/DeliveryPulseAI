"""Trace the exact calculation for every metric in measure_mapping.json."""
import json
from collections import defaultdict
from pathlib import Path

with open(Path(__file__).parent / "measure_mapping.json", encoding="utf-8") as f:
    data = json.load(f)

by_metric = defaultdict(list)
for row in data:
    by_metric[row["metric"]].append(row)

print("=" * 80)
print("HOW EACH METRIC IS CALCULATED")
print("=" * 80)

for metric in sorted(by_metric.keys()):
    rows = by_metric[metric]
    ct = rows[0].get("comp_type", "D")
    formula = rows[0].get("formula", "")
    print(f"\n[{ct}] {metric}")
    print(f"     Formula : {formula}")

    if ct == "D":
        m = rows[0]["measure"]
        print(f"     Type    : DIRECT — you enter 1 value, that value IS the KPI")
        print(f"     Input   : {m}")
        print(f"     Result  : KPI = {m}")
    else:
        nums = sorted([r for r in rows if r.get("n_seq")], key=lambda x: x["n_seq"])
        dens = sorted([r for r in rows if r.get("d_seq") and not r.get("n_seq")], key=lambda x: x["d_seq"])

        print(f"     Type    : COMPUTED — formula applied to {len(rows)} measures")
        print(f"     NUMERATOR measures:")
        for r in nums:
            op = r.get("n_op", "")
            print(f"       N{r['n_seq']}  [{op:2s}]  {r['measure']}")
        if dens:
            print(f"     DENOMINATOR measures:")
            for r in dens:
                op = r.get("d_op", "")
                print(f"       D{r['d_seq']}  [{op:2s}]  {r['measure']}")
            print(f"     Result  : (numerator / denominator) * 100")
        else:
            print(f"     Result  : numerator value directly (no division)")

print("\n" + "=" * 80)
print("EXAMPLE CALCULATIONS")
print("=" * 80)

# Run the actual compute function with sample values
import sys
sys.path.insert(0, str(Path(__file__).parents[1]))

from app.services.qpm_service import compute_kpi_value, get_required_measures

examples = [
    ("Effort Variance",           {"Actual Effort for the Work till date": 600, "Remaining Effort for completing the pending work": 500, "Planned Effort": 1000}),
    ("Delivered Defect Density",  {"Total Weighted Defects Leaked to Customer": 3, "Delivered and Accepted Size": 150}),
    ("Productivity",              {"Delivered and Accepted Size": 200, "Total Actual Effort in Person day": 40}),
    ("Unit Test Coverage %",      {"Size of code that is unit tested": 80, "Delivered and Accepted Size": 100}),
    ("Review Coverage %",         {"Size of code that is reviewed": 90, "Delivered and Accepted Size": 100}),
    ("Rework %",                  {"Rework Effort": 50, "Total Effort": 500}),
    ("Commitment to Delivery %",  {"Delivered and Accepted Size": 49, "Size of Items committed": 50}),
    ("SLA Adherance % - P1 Resolution", {"# of P1 tickets resolved within SLA": 19, "# of P1 tickets resolved": 20}),
    ("Customer Satisfaction Index", {"CSAT Score": 4.2}),
    ("Gross Margin%",             {"Gross Margin%": 47}),
    ("First time Test Case Pass %", {"Number of Test Cases passed first time": 90, "Number of test cases executed": 100}),
]

for metric, inputs in examples:
    result = compute_kpi_value(metric, inputs)
    measures = get_required_measures(metric)
    print(f"\n{metric}")
    for k, v in inputs.items():
        print(f"  Input: {k} = {v}")
    print(f"  KPI Result = {round(result, 4) if result is not None else 'None'}")
