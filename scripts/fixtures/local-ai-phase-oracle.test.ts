import Database from 'better-sqlite3'
const profile = '.scratch/wc01-real-model-library-20261005/run-U4eFuo/profile-04'
const app = new Database(profile + '/app-state/app-state.sqlite', { readonly: true, fileMustExist: true })
const library = new Database('.scratch/b-model-management-20261006/real-library-01/.dam/library.sqlite', { readonly: true, fileMustExist: true })
try {
  // Only public package/analysis metadata; no settings, account or credential tables.
  const packages = app.prepare('SELECT variant, json_extract(record,\'$.state\') AS state, json_extract(record,\'$.error\') AS error, json_extract(record,\'$.completedBytes\') AS bytes FROM managed_gguf_packages').all()
  const attempts = library.prepare(`SELECT a.title,r.capability,r.model_name,x.state,x.error_code,x.updated_at
    FROM basic_analysis_attempts x JOIN basic_analysis_requests r USING(request_id)
    JOIN assets a ON a.id=r.asset_id ORDER BY x.updated_at DESC LIMIT 6`).all()
  console.log(JSON.stringify({ packages, attempts }))
} finally { app.close(); library.close() }
