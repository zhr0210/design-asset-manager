import type {IpcMainInvokeEvent} from 'electron'
import type {MainIpcHandleRegistrar} from './ipc-registrar'
import {backgroundOcrMessage,type createBackgroundOcrController} from '../background-ocr/background-ocr-controller'
export function registerBackgroundOcrIpc(d:{controller?:ReturnType<typeof createBackgroundOcrController>;isMain(event:IpcMainInvokeEvent):boolean;handle:MainIpcHandleRegistrar}){
 for(const name of ['read','prepare','confirm','discard','revoke'] as const)d.handle('background-ocr:'+name,async(event,input)=>{
  try{
   if(!d.controller||!d.isMain(event))throw Error('BACKGROUND_OCR_UNTRUSTED')
   if(['read','prepare','revoke'].includes(name)){if(!input||typeof input!=='object'||Object.keys(input).sort().join(',')!=='generation,libraryIdentity'||!['generation','libraryIdentity'].every(k=>typeof input[k]==='string'&&input[k].length>0&&input[k].length<=256))throw Error('BACKGROUND_OCR_INPUT_INVALID')}
   else if(typeof input!=='string'||input.length>128)throw Error('BACKGROUND_OCR_INPUT_INVALID')
   return{ok:true,value:await d.controller[name](input)}
  }catch(error){return{ok:false,error:backgroundOcrMessage(error)}}
 })
}
