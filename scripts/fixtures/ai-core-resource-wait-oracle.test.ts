import fs from 'node:fs/promises'
import Database from 'better-sqlite3'

// Read-only observation of the explicitly approved public-content library.
const db=new Database('.scratch/ai-core-20261006/real-library-01/.dam/library.sqlite',{readonly:true,fileMustExist:true})
try {
  const stage=await fs.access('.scratch/ai-core-20261006/evidence/bd70-resource-before.json').then(()=>'after',()=>'before')
  const tables=['independent_tag_requests','independent_tag_request_items','independent_tag_executions','basic_analysis_requests','basic_analysis_attempts','background_analysis_execution_history']
  const counts=Object.fromEntries(tables.map(t=>[t,db.prepare('SELECT COUNT(*) FROM "'+t+'"').pluck().get()]))
  const items=db.prepare(`SELECT a.title,i.capability,i.decision,i.revision,x.state,x.attempt_epoch,x.request_id FROM background_analysis_intents i JOIN assets a ON a.id=i.asset_id LEFT JOIN background_analysis_executions x ON x.intent_id=i.id WHERE a.title='A9-page' ORDER BY i.capability`).all()
  const value={at:new Date().toISOString(),candidate:'dam-bd704c7ba0e1f78b',counts,items}
  await fs.writeFile('.scratch/ai-core-20261006/evidence/bd70-resource-'+stage+'.json',JSON.stringify(value,null,2))
  if(stage==='after') {
    const before=JSON.parse(await fs.readFile('.scratch/ai-core-20261006/evidence/bd70-resource-before.json','utf8'))
    if(JSON.stringify(before.counts)!==JSON.stringify(counts)||JSON.stringify(before.items)!==JSON.stringify(items)) throw Error('RESOURCE_WAIT_CREATED_EXECUTIONS')
  }
  console.log(JSON.stringify(value))
} finally {db.close()}
