import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'

// Read-only end audit of the explicitly authorized public Libraries. No App
// settings, account database, credentials, runtime request files or OS secrets.
const root=path.resolve('.scratch/local-ai-implementation-20261006')
const baseline=JSON.parse(await fs.readFile('.scratch/b-model-management-20261006/evidence/library-before.json','utf8'))
const targets=new Set(['public-04-coffee','public-01-astronaut'])
const experiments=[
 {name:'public-main',library:path.resolve('.scratch/b-model-management-20261006/real-library-01'),expectedAssets:44},
 {name:'background-copy',library:path.join(root,'background-ca8819d6-7793-4549-8e43-bc50eac77293/library'),expectedAssets:47}
]
const results=[]
for(const experiment of experiments){
 const control=path.join(experiment.library,'.dam'),db=new Database(path.join(control,'library.sqlite'),{readonly:true,fileMustExist:true})
 try{
  db.exec('BEGIN')
  assert.equal(db.pragma('integrity_check',{simple:true}),'ok');assert.deepEqual(db.pragma('foreign_key_check'),[])
  const assets=db.prepare('SELECT id,title,ai_caption,ai_caption_is_user_edited FROM assets ORDER BY id').all() as any[]
  assert.equal(assets.length,experiment.expectedAssets)
  const byId=new Map(assets.map(a=>[a.id,a]))
  for(const asset of baseline.assets){
   assert.ok(byId.has(asset.id),'An existing source asset must remain present')
   if(asset.ai_caption_is_user_edited||!targets.has(asset.title))assert.deepEqual(byId.get(asset.id),asset,'Manual and non-target metadata must remain exact')
  }
  for(const table of ['tags','asset_tags','library_folders','library_folder_assets'])
   assert.deepEqual(db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),baseline.manualRelations[table],table+' preserves confirmed metadata and organization')
  const edited=db.prepare('SELECT * FROM asset_ocr_state ORDER BY rowid').all() as any[]
  const protectedOcr=baseline.manualRelations.asset_ocr_state.filter((r:any)=>r.edited_text!==null||!targets.has(baseline.assets.find((a:any)=>a.id===r.asset_id)?.title))
  for(const previous of protectedOcr)assert.deepEqual(edited.find(r=>r.asset_id===previous.asset_id),previous,'Human OCR and non-target OCR remain exact')
  for(const file of baseline.files){
   const relative=file.path.replaceAll('\\','/'),target=path.resolve(experiment.library,relative)
   assert.ok(target.startsWith(experiment.library+path.sep))
   const stat=await fs.lstat(target);assert.equal(stat.isSymbolicLink(),false)
   assert.equal(createHash('sha256').update(await fs.readFile(target)).digest('hex'),file.sha256,'Original/required preview retains exact bytes')
  }
  const counts=Object.fromEntries(['basic_analysis_requests','basic_analysis_attempts','basic_analysis_evidence','background_analysis_executions','background_analysis_execution_history','independent_tag_executions']
   .map(table=>[table,db.prepare(`SELECT count(*) FROM ${table}`).pluck().get()]))
  if(experiment.name==='background-copy'){
   const previous=JSON.parse(await fs.readFile(path.join(path.dirname(experiment.library),'before-normal-reopen.json'),'utf8'))
   assert.deepEqual(counts,previous.counts,'Normal reopen/idle must not create attempts or effects')
   const current=db.prepare(`SELECT x.attempt_epoch,x.state,a.title,i.capability FROM background_analysis_executions x
     JOIN background_analysis_intents i ON i.id=x.intent_id JOIN assets a ON a.id=i.asset_id WHERE a.title='T14-page' ORDER BY i.capability`).all()
   assert.deepEqual(current,[{attempt_epoch:2,state:'succeeded',title:'T14-page',capability:'caption'},
    {attempt_epoch:1,state:'succeeded',title:'T14-page',capability:'ocr'},{attempt_epoch:1,state:'succeeded',title:'T14-page',capability:'tags'}])
   assert.deepEqual(db.prepare('SELECT state,error_code FROM basic_analysis_attempts WHERE request_id=?').get('2d05850d-aba2-47b9-b0f0-3787eea932ce'),{state:'unknown',error_code:'ABANDONED'})
   assert.equal(db.prepare('SELECT count(*) FROM basic_analysis_evidence WHERE request_id=?').pluck().get('2d05850d-aba2-47b9-b0f0-3787eea932ce'),0)
  }
  const registry=JSON.parse(await fs.readFile(path.join(control,'.dam-asset-retrieval.json'),'utf8'))
  assert.match(registry.canonical,/^asset-vectors-[a-f0-9-]{36}\.sqlite$/)
  const vectors=new Database(path.join(control,registry.canonical),{readonly:true,fileMustExist:true})
  let spaces:any[]
  try{assert.equal(vectors.pragma('integrity_check',{simple:true}),'ok');spaces=vectors.prepare('SELECT space,count(*) AS vectors FROM vectors GROUP BY space ORDER BY space').all()
   assert.deepEqual(spaces.map(s=>s.vectors),[44,44],'Source vectors persist; new background assets do not implicitly generate vectors')}
  finally{vectors.close()}
  results.push({name:experiment.name,assets:assets.length,protectedFiles:baseline.files.length,manualCaptions:baseline.assets.filter((a:any)=>a.ai_caption_is_user_edited).length,
   protectedOcr:protectedOcr.length,confirmedRelations:'unchanged',originalsAndRequiredPreviews:'same SHA-256',integrity:'ok',foreignKeys:0,counts,spaces})
 }finally{db.close()}
}
const result={at:new Date().toISOString(),scope:'read-only designated public main and recoverable background copy',results}
await fs.writeFile(path.join(root,'evidence/protection-non-ui-final.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result))
