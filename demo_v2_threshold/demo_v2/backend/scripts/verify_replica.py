import psycopg2

def get_table_counts(db_name):
    conn = psycopg2.connect(f'postgresql://postgres:root@127.0.0.1:5432/{db_name}')
    cur = conn.cursor()
    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
    tables = cur.fetchall()
    counts = {}
    for t in tables:
        cur.execute(f"SELECT COUNT(*) FROM {t[0]}")
        counts[t[0]] = cur.fetchone()[0]
    conn.close()
    return counts

original = get_table_counts("deliverypulse_ai")
replica  = get_table_counts("deliverypulse_ai_v2")

print(f"{'Table':<35} {'Original':>10} {'Replica':>10} {'Match':>8}")
print("-" * 68)

all_match = True
all_tables = sorted(set(list(original.keys()) + list(replica.keys())))
for table in all_tables:
    o = original.get(table, "MISSING")
    r = replica.get(table, "MISSING")
    match = "✓" if o == r else "✗ MISMATCH"
    if o != r:
        all_match = False
    print(f"{table:<35} {str(o):>10} {str(r):>10} {match:>8}")

print("-" * 68)
if all_match:
    print("\n✓ REPLICA IS A PERFECT MATCH — all tables and row counts are identical.")
else:
    print("\n✗ MISMATCH DETECTED — check the rows above.")
