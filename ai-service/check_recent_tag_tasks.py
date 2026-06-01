import sqlite3
import os

db_path = os.path.expanduser("~/DesignAssetManager/design_asset_manager.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, asset_id, status, error_message, sync_status, created_at FROM ai_tag_tasks ORDER BY created_at DESC LIMIT 10")
rows = cursor.fetchall()
print("\n--- RECENT TAG TASKS ---")
for r in rows:
    print(f"Task ID: {r[0]} | Asset: {r[1]} | Status: {r[2]} | Sync: {r[4]} | Created: {r[5]}")
    if r[3]:
        print(f"  Error: {r[3]}")

conn.close()
