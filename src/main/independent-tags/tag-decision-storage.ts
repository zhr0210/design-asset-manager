import {randomUUID} from 'node:crypto'
import type {TagDecisionPrepare,TagDecisionCommit,TagDecisionContext} from '../../shared/contracts/tag-decision.contract'
import {normalizeDecisionLabel,TAG_DECISION_NORMALIZATION} from '../../shared/contracts/tag-decision.contract'
import {readTagIntentContext,tagIntentFail,type TagIntentBinding} from './tag-intent-storage'
import {readCurrentTag} from './tag-execution-storage'

export function readTagDecisionContext(a:TagIntentBinding,input:TagDecisionPrepare):TagDecisionContext{
 const c=readTagIntentContext(a,input)
 if(c.schemaVersion<10||!['confirm','reject'].includes(input.decision)||typeof input.evidenceId!=='string'||typeof input.tag!=='string'||!input.tag.trim()||input.tag.length>80)tagIntentFail('TAG_DECISION_INVALID')
 const current=readCurrentTag(a,input.assetId)
 if(!current||current.evidenceId!==input.evidenceId)return tagIntentFail('TAG_DECISION_SOURCE_CHANGED')
 const row=a.database.prepare('SELECT tags_json FROM independent_tag_evidence WHERE id=? AND asset_id=?').get(current.evidenceId,input.assetId) as {tags_json:string}
 const tag=(JSON.parse(row.tags_json) as string[]).find(t=>normalizeDecisionLabel(t)===normalizeDecisionLabel(input.tag))
 if(!tag)return tagIntentFail('TAG_DECISION_SOURCE_CHANGED')
 return{schemaVersion:c.schemaVersion,sessionToken:c.sessionToken,evidenceId:current.evidenceId,tag,assetRevision:c.asset.revision,previewGeneration:c.asset.previewGeneration,sourceFamily:current.sourceFamily,sourceNormalizationVersion:current.normalizationVersion}
}
/** Caller owns one Host transaction. Decisions never mutate inference history or remove user relations. */
export function writeTagDecision(a:TagIntentBinding,input:TagDecisionCommit){
 const c=readTagDecisionContext(a,input)
 if(input.sessionToken!==c.sessionToken)tagIntentFail('TAG_INTENT_SESSION_EXPIRED')
 if(typeof input.allowUpgrade!=='boolean'||![10,11,12,13].includes(input.expectedSchemaVersion)||input.expectedSchemaVersion>c.schemaVersion)tagIntentFail('TAG_DECISION_REVIEW_STALE')
 const normalized=normalizeDecisionLabel(c.tag),now=new Date().toISOString()
 if(input.decision==='reject'){
  if(c.schemaVersion<11)tagIntentFail('TAG_DECISION_UPGRADE_REQUIRED')
  a.database.prepare('INSERT OR IGNORE INTO independent_tag_rejections VALUES(?,?,?,?,?,?,?,?,?,?)').run(input.assetId,c.assetRevision,c.previewGeneration,c.sourceFamily,c.sourceNormalizationVersion,TAG_DECISION_NORMALIZATION,normalized,c.evidenceId,c.tag,now)
  return
 }
 const confirmed=a.database.prepare("SELECT t.name FROM asset_tags a JOIN tags t ON t.id=a.tag_id WHERE a.asset_id=? AND a.status='confirmed'").all(input.assetId) as {name:string}[]
 if(confirmed.some(t=>normalizeDecisionLabel(t.name)===normalized))return
 const existing=a.database.prepare("SELECT id FROM tags WHERE normalized_name=? AND type='custom'").get(c.tag.toLocaleLowerCase()) as {id:string}|undefined
 const id=existing?.id??`tag:${randomUUID()}`
 if(!existing)a.database.prepare("INSERT INTO tags(id,name,normalized_name,slug,type,description,aliases,is_category,is_system,usage_count,created_at,updated_at) VALUES(?,?,?,?,'custom','','[]',0,0,0,?,?)").run(id,c.tag,c.tag.toLocaleLowerCase(),id,now,now)
 a.database.prepare("INSERT OR IGNORE INTO asset_tags(id,asset_id,tag_id,source,confidence,status,model_name,raw_value,created_by,created_at,updated_at) VALUES(?,?,?,'manual',1,'confirmed',NULL,?,'user',?,?)").run(`${input.assetId}_${id}_manual`,input.assetId,id,JSON.stringify({tagEvidenceId:c.evidenceId,sourceFamily:c.sourceFamily}),now,now)
 a.database.prepare("UPDATE tags SET usage_count=(SELECT COUNT(*) FROM asset_tags WHERE tag_id=? AND status='confirmed') WHERE id=?").run(id,id)
}
