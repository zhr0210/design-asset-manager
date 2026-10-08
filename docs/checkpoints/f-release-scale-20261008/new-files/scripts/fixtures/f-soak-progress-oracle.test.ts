import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'

// Public F test subset only. No settings, credentials or runtime request files.
const db = new Database(path.resolve('.scratch/f-release-scale-20261008/library-10000/.dam/library.sqlite'), { readonly: true, fileMustExist: true })
try {
  const rows = db.prepare(`SELECT a.title,r.capability,e.output_json
    FROM basic_analysis_evidence e JOIN basic_analysis_requests r ON r.request_id=e.request_id
    JOIN assets a ON a.id=r.asset_id WHERE a.title LIKE 'F-soak-%' ORDER BY a.title,r.capability`).all()
  assert.ok(rows.length > 0)
  console.log(JSON.stringify(rows))
} finally { db.close() }
