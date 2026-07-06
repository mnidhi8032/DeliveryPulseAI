# -*- coding: utf-8 -*-
"""Test whether n_op is 'operator for this row' or 'operator for next row'."""
import sys, json
sys.path.insert(0, ".")

data = json.load(open("scripts/measure_mapping.json"))

# Effort Variance: formula = (Actual + Remaining - Planned) / Planned
# n_seq: Actual(1,op=+), Remaining(2,op=-), Planned(3,op='')
# If n_op on row N means "how to insert THIS term":
#   start=Actual, then -Remaining = Actual-Remaining, then +Planned (empty=+) = Actual-Remaining+Planned
#   = 100-20+100=180 / 100 = 180% WRONG
#
# If n_op on row N means "how to insert NEXT term (N+1)":
#   start=Actual, apply n_op=+ to Remaining -> Actual+Remaining, apply n_op=- to Planned -> Actual+Remaining-Planned
#   = 100+20-100=20 / 100 = 20% CORRECT

print("Effort Variance operators (n_op convention check):")
rows = sorted([r for r in data if r["metric"] == "Effort Variance" and r.get("n_seq")], key=lambda x: x["n_seq"])
for r in rows:
    print(f"  n_seq={r['n_seq']} measure={r['measure'][:30]} n_op={repr(r['n_op'])}")

print()
print("Expected formula: (Actual + Remaining - Planned) / Planned")
print("=> n_op on row N is the operator applied to row N+1 (look-ahead)")
print()

# Check Defect Detection: formula = Internal / (Internal + Customer)
print("Defect Detection Efficiency operators:")
rows2 = [r for r in data if r["metric"] == "Defect Detection Efficiency %"]
for r in rows2:
    print(f"  measure={r['measure'][:40]} n_seq={r.get('n_seq')} d_seq={r.get('d_seq')} d_op={repr(r.get('d_op'))}")

print()
print("Denominator: d_seq=1(Internal,d_op=+) then d_seq=2(Customer,d_op='')")
print("=> d_op on row 1 is applied when combining row 2 into denominator")
print("=> empty d_op on last row means nothing (last item, no combining needed)")
print("=> d_op=+ on row 1 means: denom = Internal + Customer = 90 + 10 = 100 CORRECT")
