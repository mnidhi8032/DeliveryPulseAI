import sys
import os
from sqlalchemy import create_engine, text

def main():
    engine = create_engine("postgresql+psycopg2://postgres:root@127.0.0.1:5432/deliverypulse_ai")
    with engine.connect() as conn:
        print("ACTIVE BUSINESS UNITS:")
        bus = conn.execute(text("SELECT id, code, name FROM business_units WHERE deleted_at IS NULL")).fetchall()
        print(f"Total Active BUs: {len(bus)}")
        for bu in bus:
            print(f"  {bu}")
            
        print("\nACTIVE ACCOUNTS:")
        accts = conn.execute(text("SELECT id, code, name, business_unit_id FROM accounts WHERE deleted_at IS NULL")).fetchall()
        print(f"Total Active Accounts: {len(accts)}")
        for acct in accts[:10]:
            print(f"  {acct}")

        print("\nACTIVE PROJECTS:")
        projs = conn.execute(text("SELECT id, project_code, project_name, account_id FROM projects WHERE deleted_at IS NULL")).fetchall()
        print(f"Total Active Projects: {len(projs)}")
        for proj in projs[:10]:
            print(f"  {proj}")
            
        print("\nSUBMISSIONS COUNT BY PROJECT:")
        subs = conn.execute(text("SELECT project_id, COUNT(*) FROM submissions GROUP BY project_id")).fetchall()
        print(f"Total Submissions: {sum(c for _, c in subs)}")
        for pid, count in subs:
            p_name = conn.execute(text("SELECT project_name FROM projects WHERE id = :pid"), {"pid": pid}).scalar()
            bu_name = conn.execute(text(
                "SELECT bu.name FROM business_units bu JOIN accounts a ON a.business_unit_id = bu.id JOIN projects p ON p.account_id = a.id WHERE p.id = :pid"
            ), {"pid": pid}).scalar()
            print(f"  Project: '{p_name}' (under BU: '{bu_name}') has {count} submissions")

if __name__ == "__main__":
    main()
