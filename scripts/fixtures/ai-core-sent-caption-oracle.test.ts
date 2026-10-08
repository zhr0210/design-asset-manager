import fs from 'node:fs/promises'
import Database from 'better-sqlite3'
const db=new Database('.scratch/ai-core-20261006/real-library-01/.dam/library.sqlite',{readonly:true,fileMustExist:true})
try {
 const row=db.prepare(`SELECT a.title,r.request_id,x.attempt_id,x.state,x.updated_at FROM basic_analysis_attempts x JOIN basic_analysis_requests r USING(request_id) JOIN assets a ON a.id=r.asset_id WHERE a.title='A9-page' AND r.capability='caption' AND r.location='local' AND x.state='sent' ORDER BY x.updated_at DESC LIMIT 1`).get() ?? null
 await fs.writeFile('.scratch/ai-core-20261006/evidence/bd70-sent-caption.json',JSON.stringify(row))
}finally{db.close()}
