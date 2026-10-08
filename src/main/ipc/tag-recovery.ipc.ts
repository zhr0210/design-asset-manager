import { workspaceOwner } from '../local-host/client-context'
import * as C from '../../shared/contracts/tag-recovery.contract'
import {tagExecutionMessage} from '../independent-tags/tag-execution-controller'
import type {createTagRecoveryController} from '../independent-tags/tag-recovery-controller'
import type {createAssetCardController} from '../asset-card/asset-card-controller'
import type {MainIpcHandleRegistrar} from './ipc-registrar'
import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context'
export function registerTagRecoveryIpc(deps:{controller?:ReturnType<typeof createTagRecoveryController>;card?:ReturnType<typeof createAssetCardController>;isMain(event:IpcMainInvokeEvent):boolean;handle:MainIpcHandleRegistrar}){
 const bind=(channel:string,single:boolean,action:(owner:string,input:any)=>unknown)=>deps.handle(channel,async(event,input)=>{
  try{
   if(!deps.controller)throw Error('TAG_RECOVERY_UNAVAILABLE')
   const main=deps.isMain(event),card=!main&&deps.card?.isTrusted(event)?deps.card.inspect():null
   if(!main&&!card)throw Error('TAG_INTENT_SCOPE_EXPIRED')
   if(card&&(!input||input.libraryIdentity!==card.context.libraryIdentity||input.generation!==card.context.generation||(single?input.assetId!==card.context.assetId:!Array.isArray(input.assetIds)||input.assetIds.length!==1||input.assetIds[0]!==card.context.assetId)))throw Error('TAG_INTENT_SCOPE_EXPIRED')
   return{ok:true,value:await action(main ? workspaceOwner(event):`card:${card!.token}`,input)}
  }catch(error){return{ok:false,error:tagExecutionMessage(error)}}
 })
 bind(C.TAG_RECOVERY_LIST,false,(o,i)=>deps.controller!.list(o,i));bind(C.TAG_RECOVERY_PREPARE,false,(o,i)=>deps.controller!.prepare(o,i));bind(C.TAG_RECOVERY_RECEIPT,true,(o,i)=>deps.controller!.receipt(o,i))
}
