import {readCurrentTag} from './tag-execution-storage'
import type Database from 'better-sqlite3'
import type {TagRecoveryScope,TagRecoveryStored,TagRecoveryReceipt} from '../../shared/contracts/tag-recovery.contract'
import type {TagExecutionScope} from '../../shared/contracts/tag-execution.contract'
import {readTagIntentContext,tagIntentFail,tagIntentId,type TagIntentBinding} from './tag-intent-storage'
/** New lease only, before ready; no persisted identifier becomes a bearer claim. */
export function reconcileTagExecutions(db:Database.Database){
 if(Number(db.pragma('user_version',{simple:true}))<10)return
 db.transaction(()=>{
  if(db.prepare("SELECT 1 FROM independent_tag_executions e JOIN independent_tag_effect_receipts r USING(request_id,asset_id) WHERE e.state='running' LIMIT 1").get())throw Error('TAG_RECOVERY_INCONSISTENT')
  db.prepare("UPDATE independent_tag_executions SET state=CASE WHEN error_code='NOT_SENT' THEN 'paused' ELSE 'outcome-unknown' END,error_code=CASE WHEN error_code='NOT_SENT' THEN 'RECOVERED_NOT_SENT' ELSE 'RECOVERED_OUTCOME_UNKNOWN' END,updated_at=? WHERE state='running'").run(new Date().toISOString())
 })()
}
export function readTagReceipt(a:TagIntentBinding,input:TagExecutionScope&{requestId:string}):TagRecoveryReceipt{
 const c=readTagIntentContext(a,input);if(c.sessionToken!==input.sessionToken)return tagIntentFail('TAG_INTENT_SESSION_EXPIRED');tagIntentId(input.requestId)
 if(c.schemaVersion<10)return{receipt:null,isCurrent:false}
 const row=a.database.prepare('SELECT * FROM independent_tag_effect_receipts WHERE request_id=? AND asset_id=?').get(input.requestId,input.assetId) as any
 if(!row)return{receipt:null,isCurrent:false}
 const current=readCurrentTag(a,input.assetId)?.evidenceId
 return{receipt:{effectId:row.effect_id,requestId:row.request_id,assetId:row.asset_id,tagEvidenceId:row.tag_evidence_id,historicalOnly:row.historical_only===1,committedAt:row.committed_at},isCurrent:current===row.tag_evidence_id}
}
export function readTagRecovery(a:TagIntentBinding,input:TagRecoveryScope,allowRelated:boolean,requestId?:string):TagRecoveryStored[]{
 if(!input||!Array.isArray(input.assetIds)||input.assetIds.length<1||input.assetIds.length>8||new Set(input.assetIds).size!==input.assetIds.length)return tagIntentFail('TAG_BATCH_INVALID')
 const c=input.assetIds.map(assetId=>readTagIntentContext(a,{...input,assetId}))[0];if(c.schemaVersion<9)return[]
 if(requestId)tagIntentId(requestId)
 const marks=input.assetIds.map(()=>'?').join(','),headers=a.database.prepare(`SELECT r.* FROM independent_tag_requests r JOIN independent_tag_request_items i USING(request_id) WHERE r.library_identity=? AND r.recipe_id='independent-tags-v1' AND EXISTS(SELECT 1 FROM independent_tag_request_items selected WHERE selected.request_id=r.request_id AND selected.asset_id IN (${marks})) ${allowRelated?'':`AND NOT EXISTS(SELECT 1 FROM independent_tag_request_items other WHERE other.request_id=r.request_id AND other.asset_id NOT IN (${marks}))`} ${requestId?'AND r.request_id=?':''} GROUP BY r.request_id ORDER BY MAX(i.request_generation) DESC,r.request_id LIMIT 20`).all(a.identity,...input.assetIds,...(allowRelated?[]:input.assetIds),...(requestId?[requestId]:[])) as any[]
 return headers.map(r=>{
  const rows=a.database.prepare(`SELECT i.*,a.title,l.revision AS current_revision,l.lifecycle_state,c.grid_thumbnail_ref AS current_preview,
    (SELECT MAX(newer.request_generation) FROM independent_tag_request_items newer WHERE newer.asset_id=i.asset_id AND newer.asset_revision=i.asset_revision AND newer.preview_generation=i.preview_generation) AS latest_generation,
    ${c.schemaVersion>=10?'e.state AS execution_state,receipt.effect_id':'NULL AS execution_state,NULL AS effect_id'}
    FROM independent_tag_request_items i JOIN assets a ON a.id=i.asset_id LEFT JOIN asset_lifecycle l ON l.design_asset_identity=i.asset_id LEFT JOIN promotion_links p ON p.design_asset_identity=i.asset_id LEFT JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity
    ${c.schemaVersion>=10?'LEFT JOIN independent_tag_executions e ON e.request_id=i.request_id AND e.asset_id=i.asset_id LEFT JOIN independent_tag_effect_receipts receipt ON receipt.request_id=i.request_id AND receipt.asset_id=i.asset_id':''}
    WHERE i.request_id=? ORDER BY i.position`).all(r.request_id) as any[]
  return{requestId:r.request_id,backendId:r.backend_id,model:r.model_name,backendBindingSha256:r.backend_binding_sha256,items:rows.map(i=>{const isLatest=i.request_generation===i.latest_generation,state=i.execution_state??i.state;return{assetId:i.asset_id,title:i.title,assetRevision:i.asset_revision,previewGeneration:i.preview_generation,state:!isLatest&&!['succeeded','outcome-unknown'].includes(state)?'superseded':state,sourceMatches:i.lifecycle_state==='active'&&i.asset_revision===i.current_revision&&i.preview_generation===i.current_preview,isLatest,requestGeneration:i.request_generation,hasReceipt:Boolean(i.effect_id)}})}
 })
}
