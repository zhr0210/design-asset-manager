import fs from 'node:fs/promises'
import Database from 'better-sqlite3'
const started=new Date().toISOString()
const db=new Database('.scratch/ai-core-20261006/real-library-01/.dam/library.sqlite',{readonly:true,fileMustExist:true})
try {
 const find=db.prepare(`SELECT r.request_id,x.attempt_id,r.model_name,r.reasoning_json,x.state,x.updated_at FROM basic_analysis_attempts x JOIN basic_analysis_requests r USING(request_id) JOIN assets a ON a.id=r.asset_id WHERE a.title='public-04-coffee' AND r.capability='caption' AND r.location='external' AND x.state='sent' AND r.created_at>=? ORDER BY r.created_at DESC LIMIT 1`)
 const until=Date.now()+120000
 while(Date.now()<until) {
  const row=find.get(started)
  if(row){await fs.writeFile('.scratch/ai-core-20261006/evidence/bd70-cloud-sent-observed.json',JSON.stringify({candidate:'dam-bd704c7ba0e1f78b',observedAt:new Date().toISOString(),started,...row}));console.log('Observed fresh cloud request in sent state');break}
  await new Promise(resolve=>setTimeout(resolve,100))
 }
}finally{db.close()}
