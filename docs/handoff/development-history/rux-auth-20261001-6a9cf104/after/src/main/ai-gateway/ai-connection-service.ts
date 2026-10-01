import {AUTH_STAGES,AUTH_WORKER_STAGES,knownAuthError,authFailureMessage,type AuthStage} from '../../shared/contracts/ai-auth-state'
import {DAM_BUILD_IDENTITY} from '../../shared/build-identity.generated'
import {piProviderAdmission,type PiProviderAction} from '../../shared/constants/pi-provider-admission'
import {parseAiLoginPrompt,validAiLoginAnswer} from '../../shared/contracts/ai-login-prompt'
import {supportsPiAuthentication} from '../../shared/constants/pi-provider-presets'
import sharp from 'sharp'
import {randomInt} from 'node:crypto'
import {parseVisionOutput} from '../visual-ai/vision-response'
import {backendExecutionBinding} from './backend-binding'
import {PiProcessUnconfirmedError} from './pi-runtime-host'
import {piUsageSummary} from './usage-summary'
import {randomUUID,createHash} from 'node:crypto'
import type {AiBackendConfig} from '../../shared/types/ai-backend.types'
import type {AiLoginStatus,AiCredentialStatus} from '../../shared/contracts/ai-connection.contract'
import type {SettingsServicePort} from '../ipc/settings.ipc'
import type {CredentialVault,StoredCredential} from '../ai-credentials/credential-vault'
import type {PiRuntimeHost} from './pi-runtime-host'
import {publicBackend} from '../ai-credentials/public-settings'
import {openAiVisionProvider,type VisionProvider,type VisionInvocation} from '../visual-ai/openai-vision.provider'
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function createAiConnectionService(d:{settings:SettingsServicePort;vault:CredentialVault;runtime:PiRuntimeHost;changed():void;loginTimeoutMs?:number;hostIdentity?:{getDeviceId():string};admission?:typeof piProviderAdmission;reserveProbe?(signal:AbortSignal):Promise<{release():void}>}){
 const admission=d.admission??piProviderAdmission
 const requireAction=(b:AiBackendConfig,action:PiProviderAction)=>{const result=admission(b.providerKind??'openai-compatible',b.authMode??'none',action);if(!result.allowed)throw Error(result.code)}
 const notify=()=>{try{d.changed()}catch{}}
 let suspended=false,closing=false
 const validationReviews=new Map<string,{backend:AiBackendConfig;fingerprint:string;expires:number}>()
 const active=new Map<string,Set<AbortController>>(),tails=new Map<string,Promise<unknown>>(),logins=new Map<string,{status:AiLoginStatus;abort:AbortController;answers:Map<string,(answer:string)=>void>;authUrl?:string;binding:string;committed:boolean;bindingAfterCommit?:string;completion:Promise<void>;reason?:string;retired?:boolean}>(),latestLogin=new Map<string,string>()
 const backend=(id:string)=>{const b=d.settings.getSettings().aiBackends?.find(b=>b.id===id);if(!b)throw Error('AI_CONNECTION_MISSING');return structuredClone(b)}
 const revise=(id:string,revision:number,endpoint?:string)=>{const list=d.settings.getSettings().aiBackends??[];d.settings.saveSettings({aiBackends:list.map(b=>b.id===id?{...publicBackend(b),credentialRef:id,credentialRevision:revision,...(endpoint?{baseUrl:endpoint}:{})}:b)})}
 const invalidate=(id?:string)=>{for(const[key,review]of validationReviews)if(!id||review.backend.id===id)validationReviews.delete(key);if(id){for(const a of active.get(id)??[])a.abort()}else for(const jobs of active.values())for(const a of jobs)a.abort();notify()}
 const serialized=<T>(id:string,action:()=>Promise<T>):Promise<T>=>{const p=(tails.get(id)??Promise.resolve()).catch(()=>{}).then(action);tails.set(id,p);void p.finally(()=>{if(tails.get(id)===p)tails.delete(id)}).catch(()=>{});return p}
 const tracked=async<T>(id:string,signal:AbortSignal,action:(signal:AbortSignal)=>Promise<T>):Promise<T>=>{
  if(suspended)throw Error('AI_CONNECTIONS_SUSPENDED');if((active.get(id)?.size??0)>=4||[...active.values()].reduce((sum,jobs)=>sum+jobs.size,0)>=8)throw Error('AI_CONNECTIONS_BUSY')
  const a=new AbortController(),cancel=()=>a.abort();signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();const jobs=active.get(id)??new Set();jobs.add(a);active.set(id,jobs)
  try{return await serialized(id,async()=>{a.signal.throwIfAborted();return action(a.signal)})}finally{signal.removeEventListener('abort',cancel);jobs.delete(a);if(!jobs.size)active.delete(id)}
 }
 const validateApiKeySource=(b:AiBackendConfig,key:string)=>{if((b.providerKind==='anthropic'||new URL(b.baseUrl).hostname==='api.anthropic.com')&&key.includes('sk-ant-oat'))throw Error('AI_ANTHROPIC_SUBSCRIPTION_UNAVAILABLE')}
 const credential=async(b:AiBackendConfig)=>{if(b.authMode==='none')return undefined;const c=await d.vault.resolve(b.id,b.credentialRevision??0);if(c){if(c.type==='api_key')validateApiKeySource(b,c.key);if(b.authMode==='oauth'&&c.type!=='oauth'||b.authMode==='api-key'&&c.type!=='api_key')throw Error('AI_AUTH_METHOD_MISMATCH');return c;}if(b.authMode==='oauth'||b.authMode==='api-key')throw Error('AI_CREDENTIAL_REQUIRED');if(b.apiKey&&b.apiKey!=='local'){validateApiKeySource(b,b.apiKey);return{type:'api_key' as const,key:b.apiKey}};return undefined}
 const execute=async<T>(b:AiBackendConfig,request:Record<string,unknown>,signal:AbortSignal,callbacks:Parameters<PiRuntimeHost['execute']>[2]={})=>{
  requireAction(b,request.kind==='models'?'models':'infer')
  if(request.kind!=='models'&&!supportsPiAuthentication(b.providerKind??'openai-compatible',b.authMode??'none'))throw Error('AI_AUTH_UNSUPPORTED')
  const before=hash(b),revision=b.credentialRevision??0,c=request.kind==='models'&&b.providerKind&&b.providerKind!=='openai-compatible'?undefined:await credential(b);signal.throwIfAborted()
  if(request.kind!=='models'&&b.providerKind==='openai'&&b.authMode==='oauth'&&((c as any)?.planUsageAuthorized!==true||typeof(c as any)?.access!=='string'||!(c as any).access||!Array.isArray((c as any).scopes)||!(c as any).scopes.includes('resource.invoke')||!(c as any).scopes.includes('chatgpt.tokens.use.direct')))throw Error('AI_CHATGPT_PLAN_PERMISSION_REQUIRED')
  const value=await d.runtime.execute<T>({...request,connection:publicBackend({...b,...(request.probeImage?{capabilities:{...b.capabilities,vision:true}}:{}),authMode:b.authMode??(c?'api-key':'none')}),credential:c},signal,{...callbacks,credential:async(value,refresh)=>{if(!refresh||c?.type!=='oauth'||(value as StoredCredential)?.type!=='oauth'||hash(backend(b.id))!==before)throw Error('AI_CREDENTIAL_CHANGED');await d.vault.set(b.id,value as StoredCredential,revision,true)}})
  signal.throwIfAborted();if(hash(backend(b.id))!==before)throw Error('AI_CONNECTION_CHANGED');return value
 }
 const loginEndpoint=(b:AiBackendConfig,value:unknown)=>{if(value===undefined)return undefined;if(typeof value!=='string')throw Error('AI_AUTH_ENDPOINT_INVALID');const u=new URL(value),hosts:Record<string,string[]>={openai:['api.openai.com','chatgpt.com'],anthropic:['api.anthropic.com'],'openai-codex':['chatgpt.com'],'github-copilot':['api.individual.githubcopilot.com','api.business.githubcopilot.com','api.enterprise.githubcopilot.com']};if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!hosts[b.providerKind??'']?.includes(u.hostname))throw Error('AI_AUTH_ENDPOINT_INVALID');return u.href.replace(/\/+$/,'')}
 const live=(record:any)=>['starting','interaction','cancelling'].includes(record.status.state)
 const cancelAccount=(record:any,reason='AI_CANCELLED')=>{if(!record||record.committed||!live(record))return;record.reason=reason;record.status.state='cancelling';record.status.event=undefined;record.status.prompt=undefined;record.answers.clear();record.abort.abort()}
 const cancelBackend=(id:string)=>{for(const record of logins.values())if(record.status.backendId===id)cancelAccount(record)}
 const configurationChanged=()=>{invalidate();for(const record of logins.values()){if(record.committed||!live(record))continue;try{if(hash(backend(record.status.backendId))!==record.binding)cancelAccount(record,'AI_CONNECTION_CHANGED')}catch{cancelAccount(record,'AI_CONNECTION_CHANGED')}}}
 const setStage=(record:any,stage:AuthStage)=>{if(record.retired||record.abort.signal.aborted&&!record.committed||!AUTH_STAGES.includes(stage))return;const previous=AUTH_STAGES.indexOf(record.status.stage);if(AUTH_STAGES.indexOf(stage)<previous)return;record.status.stage=stage;record.status.sequence=(record.status.sequence??0)+1;record.status.timeline=[...(record.status.timeline??[]),{stage,at:Date.now()}].slice(-24)}
 const drainInference=async()=>{suspended=true;invalidate();let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([Promise.allSettled([...tails.values()]),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('AI_DRAIN_BLOCKED')),5000)})])}finally{clearTimeout(timer)}}
 const status=async(id:string):Promise<AiCredentialStatus>=>{const b=backend(id),s=await d.vault.status(id,b.credentialRevision??0);return{...s,legacyPresent:!!b.apiKey&&b.apiKey!=='local'}}
 const invoke=async(input:VisionInvocation,noRefresh=false)=>{
   if(!input.backendId)throw Error('AI_CONNECTION_MISSING');const b=backend(input.backendId)
   if(b.transport!=='pi'&&b.authMode==='oauth')throw Error('AI_LEGACY_OAUTH_UNSUPPORTED')
   if((b.credentialRevision??0)!==(input.credentialRevision??0))throw Error('AI_CREDENTIAL_CHANGED')
   const expected=new URL(b.baseUrl);expected.pathname=expected.pathname.replace(/\/+$/,'')+'/chat/completions';if(expected.href!==input.endpoint)throw Error('AI_CONNECTION_CHANGED')
   return tracked(b.id,input.signal,async signal=>{
    if(b.transport!=='pi'){const c=await credential(b);if(c?.type==='oauth')throw Error('AI_LEGACY_OAUTH_UNSUPPORTED');const result=await openAiVisionProvider.invokeOnce({...input,signal,apiKey:c?.key});signal.throwIfAborted();if(result&&typeof result==='object'){const{piUsage:_untrusted,...rest}=result as any;return rest}return result}
    const result=await execute<any>(b,{kind:'infer',model:input.model,systemPrompt:input.systemPrompt,userPrompt:input.userPrompt,imageDataUrl:input.imageDataUrl,maxTokens:input.maxTokens,temperature:input.temperature,allowAuthRefresh:!noRefresh},signal);return{...result,piUsage:piUsageSummary(result.usage,b.authMode!=='oauth'&&b.providerKind!==undefined&&b.providerKind!=='openai-compatible')}
   })
 }
 return{
  status,
  invalidate,
  configurationChanged,
  drainInference,
  suspendAll(){closing=true;suspended=true;invalidate();for(const record of logins.values())cancelAccount(record)},
  suspend(){suspended=true;invalidate()},
  resume(){if(!closing&&!d.runtime.inspect().unknown)suspended=false},
  async setApiKey(input:{backendId:string;key:string}){if(closing)throw Error('AI_CONNECTIONS_SUSPENDED');const b=backend(input.backendId);if(b.transport==='pi'&&!supportsPiAuthentication(b.providerKind??'openai-compatible','api-key'))throw Error('AI_AUTH_UNSUPPORTED');validateApiKeySource(b,input.key);cancelBackend(b.id);invalidate(b.id);const s=await serialized(b.id,()=>d.vault.set(b.id,{type:'api_key',key:input.key.trim()},b.credentialRevision??0,false,revision=>revise(b.id,revision)));return status(b.id)},
  async migrate(input:{backendId:string;expectedRevision:number}){if(closing)throw Error('AI_CONNECTIONS_SUSPENDED');const b=backend(input.backendId);if(b.transport==='pi'&&!supportsPiAuthentication(b.providerKind??'openai-compatible','api-key'))throw Error('AI_AUTH_UNSUPPORTED');if(!b.apiKey||b.apiKey==='local')throw Error('AI_NO_LEGACY_CREDENTIAL');validateApiKeySource(b,b.apiKey);cancelBackend(b.id);invalidate(b.id);const s=await serialized(b.id,()=>d.vault.set(b.id,{type:'api_key',key:b.apiKey!},input.expectedRevision,false,revision=>revise(b.id,revision)));return status(b.id)},
  async clear(id:string){if(closing)throw Error('AI_CONNECTIONS_SUSPENDED');const b=backend(id);cancelBackend(id);invalidate(id);const s=await serialized(id,()=>d.vault.clear(id,revision=>revise(id,revision),b.credentialRevision??0));return status(id)},
  async legacyProbe<T>(candidate:AiBackendConfig,action:(config:AiBackendConfig,signal:AbortSignal)=>Promise<T>){
   const configured=backend(candidate.id),before=hash(configured)
   if(hash(publicBackend(candidate))!==hash(publicBackend(configured)))throw Error('AI_SAVE_CONFIG_BEFORE_PROBE')
   return tracked(configured.id,AbortSignal.timeout(configured.timeoutMs),async signal=>{
    const c=await credential(configured);signal.throwIfAborted();if(hash(backend(configured.id))!==before)throw Error('AI_CONNECTION_CHANGED');if(c?.type==='oauth')throw Error('AI_LEGACY_OAUTH_UNSUPPORTED')
    const result=await action({...configured,apiKey:c?.key},signal);signal.throwIfAborted();if(hash(backend(configured.id))!==before)throw Error('AI_CONNECTION_CHANGED');return result
   })
  },
  async models(b:AiBackendConfig,signal:AbortSignal){const configured=backend(b.id);if(hash(publicBackend(b))!==hash(publicBackend(configured)))throw Error('AI_SAVE_CONFIG_BEFORE_PROBE');return tracked(b.id,signal,s=>execute<any[]>(configured,{kind:'models'},s))},
  provider:{invokeOnce:(input:VisionInvocation)=>invoke(input)} as VisionProvider,
  invokeForAcceptance:(input:VisionInvocation)=>invoke(input,true),
  prepareValidation(id:string){for(const[key,r]of validationReviews)if(r.expires<Date.now())validationReviews.delete(key);if(suspended||validationReviews.size>=4)throw Error('AI_CONNECTIONS_BUSY');const b=backend(id);requireAction(b,'infer');if(b.transport!=='pi'||!b.defaultModel?.trim()||b.defaultModel.trim().length>256)throw Error('AI_MODEL_REQUIRED');const receipt=randomUUID();validationReviews.set(receipt,{backend:b,fingerprint:hash(b),expires:Date.now()+300000});return{receipt,backendId:b.id,model:b.defaultModel,notice:`向 ${b.baseUrl} 的 ${b.defaultModel} 发送一张本应用生成的双色测试图，只验证图片请求、完整JSON及颜色识别，不读取资料库。仅调用一次，30秒上限；云端/API/订阅可能消耗额度，费用未知。`}},
  discardValidation(receipt:string){validationReviews.delete(receipt)},
  async confirmValidation(receipt:string){
   const review=validationReviews.get(receipt);validationReviews.delete(receipt);if(!review||review.expires<Date.now()||hash(backend(review.backend.id))!==review.fingerprint)throw Error('AI_VALIDATION_EXPIRED')
   const b=review.backend,deadline=AbortSignal.timeout(30000)
   const result=await tracked(b.id,deadline,async signal=>{
    const permit=await d.reserveProbe?.(signal);let unknown=false
    try{
     signal.throwIfAborted();const left=randomInt(3),right=(left+1+randomInt(2))%3,labels=['红色','绿色','蓝色'],pixels=Buffer.alloc(64*32*3)
     for(let y=0;y<32;y++)for(let x=0;x<64;x++)pixels[(y*64+x)*3+(x<32?left:right)]=255
     const image=await sharp(pixels,{raw:{width:64,height:32,channels:3}}).jpeg().toBuffer()
     const response=await execute<any>(b,{kind:'infer',probeImage:true,model:b.defaultModel,systemPrompt:'只返回完整JSON对象，字段caption为简短中文描述、ocrText固定空字符串、prompt为简短英文描述、tags为图片两块主要颜色的简体中文颜色名称数组。不返回其他内容。',userPrompt:'请完成双色验证：根据图片列出两块主要颜色，不猜测来源。',imageDataUrl:'data:image/jpeg;base64,'+image.toString('base64'),maxTokens:256,temperature:0},signal)
     const output=parseVisionOutput(response),passed=[labels[left],labels[right]].every(label=>output.tags.includes(label))
     return{model:b.defaultModel!,imageRequestAccepted:true,structuredOutputValid:true,colourChallengePassed:passed,testedAt:new Date().toISOString()}
    }catch(error){if(error instanceof PiProcessUnconfirmedError){unknown=true;void error.released.then(()=>permit?.release())}throw error}finally{if(!unknown)permit?.release()}
   })
   if(hash(backend(b.id))!==review.fingerprint)throw Error('AI_CONNECTION_CHANGED')
   const list=d.settings.getSettings().aiBackends??[];d.settings.saveSettings({aiBackends:list.map(current=>current.id===b.id?{...current,modelValidation:{model:result.model,bindingSha256:backendExecutionBinding(b,result.model),vision:result.colourChallengePassed,jsonOutput:true,testedAt:result.testedAt,generatedInput:true as const}}:current)})
   notify();return result
  },
  async login(id:string){
   if(closing)throw Error('AI_CONNECTIONS_SUSPENDED');if(d.runtime.inspect().unknown)throw Error('AI_PROCESS_EXIT_UNCONFIRMED');const b=backend(id);requireAction(b,'login');if(b.authMode!=='oauth'||!['openai','anthropic','openai-codex','github-copilot'].includes(b.providerKind??''))throw Error('AI_OAUTH_UNSUPPORTED')
   cancelBackend(id);const operation=randomUUID(),a=new AbortController(),startedAt=Date.now(),timeout=Math.max(1,Math.min(300000,d.loginTimeoutMs??300000))
   const record={status:{id:operation,backendId:id,state:'starting',startedAt,deadlineAt:startedAt+timeout,workerCloseStatus:'pending',timeline:[]} as AiLoginStatus,abort:a,answers:new Map<string,(answer:string)=>void>(),binding:hash(b),committed:false,completion:Promise.resolve(),reason:undefined as string|undefined,bindingAfterCommit:undefined as string|undefined,retired:false,authUrl:undefined as string|undefined};logins.set(operation,record);latestLogin.set(id,operation);setStage(record,'preparing-local-storage')
   const assertCurrent=()=>{if(closing||a.signal.aborted||latestLogin.get(id)!==operation||hash(backend(id))!==record.binding)throw Error(a.signal.aborted?record.reason??'AI_CANCELLED':'AI_CONNECTION_CHANGED')}
   const timer=setTimeout(()=>cancelAccount(record,'AI_TIMEOUT'),timeout)
   record.completion=(async()=>{
    const storage=await d.vault.status(id,b.credentialRevision??0);if(!storage.storageAvailable)throw Error('AI_SECRET_STORAGE_UNAVAILABLE');assertCurrent()
    const prior=b.providerKind==='openai'?await d.vault.resolve(id,b.credentialRevision??0):undefined;assertCurrent();setStage(record,'preparing-listener')
    await d.runtime.execute({kind:'login',connection:publicBackend(b),...(prior?.type==='oauth'?{credential:prior}:{}),...(b.providerKind==='openai'?{deviceId:d.hostIdentity?.getDeviceId()}: {})},a.signal,{
     authStage:stage=>{if(!AUTH_WORKER_STAGES.includes(stage))throw Error('AI_PROTOCOL_INVALID');setStage(record,stage)},
     credential:async(value,refresh,result)=>{if(b.providerKind==='openai'&&((value as any)?.registration!=='dam-siwc-v1'||(result as any)?.registrationVerified!==true))throw Error('AI_AUTH_IDENTITY_INVALID');if(refresh)throw Error('AI_CONNECTION_CHANGED');if(b.providerKind==='openai'&&((result as any)?.planUsageAuthorized===true)!==((value as any)?.planUsageAuthorized===true))throw Error('AI_AUTH_IDENTITY_INVALID');if((value as any)?.planUsageAuthorized===true&&(typeof(value as any).access!=='string'||!(value as any).access||!Array.isArray((value as any).scopes)||!(value as any).scopes.includes('resource.invoke')||!(value as any).scopes.includes('chatgpt.tokens.use.direct')))throw Error('AI_AUTH_IDENTITY_INVALID');setStage(record,'persisting-credentials');const endpoint=loginEndpoint(b,(result as any)?.endpoint);await serialized(id,async()=>{assertCurrent();await d.vault.set(id,value as StoredCredential,b.credentialRevision??0,false,revision=>{assertCurrent();revise(id,revision,endpoint);record.committed=true;record.bindingAfterCommit=hash(backend(id));record.status.credentialRevisionAtEnd=revision});record.status.planUsageAuthorized=(result as any)?.planUsageAuthorized;notify()})},
     interaction:event=>{assertCurrent();const privateUrl=event.url??event.verificationUri;let url;if(typeof privateUrl==='string'){const u=new URL(privateUrl);if(u.protocol!=='https:'||u.username||u.password||!['auth.openai.com','chatgpt.com','github.com','githubcopilot.com'].includes(u.hostname))throw Error('AI_AUTH_URL_INVALID');record.authUrl=u.href;url=u.origin+u.pathname}record.status.state='interaction';if(record.status.stage==='preparing-listener')setStage(record,'awaiting-browser');record.status.event={type:event.type,...(typeof url==='string'?{url}:{}),...(typeof event.userCode==='string'?{userCode:event.userCode.slice(0,128)}:{})}},
     promptExpired:promptId=>{record.answers.delete(promptId);if(record.status.prompt?.id===promptId)record.status.prompt=undefined},
     prompt:(message,answer)=>{assertCurrent();const prompt=parseAiLoginPrompt({id:message.id,...message.prompt});record.answers.clear();record.status.state='interaction';record.answers.set(prompt.id,answer);record.status.prompt=prompt}
    });record.status.workerCloseStatus='confirmed';if(!record.committed)throw Error('AI_CREDENTIAL_PERSIST_FAILED');record.status.state='completed';setStage(record,record.status.planUsageAuthorized?'connected-plan':'connected-identity')
   })().catch(async(error)=>{if(record.committed){record.status.state='completed';record.status.workerCloseStatus='confirmed';setStage(record,record.status.planUsageAuthorized?'connected-plan':'connected-identity');return}const message=error instanceof Error?error.message:'';const code=record.reason??(knownAuthError(message)?message:'AI_PROVIDER_FAILED');record.status.errorCode=code;record.status.error=authFailureMessage(code);record.status.state=error instanceof PiProcessUnconfirmedError||code==='AI_PROCESS_EXIT_UNCONFIRMED'?'unknown':code==='AI_AUTH_DECLINED'?'denied':code==='AI_TIMEOUT'?'expired':a.signal.aborted?'cancelled':'failed';record.status.workerCloseStatus=error instanceof PiProcessUnconfirmedError||code==='AI_PROCESS_EXIT_UNCONFIRMED'?'unknown':'confirmed';if(error instanceof PiProcessUnconfirmedError){await error.released;record.status.workerCloseStatus='confirmed'}}).finally(()=>{clearTimeout(timer);record.status.event=undefined;record.status.prompt=undefined;record.authUrl=undefined;record.answers.clear();for(const[key,value]of logins)if(logins.size>20&&!live(value)&&value.status.workerCloseStatus!=='unknown'&&latestLogin.get(value.status.backendId)!==key)logins.delete(key)})
   return structuredClone(record.status)
  },
  currentLogin(id:string){const key=latestLogin.get(id),record=key?logins.get(key):undefined;if(!record)return null;if(record.status.workerCloseStatus==='unknown'&&!d.runtime.inspect().unknown)record.status.workerCloseStatus='confirmed';try{if(hash(backend(id))!==(record.bindingAfterCommit??record.binding))return null}catch{return null}return structuredClone(record.status)},
  activeLogins(){for(const record of logins.values())if(record.status.workerCloseStatus==='unknown'&&!d.runtime.inspect().unknown)record.status.workerCloseStatus='confirmed';return[...logins.values()].filter(record=>live(record)||record.status.workerCloseStatus==='unknown').map(record=>({id:record.status.id,backendId:record.status.backendId,state:record.status.state,stage:record.status.stage,workerCloseStatus:record.status.workerCloseStatus}))},
  diagnostic(id:string){const record=logins.get(id);if(!record)throw Error('AI_LOGIN_EXPIRED');return{reportRef:randomUUID(),buildId:DAM_BUILD_IDENTITY.buildId,provider:backend(record.status.backendId).providerKind??'openai-compatible',stage:record.status.stage,errorCode:record.status.errorCode??null,timeline:record.status.timeline??[],workerCloseStatus:record.status.workerCloseStatus,state:record.status.state,credentialsCommitted:record.committed}},
  authUrlForOperation(id:string){const r=logins.get(id);if(!r||!['starting','interaction'].includes(r.status.state)||r.abort.signal.aborted||!r.authUrl)throw Error('AI_LOGIN_EXPIRED');return r.authUrl},
  loginStatus(id:string){const r=logins.get(id);if(!r)throw Error('AI_LOGIN_EXPIRED');return structuredClone(r.status)},
  answer(input:{id:string;promptId:string;answer:string}){const r=logins.get(input.id),a=r?.answers.get(input.promptId);if(!r||!a||r.status.state!=='interaction'||r.abort.signal.aborted||r.status.prompt?.id!==input.promptId||!validAiLoginAnswer(r.status.prompt,input.answer))throw Error('AI_LOGIN_EXPIRED');r.answers.delete(input.promptId);r.status.prompt=undefined;a(input.answer)},
  cancelLogin(id:string){cancelAccount(logins.get(id))},
  async drain(){closing=true;suspended=true;invalidate();for(const record of logins.values())cancelAccount(record);let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([Promise.allSettled([...tails.values(),...[...logins.values()].map(record=>record.completion)]),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('AI_DRAIN_BLOCKED')),5000)})]);if(d.runtime.inspect().unknown)throw Error('AI_PROCESS_EXIT_UNCONFIRMED')}finally{clearTimeout(timer)}}
 }
}
export type AiConnectionService=ReturnType<typeof createAiConnectionService>
