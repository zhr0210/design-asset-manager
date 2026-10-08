import {backendExecutionBinding,backendLocation} from '../ai-gateway/backend-binding'
import {createHash,randomUUID} from 'node:crypto'
import type {ActiveLibraryHost} from '../../shared/contracts/active-library.contract'
import type {AppSettings} from '../../shared/types/settings.types'
import type {TagBatchPrepare,TagBatchCommit,TagBatchReview,TagBatchJob,TagBatchScope} from '../../shared/contracts/tag-batch.contract'
import type {createTagExecutionController} from './tag-execution-controller'
import {tagExecutionMessage} from './tag-execution-controller'
import {tagIntentId} from './tag-intent-storage'
const fingerprint=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
type Plan={skipStates?:ReadonlyArray<{assetId:string;state:'outcome-unknown'|'superseded'}>;owner:string;input:TagBatchCommit;review:TagBatchReview;backendFingerprint:string}
type Job={activeChild?:{id:string;assetId:string};owner:string;childOwner:string;value:TagBatchJob;abort:AbortController;settled?:Promise<void>}
export function createTagBatchController(deps:{host:ActiveLibraryHost;settings():AppSettings;execution:ReturnType<typeof createTagExecutionController>;changed(scope:TagBatchScope&{assetId:string}):void;now?:()=>number}){
 const plans=new Map<string,Plan>(),jobs=new Map<string,Job>(),preparing=new Set<string>(),owners=new Map<string,number>();let epoch=0,suspended=false,running=0;const now=deps.now??Date.now
 const backend=(id:string)=>{const b=deps.settings().aiBackends?.find(b=>b.id===id);if(!b?.enabled||!b.capabilities.vision)throw Error('TAG_BACKEND_UNAVAILABLE');const u=new URL(b.baseUrl);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hash)throw Error('TAG_BACKEND_UNAVAILABLE');return structuredClone(b)}
 const scope=(s:TagBatchScope)=>{const current=deps.host.inspect();if(current.state!=='ready'||current.identity!==s.libraryIdentity||current.generation!==s.generation)throw Error('TAG_INTENT_SCOPE_EXPIRED')}
 const get=(owner:string,id:string)=>{const j=jobs.get(id);if(!j||owner!=='main'&&j.owner!==owner)throw Error('TAG_JOB_UNAVAILABLE');scope(j.value);return j}
 const snapshot=(j:Job)=>{const value=structuredClone(j.value);if(j.activeChild){const child=deps.execution.inspect(j.childOwner,j.activeChild.id),item=value.items.find(i=>i.assetId===j.activeChild!.assetId)!;item.state=child.state;item.error=child.error}return value}
 const stop=(j:Job)=>{j.abort.abort();deps.execution.cancelOwner(j.childOwner)}
 const invalidate=()=>{epoch++;plans.clear();for(const j of jobs.values())stop(j)}
 const checkFrozen=async(p:Plan,signal:AbortSignal,item:TagBatchCommit['items'][number])=>{
  signal.throwIfAborted();scope(p.input);if(fingerprint(backend(p.input.backendId))!==p.backendFingerprint)throw Error('TAG_BACKEND_CHANGED')
  const c=await deps.host.readTagIntentContext({...p.input,assetId:item.assetId});signal.throwIfAborted()
  if(c.sessionToken!==p.input.sessionToken||c.asset.revision!==item.assetRevision||c.asset.previewGeneration!==item.previewGeneration)throw Error('TAG_INTENT_SOURCE_CHANGED')
 }
 return{
  async prepare(owner:string,input:TagBatchPrepare,skipStates?:Plan['skipStates']):Promise<TagBatchReview>{
   if(suspended||!input||Object.keys(input).some(k=>!['libraryIdentity','generation','assetIds','requestId','backendId','model','forceRerun'].includes(k))||!Array.isArray(input.assetIds)||input.assetIds.length<1||input.assetIds.length>8||new Set(input.assetIds).size!==input.assetIds.length||typeof input.forceRerun!=='boolean')throw Error('TAG_BATCH_INVALID')
   tagIntentId(input.requestId);tagIntentId(input.backendId);input.assetIds.forEach(tagIntentId)
   const model=input.model?.trim();if(!model||model.length>256||/[\x00-\x1f]/.test(model))throw Error('TAG_BATCH_INVALID')
   for(const [id,p]of plans)if(p.owner===owner||Date.parse(p.review.expiresAt)<now())plans.delete(id)
   if(preparing.has(owner)||preparing.size+plans.size>=4)throw Error('TAG_EXECUTION_BUSY')
   const version=epoch,ownerVersion=owners.get(owner)??0,b=backend(input.backendId),fp=fingerprint(b)
   preparing.add(owner)
   try{
    const contexts:Array<Awaited<ReturnType<ActiveLibraryHost['readTagIntentContext']>>>=[];for(const assetId of [...input.assetIds].sort((a,b)=>a.localeCompare(b,'en')))contexts.push(await deps.host.readTagIntentContext({...input,assetId}))
    const selected=await deps.host.readAssetContext(input.assetIds)
    if(suspended||epoch!==version||ownerVersion!==(owners.get(owner)??0)||fingerprint(backend(input.backendId))!==fp||contexts.some(c=>c.sessionToken!==contexts[0].sessionToken))throw Error('TAG_INTENT_SESSION_EXPIRED')
    const c=contexts[0],origin=new URL(b.baseUrl),review:TagBatchReview={receipt:randomUUID(),requestId:input.requestId,assetIds:contexts.map(c=>c.asset.id),assets:contexts.map(c=>({assetId:c.asset.id,title:selected.assets.find(a=>a.id===c.asset.id)?.title??'素材'})),backendName:b.name,providerOrigin:origin.origin,model,location:backendLocation(b),forceRerun:input.forceRerun,inputDescription:`确认后逐一处理本次 ${contexts.length} 个素材的受控预览（白底 JPEG，最长边1024），最多8项；不发送原件或路径。已成功项复用结果；状态未知项不自动重发。`,storageNotice:(c.schemaVersion<10?'首次启用将备份数据库、停止在途旧视觉任务并升级至 v10；旧版应用无法打开。 ':'')+(input.forceRerun?'本次明确新建请求代次并重新分析；失败仍保留上次已提交结果。':'相同范围和配置复用已有请求；重复点击不增加代次。'),expiresAt:new Date(now()+300000).toISOString()}
    const commit:TagBatchCommit={libraryIdentity:input.libraryIdentity,generation:input.generation,sessionToken:c.sessionToken,expectedSchemaVersion:c.schemaVersion,allowUpgrade:true,requestId:input.requestId,backendId:b.id,model,backendBindingSha256:backendExecutionBinding(b,model),recipeId:'independent-tags-v1',recipeVersion:'1',forceRerun:input.forceRerun,items:contexts.map(c=>({assetId:c.asset.id,assetRevision:c.asset.revision,previewGeneration:c.asset.previewGeneration}))}
    plans.set(review.receipt,{owner,input:commit,review,backendFingerprint:fp,skipStates:skipStates?structuredClone(skipStates):undefined});return review
   }finally{preparing.delete(owner)}
  },
  async run(owner:string,receipt:string):Promise<TagBatchJob>{
   if(suspended||running)throw Error('TAG_EXECUTION_BUSY');const p=plans.get(receipt);if(!p||p.owner!==owner||Date.parse(p.review.expiresAt)<now())throw Error('TAG_INTENT_SESSION_EXPIRED');scope(p.input)
   plans.delete(receipt);const id=randomUUID(),j:Job={owner,childOwner:`batch:${owner}:${id}`,abort:new AbortController(),value:{id,requestId:p.input.requestId,libraryIdentity:p.input.libraryIdentity,generation:p.input.generation,state:'queued',items:p.input.items.map(i=>({assetId:i.assetId,title:p.review.assets.find(a=>a.assetId===i.assetId)!.title,state:'waiting-execution'}))}}
   for(const [key,old]of jobs)if(jobs.size>=50&&!['queued','running'].includes(old.value.state))jobs.delete(key)
   jobs.set(id,j);running++;j.settled=execute(p,j).finally(()=>{running--});return structuredClone(j.value)
  },
  inspect:(owner:string,id:string)=>snapshot(get(owner,id)),
  cancel(owner:string,id:string){const j=get(owner,id);stop(j);return snapshot(j)},
  async settle(owner:string,id:string){const j=get(owner,id);await j.settled;return structuredClone(j.value)},
  discard(owner:string,receipt:string){const p=plans.get(receipt);if(!p)return;if(p.owner!==owner)throw Error('TAG_INTENT_SESSION_EXPIRED');plans.delete(receipt)},
  cancelOwner(owner:string){owners.set(owner,(owners.get(owner)??0)+1);for(const [id,p]of plans)if(p.owner===owner)plans.delete(id);for(const j of jobs.values())if(j.owner===owner)stop(j)},
  invalidate,
  async suspendAndDrain(){suspended=true;invalidate();await Promise.all([...jobs.values()].map(j=>j.settled))},
  resume(){suspended=false}
 }
 async function execute(p:Plan,j:Job){
  try{
   for(const item of p.input.items)await checkFrozen(p,j.abort.signal,item)
   const saved=await deps.host.saveTagBatch(p.input,j.abort.signal);j.value.requestId=saved.requestId;j.value.state='running'
   for(const item of p.input.items){
    const status=j.value.items.find(i=>i.assetId===item.assetId)!
    if(j.abort.signal.aborted){status.state='cancelled';continue}
    const skipped=p.skipStates?.find(s=>s.assetId===item.assetId);if(skipped){status.state=skipped.state;continue}
    let review:string|undefined
    try{
     for(;;){
      await deps.execution.waitIdle(j.abort.signal);await checkFrozen(p,j.abort.signal,item)
      const r=await deps.execution.prepare(j.childOwner,{libraryIdentity:p.input.libraryIdentity,generation:p.input.generation,assetId:item.assetId,requestId:saved.requestId});review=r.receipt
      await checkFrozen(p,j.abort.signal,item)
      try{
       const child=await deps.execution.run(j.childOwner,review);review=undefined;j.activeChild={id:child.id,assetId:item.assetId};status.state=child.state
       const result=await deps.execution.settle(j.childOwner,child.id);status.state=result.state;status.error=result.error;break
      }catch(e){if(e instanceof Error&&e.message==='TAG_EXECUTION_BUSY'){deps.execution.discardReview(j.childOwner,review!);review=undefined;continue}throw e}
     }
    }catch(error){status.state=j.abort.signal.aborted?'cancelled':'failed';status.error=tagExecutionMessage(error);if(!j.abort.signal.aborted&&error instanceof Error&&error.message==='TAG_EXECUTION_RECONFIRM_REQUIRED'){try{const current=await deps.host.readTagExecutionRequest({...p.input,assetId:item.assetId},saved.requestId);if(['outcome-unknown','superseded','running'].includes(current.state))status.state=current.state}catch{}}}
    finally{j.activeChild=undefined;if(review)deps.execution.discardReview(j.childOwner,review);try{deps.changed({...j.value,assetId:item.assetId})}catch{}}
   }
   const successes=j.value.items.filter(i=>i.state==='succeeded').length
   j.value.state=successes===j.value.items.length?'completed':j.abort.signal.aborted?'cancelled':successes?'partial':'failed'
  }catch(error){j.value.state=j.abort.signal.aborted?'cancelled':'failed';j.value.error=tagExecutionMessage(error);for(const i of j.value.items)if(i.state==='waiting-execution')i.state=j.abort.signal.aborted?'cancelled':'failed'}
 }
}
