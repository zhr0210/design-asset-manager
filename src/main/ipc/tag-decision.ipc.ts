import { workspaceOwner } from '../local-host/client-context'
import {TAG_DECISION_PREPARE,TAG_DECISION_CONFIRM,TAG_DECISION_DISCARD} from '../../shared/contracts/tag-decision.contract'
import type {TagIntentScope} from '../../shared/contracts/independent-tag-intent.contract'
import {tagDecisionMessage,type createTagDecisionController} from '../independent-tags/tag-decision-controller'
import type {createAssetCardController} from '../asset-card/asset-card-controller'
import type {MainIpcHandleRegistrar} from './ipc-registrar'
import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context'
export function registerTagDecisionIpc(deps:{controller?:ReturnType<typeof createTagDecisionController>;card?:ReturnType<typeof createAssetCardController>;isMain(event:IpcMainInvokeEvent):boolean;handle:MainIpcHandleRegistrar}){
 const bind=(channel:string,scoped:boolean,action:(owner:string,input:any)=>unknown)=>deps.handle(channel,async(event,input)=>{
  try{
   if(!deps.controller)throw Error('TAG_DECISION_UNAVAILABLE')
   const main=deps.isMain(event),card=!main&&deps.card?.isTrusted(event)?deps.card.inspect():null
   if(!main&&!card)throw Error('TAG_INTENT_SCOPE_EXPIRED')
   if(card&&scoped){const s=input as TagIntentScope;if(!s||s.libraryIdentity!==card.context.libraryIdentity||s.generation!==card.context.generation||s.assetId!==card.context.assetId)throw Error('TAG_INTENT_SCOPE_EXPIRED')}
   return{ok:true,value:await action(main ? workspaceOwner(event):`card:${card!.token}`,input)}
  }catch(error){return{ok:false,error:tagDecisionMessage(error)}}
 })
 bind(TAG_DECISION_PREPARE,true,(o,i)=>deps.controller!.prepare(o,i));bind(TAG_DECISION_CONFIRM,false,(o,i)=>deps.controller!.confirm(o,i));bind(TAG_DECISION_DISCARD,false,(o,i)=>deps.controller!.discard(o,i))
}
