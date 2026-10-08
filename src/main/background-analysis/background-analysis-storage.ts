import {BASIC_CAPABILITIES,type BackgroundScope,type BackgroundSnapshot,type BackgroundConfigCommit,type BackgroundDecision,type BackgroundPolicy} from '../../shared/contracts/background-analysis.contract'
import {tagIntentFail,type TagIntentBinding,tagIntentId} from '../independent-tags/tag-intent-storage'
import {isKnownLibrarySchemaVersion} from '../library-lifecycle/library-schema-version'
const defaults=():BackgroundPolicy=>({enabled:false,capabilities:{tags:true,caption:true,ocr:true},revision:0})
const safeRevision=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER
function authorize(a:TagIntentBinding,s:BackgroundScope){if(!s||s.libraryIdentity!==a.identity||s.generation!==a.generation)tagIntentFail('BACKGROUND_SCOPE_EXPIRED');if(s.assetId){tagIntentId(s.assetId);if(!a.database.prepare("SELECT 1 FROM asset_lifecycle WHERE design_asset_identity=? AND lifecycle_state='active'").get(s.assetId))tagIntentFail('BACKGROUND_ASSET_UNAVAILABLE')}const v=Number(a.database.pragma('user_version',{simple:true}));if(!isKnownLibrarySchemaVersion(v))tagIntentFail('BACKGROUND_SCHEMA_UNSUPPORTED');return v}
const projection=`CASE WHEN i.decision='cancelled' THEN 'cancelled' WHEN r.source_generation!=i.source_generation OR c.preview_generation_identity!=i.preview_generation THEN 'superseded' WHEN i.decision='user-paused' THEN 'user-paused' WHEN l.lifecycle_state!='active' THEN 'waiting-asset' WHEN policy.enabled=0 OR k.enabled=0 THEN 'policy-paused' ELSE 'waiting' END`
const joins=`FROM background_analysis_intents i JOIN background_analysis_capabilities k USING(capability) JOIN asset_lifecycle l ON l.design_asset_identity=i.asset_id JOIN promotion_links p ON p.design_asset_identity=i.asset_id JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity CROSS JOIN background_analysis_policy policy`
interface CountCache {sequence:number;schema:number;installed:Set<string>;rows:Map<string,BackgroundSnapshot['counts']>;key:string}
const countCaches=new WeakMap<TagIntentBinding['database'],CountCache>()
const suspendedCountCaches=new WeakSet<TagIntentBinding['database']>()
/** The Host has drained readers before maintenance. Remove only this cache's
 * own TEMP triggers so the protected backup still sees an empty temp schema.
 * Reads during maintenance stay pure; the next ordinary read reattaches. */
export function suspendBackgroundCountCache(db:TagIntentBinding['database']):()=>void{
 const cache=countCaches.get(db)
 suspendedCountCaches.add(db)
 const resume=()=>{suspendedCountCaches.delete(db);if(cache){cache.installed.clear();cache.rows.clear();cache.key=''}}
 try{
  if(cache)for(const table of cache.installed)for(const event of ['INSERT','UPDATE','DELETE'])db.exec(`DROP TRIGGER IF EXISTS temp.dam_bg_counts_${table}_${event}`)
 }catch(error){resume();throw error}
 if(cache){cache.installed.clear();cache.rows.clear();cache.key=''}
 return resume
}
/** Derived aggregate only. TEMP triggers invalidate on every relevant write;
 * a rolled-back write can cause extra work, never a stale committed count.
 * Counts read inside a transaction are deliberately not retained. */
