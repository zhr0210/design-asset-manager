import {normalizeDecisionLabel,TAG_DECISION_NORMALIZATION} from '../../shared/contracts/tag-decision.contract'
import {createHash,randomUUID} from 'node:crypto'
import type {TagIntentScope} from '../../shared/contracts/independent-tag-intent.contract'
import type {TagClaimRequest,TagAttemptClaim,TagEffectCommit,TagEffectReceipt,TagCurrentSummary,TagExecutionSnapshot,TagAttemptFinish,TagAttemptRef,TagExecutionRequest} from '../../shared/contracts/tag-execution.contract'
import {readTagIntentContext,tagIntentFail,type TagIntentBinding} from './tag-intent-storage'
import {commitVisualAiEvidence} from '../visual-ai/visual-ai-storage'
import type {VisualAiEvidence} from '../../shared/contracts/visual-ai.contract'

interface Claim extends TagAttemptClaim {requestId:string;assetId:string;session:string;revision:string;preview:string;inputSha256:string;origin:'tags-only'|'combined';sent:boolean}
export interface TagExecutionBinding extends TagIntentBinding {leaseIdentity:string;claims:Map<string,Claim>}
const fail=(code:string):never=>tagIntentFail(code)
const sha=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const normalized=(tag:string)=>tag.normalize('NFKC').toLowerCase()
function tagsOf(value:unknown,combined:boolean):string[]{
 if(!Array.isArray(value)||value.length>(combined?30:8)||value.some(t=>typeof t!=='string'||!t.trim()||t.length>80))return fail('TAG_OUTPUT_INVALID')
 const result:string[]=[],seen=new Set<string>()
 for(const v of value){const t=v.trim(),key=combined?t:normalized(t);if(!seen.has(key)){result.push(t);seen.add(key)}}
 return result
}
function authorize(a:TagExecutionBinding,input:TagIntentScope&{sessionToken:string}){
 const current=readTagIntentContext(a,input)
 if(current.schemaVersion<10)return fail('TAG_EXECUTION_UPGRADE_REQUIRED')
 if(input.sessionToken!==a.notebookSession)return fail('TAG_INTENT_SESSION_EXPIRED')
 return current
}
interface RequestRow {request_id:string;asset_id:string;asset_revision:string;preview_generation:string;request_generation:number;backend_id:string;model_name:string;recipe_id:string}
function request(a:TagExecutionBinding,input:{requestId:string;assetId:string}):RequestRow{
 const r=a.database.prepare(`SELECT i.*,r.backend_id,r.model_name,r.recipe_id FROM independent_tag_request_items i JOIN independent_tag_requests r USING(request_id) WHERE i.request_id=? AND i.asset_id=? AND r.library_identity=?`).get(input.requestId,input.assetId,a.identity) as RequestRow|undefined
 if(!r)return fail('TAG_REQUEST_UNAVAILABLE');return r
}
function latest(a:TagExecutionBinding,r:RequestRow){return a.database.prepare('SELECT MAX(request_generation) FROM independent_tag_request_items WHERE asset_id=? AND asset_revision=? AND preview_generation=?').pluck().get(r.asset_id,r.asset_revision,r.preview_generation)===r.request_generation}
function lookup(a:TagExecutionBinding,input:{requestId:string;assetId:string},payload:string):TagEffectReceipt|undefined{
 const r=a.database.prepare('SELECT * FROM independent_tag_effect_receipts WHERE request_id=? AND asset_id=?').get(input.requestId,input.assetId) as any
 if(!r)return
 if(r.payload_sha256!==payload)return fail('TAG_EFFECT_CONFLICT')
 return{effectId:r.effect_id,requestId:r.request_id,assetId:r.asset_id,tagEvidenceId:r.tag_evidence_id,historicalOnly:r.historical_only===1,committedAt:r.committed_at}
}
export function seedTagCurrent(a:TagExecutionBinding){
 const rows=a.database.prepare(`SELECT e.evidence_json FROM visual_ai_evidence e JOIN asset_lifecycle l ON l.design_asset_identity=e.asset_id AND l.revision=e.asset_revision AND l.lifecycle_state='active' JOIN promotion_links p ON p.design_asset_identity=e.asset_id JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity AND c.grid_thumbnail_ref=e.preview_generation ORDER BY e.created_at DESC,e.id DESC`).all() as Array<{evidence_json:string}>
 const seen=new Set<string>()
 for(const row of rows){const e=JSON.parse(row.evidence_json) as VisualAiEvidence;if(seen.has(e.assetId))continue;seen.add(e.assetId)
  const tags=tagsOf(e.output.tags,true),id=`seed:${e.id}`
  a.database.prepare('INSERT INTO independent_tag_evidence VALUES(?,NULL,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,e.assetId,e.assetRevision,e.previewGeneration,0,'visual-ai-v1','visual-ai-v1',e.backendId,e.model,e.inputSha256,JSON.stringify(tags),e.id,e.createdAt)
  a.database.prepare('INSERT INTO independent_tag_current VALUES(?,?,?,?,0)').run(e.assetId,e.assetRevision,e.previewGeneration,id)
 }
}
export function claimTagExecution(a:TagExecutionBinding,input:TagClaimRequest):TagAttemptClaim{
 const context=authorize(a,input),r=request(a,input)
 if(!/^[a-f0-9]{64}$/.test(input.inputSha256)||!['tags-only','combined'].includes(input.origin)||r.recipe_id!==(input.origin==='tags-only'?'independent-tags-v1':'visual-ai-v1'))return fail('TAG_CLAIM_INVALID')
 if(r.asset_revision!==context.asset.revision||r.preview_generation!==context.asset.previewGeneration||!latest(a,r))return fail('TAG_REQUEST_SUPERSEDED')
 const previous=a.database.prepare('SELECT state,attempt_epoch FROM independent_tag_executions WHERE request_id=? AND asset_id=?').get(input.requestId,input.assetId) as {state:string;attempt_epoch:number}|undefined
 if(previous&&['running','succeeded','outcome-unknown','superseded'].includes(previous.state))return fail('TAG_EXECUTION_RECONFIRM_REQUIRED')
 if(a.claims.size>=32)return fail('TAG_EXECUTION_BUSY')
 const attemptEpoch=(previous?.attempt_epoch??0)+1;if(!Number.isSafeInteger(attemptEpoch))return fail('TAG_EPOCH_EXHAUSTED')
 const c:Claim={attemptToken:randomUUID(),attemptId:randomUUID(),attemptEpoch,requestGeneration:r.request_generation,leaseIdentity:a.leaseIdentity,requestId:input.requestId,assetId:input.assetId,session:a.notebookSession,revision:r.asset_revision,preview:r.preview_generation,inputSha256:input.inputSha256,origin:input.origin,sent:false}
 a.database.prepare(`INSERT INTO independent_tag_executions VALUES(?,?,?,?,?,'running',?,'NOT_SENT',?) ON CONFLICT(request_id,asset_id) DO UPDATE SET attempt_epoch=excluded.attempt_epoch,attempt_id=excluded.attempt_id,origin=excluded.origin,state='running',input_sha256=excluded.input_sha256,error_code='NOT_SENT',updated_at=excluded.updated_at`).run(c.requestId,c.assetId,c.attemptEpoch,c.attemptId,c.origin,c.inputSha256,new Date().toISOString())
 a.claims.set(c.attemptToken,c)
 return{attemptToken:c.attemptToken,attemptId:c.attemptId,attemptEpoch:c.attemptEpoch,requestGeneration:c.requestGeneration,leaseIdentity:c.leaseIdentity}
}
function requireClaim(a:TagExecutionBinding,input:{requestId:string;assetId:string;attemptToken:string}){
 const c=a.claims.get(input.attemptToken)
 if(!c||c.session!==a.notebookSession||c.leaseIdentity!==a.leaseIdentity||c.assetId!==input.assetId||c.requestId!==input.requestId)return fail('TAG_CLAIM_EXPIRED')
 const row=a.database.prepare('SELECT attempt_id,attempt_epoch,state FROM independent_tag_executions WHERE request_id=? AND asset_id=?').get(c.requestId,c.assetId) as any
 if(row?.attempt_id!==c.attemptId||row.attempt_epoch!==c.attemptEpoch||row.state!=='running')return fail('TAG_CLAIM_EXPIRED')
 return c
}
export function markTagExecutionSent(a:TagExecutionBinding,input:TagAttemptRef){
 const context=authorize(a,input),c=requireClaim(a,input),r=request(a,input)
 if(c.sent||context.asset.revision!==c.revision||context.asset.previewGeneration!==c.preview||!latest(a,r))return fail('TAG_ATTEMPT_NOT_CURRENT')
 a.database.prepare('UPDATE independent_tag_executions SET error_code=NULL,updated_at=? WHERE request_id=? AND asset_id=?').run(new Date().toISOString(),c.requestId,c.assetId)
 c.sent=true
}
export function commitTagExecution(a:TagExecutionBinding,input:TagEffectCommit,signal?:AbortSignal):TagEffectReceipt{
 const context=authorize(a,input)
 const tags=tagsOf(input.tags,Boolean(input.combinedEvidence)),payload=sha({tags,combined:input.combinedEvidence??null})
 const old=lookup(a,input,payload);if(old)return old
 if(signal?.aborted)return fail('TAG_EXECUTION_CANCELLED')
 const c=requireClaim(a,input),r=request(a,input)
 if(!c.sent)return fail('TAG_ATTEMPT_NOT_SENT')
 if(c.revision!==context.asset.revision||c.preview!==context.asset.previewGeneration)return fail('TAG_INTENT_SOURCE_CHANGED')
 if((c.origin==='combined')!==Boolean(input.combinedEvidence))return fail('TAG_EFFECT_INVALID')
 const e=input.combinedEvidence
 if(e&&(e.assetId!==input.assetId||e.assetRevision!==c.revision||e.previewGeneration!==c.preview||e.inputSha256!==c.inputSha256||e.backendId!==r.backend_id||e.model!==r.model_name||JSON.stringify(tagsOf(e.output.tags,true))!==JSON.stringify(tags)))return fail('TAG_EFFECT_INVALID')
 const historicalOnly=!latest(a,r)
 if(historicalOnly&&c.origin!=='combined')return fail('TAG_REQUEST_SUPERSEDED')
 const effectId=randomUUID(),evidenceId=historicalOnly?null:`tags:${effectId}`,now=new Date().toISOString()
 if(e)commitVisualAiEvidence(a.database,e,true)
 if(evidenceId){
  const family=c.origin==='combined'?'visual-ai-v1':'independent-tags-v1'
  a.database.prepare('INSERT INTO independent_tag_evidence VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(evidenceId,r.request_id,r.asset_id,c.revision,c.preview,c.requestGeneration,family,c.origin==='combined'?'visual-ai-v1':'tags-nfkc-lower-v1',r.backend_id,r.model_name,c.inputSha256,JSON.stringify(tags),e?.id??null,now)
  a.database.prepare('INSERT INTO independent_tag_current VALUES(?,?,?,?,?) ON CONFLICT(asset_id) DO UPDATE SET asset_revision=excluded.asset_revision,preview_generation=excluded.preview_generation,evidence_id=excluded.evidence_id,request_generation=excluded.request_generation').run(r.asset_id,c.revision,c.preview,evidenceId,c.requestGeneration)
 }
 a.database.prepare('UPDATE independent_tag_executions SET state=?,updated_at=? WHERE request_id=? AND asset_id=?').run(historicalOnly?'superseded':'succeeded',now,r.request_id,r.asset_id)
 a.database.prepare('INSERT INTO independent_tag_effect_receipts VALUES(?,?,?,?,?,?,?)').run(r.request_id,r.asset_id,payload,effectId,evidenceId,historicalOnly?1:0,now)
 a.database.prepare('INSERT INTO independent_tag_outbox VALUES(?,?,?,0,?)').run(`event:${effectId}`,effectId,r.asset_id,now)
 return{effectId,requestId:r.request_id,assetId:r.asset_id,tagEvidenceId:evidenceId,historicalOnly,committedAt:now}
}
export function finishTagExecution(a:TagExecutionBinding,input:TagAttemptFinish,closing=false){
 authorize(a,input);const c=requireClaim(a,input)
 if(!['failed','cancelled','outcome-unknown','paused'].includes(input.state))return fail('TAG_STATE_INVALID')
 const code=input.errorCode&&/^[A-Z_]{1,80}$/.test(input.errorCode)?input.errorCode:null
 a.database.prepare('UPDATE independent_tag_executions SET state=?,error_code=?,updated_at=? WHERE request_id=? AND asset_id=?').run(closing?(c.sent?'outcome-unknown':'paused'):input.state,closing?(c.sent?'CLOSE_OUTCOME_UNKNOWN':'CLOSE_NOT_SENT'):code,new Date().toISOString(),c.requestId,c.assetId)
 a.claims.delete(c.attemptToken)
}
/** Bulk projection avoids per-asset scans when the Gallery reads a whole library. */
export function readCurrentTagSummaries(a:Pick<TagExecutionBinding,'database'>,ids?:readonly string[]):Map<string,TagCurrentSummary>{
 if(ids?.length===0)return new Map()
 const filter=ids?`AND s.asset_id IN (${ids.map(()=>'?').join(',')})`:'',args=ids??[]
 const rows=a.database.prepare(`SELECT e.* FROM independent_tag_current s JOIN independent_tag_evidence e ON e.id=s.evidence_id AND e.asset_id=s.asset_id AND e.asset_revision=s.asset_revision AND e.preview_generation=s.preview_generation AND e.request_generation=s.request_generation JOIN asset_lifecycle l ON l.design_asset_identity=s.asset_id AND l.revision=s.asset_revision AND l.lifecycle_state='active' JOIN promotion_links p ON p.design_asset_identity=s.asset_id JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity AND c.grid_thumbnail_ref=s.preview_generation WHERE 1=1 ${filter}`).all(...args) as any[]
 if(!rows.length)return new Map()
 const rejected=new Set<string>()
 for(const r of a.database.prepare(`SELECT t.asset_id,t.tag_name,t.raw_payload FROM tag_suggestions t JOIN independent_tag_current s ON s.asset_id=t.asset_id WHERE t.status='rejected' AND t.source='visual-ai' ${filter}`).all(...args) as any[]){try{rejected.add(JSON.stringify([r.asset_id,JSON.parse(r.raw_payload).evidenceId,r.tag_name]))}catch{}}
 const confirmed=new Map<string,Set<string>>()
 for(const r of a.database.prepare(`SELECT t.asset_id,n.name FROM asset_tags t JOIN tags n ON n.id=t.tag_id JOIN independent_tag_current s ON s.asset_id=t.asset_id WHERE t.status='confirmed' ${filter}`).all(...args) as {asset_id:string;name:string}[]){if(!confirmed.has(r.asset_id))confirmed.set(r.asset_id,new Set());confirmed.get(r.asset_id)!.add(normalized(r.name))}
 const familyRejected=new Set<string>()
 if(Number(a.database.pragma('user_version',{simple:true}))>=11)for(const r of a.database.prepare(`SELECT r.* FROM independent_tag_rejections r JOIN independent_tag_current s ON s.asset_id=r.asset_id WHERE 1=1 ${filter}`).all(...args) as any[])familyRejected.add(JSON.stringify([r.asset_id,r.asset_revision,r.preview_generation,r.source_family,r.source_normalization_version,r.decision_normalization_version,r.normalized_label]))
 const result=new Map<string,TagCurrentSummary>()
 for(const e of rows){
  try{
   const raw:unknown=JSON.parse(e.tags_json)
   if(!Array.isArray(raw)||raw.some(t=>typeof t!=='string'||!t.trim()||t.length>80)||raw.length>(e.source_family==='visual-ai-v1'?30:8))continue
   if(e.normalization_version!==(e.source_family==='visual-ai-v1'?'visual-ai-v1':'tags-nfkc-lower-v1'))continue
   const tags=(raw as string[]).filter(t=>(!e.original_visual_evidence_id||!rejected.has(JSON.stringify([e.asset_id,e.original_visual_evidence_id,t])))&&!familyRejected.has(JSON.stringify([e.asset_id,e.asset_revision,e.preview_generation,e.source_family,e.normalization_version,TAG_DECISION_NORMALIZATION,normalizeDecisionLabel(t)])))
   result.set(e.asset_id,{evidenceId:e.id,assetId:e.asset_id,requestGeneration:e.request_generation,sourceFamily:e.source_family,normalizationVersion:e.normalization_version,model:e.model_name,backendId:e.backend_id,createdAt:e.created_at,observedTagCount:raw.length,tags,pendingTags:tags.filter(t=>!confirmed.get(e.asset_id)?.has(normalized(t))),originalVisualEvidenceId:e.original_visual_evidence_id})
  }catch{/* Unreadable enrichment must not prevent basic asset browsing. */}
 }
 return result
}
export function readCurrentTag(a:Pick<TagExecutionBinding,'database'>,assetId:string):TagCurrentSummary|null{return readCurrentTagSummaries(a,[assetId]).get(assetId)??null}
export function readTagExecution(a:TagExecutionBinding,scope:TagIntentScope):TagExecutionSnapshot{
 const context=readTagIntentContext(a,scope)
 return{schemaVersion:context.schemaVersion,sessionToken:context.sessionToken,current:context.schemaVersion>=10?readCurrentTag(a,scope.assetId):null,jobs:context.schemaVersion>=10?a.database.prepare('SELECT request_id AS requestId,state,attempt_epoch AS attemptEpoch,error_code AS errorCode FROM independent_tag_executions WHERE asset_id=? ORDER BY updated_at DESC LIMIT 50').all(scope.assetId) as TagExecutionSnapshot['jobs']:[]}
}

export function readTagExecutionRequest(a:TagExecutionBinding,scope:TagIntentScope,requestId:string):TagExecutionRequest{
 const c=readTagIntentContext(a,scope)
 const r=a.database.prepare('SELECT i.*,r.backend_id,r.model_name,r.backend_binding_sha256,r.recipe_id,r.recipe_version FROM independent_tag_request_items i JOIN independent_tag_requests r USING(request_id) WHERE i.request_id=? AND i.asset_id=? AND r.library_identity=?').get(requestId,scope.assetId,a.identity) as any
 if(!r)return fail('TAG_REQUEST_UNAVAILABLE')
 const state=c.schemaVersion>=10?(a.database.prepare('SELECT state FROM independent_tag_executions WHERE request_id=? AND asset_id=?').get(requestId,scope.assetId) as any)?.state:null
 return{requestId,assetId:scope.assetId,assetRevision:r.asset_revision,previewGeneration:r.preview_generation,requestGeneration:r.request_generation,backendId:r.backend_id,model:r.model_name,backendBindingSha256:r.backend_binding_sha256,recipeId:r.recipe_id,recipeVersion:r.recipe_version,state:state??'waiting-execution',sourceMatches:r.asset_revision===c.asset.revision&&r.preview_generation===c.asset.previewGeneration}
}
