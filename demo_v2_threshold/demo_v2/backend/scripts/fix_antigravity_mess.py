"""
Fix the mess left by Antigravity + partial surgical_db_clean run.
Uses raw psycopg2 to avoid SQLAlchemy transaction issues.
Restores DB to exactly 6 BUs, 6 Accounts, 8 Projects with all
original submissions/health scores intact.
"""

from __future__ import annotations
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import psycopg2
import psycopg2.extras
import psycopg2.extensions
import uuid as _uuid

# Register UUID adapter so Python uuid.UUID objects work with psycopg2
psycopg2.extras.register_uuid()

# ── Connection ────────────────────────────────────────────────────────────────
DB_URL = "postgresql://postgres:root@127.0.0.1:5432/deliverypulse_ai"

def get_conn():
    return psycopg2.connect(DB_URL)

def run():
    conn = get_conn()
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        print("=" * 60)
        print("DeliveryPulse AI — DB Restore Fix")
        print("=" * 60)

        # ── 1. Find the 8 projects that have submissions ──────────
        cur.execute("""
            SELECT DISTINCT p.id, p.project_code, p.project_name
            FROM projects p
            JOIN submissions s ON s.project_id = p.id
            ORDER BY p.project_code
        """)
        proj_rows = cur.fetchall()
        keep_proj_ids = [r["id"] for r in proj_rows]
        print(f"\nProjects with submissions ({len(keep_proj_ids)}):")
        for r in proj_rows:
            print(f"  {r['project_code']:20s} | {r['project_name']}")

        if not keep_proj_ids:
            print("ERROR: No projects with submissions found!")
            return

        # ── 2. Find accounts, BUs, submissions ───────────────────
        cur.execute("SELECT DISTINCT account_id FROM projects WHERE id = ANY(%s)", (keep_proj_ids,))
        keep_acct_ids = [r["account_id"] for r in cur.fetchall()]

        cur.execute("SELECT DISTINCT business_unit_id FROM accounts WHERE id = ANY(%s)", (keep_acct_ids,))
        keep_bu_ids = [r["business_unit_id"] for r in cur.fetchall()]

        cur.execute("SELECT id FROM submissions WHERE project_id = ANY(%s)", (keep_proj_ids,))
        keep_sub_ids = [r["id"] for r in cur.fetchall()]

        print(f"Accounts to keep: {len(keep_acct_ids)}")
        print(f"BUs to keep: {len(keep_bu_ids)}")
        print(f"Submissions to keep: {len(keep_sub_ids)}")

        # ── 3. Core users to keep ─────────────────────────────────
        core_emails = [
            "admin@deliverypulse.ai",
            "customer.admin@deliverypulse.ai",
            "pm1@deliverypulse.ai",
            "pm2@deliverypulse.ai",
            "priya.dh@deliverypulse.ai",
            "amit.dh@deliverypulse.ai",
            "rajesh.dh@deliverypulse.ai",
            "kiran.dh@deliverypulse.ai",
            "sanjay.dh@deliverypulse.ai",
            "vikram.dh@deliverypulse.ai",
        ]
        cur.execute("SELECT id FROM users WHERE email = ANY(%s)", (core_emails,))
        keep_user_ids = [r["id"] for r in cur.fetchall()]

        # Also keep users referenced by kept submissions
        if keep_sub_ids:
            cur.execute("""
                SELECT DISTINCT created_by_user_id as uid FROM submissions WHERE id = ANY(%s)
                UNION
                SELECT DISTINCT reviewed_by_user_id FROM submissions
                WHERE id = ANY(%s) AND reviewed_by_user_id IS NOT NULL
            """, (keep_sub_ids, keep_sub_ids))
            for r in cur.fetchall():
                if r["uid"] and r["uid"] not in keep_user_ids:
                    keep_user_ids.append(r["uid"])

        print(f"Users to keep: {len(keep_user_ids)}")

        # Excel batches
        if keep_sub_ids:
            cur.execute("SELECT id FROM excel_import_batches WHERE submission_id = ANY(%s)", (keep_sub_ids,))
            keep_batch_ids = [r["id"] for r in cur.fetchall()]
        else:
            keep_batch_ids = []

        # ── 4. Rename duplicate codes with temp suffix ────────────
        print("\nRenaming duplicate codes with temp suffix...")
        cur.execute("""
            UPDATE business_units
            SET code = code || '_DEL_' || substring(id::text, 1, 8)
            WHERE id != ALL(%s)
        """, (keep_bu_ids,))
        print(f"  BUs renamed: {cur.rowcount}")

        cur.execute("""
            UPDATE accounts
            SET code = code || '_DEL_' || substring(id::text, 1, 8)
            WHERE id != ALL(%s)
        """, (keep_acct_ids,))
        print(f"  Accounts renamed: {cur.rowcount}")

        cur.execute("""
            UPDATE projects
            SET project_code = project_code || '_DEL_' || substring(id::text, 1, 8)
            WHERE id != ALL(%s)
        """, (keep_proj_ids,))
        print(f"  Projects renamed: {cur.rowcount}")

        # ── 5. Restore canonical names for kept items ─────────────
        print("\nRestoring canonical names...")

        bu_updates = [
            ("BFSI",          "BFSI"),
            ("HEALTHCARE_LS", "Healthcare"),
            ("RETAIL",        "Retail"),
            ("TMT",           "Technology & Telecom"),
            ("ENERGY",        "Energy"),
            ("PUBLIC_SECTOR", "Public Sector"),
        ]
        for code, name in bu_updates:
            cur.execute("""
                UPDATE business_units SET name=%s, deleted_at=NULL, is_active=TRUE
                WHERE id = ANY(%s) AND (code=%s OR code LIKE %s)
            """, (name, keep_bu_ids, code, code + "%"))

        acct_updates = [
            ("BFSI_AC1",          "Apex Banking"),
            ("HEALTHCARE_AC1",    "St. Jude Health"),
            ("RETAIL_AC1",        "SwiftMart Retail"),
            ("TMT_AC1",           "Telco Prime"),
            ("ENERGY_AC1",        "Nexus Energy"),
            ("PUBLIC_SECTOR_AC1", "State Registry Account"),
        ]
        for code, name in acct_updates:
            cur.execute("""
                UPDATE accounts SET name=%s, deleted_at=NULL, is_active=TRUE
                WHERE id = ANY(%s) AND (code=%s OR code LIKE %s)
            """, (name, keep_acct_ids, code, code + "%"))

        proj_updates = [
            ("BFSI_P1",       "Mobile Banking Portal"),
            ("BFSI_P2",       "Credit Card Analytics"),
            ("HEALTHCARE_P1", "Patient Portal Upgrade"),
            ("HEALTHCARE_P2", "Pharmacy Supply Chain"),
            ("RETAIL_P1",     "E-commerce Platform Redesign"),
            ("RETAIL_P2",     "POS Integration"),
            ("TMT_P1",        "5G Core Cloud Migration"),
            ("ENERGY_P1",     "Smart Grid Analytics"),
        ]
        for code, name in proj_updates:
            cur.execute("""
                UPDATE projects SET project_name=%s, deleted_at=NULL, status='ACTIVE'
                WHERE id = ANY(%s) AND (project_code=%s OR project_code LIKE %s)
            """, (name, keep_proj_ids, code, code + "%"))

        # ── 6. NULL out DH refs on non-canonical BUs ──────────────
        print("Clearing DH refs on non-canonical BUs...")
        cur.execute("""
            UPDATE business_units SET delivery_head_user_id = NULL
            WHERE id != ALL(%s)
        """, (keep_bu_ids,))
        print(f"  BUs cleared: {cur.rowcount}")

        # ── 7. Delete garbage in FK-safe order ────────────────────
        print("\nDeleting garbage data...")

        def safe_delete(label, sql, params):
            cur.execute(sql, params)
            print(f"  {label}: {cur.rowcount} deleted")

        safe_delete("excel_import_rows",
            "DELETE FROM excel_import_rows WHERE batch_id != ALL(%s)",
            (keep_batch_ids or [None],))

        safe_delete("excel_import_batches",
            "DELETE FROM excel_import_batches WHERE id != ALL(%s)",
            (keep_batch_ids or [None],))

        safe_delete("submission_lifecycle_audits",
            "DELETE FROM submission_lifecycle_audits WHERE submission_id != ALL(%s)",
            (keep_sub_ids or [None],))

        # audit_events — use SAVEPOINT so a failure doesn't abort the transaction
        cur.execute("SAVEPOINT sp_audit")
        try:
            cur.execute(
                "DELETE FROM audit_events WHERE entity_id::uuid != ALL(%s)",
                (keep_sub_ids or [None],)
            )
            print(f"  audit_events: {cur.rowcount} deleted")
        except Exception as e:
            cur.execute("ROLLBACK TO SAVEPOINT sp_audit")
            print(f"  audit_events: skipped ({e})")
        cur.execute("RELEASE SAVEPOINT sp_audit")

        # notifications — use SAVEPOINT
        cur.execute("SAVEPOINT sp_notif")
        try:
            cur.execute(
                "DELETE FROM notifications WHERE submission_id IS NOT NULL AND submission_id != ALL(%s)",
                (keep_sub_ids or [None],)
            )
            print(f"  notifications: {cur.rowcount} deleted")
        except Exception as e:
            cur.execute("ROLLBACK TO SAVEPOINT sp_notif")
            print(f"  notifications: skipped ({e})")
        cur.execute("RELEASE SAVEPOINT sp_notif")

        safe_delete("metric_values",
            "DELETE FROM metric_values WHERE submission_id != ALL(%s)",
            (keep_sub_ids or [None],))

        safe_delete("dimension_scores",
            "DELETE FROM dimension_scores WHERE submission_id != ALL(%s)",
            (keep_sub_ids or [None],))

        safe_delete("health_scores",
            "DELETE FROM health_scores WHERE submission_id != ALL(%s)",
            (keep_sub_ids or [None],))

        safe_delete("submissions",
            "DELETE FROM submissions WHERE id != ALL(%s)",
            (keep_sub_ids or [None],))

        safe_delete("projects",
            "DELETE FROM projects WHERE id != ALL(%s)",
            (keep_proj_ids,))

        safe_delete("accounts",
            "DELETE FROM accounts WHERE id != ALL(%s)",
            (keep_acct_ids,))

        safe_delete("business_units",
            "DELETE FROM business_units WHERE id != ALL(%s)",
            (keep_bu_ids,))

        # Get role IDs
        cur.execute("SELECT id FROM roles WHERE code = 'PLATFORM_ADMIN'")
        pa_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM roles WHERE code = 'CUSTOMER_ADMIN'")
        ca_id = cur.fetchone()["id"]

        safe_delete("users",
            "DELETE FROM users WHERE id != ALL(%s) AND role_id NOT IN (%s, %s)",
            (keep_user_ids, pa_id, ca_id))

        # ── 8. Restore PM assignments ─────────────────────────────
        print("\nRestoring PM assignments...")
        cur.execute("SELECT id FROM users WHERE email = 'pm1@deliverypulse.ai'")
        pm1_row = cur.fetchone()
        cur.execute("SELECT id FROM users WHERE email = 'pm2@deliverypulse.ai'")
        pm2_row = cur.fetchone()
        pm1_id = pm1_row["id"] if pm1_row else None
        pm2_id = pm2_row["id"] if pm2_row else None

        pm_map = {
            "BFSI_P1": pm1_id, "BFSI_P2": pm2_id,
            "HEALTHCARE_P1": pm1_id, "HEALTHCARE_P2": pm2_id,
            "RETAIL_P1": pm1_id, "RETAIL_P2": pm2_id,
            "TMT_P1": pm1_id, "ENERGY_P1": pm2_id,
        }
        for code, pm_id in pm_map.items():
            if pm_id:
                cur.execute(
                    "UPDATE projects SET project_manager_id=%s WHERE project_code=%s",
                    (pm_id, code)
                )

        # ── 9. Ensure vikram.dh exists ────────────────────────────
        cur.execute("SELECT id FROM users WHERE email = 'vikram.dh@deliverypulse.ai'")
        vikram = cur.fetchone()
        if not vikram:
            # Create vikram
            from app.auth.password import hash_password
            cur.execute("SELECT id FROM roles WHERE code = 'DELIVERY_HEAD'")
            dh_role_id = cur.fetchone()["id"]
            import uuid
            vikram_id = uuid.uuid4()
            cur.execute("""
                INSERT INTO users (id, email, password_hash, full_name, role_id, is_active, created_at, updated_at)
                VALUES (%s, 'vikram.dh@deliverypulse.ai', %s, 'Vikram (Delivery Head)', %s, TRUE, NOW(), NOW())
            """, (vikram_id, hash_password("Demo@12345"), dh_role_id))
            print("  Created vikram.dh@deliverypulse.ai")
            vikram_id_val = vikram_id
        else:
            vikram_id_val = vikram["id"]

        # Assign vikram to PUBLIC_SECTOR BU
        cur.execute("""
            UPDATE business_units SET delivery_head_user_id = %s
            WHERE code = 'PUBLIC_SECTOR'
        """, (vikram_id_val,))

        conn.commit()
        print("\n✅ Commit successful!")

        # ── 10. Verify ────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("FINAL STATE")
        print("=" * 60)

        for tbl, expected in [
            ("business_units", 6),
            ("accounts", 6),
            ("projects", 8),
            ("submissions", None),
            ("health_scores", None),
            ("users", None),
        ]:
            cur.execute(f"SELECT COUNT(*) as cnt FROM {tbl}")
            cnt = cur.fetchone()["cnt"]
            ok = "✅" if expected is None or cnt == expected else "⚠️ "
            exp_str = f"(expected {expected})" if expected else ""
            print(f"  {ok} {tbl}: {cnt} {exp_str}")

        print("\nProjects + health scores:")
        cur.execute("""
            SELECT p.project_code, p.project_name,
                   COUNT(DISTINCT s.id) as subs,
                   COUNT(DISTINCT hs.id) as hs,
                   MAX(hs.rag_status) as rag
            FROM projects p
            LEFT JOIN submissions s ON s.project_id = p.id
            LEFT JOIN health_scores hs ON hs.submission_id = s.id
            GROUP BY p.project_code, p.project_name
            ORDER BY p.project_code
        """)
        for r in cur.fetchall():
            print(f"  {r['project_code']:20s} | {r['project_name']:35s} | subs={r['subs']} hs={r['hs']} rag={r['rag']}")

        print("\nBusiness Units:")
        cur.execute("""
            SELECT bu.code, bu.name, u.email as dh_email
            FROM business_units bu
            LEFT JOIN users u ON u.id = bu.delivery_head_user_id
            ORDER BY bu.code
        """)
        for r in cur.fetchall():
            print(f"  {r['code']:20s} | {r['name']:30s} | DH: {r['dh_email']}")

        print("\nDemo credentials (all use Demo@12345 except admin):")
        print("  admin@deliverypulse.ai          → Admin@123")
        print("  customer.admin@deliverypulse.ai → Demo@12345")
        print("  pm1@deliverypulse.ai            → Demo@12345")
        print("  pm2@deliverypulse.ai            → Demo@12345")
        print("  priya.dh / amit.dh / rajesh.dh / kiran.dh / sanjay.dh / vikram.dh → Demo@12345")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        import traceback; traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run()
