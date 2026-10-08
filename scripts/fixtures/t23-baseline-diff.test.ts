import fs from 'node:fs/promises'
import path from 'node:path'
import Database from 'better-sqlite3'
const root=path.resolve('.scratch/local-ai-implementation-20261006'),setup=JSON.parse(await fs.readFile(path.join(root,'recovery-cfea412f-2b5a-4bdf-9004-42e1d742178c/setup.json'),'utf8'))
const results=[]
for(const [name,library] of [['public-main',path.resolve('.scratch/b-model-management-20261006/real-library-01')],['damaged',setup.damaged],['scale',setup.scale],['background',path.join(root,'background-ca8819d6-7793-4549-8e43-bc50eac77293/library')]]){
 const db=new Database(path.join(library,'.dam/library.sqlite'),{readonly:true,fileMustExist:true})
 try{results.push({name,asset:db.prepare(`SELECT id,title,ai_caption,ai_caption_updated_at,ai_caption_is_user_edited FROM assets WHERE title='A-bg-astronaut'`).get(),
  attempts:db.prepare(`SELECT r.request_id,r.model_name,x.state,x.updated_at FROM basic_analysis_attempts x JOIN basic_analysis_requests r USING(request_id) JOIN assets a ON a.id=r.asset_id WHERE a.title='A-bg-astronaut' ORDER BY x.updated_at`).all(),
  visual:db.prepare(`SELECT e.id,json_extract(e.evidence_json,'$.model') AS model_name,e.created_at FROM visual_ai_evidence e JOIN assets a ON a.id=e.asset_id WHERE a.title='A-bg-astronaut' ORDER BY e.created_at`).all()})}finally{db.close()}
}
await fs.writeFile(path.join(root,'t23-evidence/baseline-diff.json'),JSON.stringify({at:new Date().toISOString(),scope:'read only, approved public asset and copies',results},null,2));console.log(JSON.stringify(results))
