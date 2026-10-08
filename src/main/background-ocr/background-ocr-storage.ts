import {randomUUID,createHash} from 'node:crypto'
import {tagIntentFail,type TagIntentBinding} from '../independent-tags/tag-intent-storage'
import {commitOcr,requireOcrScope} from '../ocr/ocr-storage'
import {validateOcrObservation} from '../../shared/contracts/asset-ocr.contract'
import type {BackgroundOcrScope,BackgroundOcrSession,BackgroundOcrSnapshot,BackgroundOcrPermission,BackgroundOcrClaim,BackgroundOcrCommit,BackgroundOcrReceipt} from '../../shared/contracts/background-ocr.contract'
interface Grant {session:string;revision:number;runtime:string}
interface Held {session:string;intentId:string;attemptId:string;generation:number;intentRevision:number;permissionRevision:number;source:string;preview:string;runtime:string}
export interface BackgroundOcrAuthority {grant?:Grant;claims:Map<string,Held>}
type Binding=TagIntentBinding&{ocrAuthority:BackgroundOcrAuthority}
const fail=(code='BACKGROUND_OCR_SCOPE_EXPIRED'):never=>tagIntentFail(code)
const safe=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER
function scope(a:Binding,s:BackgroundOcrScope){if(!s||s.libraryIdentity!==a.identity||s.generation!==a.generation)fail();const v=Number(a.database.pragma('user_version',{simple:true}));if(v<1||v>15)fail();return v}
function session(a:Binding,s:BackgroundOcrSession){scope(a,s);if(s.sessionToken!==a.notebookSession)fail()}
function policy(a:Binding){return a.database.prepare('SELECT revision,choice,runtime_fingerprint AS runtime FROM background_ocr_permission WHERE singleton=1').get() as {revision:number;choice:number;runtime:string}}
export function readBackgroundOcr(a:Binding,s:BackgroundOcrScope):BackgroundOcrSnapshot{
 const version=scope(a,s),p=version>=13?policy(a):{revision:0,choice:0,runtime:''},g=a.ocrAuthority.grant
 return{schemaVersion:version,sessionToken:a.notebookSession,permissionRevision:p.revision,authorized:version===13&&!!g&&g.session===a.notebookSession&&g.revision===p.revision&&g.runtime===p.runtime&&p.choice===1,runtimeFingerprint:p.runtime,attempts:version>=13?a.database.prepare(`SELECT x.intent_id AS intentId,i.asset_id AS assetId,x.state,x.attempt_generation AS attemptGeneration,CASE WHEN x.owner_session!=? AND x.state IN ('claimed','sent','unknown') THEN 1 ELSE 0 END AS interrupted FROM background_ocr_attempts x JOIN background_analysis_intents i ON i.id=x.intent_id ORDER BY x.updated_at DESC,x.intent_id LIMIT 20`).all(a.notebookSession).map((r:any)=>({...r,interrupted:!!r.interrupted})) as BackgroundOcrSnapshot['attempts']:[]}
}
export function validateBackgroundOcrPermission(a:Binding,s:BackgroundOcrPermission,signal?:AbortSignal){
 session(a,s);const view=readBackgroundOcr(a,s)
 if(view.schemaVersion>=14)fail('BACKGROUND_OCR_USE_CONTINUOUS_RULES')
 if(signal?.aborted||!safe(s.expectedRevision)||s.expectedRevision!==view.permissionRevision||s.expectedSchemaVersion!==view.schemaVersion||typeof s.enabled!=='boolean'||typeof s.allowUpgrade!=='boolean'||typeof s.runtimeFingerprint!=='string'||s.runtimeFingerprint.length>256||s.enabled&&!s.runtimeFingerprint)fail('BACKGROUND_OCR_REVIEW_EXPIRED')
 if(view.schemaVersion!==12&&view.schemaVersion!==13)fail('BACKGROUND_OCR_ENABLE_PLANS_FIRST')
 return view
}
export function writeBackgroundOcrPermission(a:Binding,s:BackgroundOcrPermission){
 a.database.prepare('UPDATE background_ocr_permission SET revision=revision+1,choice=?,runtime_fingerprint=?,updated_at=? WHERE singleton=1 AND revision=?').run(s.enabled?1:0,s.runtimeFingerprint,new Date().toISOString(),s.expectedRevision)
}
const joins=`FROM background_analysis_intents i JOIN asset_lifecycle l ON l.design_asset_identity=i.asset_id JOIN promotion_links p ON p.design_asset_identity=i.asset_id JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity CROSS JOIN background_analysis_policy b JOIN background_analysis_capabilities k ON k.capability=i.capability`
const eligible=`i.capability='ocr' AND i.decision='active' AND l.ownership='managed' AND l.lifecycle_state='active' AND i.source_generation=r.source_generation AND i.preview_generation=c.preview_generation_identity AND b.singleton=1 AND b.enabled=1 AND k.enabled=1`
function intent(a:Binding,id:string){return a.database.prepare(`SELECT i.id,i.asset_id AS assetId,i.revision,i.source_generation AS source,i.preview_generation AS preview ${joins} WHERE ${eligible} AND i.id=?`).get(id) as {id:string;assetId:string;revision:number;source:string;preview:string}|undefined}
function grant(a:Binding,s:BackgroundOcrSession,runtime:string){session(a,s);const g=a.ocrAuthority.grant;if(!g)return fail('BACKGROUND_OCR_PERMISSION_REQUIRED');if(g.session!==a.notebookSession||g.runtime!==runtime||Number(a.database.pragma('user_version',{simple:true}))!==13)fail('BACKGROUND_OCR_PERMISSION_REQUIRED');const p=policy(a);if(!p.choice||p.revision!==g.revision)fail();return g}
export function claimBackgroundOcr(a:Binding,s:BackgroundOcrSession&{runtimeFingerprint:string}):BackgroundOcrClaim|null{
 const g=grant(a,s,s.runtimeFingerprint)
 if([...a.ocrAuthority.claims.values()].some(c=>c.session===a.notebookSession))return null
 const row=a.database.prepare(`SELECT i.id ${joins} LEFT JOIN background_ocr_attempts x ON x.intent_id=i.id WHERE ${eligible} AND (x.intent_id IS NULL OR x.state='deferred' OR (x.state IN ('failed','cancelled') AND (x.permission_revision<? OR (x.state='cancelled' AND x.intent_revision<i.revision))) OR (x.state='claimed' AND x.owner_session!=? AND x.permission_revision<?)) ORDER BY i.created_at,i.id LIMIT 1`).get(g.revision,a.notebookSession,g.revision) as {id:string}|undefined
 if(!row)return null
 const i=intent(a,row.id)!;const old=a.database.prepare('SELECT attempt_generation AS generation FROM background_ocr_attempts WHERE intent_id=?').get(i.id) as {generation:number}|undefined
 const generation=(old?.generation??0)+1;if(!safe(generation))fail();const attemptId=randomUUID(),token=randomUUID(),now=new Date().toISOString()
 a.database.prepare(`INSERT INTO background_ocr_attempts VALUES(?,?,?,?,?,?,'claimed',?,'rapidocr-preview-v1',NULL,NULL,NULL,?) ON CONFLICT(intent_id) DO UPDATE SET attempt_id=excluded.attempt_id,attempt_generation=excluded.attempt_generation,intent_revision=excluded.intent_revision,permission_revision=excluded.permission_revision,owner_session=excluded.owner_session,state='claimed',runtime_fingerprint=excluded.runtime_fingerprint,effect_digest=NULL,evidence_id=NULL,saved_revision=NULL,updated_at=excluded.updated_at`).run(i.id,attemptId,generation,i.revision,g.revision,a.notebookSession,g.runtime,now)
 a.ocrAuthority.claims.set(token,{session:a.notebookSession,intentId:i.id,attemptId,generation,intentRevision:i.revision,permissionRevision:g.revision,source:i.source,preview:i.preview,runtime:g.runtime})
 return{...s,token,attemptId,intentId:i.id,assetId:i.assetId,runtimeFingerprint:g.runtime}
}
function held(a:Binding,c:BackgroundOcrClaim){session(a,c);const h=a.ocrAuthority.claims.get(c.token);if(!h||h.session!==a.notebookSession||h.attemptId!==c.attemptId||h.intentId!==c.intentId||h.runtime!==c.runtimeFingerprint)fail();return h!}
function validateClaim(a:Binding,c:BackgroundOcrClaim){const h=held(a,c),g=grant(a,c,c.runtimeFingerprint),i=intent(a,c.intentId);if(g.revision!==h.permissionRevision||!i||i.assetId!==c.assetId||i.revision!==h.intentRevision||i.source!==h.source||i.preview!==h.preview)fail('BACKGROUND_OCR_INTENT_CHANGED');return h}
export function markBackgroundOcrSent(a:Binding,c:BackgroundOcrClaim){validateClaim(a,c);const r=a.database.prepare("UPDATE background_ocr_attempts SET state='sent',updated_at=? WHERE intent_id=? AND attempt_id=? AND state='claimed'").run(new Date().toISOString(),c.intentId,c.attemptId);if(r.changes!==1)fail()}
export function commitBackgroundOcr(a:Binding,input:BackgroundOcrCommit,signal?:AbortSignal):BackgroundOcrReceipt{
 const {claim:c,ocr}=input;session(a,c);if(signal?.aborted)fail();if(ocr.assetId!==c.assetId||ocr.libraryIdentity!==c.libraryIdentity||ocr.generation!==c.generation||ocr.sessionToken!==c.sessionToken)fail()
 const row=a.database.prepare('SELECT * FROM background_ocr_attempts WHERE intent_id=? AND attempt_id=?').get(c.intentId,c.attemptId) as any;if(!row)fail()
 const origin=a.database.prepare('SELECT asset_id,source_generation,preview_generation FROM background_analysis_intents WHERE id=?').get(c.intentId) as any
 if(!origin||origin.asset_id!==c.assetId||row.runtime_fingerprint!==c.runtimeFingerprint)fail()
 requireOcrScope(a,ocr)
 const observation=validateOcrObservation(ocr.evidence.observation)
 const digest=createHash('sha256').update(JSON.stringify([c.intentId,c.attemptId,row.attempt_generation,origin.asset_id,origin.source_generation,origin.preview_generation,c.runtimeFingerprint,'rapidocr-preview-v1',ocr.evidence.assetRevision,ocr.evidence.sourceRef,ocr.evidence.inputSha256,observation])).digest('hex')
 if(row.state==='succeeded'){if(row.effect_digest!==digest)fail('BACKGROUND_OCR_EFFECT_CONFLICT');return{attemptId:c.attemptId,intentId:c.intentId,evidenceId:row.evidence_id,savedRevision:row.saved_revision}}
 validateClaim(a,c);if(row.state!=='sent')fail()
 const result=commitOcr(a,{...ocr,evidence:{...ocr.evidence,observation}},signal)
 a.database.prepare("UPDATE background_ocr_attempts SET state='succeeded',effect_digest=?,evidence_id=?,saved_revision=?,updated_at=? WHERE intent_id=? AND attempt_id=?").run(digest,result.evidence!.id,result.revision,new Date().toISOString(),c.intentId,c.attemptId)
 return{attemptId:c.attemptId,intentId:c.intentId,evidenceId:result.evidence!.id,savedRevision:result.revision}
}
export function finishBackgroundOcr(a:Binding,c:BackgroundOcrClaim,state:'failed'|'cancelled'|'unknown'|'deferred'){
 held(a,c);if(state==='deferred'&&(a.database.prepare('SELECT state FROM background_ocr_attempts WHERE attempt_id=?').get(c.attemptId) as {state:string}|undefined)?.state!=='claimed')fail();a.database.prepare("UPDATE background_ocr_attempts SET state=?,updated_at=? WHERE intent_id=? AND attempt_id=? AND state IN ('claimed','sent','unknown')").run(state,new Date().toISOString(),c.intentId,c.attemptId)
 if(state!=='unknown')a.ocrAuthority.claims.delete(c.token)
}
export function releaseBackgroundOcrClaim(a:Binding,c:BackgroundOcrClaim){a.ocrAuthority.claims.delete(c.token)}
