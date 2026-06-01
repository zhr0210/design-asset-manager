import sqlite3
import os

db_path = os.path.expanduser("~/DesignAssetManager/design_asset_manager.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\n--- RECENT SYNCED TAG SUGGESTIONS ---")
cursor.execute("SELECT id, asset_id, tag_name, confidence, status, created_at FROM tag_suggestions ORDER BY created_at DESC LIMIT 15")
rows = cursor.fetchall()
for r in rows:
    print(f"ID: {r[0]} | Asset: {r[1]} | Tag: {r[2]} | Conf: {r[3]} | Status: {r[4]} | Created: {r[5]}")

conn.close()
