# -*- coding: utf-8 -*-
"""Debug the mapping structure for failing metrics."""
import sys, json
sys.path.insert(0, ".")

_MAP_FILE = "scripts/measure_mapping.json"
data = json.load(open(_MAP_FILE))

for metric_name in ["Defect Detection Efficiency %", "Effort Variance"]:
    rows = [r for r in data if r["metric"] == metric_name]
    print(f"\n=== {metric_name} ===")
    print(f"  Formula: {rows[0]['formula']}")
    for r in rows:
        print(f"  measure: {r['measure']}")
        print(f"    n_seq={r.get('n_seq')}  n_op={repr(r.get('n_op'))}")
        print(f"    d_seq={r.get('d_seq')}  d_op={repr(r.get('d_op'))}")
