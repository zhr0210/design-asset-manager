import type {IpcMainInvokeEvent} from 'electron'
import type {MainIpcHandleRegistrar} from './ipc-registrar'
import type {AiConnectionService} from '../ai-gateway/ai-connection-service'
const id=(v:unknown)=>{if(typeof v!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._:~-]{0,255}$/.test(v))throw Error('AI_REQUEST_INVALID');return v}
export function registerAiConnectionIpc(d:{service:AiConnectionService;handle:MainIpcHandleRegistrar;isMain(e:IpcMainInvokeEvent):boolean;openAuthUrl?(url:string):Promise<void>}){
 const operation=(name:string,fn:(input:any)=>unknown)=>d.handle('ai-connection:'+name,async(event,input)=>{if(!d.isMain(event))throw Error('UNTRUSTED_SENDER');try{return await fn(input)}catch{throw Error('AI_CONNECTION_OPERATION_FAILED')}})
 operation('prepare-validation',v=>d.service.prepareValidation(id(v)))
 operation('confirm-validation',v=>d.service.confirmValidation(id(v)))
 operation('discard-validation',v=>d.service.discardValidation(id(v)))
 operation('credential-status',v=>d.service.status(id(v)))
 operation('set-api-key',v=>{id(v?.backendId);if(typeof v?.key!=='string'||v.key.length>65536)throw Error('AI_REQUEST_INVALID');return d.service.setApiKey(v)})
 operation('migrate-credential',v=>{id(v?.backendId);if(!Number.isSafeInteger(v.expectedRevision))throw Error('AI_REQUEST_INVALID');return d.service.migrate(v)})
 operation('clear-credential',v=>d.service.clear(id(v)))
 operation('login',v=>d.service.login(id(v)));operation('login-status',v=>d.service.loginStatus(id(v)))
 operation('answer-login',v=>{id(v?.id);id(v?.promptId);if(typeof v?.answer!=='string')throw Error('AI_REQUEST_INVALID');d.service.answer(v)})
 operation('cancel-login',v=>d.service.cancelLogin(id(v)))
 operation('open-auth-url',async v=>{
  const r=d.service.loginStatus(id(v?.id)),url=r.event?.url;if(!url||url!==v.url)throw Error('AI_AUTH_URL_INVALID');const privateUrl=d.service.authUrlForOperation(v.id),u=new URL(privateUrl)
  const allowed=['auth.openai.com','chatgpt.com','claude.ai','console.anthropic.com','github.com','githubcopilot.com'];if(u.protocol!=='https:'||u.username||u.password||!allowed.includes(u.hostname))throw Error('AI_AUTH_URL_INVALID');await d.openAuthUrl?.(privateUrl)
 })
}
