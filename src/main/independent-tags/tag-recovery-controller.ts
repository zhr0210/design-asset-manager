import {backendExecutionBinding} from '../ai-gateway/backend-binding'
import {createHash} from 'node:crypto'
import type {ActiveLibraryHost} from '../../shared/contracts/active-library.contract'
import type {AppSettings} from '../../shared/types/settings.types'
import type {TagBatchScope} from '../../shared/contracts/tag-batch.contract'
import type {TagRecoveryScope,TagRecoveryBatch} from '../../shared/contracts/tag-recovery.contract'
import type {createTagBatchController} from './tag-batch-controller'
const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
export function createTagRecoveryController(deps:{host:ActiveLibraryHost;settings():AppSettings;batch:ReturnType<typeof createTagBatchController>;changed(scope:TagBatchScope&{assetId:string;eventId:string}):void|Promise<void>}){
 let epoch=0;const owners=new Map<string,number>()
 let flight:{key:string;promise:Promise<{delivered:number;pending:boolean}>}|undefined
 async function flush(scope:TagBatchScope){
  const session=await deps.host.readVisualSession(scope),key=JSON.stringify([scope.libraryIdentity,scope.generation,session.sessionToken])
  if(flight?.key===key)return flight.promise
  const pending=(async()=>{let delivered=0
   try{
    for(let page=0;page<20;page++){
     const events=await deps.host.readTagOutbox({...scope,sessionToken:session.sessionToken});if(!events.length)return{delivered,pending:false}
     for(const event of events){await deps.changed({...scope,assetId:event.assetId,eventId:event.eventId});await deps.host.ackTagOutbox({...scope,sessionToken:session.sessionToken},event.eventId);delivered++}
    }
    return{delivered,pending:(await deps.host.readTagOutbox({...scope,sessionToken:session.sessionToken})).length>0}
   }catch{return{delivered,pending:true}}
  })()
  flight={key,promise:pending};try{return await pending}finally{if(flight?.promise===pending)flight=undefined}
 }
 const fence=async(owner:string,scope:TagBatchScope,version:number,ownerVersion:number,sessionToken:string)=>{
  const current=await deps.host.readVisualSession(scope)
  if(version!==epoch||ownerVersion!==(owners.get(owner)??0)||current.sessionToken!==sessionToken)throw Error('TAG_INTENT_SESSION_EXPIRED')
 }
 const stored=(owner:string,input:TagRecoveryScope,requestId?:string)=>deps.host.readTagRecovery(input,owner==='main',requestId)
 return{
  flush,
  invalidate(){epoch++},
  cancelOwner(owner:string){owners.set(owner,(owners.get(owner)??0)+1)},
  async list(owner:string,input:TagRecoveryScope):Promise<TagRecoveryBatch[]>{
   const version=epoch,ownerVersion=owners.get(owner)??0,session=await deps.host.readVisualSession(input),rows=await stored(owner,input);await flush(input)
   await fence(owner,input,version,ownerVersion,session.sessionToken)
   return rows.map(r=>({requestId:r.requestId,backendId:r.backendId,model:r.model,items:r.items.map(({assetRevision:_r,previewGeneration:_p,...i})=>i)}))
  },
  async prepare(owner:string,input:TagRecoveryScope&{requestId:string}){
   if(!input||Object.keys(input).some(k=>!['libraryIdentity','generation','assetIds','requestId'].includes(k)))throw Error('TAG_RECOVERY_INVALID')
   const version=epoch,ownerVersion=owners.get(owner)??0,session=await deps.host.readVisualSession(input)
   const record=(await stored(owner,input,input.requestId))[0];if(!record||record.items.some(i=>!i.sourceMatches))throw Error('TAG_INTENT_SOURCE_CHANGED')
   const b=deps.settings().aiBackends?.find(b=>b.id===record.backendId)
   if(!b?.enabled||!b.capabilities.vision||backendExecutionBinding(b,record.model)!==record.backendBindingSha256)throw Error('TAG_BACKEND_CHANGED')
   const allowed=record.items.filter(i=>i.isLatest&&['waiting-execution','paused','failed','cancelled'].includes(i.state));if(!allowed.length)throw Error('TAG_RECOVERY_NOTHING_TO_RUN')
   const skipped=record.items.filter(i=>i.state==='outcome-unknown'||i.state==='superseded').map(i=>({assetId:i.assetId,state:i.state as 'outcome-unknown'|'superseded'}))
   const review=await deps.batch.prepare(owner,{libraryIdentity:input.libraryIdentity,generation:input.generation,assetIds:record.items.map(i=>i.assetId),requestId:record.requestId,backendId:record.backendId,model:record.model,forceRerun:false},skipped)
   try{
    const fresh=(await stored(owner,input,input.requestId))[0]
    if(!fresh||fresh.items.some(i=>!i.sourceMatches))throw Error('TAG_INTENT_SOURCE_CHANGED')
    await fence(owner,input,version,ownerVersion,session.sessionToken)
   }catch(error){deps.batch.discard(owner,review.receipt);throw error}
   return{...review,resumeSummary:`重新核对当前服务与认证配置：${allowed.length} 项可继续，${record.items.filter(i=>i.state==='succeeded').length} 项复用已保存结果，${skipped.length} 项未知或已被替代，不会重发。`}
  },
  async receipt(owner:string,input:TagBatchScope&{assetId:string;requestId:string}){
   const version=epoch,ownerVersion=owners.get(owner)??0,session=await deps.host.readVisualSession(input)
   const result=await deps.host.readTagEffectReceipt({...input,sessionToken:session.sessionToken})
   await fence(owner,input,version,ownerVersion,session.sessionToken);return result
  }
 }
}
