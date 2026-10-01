import {BASIC_CAPABILITIES,type BackgroundScope,type BackgroundSnapshot,type BackgroundConfigCommit,type BackgroundDecision,type BackgroundPolicy} from '../../shared/contracts/background-analysis.contract'
import {tagIntentFail,type TagIntentBinding,tagIntentId} from '../independent-tags/tag-intent-storage'
import {isKnownLibrarySchemaVersion} from '../library-lifecycle/library-schema-version'
const defaults=():BackgroundPolicy=>({enabled:false,capabilities:{tags:true,caption:true,ocr:true},revision:0})
const safeRevision=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER
function authorize(a:TagIntentBinding,s:BackgroundScope){if(!s||s.libraryIdentity!==a.identity||s.generation!==a.generation)tagIntentFail('BACKGROUND_SCOPE_EXPIRED');if(s.assetId){tagIntentId(s.assetId);if(!a.database.prepare("SELECT 1 FROM asset_lifecycle WHERE design_asset_identity=? AND lifecycle_state='active'").get(s.assetId))tagIntentFail('BACKGROUND_ASSET_UNAVAILABLE')}const v=Number(a.database.pragma('user_version',{simple:true}));if(!isKnownLibrarySchemaVersion(v))tagIntentFail('BACKGROUND_SCHEMA_UNSUPPORTED');return v}
const projection=`CASE WHEN i.decision='cancelled' THEN 'cancelled' WHEN r.source_generation!=i.source_generation OR c.preview_generation_identity!=i.preview_generation THEN 'superseded' WHEN i.decision='user-paused' THEN 'user-paused' WHEN l.lifecycle_state!='active' THEN 'waiting-asset' WHEN policy.enabled=0 OR k.enabled=0 THEN 'policy-paused' ELSE 'waiting' END`
const joins=`FROM background_analysis_intents i JOIN background_analysis_capabilities k USING(capability) JOIN asset_lifecycle l ON l.design_asset_identity=i.asset_id JOIN promotion_links p ON p.design_asset_identity=i.asset_id JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity CROSS JOIN background_analysis_policy policy`
export function readBackgroundAnalysis(a:TagIntentBinding,input:BackgroundScope):BackgroundSnapshot{
 const version=authorize(a,input);if(version<12)return{schemaVersion:version,sessionToken:a.notebookSession,policy:defaults(),intents:[],counts:[]}
 const policy=a.database.prepare('SELECT enabled,revision FROM background_analysis_policy WHERE singleton=1').get() as {enabled:number;revision:number}|undefined,rows=a.database.prepare('SELECT capability,enabled FROM background_analysis_capabilities').all() as {capability:string;enabled:number}[]
 if(!policy||!safeRevision(policy.revision)||rows.length!==3)throw Error('BACKGROUND_POLICY_INVALID')
 const config=defaults();config.enabled=policy.enabled===1;config.revision=policy.revision;for(const cap of BASIC_CAPABILITIES){const row=rows.find(r=>r.capability===cap);if(!row)throw Error('BACKGROUND_POLICY_INVALID');config.capabilities[cap]=row.enabled===1}
 const filter=input.assetId?'WHERE i.asset_id=?':'',args=input.assetId?[input.assetId]:[]
 const counts=a.database.prepare(`SELECT i.capability,${projection} AS state,COUNT(*) AS count ${joins} ${filter} GROUP BY i.capability,state ORDER BY i.capability,state`).all(...args) as BackgroundSnapshot['counts']
 const intents=input.assetId?a.database.prepare(`SELECT i.id,i.capability,i.revision,${projection} AS state ${joins} WHERE i.asset_id=? ORDER BY i.capability LIMIT 3`).all(input.assetId) as BackgroundSnapshot['intents']:[]
 return{schemaVersion:version,sessionToken:a.notebookSession,policy:config,intents,counts}
}
export function validateBackgroundConfig(a:TagIntentBinding,input:BackgroundConfigCommit,signal?:AbortSignal){
 const snapshot=readBackgroundAnalysis(a,input)
 if(input.assetId!==undefined||signal?.aborted||input.sessionToken!==a.notebookSession)tagIntentFail('BACKGROUND_SCOPE_EXPIRED')
 if(!safeRevision(input.expectedRevision)||input.expectedRevision===Number.MAX_SAFE_INTEGER||input.expectedRevision!==snapshot.policy.revision)tagIntentFail('BACKGROUND_CONFLICT')
 if(typeof input.enabled!=='boolean'||typeof input.allowUpgrade!=='boolean'||!isKnownLibrarySchemaVersion(input.expectedSchemaVersion)||!input.capabilities||Object.keys(input.capabilities).length!==3||BASIC_CAPABILITIES.some(c=>typeof input.capabilities[c]!=='boolean'))tagIntentFail('BACKGROUND_INPUT_INVALID')
 return snapshot
}
export function writeBackgroundConfig(a:TagIntentBinding,input:BackgroundConfigCommit,signal?:AbortSignal){
 validateBackgroundConfig(a,input,signal)
 a.database.prepare('UPDATE background_analysis_policy SET enabled=?,revision=revision+1 WHERE singleton=1 AND revision=?').run(input.enabled?1:0,input.expectedRevision)
 for(const cap of BASIC_CAPABILITIES)a.database.prepare('UPDATE background_analysis_capabilities SET enabled=? WHERE capability=?').run(input.capabilities[cap]?1:0,cap)
}
export function changeBackgroundIntent(a:TagIntentBinding,input:BackgroundDecision,signal?:AbortSignal){
 const snapshot=readBackgroundAnalysis(a,input)
 if(signal?.aborted||input.sessionToken!==a.notebookSession||!input.assetId)tagIntentFail('BACKGROUND_SCOPE_EXPIRED')
 if(!safeRevision(input.expectedRevision)||input.expectedRevision===Number.MAX_SAFE_INTEGER||!['pause','resume','cancel'].includes(input.action))tagIntentFail('BACKGROUND_INPUT_INVALID')
 const item=snapshot.intents.find(i=>i.id===input.id);if(!item||item.revision!==input.expectedRevision||['superseded','cancelled','waiting-asset'].includes(item.state))tagIntentFail('BACKGROUND_CONFLICT')
 const raw=a.database.prepare('SELECT decision FROM background_analysis_intents WHERE id=? AND asset_id=?').get(input.id,input.assetId) as {decision:string}
 if(input.action==='resume'&&raw.decision!=='user-paused')tagIntentFail('BACKGROUND_CONFLICT')
 a.database.prepare('UPDATE background_analysis_intents SET decision=?,revision=revision+1 WHERE id=? AND revision=?').run(input.action==='pause'?'user-paused':input.action==='resume'?'active':'cancelled',input.id,input.expectedRevision)
}
