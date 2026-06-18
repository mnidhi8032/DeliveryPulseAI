import psycopg2

conn = psycopg2.connect('postgresql://postgres:root@127.0.0.1:5432/deliverypulse_ai')
cur = conn.cursor()
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
tables = cur.fetchall()
print("Tables in deliverypulse_ai:")
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t[0]}")
    count = cur.fetchone()[0]
    print(f"  {t[0]}: {count} rows")
conn.close()
