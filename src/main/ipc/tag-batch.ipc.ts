import * as C from '../../shared/contracts/tag-batch.contract'
import {tagExecutionMessage} from '../independent-tags/tag-execution-controller'
import type {createTagBatchController} from '../independent-tags/tag-batch-controller'
import type {createAssetCardController} from '../asset-card/asset-card-controller'
import type {MainIpcHandleRegistrar} from './ipc-registrar'
import type {IpcMainInvokeEvent} from 'electron'
export function registerTagBatchIpc(deps:{controller?:ReturnType<typeof createTagBatchController>;card?:ReturnType<typeof createAssetCardController>;isMain(event:IpcMainInvokeEvent):boolean;handle:MainIpcHandleRegistrar}){
 const bind=(channel:string,scoped:boolean,action:(owner:string,input:any)=>unknown)=>deps.handle(channel,async(event,input)=>{
  try{
   if(!deps.controller)throw Error('TAG_BATCH_UNAVAILABLE')
   const main=deps.isMain(event),card=!main&&deps.card?.isTrusted(event)?deps.card.inspect():null
   if(!main&&!card)throw Error('TAG_INTENT_SCOPE_EXPIRED')
   if(card&&scoped){const s=input as C.TagBatchPrepare;if(!s||s.libraryIdentity!==card.context.libraryIdentity||s.generation!==card.context.generation||!Array.isArray(s.assetIds)||s.assetIds.length!==1||s.assetIds[0]!==card.context.assetId)throw Error('TAG_INTENT_SCOPE_EXPIRED')}
   return{ok:true,value:await action(main?'main':`card:${card!.token}`,input)}
  }catch(error){return{ok:false,error:tagExecutionMessage(error)}}
 })
 bind(C.TAG_BATCH_PREPARE,true,(o,i)=>deps.controller!.prepare(o,i));bind(C.TAG_BATCH_RUN,false,(o,i)=>deps.controller!.run(o,i));bind(C.TAG_BATCH_DISCARD,false,(o,i)=>deps.controller!.discard(o,i));bind(C.TAG_BATCH_INSPECT,false,(o,i)=>deps.controller!.inspect(o,i));bind(C.TAG_BATCH_CANCEL,false,(o,i)=>deps.controller!.cancel(o,i))
}
