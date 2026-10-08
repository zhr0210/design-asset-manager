import { workspaceOwner } from '../local-host/client-context'
import {TAG_EXECUTION_PREPARE,TAG_EXECUTION_RUN,TAG_EXECUTION_INSPECT,TAG_EXECUTION_CANCEL,TAG_EXECUTION_READ} from '../../shared/contracts/tag-execution.contract'
import type {TagIntentScope} from '../../shared/contracts/independent-tag-intent.contract'
import {tagExecutionMessage,type createTagExecutionController} from '../independent-tags/tag-execution-controller'
import type {createAssetCardController} from '../asset-card/asset-card-controller'
import type {MainIpcHandleRegistrar} from './ipc-registrar'
import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context'

export function registerTagExecutionIpc(deps:{controller?:ReturnType<typeof createTagExecutionController>;card?:ReturnType<typeof createAssetCardController>;isMain(event:IpcMainInvokeEvent):boolean;handle:MainIpcHandleRegistrar}){
 const bind=(channel:string,scoped:boolean,action:(owner:string,input:any)=>unknown)=>deps.handle(channel,async(event,input)=>{
  try{
   if(!deps.controller)throw Error('TAG_EXECUTION_UNAVAILABLE')
   const main=deps.isMain(event),card=!main&&deps.card?.isTrusted(event)?deps.card.inspect():null
   if(!main&&!card)throw Error('TAG_INTENT_SCOPE_EXPIRED')
   if(card&&scoped){const s=input as TagIntentScope;if(!s||s.libraryIdentity!==card.context.libraryIdentity||s.generation!==card.context.generation||s.assetId!==card.context.assetId)throw Error('TAG_INTENT_SCOPE_EXPIRED')}
   return{ok:true,value:await action(main ? workspaceOwner(event):`card:${card!.token}`,input)}
  }catch(error){return{ok:false,error:tagExecutionMessage(error)}}
 })
 bind(TAG_EXECUTION_PREPARE,true,(o,i)=>deps.controller!.prepare(o,i))
 bind('tag-execution:discard-review',false,(o,i)=>deps.controller!.discardReview(o,i))
 bind(TAG_EXECUTION_RUN,false,(o,i)=>deps.controller!.run(o,i))
 bind(TAG_EXECUTION_INSPECT,false,(o,i)=>deps.controller!.inspect(o,i))
 bind(TAG_EXECUTION_CANCEL,false,(o,i)=>deps.controller!.cancel(o,i))
 bind(TAG_EXECUTION_READ,true,(o,i)=>deps.controller!.read(o,i))
}
