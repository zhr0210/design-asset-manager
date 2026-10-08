/** Independent read-only oracle; exact WC01 public copied Libraries only. */
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'
assert.equal(process.env.DAM_WC01_REAL_MODEL_EXECUTE,'1')
const parent=path.resolve('.scratch/wc01-real-model-library-20261005')
const run=path.resolve((await fs.readFile(path.join(parent,'selected-run.txt'),'utf8')).trim())
assert.equal(path.dirname(run),parent)
const sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex')
const q=(s:string)=>'"'+s.replaceAll('"','""')+'"'
const sorted=(r:unknown[])=>r.map(v=>JSON.stringify(v)).sort()
function inspect(label:string){
 const db=new Database(path.join(run,label,'.dam/library.sqlite'),{readonly:true,fileMustExist:true})
 try{return db.transaction(()=>{
  assert.equal(db.pragma('user_version',{simple:true}),13)
  assert.deepEqual(db.pragma('integrity_check'),[{integrity_check:'ok'}]);assert.deepEqual(db.pragma('foreign_key_check'),[])
  const tables=(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as {name:string}[]).map(r=>r.name)
  const assets=db.prepare('SELECT * FROM assets ORDER BY id').all() as Record<string,unknown>[];assert.equal(assets.length,24)
  const protectedAssets=assets.map(({ai_caption:_caption,ai_caption_updated_at:_time,...rest})=>rest)
  const confirmedCaptions=assets.filter(a=>a.ai_caption_is_user_edited===1).map(a=>({id:a.id,caption:a.ai_caption}))
  // Current v13 organization uses library_folder_assets, not legacy asset_folders.
  const relationTables=['tags','asset_tags','library_folders','library_folder_assets','library_palette_colors']
  for(const table of relationTables)assert.ok(tables.includes(table),'Required current relation table: '+table)
  const relations=Object.fromEntries(relationTables.map(t=>[t,sorted(db.prepare('SELECT * FROM '+q(t)).all())]))
  const tableDigests=Object.fromEntries(tables.map(t=>[t,{rows:(db.prepare('SELECT COUNT(*) n FROM '+q(t)).get() as {n:number}).n,sha256:sha(JSON.stringify(sorted(db.prepare('SELECT * FROM '+q(t)).all())))}]))
  const evidence=(db.prepare('SELECT evidence_json FROM visual_ai_evidence ORDER BY id').all() as {evidence_json:string}[]).map(r=>JSON.parse(r.evidence_json))
  const current=(db.prepare(`SELECT a.id,a.title,l.revision,c.grid_thumbnail_ref AS preview FROM assets a
    JOIN asset_lifecycle l ON l.design_asset_identity=a.id JOIN promotion_links p ON p.design_asset_identity=a.id
    JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity WHERE l.lifecycle_state='active'`).all() as any[])
  for(const e of evidence){const a=current.find(a=>a.id===e.assetId);assert.ok(a);assert.equal(e.assetRevision,a.revision);assert.equal(e.previewGeneration,a.preview);assert.equal(e.output.ocrText,'');assert.match(e.inputSha256,/^[a-f0-9]{64}$/);assert.equal(e.inputScope,'controlled-preview-rgb')}
  return{label,tables,protectedAssets,confirmedCaptions,relations,tableDigests,evidence,current}
 })()}finally{db.close()}
}
const baseline=inspect('baseline-v13'),local=inspect('work-local'),cloud=inspect('work-cloud')
for(const current of [local,cloud]){
 assert.deepEqual(current.tables,baseline.tables)
 assert.deepEqual(current.protectedAssets,baseline.protectedAssets)
 assert.deepEqual(current.confirmedCaptions,baseline.confirmedCaptions)
 assert.deepEqual(current.relations,baseline.relations)
 for(const e of baseline.evidence)assert.deepEqual(current.evidence.find(v=>v.id===e.id),e)
}
const localResult=JSON.parse(await fs.readFile(path.join(run,'exec-03/result.json'),'utf8'))
assert.equal(localResult.executed,true)
for(const outcome of localResult.outcomes.filter((o:any)=>o.evidenceId)){
 const job=JSON.parse(await fs.readFile(path.join(run,'exec-03',outcome.sample+'-job.json'),'utf8'))
 assert.deepEqual(local.evidence.find(e=>e.id===outcome.evidenceId),job.items[0].evidence)
}
const newCloud=cloud.evidence.filter(e=>!baseline.evidence.some(b=>b.id===e.id))
assert.equal(newCloud.length,2,'Exactly two actual subscription Library analyses expected')
assert.deepEqual(newCloud.map(e=>cloud.current.find(a=>a.id===e.assetId).title).sort(),['public-01-astronaut','public-03-chelsea'])
for(const e of newCloud){assert.equal(e.model,'gpt-6-luna');assert.equal(e.providerOrigin,'https://api.openai.com');assert.equal(e.processingLocation,'external-service');assert.ok(e.usage.inputTokens>0);assert.ok(e.usage.outputTokens>0);assert.equal(e.usage.costEstimateUsd,null)}
const copies=JSON.parse(await fs.readFile(path.join(run,'library-copies.json'),'utf8'))
const fileChecks=[]
for(const f of copies.files){
 assert.equal(sha(await fs.readFile(path.join(run,'baseline-v13',f.relativePath))),f.sha256)
 if(f.relativePath.startsWith('Originals/')||f.relativePath.startsWith('.dam/required-previews/')){
  for(const label of ['work-local','work-cloud'])assert.equal(sha(await fs.readFile(path.join(run,label,f.relativePath))),f.sha256)
  fileChecks.push(f.relativePath)
 }
}
const prepared=JSON.parse(await fs.readFile(path.join(run,'prepared-inputs.json'),'utf8'))
const inputMapping=prepared.records.map((r:any)=>{const stem=r.previewFile.replace(/\.[^.]+$/,'');const a=baseline.current.find(a=>a.preview.replace(/^preview:/,'').replaceAll(':','-')===stem);assert.ok(a);return{sample:r.file,title:a.title,jpegSha256:r.jpegSha256}})
const differences=(current:ReturnType<typeof inspect>)=>Object.entries(current.tableDigests).filter(([t,d])=>d.sha256!==baseline.tableDigests[t].sha256).map(([table,d])=>({table,before:baseline.tableDigests[table],after:d}))
const result={at:new Date().toISOString(),status:'PASS',oracle:'Independent direct read-only SQLite + byte digest checks; no Host, no credential access',schema:13,assets:24,
 integrityAndForeignKeys:true,allNonCaptionAssetFieldsPreserved:true,confirmedCaptionsPreserved:true,confirmedRelationsPreserved:true,baselineBytesPreserved:true,originalAndPreviewFiles:fileChecks.length,
 localCompletedEvidence:6,cloudCompletedEvidence:2,cloudEvidence:newCloud,localTableDifferences:differences(local),cloudTableDifferences:differences(cloud),preparedInputMapping:inputMapping}
await fs.writeFile(path.join(run,'independent-oracle.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({status:'INDEPENDENT_ORACLE_PASS',local:6,cloud:2,assets:24,protectedFiles:fileChecks.length}))
