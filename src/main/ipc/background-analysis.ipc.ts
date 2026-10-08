import { workspaceOwner } from '../local-host/client-context'
import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context'
import type {MainIpcHandleRegistrar} from './ipc-registrar'
import type {createAssetCardController} from '../asset-card/asset-card-controller'
import {backgroundMessage,type createBackgroundAnalysisController} from '../background-analysis/background-analysis-controller'
export function registerBackgroundAnalysisIpc(deps:{onMutate?():void;controller?:ReturnType<typeof createBackgroundAnalysisController>;card?:ReturnType<typeof createAssetCardController>;isMain(e:IpcMainInvokeEvent):boolean;handle:MainIpcHandleRegistrar}){
 const bind=(name:string,policy:boolean,scoped:boolean,action:(owner:string,input:any)=>unknown)=>deps.handle('background-analysis:'+name,async(event,input)=>{
  try{
   if(!deps.controller)throw Error('BACKGROUND_UNAVAILABLE')
   const main=deps.isMain(event),card=!main&&deps.card?.isTrusted(event)?deps.card.inspect():null
   if(!main&&!card||policy&&!main)throw Error('BACKGROUND_SCOPE_EXPIRED')
   if(card&&scoped&&(!input||input.libraryIdentity!==card.context.libraryIdentity||input.generation!==card.context.generation||input.assetId!==card.context.assetId))throw Error('BACKGROUND_SCOPE_EXPIRED')
   if(name==='change'||name==='confirm')deps.onMutate?.()
   return{ok:true,value:await action(main ? workspaceOwner(event):`card:${card!.token}`,input)}
  }catch(e){return{ok:false,error:backgroundMessage(e)}}
 })
 bind('read',false,true,(o,i)=>deps.controller!.read(o,i));bind('prepare',true,true,(o,i)=>deps.controller!.prepare(o,i));bind('confirm',true,false,(o,i)=>deps.controller!.confirm(o,i));bind('discard',true,false,(o,i)=>deps.controller!.discard(o,i));bind('change',false,true,(o,i)=>deps.controller!.change(o,i))
 bind('prepare-execution',true,true,(o,i)=>deps.controller!.prepareExecution(o,i));bind('confirm-execution',true,false,(o,i)=>deps.controller!.confirmExecution(o,i));bind('recover',true,true,(o,i)=>deps.controller!.recover(o,i))
}
