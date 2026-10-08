import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'

// Read-only oracle for the explicitly authorized public copies. No App settings,
// accounts, runtime requests, credentials or arbitrary user-selected paths.
const root=path.resolve('.scratch/local-ai-implementation-20261006')
const setup=JSON.parse(await fs.readFile(path.join(root,'recovery-cfea412f-2b5a-4bdf-9004-42e1d742178c/setup.json'),'utf8'))
const baseline=JSON.parse(await fs.readFile('.scratch/b-model-management-20261006/evidence/library-before.json','utf8'))
const results=[]
const analysisTargets=new Set(['public-04-coffee','public-01-astronaut'])
for(const [name,library] of [['public-main',path.resolve('.scratch/b-model-management-20261006/real-library-01')],['damaged',setup.damaged],['scale',setup.scale],['background',path.join(root,'background-ca8819d6-7793-4549-8e43-bc50eac77293/library')]] as const){
 const control=path.join(library,'.dam'),db=new Database(path.join(control,'library.sqlite'),{readonly:true,fileMustExist:true})
 try{
  db.exec('BEGIN');assert.equal(db.pragma('integrity_check',{simple:true}),'ok');assert.deepEqual(db.pragma('foreign_key_check'),[])
  const assets=db.prepare('SELECT id,title,ai_caption,ai_caption_is_user_edited FROM assets ORDER BY id').all() as any[]
  const observedAiChanges=[]
  if(name==='scale')assert.equal(assets.length,164,'Exactly 120 authorized copies were added to the original 44')
  if(name==='background'){
   assert.equal(assets.length,48,'Only the one authorized T23 page was added to the existing 47')
   const executions=db.prepare(`SELECT i.capability,x.state,x.attempt_epoch FROM background_analysis_executions x
    JOIN background_analysis_intents i ON i.id=x.intent_id JOIN assets a ON a.id=i.asset_id
    WHERE a.title='T23-background-page' ORDER BY i.capability`).all()
   assert.deepEqual(executions,[{capability:'caption',state:'succeeded',attempt_epoch:1},{capability:'ocr',state:'succeeded',attempt_epoch:1},{capability:'tags',state:'succeeded',attempt_epoch:1}])
   assert.deepEqual(db.prepare('SELECT state,error_code FROM basic_analysis_attempts WHERE request_id=?').get('2d05850d-aba2-47b9-b0f0-3787eea932ce'),{state:'unknown',error_code:'ABANDONED'})
   assert.equal(db.prepare('SELECT count(*) FROM basic_analysis_evidence WHERE request_id=?').pluck().get('2d05850d-aba2-47b9-b0f0-3787eea932ce'),0)
  }
  if(name==='scale'){
   assert.equal(db.prepare('SELECT state FROM basic_analysis_attempts WHERE request_id=?').pluck().get('6bd1c4e8-3252-4e48-9ace-41d55a7482ae'),'unknown','Explicit new execution keeps the original unknown audit')
   assert.equal(db.prepare('SELECT count(*) FROM basic_analysis_evidence WHERE request_id=?').pluck().get('6bd1c4e8-3252-4e48-9ace-41d55a7482ae'),0,'Unknown cancelled work never acquires a fabricated effect')
  }
  for(const previous of baseline.assets){
   const current=assets.find(a=>a.id===previous.id);assert.ok(current,'Every original asset remains present')
   if(previous.ai_caption_is_user_edited||!analysisTargets.has(previous.title)){
    if(name==='damaged'&&previous.title==='A-bg-astronaut'&&!previous.ai_caption_is_user_edited){
     assert.deepEqual(db.prepare('SELECT state,updated_at FROM basic_analysis_attempts WHERE request_id=?').get('981e1a69-2325-4b31-a4ae-109ab34ee245'),{state:'succeeded',updated_at:'2026-10-07T09:21:32.717Z'},'The pre-existing copy change must retain its actual successful audit')
     assert.equal(current.ai_caption_is_user_edited,0)
     observedAiChanges.push({title:previous.title,kind:'caption',requestId:'981e1a69-2325-4b31-a4ae-109ab34ee245',status:'differs from historical B baseline; execution observed during UI pause; operator not established'})
    }else assert.deepEqual(current,previous,'Manual and all other non-target descriptions remain exact')
   }
  }
  for(const table of ['tags','asset_tags','library_folders','library_folder_assets']){
   const rows=db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all() as any[]
   for(const previous of baseline.manualRelations[table])assert.ok(rows.some(r=>JSON.stringify(r)===JSON.stringify(previous)),table+' preserves every original confirmed relation')
  }
  const ocr=db.prepare('SELECT * FROM asset_ocr_state ORDER BY rowid').all() as any[]
  for(const previous of baseline.manualRelations.asset_ocr_state.filter((r:any)=>r.edited_text!==null||!analysisTargets.has(baseline.assets.find((a:any)=>a.id===r.asset_id)?.title))){
   if(name==='damaged'&&baseline.assets.find((a:any)=>a.id===previous.asset_id)?.title==='A-bg-astronaut'&&previous.edited_text===null){
    assert.deepEqual(db.prepare('SELECT state,updated_at FROM basic_analysis_attempts WHERE request_id=?').get('e1ea6d53-a893-4d95-b64c-f892e50ea28c'),{state:'succeeded',updated_at:'2026-10-07T09:21:35.548Z'})
    assert.equal(ocr.find(r=>r.asset_id===previous.asset_id)?.edited_text,null)
    observedAiChanges.push({title:'A-bg-astronaut',kind:'ocr',requestId:'e1ea6d53-a893-4d95-b64c-f892e50ea28c',status:'new audited result during UI pause; no human revision overwritten'})
   }else assert.deepEqual(ocr.find(r=>r.asset_id===previous.asset_id),previous,'Edited and all other non-target OCR remain exact')
  }
  for(const file of baseline.files){
   const filename=path.resolve(library,file.path.replaceAll('\\','/'));assert.ok(filename.startsWith(library+path.sep))
   assert.equal((await fs.lstat(filename)).isSymbolicLink(),false)
   assert.equal(createHash('sha256').update(await fs.readFile(filename)).digest('hex'),file.sha256,'Originals and required previews keep their bytes')
  }
  const registry=JSON.parse(await fs.readFile(path.join(control,'.dam-asset-retrieval.json'),'utf8'))
  assert.match(registry.canonical,/^asset-vectors-[a-f0-9-]{36}\.sqlite$/)
  const vectors=new Database(path.join(control,registry.canonical),{readonly:true,fileMustExist:true})
  let spaces
  try{assert.equal(vectors.pragma('integrity_check',{simple:true}),'ok');spaces=vectors.prepare('SELECT space,count(*) AS vectors FROM vectors GROUP BY space ORDER BY space').all();assert.deepEqual(spaces,setup.spaces)}finally{vectors.close()}
  results.push({name,assets:assets.length,protectedFiles:baseline.files.length,manualCaptions:baseline.assets.filter((a:any)=>a.ai_caption_is_user_edited).length,integrity:'ok',spaces,observedAiChanges,
   counts:Object.fromEntries(['basic_analysis_requests','basic_analysis_attempts','basic_analysis_evidence','background_analysis_executions','background_analysis_execution_history','independent_tag_executions'].map(t=>[t,db.prepare(`SELECT count(*) FROM ${t}`).pluck().get()])),
   scaleAssets:assets.filter(a=>a.title.startsWith('规模-咖啡-')),backgroundAssets:assets.filter(a=>a.title.startsWith('T14-'))})
 }finally{db.close()}
}
const out=path.join(root,'t23-evidence/library-readback-latest.json')
await fs.writeFile(out,JSON.stringify({at:new Date().toISOString(),scope:'designated public copies, read only',results},null,2));console.log(JSON.stringify(results.map(({scaleAssets,backgroundAssets,...r})=>r)))
