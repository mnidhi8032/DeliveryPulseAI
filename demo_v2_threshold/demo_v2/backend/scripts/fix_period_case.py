"""
Fix case-duplicate period entries in kpi_measure_entries and kpi_measurements.
For each plan_metric_id + measure_name, if multiple rows exist with the same
frequency_name differing only by case (e.g. q5 and Q5), keep the most recently
updated row and delete the older duplicates.
Same for kpi_measurements.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1]))

from database.database import SessionLocal
from sqlalchemy import text

with SessionLocal() as s:
    print("=== Fixing kpi_measure_entries ===")
    # Find case-duplicate groups
    dupes = s.execute(text("""
        SELECT plan_metric_id, measure_name, LOWER(frequency_name) as fn_lower,
               COUNT(*) as cnt
        FROM kpi_measure_entries
        GROUP BY plan_metric_id, measure_name, LOWER(frequency_name)
        HAVING COUNT(*) > 1
    """)).fetchall()
    print(f"Found {len(dupes)} duplicate groups in kpi_measure_entries")

    for row in dupes:
        pid, mname, fn_lower, cnt = row
        # Get all rows for this group ordered by updated_at DESC
        entries = s.execute(text("""
            SELECT id, frequency_name, updated_at FROM kpi_measure_entries
            WHERE plan_metric_id = :pid
              AND measure_name = :mname
              AND LOWER(frequency_name) = :fnl
            ORDER BY updated_at DESC NULLS LAST
        """), {"pid": pid, "mname": mname, "fnl": fn_lower}).fetchall()

        # Keep the first (most recent), normalize its frequency_name to the first seen casing
        keep_id = entries[0][0]
        keep_fn = entries[0][1]  # preserve the casing of the most recent

        # Delete older duplicates
        for e in entries[1:]:
            s.execute(text("DELETE FROM kpi_measure_entries WHERE id = :id"), {"id": e[0]})
            print(f"  Deleted kpi_measure_entries id={e[0]} period={e[1]} (kept {keep_fn})")

    print("\n=== Fixing kpi_measurements ===")
    dupes2 = s.execute(text("""
        SELECT plan_metric_id, LOWER(frequency_name) as fn_lower, COUNT(*) as cnt
        FROM kpi_measurements
        GROUP BY plan_metric_id, LOWER(frequency_name)
        HAVING COUNT(*) > 1
    """)).fetchall()
    print(f"Found {len(dupes2)} duplicate groups in kpi_measurements")

    for row in dupes2:
        pid, fn_lower, cnt = row
        measurements = s.execute(text("""
            SELECT id, frequency_name, updated_at FROM kpi_measurements
            WHERE plan_metric_id = :pid
              AND LOWER(frequency_name) = :fnl
            ORDER BY updated_at DESC NULLS LAST
        """), {"pid": pid, "fnl": fn_lower}).fetchall()

        keep_id = measurements[0][0]
        keep_fn = measurements[0][1]

        for m in measurements[1:]:
            s.execute(text("DELETE FROM kpi_measurements WHERE id = :id"), {"id": m[0]})
            print(f"  Deleted kpi_measurements id={m[0]} period={m[1]} (kept {keep_fn})")

    s.commit()
    print("\nDone. All case-duplicate periods merged.")
