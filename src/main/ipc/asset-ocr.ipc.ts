import {OCR_STATUS,OCR_CONFIGURE,OCR_READ,OCR_PREPARE,OCR_RUN,OCR_CANCEL,OCR_CORRECT} from '../../shared/contracts/asset-ocr.contract'
import {ocrMessage,type createOcrController} from '../ocr/ocr-controller'
import type {MainIpcHandleRegistrar} from './ipc-registrar'
import type {IpcMainInvokeEvent} from 'electron'
export function registerAssetOcrIpc(d:{controller?:ReturnType<typeof createOcrController>;isMain(event:IpcMainInvokeEvent):boolean;handle:MainIpcHandleRegistrar}){
 const operations:Record<string,(value:any)=>unknown>={
  [OCR_STATUS]:()=>d.controller!.status(),[OCR_CONFIGURE]:async()=>{await d.controller!.configure();return d.controller!.status()},
  [OCR_READ]:v=>d.controller!.read(v),[OCR_PREPARE]:v=>d.controller!.prepare(v),[OCR_RUN]:v=>d.controller!.run(v),[OCR_CANCEL]:()=>d.controller!.cancel(),[OCR_CORRECT]:v=>d.controller!.correct(v)
 }
 for(const [channel,operation]of Object.entries(operations))d.handle(channel,async(event,value)=>{try{if(!d.isMain(event)||!d.controller)throw Error('OCR_RUNTIME_UNAVAILABLE');return{ok:true,value:await operation(value)}}catch(error){return{ok:false,error:ocrMessage(error)}}})
}
