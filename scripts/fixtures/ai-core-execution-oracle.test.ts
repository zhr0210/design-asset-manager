import Database from 'better-sqlite3'
const db = new Database('.scratch/ai-core-20261006/real-library-01/.dam/library.sqlite', { readonly: true, fileMustExist: true })
try {
  const rows = {
    background: db.prepare(`SELECT a.title,i.capability,x.state,x.attempt_epoch,x.request_id,x.updated_at FROM background_analysis_executions x JOIN background_analysis_intents i ON i.id=x.intent_id JOIN assets a ON a.id=i.asset_id ORDER BY x.updated_at`).all(),
    basic: db.prepare(`SELECT a.title,r.capability,x.state,x.error_code,x.updated_at FROM basic_analysis_attempts x JOIN basic_analysis_requests r USING(request_id) JOIN assets a ON a.id=r.asset_id ORDER BY x.updated_at DESC LIMIT 8`).all(),
    tags: db.prepare(`SELECT a.title,x.state,x.error_code,x.updated_at FROM independent_tag_executions x JOIN assets a ON a.id=x.asset_id ORDER BY x.updated_at DESC LIMIT 8`).all(),
    outbox: db.prepare(`SELECT 'basic' AS kind,delivered,COUNT(*) AS count FROM basic_analysis_outbox GROUP BY delivered UNION ALL SELECT 'tag',delivered,COUNT(*) FROM independent_tag_outbox GROUP BY delivered`).all()
  }
  console.log(JSON.stringify(rows))
} finally { db.close() }
