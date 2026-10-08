import fs from 'node:fs/promises'
import Database from 'better-sqlite3'
const db = new Database('.scratch/b-model-management-20261006/real-library-01/.dam/library.sqlite', { readonly: true, fileMustExist: true })
try {
  const result = {
    basic: db.prepare(`SELECT a.title,r.capability,r.model_name,x.state,x.error_code,x.updated_at,e.output_json FROM basic_analysis_attempts x JOIN basic_analysis_requests r USING(request_id) JOIN assets a ON a.id=r.asset_id LEFT JOIN basic_analysis_evidence e USING(request_id) WHERE r.created_at > '2026-10-06T12:15:00' ORDER BY x.updated_at`).all(),
    tags: db.prepare(`SELECT a.title,x.state,x.error_code,x.updated_at FROM independent_tag_executions x JOIN assets a ON a.id=x.asset_id WHERE x.updated_at > '2026-10-06T12:15:00' ORDER BY x.updated_at`).all(),
    outbox: db.prepare(`SELECT 'basic' AS kind,delivered,COUNT(*) AS count FROM basic_analysis_outbox GROUP BY delivered UNION ALL SELECT 'tag',delivered,COUNT(*) FROM independent_tag_outbox GROUP BY delivered`).all()
  }
  await fs.writeFile('.scratch/b-model-management-20261006/evidence/executions-latest.json', JSON.stringify(result,null,2))
  console.log(JSON.stringify(result))
} finally { db.close() }
