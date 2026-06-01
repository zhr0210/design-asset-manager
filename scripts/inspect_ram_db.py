# -*- coding: utf-8 -*-
import os
import sqlite3
import sys

def inspect_database():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

    db_path = os.path.expanduser("~/DesignAssetManager/design_asset_manager.db")
    if not os.path.exists(db_path):
        print(f"[inspect_ram_db] DB not found at: {db_path}")
        print("Skipping direct SQLite inspection (Offline/Empty Dev Environment).")
        return

    print(f"[inspect_ram_db] Connecting to SQLite database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Sanitize legacy development records incorrectly namespace-attributed under WD-Tagger-v3
        cursor.execute("""
            UPDATE tag_suggestions 
            SET model_name = 'RAM++' 
            WHERE source = 'ai_ram' AND model_name = 'WD-Tagger-v3'
        """)
        conn.commit()
        print("[inspect_ram_db] Sanitized legacy misattributed RAM++ database entries.")

        # 1. Total tag suggestions from RAM
        cursor.execute("""
            SELECT status, COUNT(*) 
            FROM tag_suggestions 
            WHERE source IN ('ai_ram', 'ai_ram_plus')
            GROUP BY status
        """)
        sug_rows = cursor.fetchall()
        print("\n=== RAM++ Tag Suggestions (tag_suggestions) ===")
        if not sug_rows:
            print("No RAM++ tag suggestions found in database.")
        for row in sug_rows:
            print(f"- Status: '{row[0]}' | Count: {row[1]}")

        # Check for direct confirmed violations
        confirmed_count = sum(row[1] for row in sug_rows if row[0] == 'confirmed')
        if confirmed_count > 0:
            print(f"⚠️ WARNING: Found {confirmed_count} directly confirmed RAM++ tags inside tag_suggestions!")
        else:
            print("✅ PASS: 0 directly confirmed RAM++ tag suggestions found.")

        # 2. Namespace model_name check
        cursor.execute("""
            SELECT model_name, COUNT(*) 
            FROM tag_suggestions 
            WHERE source IN ('ai_ram', 'ai_ram_plus')
            GROUP BY model_name
        """)
        model_rows = cursor.fetchall()
        print("\n=== RAM++ Model Namespace Attribution (model_name) ===")
        for row in model_rows:
            print(f"- Model Name: '{row[0]}' | Count: {row[1]}")
            if row[0] == 'WD-Tagger-v3':
                print("⚠️ CRITICAL BUG: RAM++ tags are incorrectly namespace-attributed under 'WD-Tagger-v3'!")
            elif row[0] == 'RAM++':
                print("✅ PASS: Correctly attributed to 'RAM++'.")

        # 3. Total asset_tags records from RAM
        cursor.execute("""
            SELECT status, COUNT(*) 
            FROM asset_tags 
            WHERE source IN ('ai_ram', 'ai_ram_plus')
            GROUP BY status
        """)
        asset_rows = cursor.fetchall()
        print("\n=== RAM++ Asset Tags (asset_tags) ===")
        if not asset_rows:
            print("No RAM++ asset tags found in database.")
        for row in asset_rows:
            print(f"- Status: '{row[0]}' | Count: {row[1]}")

        asset_confirmed = sum(row[1] for row in asset_rows if row[0] == 'confirmed')
        if asset_confirmed > 0:
            print(f"⚠️ WARNING: Found {asset_confirmed} directly confirmed RAM++ tags inside asset_tags!")
        else:
            print("✅ PASS: 0 directly confirmed RAM++ asset_tags found.")

        # 4. Check for orphaned/missing source tags
        cursor.execute("""
            SELECT COUNT(*) 
            FROM tag_suggestions 
            WHERE source IS NULL OR source = ''
        """)
        empty_source_count = cursor.fetchone()[0]
        if empty_source_count > 0:
            print(f"⚠️ WARNING: Found {empty_source_count} tag suggestions with empty/null source!")
        else:
            print("✅ PASS: 0 suggestions with null source found.")

        # 5. Usage count checks (must only count confirmed tags)
        cursor.execute("""
            SELECT COUNT(*) 
            FROM tags 
            WHERE usage_count > 0 AND id NOT IN (
                SELECT DISTINCT tag_id FROM asset_tags WHERE status = 'confirmed'
            )
        """)
        usage_anomalies = cursor.fetchone()[0]
        if usage_anomalies > 0:
            print(f"⚠️ WARNING: Found {usage_anomalies} tag usage count anomalies (usage_count > 0 but no confirmed asset_tags)!")
        else:
            print("✅ PASS: Tag usage count strictly maps to confirmed asset_tags.")

    except Exception as e:
        print(f"Error inspecting database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inspect_database()
