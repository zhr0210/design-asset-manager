/** Independent read-only SQLite/byte oracle, restricted to the approved public corpus. No Host or profile access. */
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'
const parent=path.resolve('.scratch/wc01-reasoning-20261005'),run=path.resolve((await fs.readFile(path.join(parent,'selected-run.txt'),'utf8')).trim())
assert.equal(path.dirname(run),parent)
const copies=JSON.parse(await fs.readFile(path.join(run,'library-copies.json'),'utf8'))
assert.equal(copies.source,'.scratch/wc01-real-model-library-20261005/run-U4eFuo/baseline-v13')
assert.equal(copies.copy,'work-browser');assert.equal(copies.privateLibraryAccess,false)
const sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex'),sorted=(rows:unknown[])=>rows.map(v=>JSON.stringify(v)).sort()
const quote=(s:string)=>'"'+s.replaceAll('"','""')+'"'
function inspect(directory:string){
 const db=new Database(path.join(directory,'.dam/library.sqlite'),{readonly:true,fileMustExist:true})
 try{return db.transaction(()=>{
  assert.equal(db.pragma('user_version',{simple:true}),13)
  assert.deepEqual(db.pragma('integrity_check'),[{integrity_check:'ok'}]);assert.deepEqual(db.pragma('foreign_key_check'),[])
  const assets=db.prepare('SELECT * FROM assets ORDER BY id').all() as Record<string,unknown>[];assert.equal(assets.length,24)
  const protectedAssets=assets.map(({ai_caption:_caption,ai_caption_updated_at:_time,...rest})=>rest)
  const confirmedCaptions=assets.filter(a=>a.ai_caption_is_user_edited===1).map(a=>({id:a.id,caption:a.ai_caption}))
  const relationTables=['tags','asset_tags','library_folders','library_folder_assets','library_palette_colors']
  const relations=Object.fromEntries(relationTables.map(t=>[t,sorted(db.prepare('SELECT * FROM '+quote(t)).all())]))
  const evidence=(db.prepare('SELECT evidence_json FROM visual_ai_evidence ORDER BY id').all() as {evidence_json:string}[]).map(r=>JSON.parse(r.evidence_json))
  const current=db.prepare(`SELECT a.id,a.title,l.revision,c.grid_thumbnail_ref AS preview FROM assets a JOIN asset_lifecycle l ON l.design_asset_identity=a.id JOIN promotion_links p ON p.design_asset_identity=a.id JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity WHERE l.lifecycle_state='active'`).all() as any[]
  const tableDigests=Object.fromEntries((db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as {name:string}[]).map(({name})=>[name,{sha256:sha(JSON.stringify(sorted(db.prepare('SELECT * FROM '+quote(name)).all()))),rows:(db.prepare('SELECT COUNT(*) n FROM '+quote(name)).get() as {n:number}).n}]))
  return{assets,protectedAssets,confirmedCaptions,relations,evidence,current,tableDigests}
 })()}finally{db.close()}
}
const baseline=inspect(path.resolve(copies.source)),actual=inspect(path.join(run,copies.copy))
assert.deepEqual(actual.protectedAssets,baseline.protectedAssets)
assert.deepEqual(actual.confirmedCaptions,baseline.confirmedCaptions)
assert.deepEqual(actual.relations,baseline.relations)
assert.deepEqual(Object.keys(actual.tableDigests),Object.keys(baseline.tableDigests))
for(const e of baseline.evidence)assert.deepEqual(actual.evidence.find(v=>v.id===e.id),e)
const added=actual.evidence.filter(e=>!baseline.evidence.some(b=>b.id===e.id))
assert.equal(added.length,1,'One independently confirmed real subscription analysis expected')
const e=added[0],asset=actual.current.find(a=>a.id===e.assetId)
assert.equal(asset.title,'public-01-astronaut');assert.equal(e.model,'gpt-6-luna');assert.equal(e.reasoning,'low')
assert.equal(e.assetRevision,asset.revision);assert.equal(e.previewGeneration,asset.preview);assert.equal(e.inputScope,'controlled-preview-rgb')
assert.equal(e.providerOrigin,'https://api.openai.com');assert.equal(e.processingLocation,'external-service');assert.equal(e.output.ocrText,'')
assert.match(e.inputSha256,/^[a-f0-9]{64}$/);assert.ok(e.usage.inputTokens>0);assert.ok(e.usage.outputTokens>0);assert.equal(e.usage.costEstimateUsd,null)
for(const a of actual.assets)if(a.id!==asset.id)assert.deepEqual(a,baseline.assets.find(b=>b.id===a.id),'Only reviewed asset may get a generated caption')
let protectedFiles=0
for(const [name,f] of Object.entries(copies.files) as [string,{sha256:string}][]){
 assert.equal(sha(await fs.readFile(path.join(copies.source,name))),f.sha256,'Baseline byte drift')
 if(name.startsWith('Originals/')||name.startsWith('.dam/required-previews/')){assert.equal(sha(await fs.readFile(path.join(run,copies.copy,name))),f.sha256);protectedFiles++}
}
assert.equal(protectedFiles,48)
const tableChanges=Object.entries(actual.tableDigests).filter(([t,d])=>d.sha256!==baseline.tableDigests[t].sha256).map(([table,after])=>({table,before:baseline.tableDigests[table],after}))
await fs.writeFile(path.join(run,'independent-oracle.json'),JSON.stringify({at:new Date().toISOString(),status:'PASS',oracle:'Independent direct readonly SQLite, integrity/FK, baseline and byte digests; no Host/profile/credentials',schema:13,assets:24,addedEvidence:1,reasoning:'low',model:'gpt-6-luna',asset:'public-01-astronaut',allOtherAssetsPreserved:true,protectedAssetFieldsAndConfirmedRelationsPreserved:true,baselineFilesPreserved:Object.keys(copies.files).length,originalAndPreviewFilesPreserved:protectedFiles,usage:e.usage,evidence:e,tableChanges},null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({status:'INDEPENDENT_REASONING_ORACLE_PASS',assets:24,evidence:1,model:'gpt-6-luna',reasoning:'low',protectedFiles}))
