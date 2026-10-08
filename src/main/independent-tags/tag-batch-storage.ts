import {createHash} from 'node:crypto'
import type {TagBatchCommit,TagBatchSaved} from '../../shared/contracts/tag-batch.contract'
import {tagIntentFail,tagIntentId,tagIntentPayloadDigest,readTagIntentSummaries,type TagIntentBinding} from './tag-intent-storage'
export function tagBatchInputs(input:TagBatchCommit){
 if(!input||!Array.isArray(input.items)||input.items.length<1||input.items.length>8||typeof input.forceRerun!=='boolean'||input.recipeId!=='independent-tags-v1')return tagIntentFail('TAG_BATCH_INVALID')
 const items=[...input.items].sort((a,b)=>a.assetId.localeCompare(b.assetId,'en'))
 const seen=new Set<string>()
 return items.map(item=>{tagIntentId(item.assetId);if(seen.has(item.assetId))return tagIntentFail('TAG_BATCH_INVALID');seen.add(item.assetId);return{...input,assetId:item.assetId,assetRevision:item.assetRevision,previewGeneration:item.previewGeneration}})
}
function digest(input:TagBatchCommit){const items=tagBatchInputs(input);if(items.length===1)return tagIntentPayloadDigest(items[0]);return createHash('sha256').update(JSON.stringify(['batch-v1',...items.map(tagIntentPayloadDigest)])).digest('hex')}
function saved(a:TagIntentBinding,input:TagBatchCommit,requestId:string):TagBatchSaved{
 const items=tagBatchInputs(input).map(item=>readTagIntentSummaries(a,item,requestId)[0]);if(items.some(x=>!x))return tagIntentFail('TAG_INTENT_REQUEST_CONFLICT');return{requestId,items}
}
/** Host has already revalidated every source/session under its actual lease. */
export function existingTagBatch(a:TagIntentBinding,input:TagBatchCommit):TagBatchSaved|undefined{
 if(Number(a.database.pragma('user_version',{simple:true}))<9)return
 const sha=digest(input),row=a.database.prepare('SELECT payload_sha256 FROM independent_tag_requests WHERE request_id=?').get(input.requestId) as {payload_sha256:string}|undefined
 if(row){if(row.payload_sha256!==sha)return tagIntentFail('TAG_INTENT_REQUEST_CONFLICT');return saved(a,input,input.requestId)}
 if(!input.forceRerun){
  const prior=a.database.prepare(`SELECT r.request_id FROM independent_tag_requests r JOIN independent_tag_request_items i USING(request_id) WHERE r.library_identity=? AND r.payload_sha256=? GROUP BY r.request_id ORDER BY MAX(i.request_generation) DESC LIMIT 1`).get(a.identity,sha) as {request_id:string}|undefined
  if(prior)return saved(a,input,prior.request_id)
 }
}
export function insertTagBatch(a:TagIntentBinding,input:TagBatchCommit):TagBatchSaved{
 const prior=existingTagBatch(a,input);if(prior)return prior
 const items=tagBatchInputs(input),now=new Date().toISOString()
 a.database.prepare('INSERT INTO independent_tag_requests VALUES(?,?,?,?,?,?,?,?,?)').run(input.requestId,a.identity,digest(input),input.backendId,input.model,input.backendBindingSha256,input.recipeId,input.recipeVersion,now)
 items.forEach((item,position)=>{
  const max=a.database.prepare('SELECT COALESCE(MAX(request_generation),0) FROM independent_tag_request_items WHERE asset_id=? AND asset_revision=? AND preview_generation=?').pluck().get(item.assetId,item.assetRevision,item.previewGeneration) as number
  if(!Number.isSafeInteger(max)||max>=Number.MAX_SAFE_INTEGER)return tagIntentFail('TAG_INTENT_GENERATION_EXHAUSTED')
  a.database.prepare("INSERT INTO independent_tag_request_items VALUES(?,?,?,?,?,?,'waiting-execution',1,?)").run(input.requestId,item.assetId,position,item.assetRevision,item.previewGeneration,max+1,now)
 })
 return saved(a,input,input.requestId)
}
