import type {createAcceptanceService} from '../ai-acceptance/acceptance-service'
import type {MainIpcHandleRegistrar} from './ipc-registrar'
import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context'
export function registerAiAcceptanceIpc(d:{service:ReturnType<typeof createAcceptanceService>;handle:MainIpcHandleRegistrar;isMain(e:IpcMainInvokeEvent):boolean}){
 const id=(v:unknown)=>{if(typeof v!=='string'||!/^[a-zA-Z0-9-]{1,128}$/.test(v))throw Error('ACCEPTANCE_INPUT_INVALID');return v}
 const register=(name:string,operation:(input:any)=>unknown)=>d.handle('ai-acceptance:'+name,async(event,input)=>{if(!d.isMain(event))throw Error('UNTRUSTED_SENDER');try{return await operation(input)}catch{throw Error('ACCEPTANCE_OPERATION_FAILED')}})
 register('prepare',input=>{if(!input||Object.keys(input).sort().join('|')!==['connectionRef','model','maxPhysicalRequests','maxOutputTokens','maxWallClockMs','maxEstimatedCostUsd','estimatedCostPerRequestUsd'].sort().join('|'))throw Error('ACCEPTANCE_INPUT_INVALID');id(input.connectionRef);if(typeof input.model!=='string'||input.model.length>256)throw Error('ACCEPTANCE_INPUT_INVALID');return d.service.prepare(input)})
 register('confirm',input=>d.service.confirmForUserAction(id(input)));register('status',input=>d.service.status(id(input)));register('cancel',input=>d.service.cancel(id(input)));register('discard',input=>d.service.discard(id(input)))
}