function backgroundCounts(a:TagIntentBinding,scope:BackgroundScope,version:number,sql:string,args:string[]):BackgroundSnapshot['counts']{
 const db=a.database
 // Backup/migration validation can deliberately hold a query-only connection
 // or an open DDL transaction. It must remain a pure read, including TEMP DDL.
 if(suspendedCountCaches.has(db)||db.inTransaction||Number(db.pragma('query_only',{simple:true}))===1)return db.prepare(sql).all(...args) as BackgroundSnapshot['counts']
 let cache=countCaches.get(db)
 if(!cache){cache={sequence:0,schema:-1,installed:new Set(),rows:new Map(),key:''};countCaches.set(db,cache)
   db.function('dam_background_counts_changed',()=>{cache!.sequence++;return null})}
 const schema=Number(db.pragma('schema_version',{simple:true}))
 if(cache.schema!==schema){cache.schema=schema;cache.installed.clear();cache.rows.clear()}
 const tables=new Set((db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all() as {name:string}[]).map(row=>row.name))
 for(const table of ['background_analysis_intents','background_analysis_policy','background_analysis_capabilities','background_analysis_executions',
   'asset_lifecycle','promotion_links','asset_candidates','capture_requests']){
   if(!tables.has(table)||cache.installed.has(table))continue
   for(const event of ['INSERT','UPDATE','DELETE'])db.exec(`CREATE TEMP TRIGGER IF NOT EXISTS dam_bg_counts_${table}_${event} AFTER ${event} ON main.${table} BEGIN SELECT dam_background_counts_changed(); END`)
   cache.installed.add(table)
 }
 const key=JSON.stringify([a.identity,a.generation,version,schema,cache.sequence,db.pragma('data_version',{simple:true})])
 if(cache.key!==key){cache.rows.clear();cache.key=key}
 const owner=scope.assetId??'whole-library'
 const previous=!db.inTransaction?cache.rows.get(owner):undefined
 if(previous)return previous.map(row=>({...row}))
 const rows=db.prepare(sql).all(...args) as BackgroundSnapshot['counts']
 if(!db.inTransaction){if(cache.rows.size>=32)cache.rows.delete(cache.rows.keys().next().value!);cache.rows.set(owner,rows.map(row=>({...row})))}
 return rows
}
export function readBackgroundAnalysis(a:TagIntentBinding,input:BackgroundScope):BackgroundSnapshot{
 const version=authorize(a,input);if(version<12)return{schemaVersion:version,sessionToken:a.notebookSession,policy:defaults(),intents:[],counts:[]}
 const policy=a.database.prepare('SELECT enabled,revision FROM background_analysis_policy WHERE singleton=1').get() as {enabled:number;revision:number}|undefined,rows=a.database.prepare('SELECT capability,enabled FROM background_analysis_capabilities').all() as {capability:string;enabled:number}[]
 if(!policy||!safeRevision(policy.revision)||rows.length!==3)throw Error('BACKGROUND_POLICY_INVALID')
 const config=defaults();config.enabled=policy.enabled===1;config.revision=policy.revision;for(const cap of BASIC_CAPABILITIES){const row=rows.find(r=>r.capability===cap);if(!row)throw Error('BACKGROUND_POLICY_INVALID');config.capabilities[cap]=row.enabled===1}
 const filter=input.assetId?'WHERE i.asset_id=?':'',args=input.assetId?[input.assetId]:[]
 const executionJoins=version>=14?joins+' LEFT JOIN background_analysis_executions x ON x.intent_id=i.id':joins
 const state=version>=14?`CASE WHEN i.decision='cancelled' THEN 'cancelled' WHEN r.source_generation!=i.source_generation OR c.preview_generation_identity!=i.preview_generation THEN 'superseded' WHEN i.decision='user-paused' THEN 'user-paused' WHEN x.state IN ('claimed','sent') THEN 'running' WHEN x.state IN ('succeeded','failed','cancelled','unknown','abandoned') THEN x.state ELSE ${projection} END`:projection
 const counts=backgroundCounts(a,input,version,`SELECT i.capability,${state} AS state,COUNT(*) AS count ${executionJoins} ${filter} GROUP BY i.capability,state ORDER BY i.capability,state`,args)
 const intents=input.assetId?a.database.prepare(`SELECT i.id,i.capability,i.revision,${state} AS state ${executionJoins} WHERE i.asset_id=? ORDER BY i.capability LIMIT 3`).all(input.assetId) as BackgroundSnapshot['intents']:[]
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
