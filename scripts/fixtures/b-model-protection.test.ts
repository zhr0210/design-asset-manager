import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

// Read-only comparison of the explicitly authorized public library snapshots.
const root=path.resolve('.scratch/b-model-management-20261006/evidence')
const before=JSON.parse(await fs.readFile(path.join(root,'library-before.json'),'utf8'))
const after=JSON.parse(await fs.readFile(path.join(root,'library-latest.json'),'utf8'))
const targets=new Set(['public-04-coffee','public-01-astronaut'])
assert.deepEqual(after.files,before.files,'Originals and required previews must retain their exact hashes')
assert.deepEqual(after.assets.map((a:any)=>a.id),before.assets.map((a:any)=>a.id))
const protectedAssets=before.assets.filter((a:any)=>a.ai_caption_is_user_edited||!targets.has(a.title))
assert.deepEqual(after.assets.filter((a:any)=>protectedAssets.some((p:any)=>p.id===a.id)),protectedAssets,'All manual captions and non-target assets remain unchanged')
for(const table of ['tags','asset_tags','library_folders','library_folder_assets'])
 assert.deepEqual(after.manualRelations[table],before.manualRelations[table],table+' must preserve confirmed metadata and organization')
const astronaut=after.assets.find((a:any)=>a.title==='public-01-astronaut').id
assert.deepEqual(after.manualRelations.asset_ocr_state.filter((r:any)=>r.asset_id!==astronaut),before.manualRelations.asset_ocr_state.filter((r:any)=>r.asset_id!==astronaut),'OCR corrections and all non-target OCR state remain unchanged')
assert.deepEqual(after.integrity,[{integrity_check:'ok'}]);assert.deepEqual(after.foreignKeys,[])
const result={at:new Date().toISOString(),scope:'B public recoverable library only',assets:after.assets.length,files:after.files.length,
 protectedAssets:protectedAssets.length,manualCaptions:before.assets.filter((a:any)=>a.ai_caption_is_user_edited).length,
 originalAndPreviewHashes:'unchanged',confirmedTagsAndOrganization:'unchanged',nonTargetOcr:'unchanged',integrity:'ok',counts:after.counts}
await fs.writeFile(path.join(root,'protection-final.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result))
