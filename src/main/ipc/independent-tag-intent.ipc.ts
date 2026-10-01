import { TAG_INTENT_PREPARE,TAG_INTENT_CONFIRM,TAG_INTENT_READ,type TagIntentScope } from '../../shared/contracts/independent-tag-intent.contract'
import { tagIntentMessage, type createTagIntentController } from '../independent-tags/tag-intent-controller'
import type { createAssetCardController } from '../asset-card/asset-card-controller'
import type { MainIpcHandleRegistrar } from './ipc-registrar'
import type { IpcMainInvokeEvent } from 'electron'

export function registerTagIntentIpc(deps:{ controller?:ReturnType<typeof createTagIntentController>; card?:ReturnType<typeof createAssetCardController>; isMain(event:IpcMainInvokeEvent):boolean; handle:MainIpcHandleRegistrar }) {
  const bind=(channel:string,scoped:boolean,action:(owner:string,input:any)=>unknown)=>deps.handle(channel,async(event,input)=>{
    try {
      if (!deps.controller) throw Error('TAG_INTENT_UNAVAILABLE')
      const main=deps.isMain(event),card=!main&&deps.card?.isTrusted(event)?deps.card.inspect():null
      if (!main&&!card) throw Error('TAG_INTENT_SCOPE_EXPIRED')
      if (card&&scoped) {
        const s=input as TagIntentScope
        if (!s||s.libraryIdentity!==card.context.libraryIdentity||s.generation!==card.context.generation||s.assetId!==card.context.assetId)throw Error('TAG_INTENT_SCOPE_EXPIRED')
      }
      return {ok:true,value:await action(main?'main':`card:${card!.token}`,input)}
    } catch(error) { return {ok:false,error:tagIntentMessage(error)} }
  })
  bind(TAG_INTENT_PREPARE,true,(owner,input)=>deps.controller!.prepare(owner,input))
  bind(TAG_INTENT_CONFIRM,false,(owner,input)=>deps.controller!.confirm(owner,input))
  bind(TAG_INTENT_READ,true,(_owner,input)=>deps.controller!.read(input))
}
