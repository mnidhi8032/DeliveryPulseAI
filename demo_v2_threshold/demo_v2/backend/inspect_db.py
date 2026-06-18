import sys
import os
from sqlalchemy import create_engine, inspect, text

def main():
    engine = create_engine("postgresql+psycopg2://postgres:root@127.0.0.1:5432/deliverypulse_ai")
    
    try:
        with engine.connect() as conn:
            print("Connected successfully.")
            
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            print("\nTables found:")
            for table in tables:
                # get counts
                count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                print(f" - {table} ({count} rows)")
                
                # print some foreign keys
                fks = inspector.get_foreign_keys(table)
                if fks:
                    for fk in fks:
                        constrained_columns = ", ".join(fk['constrained_columns'])
                        referred_table = fk['referred_table']
                        referred_columns = ", ".join(fk['referred_columns'])
                        print(f"    -> FK: {constrained_columns} references {referred_table}({referred_columns})")
    except Exception as e:
        print(f"Error connecting: {e}")

if __name__ == "__main__":
    main()
