import fs from 'node:fs/promises'
import path from 'node:path'
import Database from 'better-sqlite3'

const root=path.resolve('.scratch/local-ai-implementation-20261006')
const setup=JSON.parse(await fs.readFile(path.join(root,'recovery-cfea412f-2b5a-4bdf-9004-42e1d742178c/setup.json'),'utf8'))
const db=new Database(path.join(setup.scale,'.dam/library.sqlite'),{readonly:true,fileMustExist:true})
try{
 const attempts=db.prepare(`SELECT a.title,r.request_id,r.capability,r.model_name,x.attempt_id,x.state,x.error_code,x.updated_at
 FROM basic_analysis_attempts x JOIN basic_analysis_requests r USING(request_id) JOIN assets a ON a.id=r.asset_id
 WHERE a.title IN ('规模-咖啡-119','规模-咖啡-120') ORDER BY x.updated_at`).all()
 const result={at:new Date().toISOString(),scope:'read-only, two public scale copies; no App settings or runtime secrets',attempts}
 await fs.appendFile(path.join(root,'t23-evidence/analysis-phases.jsonl'),JSON.stringify(result)+'\n');console.log(JSON.stringify(result))
}finally{db.close()}
