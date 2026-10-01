import readline from 'node:readline'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import policy from './provider-policy.json' with {type:'json'}
import {createChatGptAuth} from './openai-chatgpt-auth.mjs'
import {openAIResponsesApi} from '@earendil-works/pi-ai/api/openai-responses.lazy'
import {normalizeAuthPrompt,validAuthAnswer} from './auth-interaction.mjs'
import {createModels,createProvider,InMemoryCredentialStore,cleanupSessionResources} from '@earendil-works/pi-ai'
import {openAICompletionsApi} from '@earendil-works/pi-ai/api/openai-completions.lazy'
/** Internal dependency seam for generated-network contract tests; production entry supplies no overrides. */
export async function startPiWorker({authorizeContract,authNetworkFactory}={}){
const abort=new AbortController();process.on('SIGTERM',()=>abort.abort());let sessionId
const send=value=>process.stdout.write(JSON.stringify(value)+'\n')
const prompts=new Map(),lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity})
send({type:'ready',nodeVersion:process.versions.node,piVersion:'0.99.1'})
let launched=false
for await(const line of lines){
 if(line.length>9*1024*1024){send({type:'error',code:'AI_INPUT_TOO_LARGE'});break}
 let m;try{m=JSON.parse(line)}catch{send({type:'error',code:'AI_PROTOCOL_INVALID'});break}
 if(m.kind==='answer'){const p=prompts.get(m.id);if(!p||!validAuthAnswer(p.prompt,m.answer)){send({type:'error',code:'AI_AUTH_ANSWER_INVALID'});abort.abort();for(const pending of prompts.values())pending.reject(Error('invalid answer'));continue}prompts.delete(m.id);p.resolve(m.answer);continue}
 if(m.kind==='cancel'){abort.abort();continue}
 if(launched){send({type:'error',code:'AI_PROTOCOL_INVALID'});break}launched=true
 void action(m).catch(error=>send({type:'error',code:abort.signal.aborted?'AI_CANCELLED':(['AI_AUTH_UNSUPPORTED','AI_AUTH_METHOD_MISMATCH','AI_AUTH_REAUTH_REQUIRED','AI_AUTH_FRESH_LOGIN_REQUIRED','AI_CHATGPT_PLAN_PERMISSION_REQUIRED'].includes(error?.message)||Object.values(policy.blocked).some(b=>b.code===error?.message))?error.message:'AI_PROVIDER_FAILED'})).finally(()=>{lines.close();process.stdin.destroy();if(sessionId)cleanupSessionResources(sessionId)})
}
async function action(input){
 const {connection:c,credential}=input
 if(!c||typeof c.id!=='string')throw Error('input')
 const kind=input.kind==='models'?'models':input.kind==='login'?'login':'infer'
 if(kind!=='models'){if((c.providerKind==='anthropic'||new URL(c.baseUrl).hostname==='api.anthropic.com')&&credential?.type==='api_key'&&credential.key?.includes('sk-ant-oat'))throw Error('AI_ANTHROPIC_SUBSCRIPTION_UNAVAILABLE');if(!policy.sdkAuthModes[c.providerKind??'openai-compatible']?.includes(c.authMode??'none')||kind==='login'&&c.authMode!=='oauth')throw Error('AI_AUTH_UNSUPPORTED');const block=policy.blocked[(c.providerKind??'openai-compatible')+':'+(c.authMode??'none')]??policy.blocked[(c.providerKind??'openai-compatible')+':'+kind];if(block&&!authorizeContract?.(c,kind))throw Error(block.code)}
 if(kind==='infer'&&c.authMode==='oauth'&&credential?.type!=='oauth')throw Error('AI_AUTH_METHOD_MISMATCH')
 if(kind==='infer'&&c.authMode==='api-key'&&credential?.type==='oauth')throw Error('AI_AUTH_METHOD_MISMATCH')
 const store=new InMemoryCredentialStore(),models=createModels({credentials:store,authContext:{env:async()=>undefined,fileExists:async()=>false}})
 let provider
 if((c.providerKind??'openai-compatible')==='openai-compatible'){
  const model={id:input.model??c.defaultModel??'',name:input.model??c.defaultModel??'',api:'openai-completions',provider:'dam-compatible',baseUrl:c.baseUrl,reasoning:false,input:c.capabilities?.vision?['text','image']:['text'],contextWindow:32768,maxTokens:8192,cost:{input:0,output:0,cacheRead:0,cacheWrite:0},compat:{supportsStore:false,supportsDeveloperRole:false,supportsReasoningEffort:false,supportsUsageInStreaming:false,maxTokensField:'max_tokens'}}
  provider=createProvider({id:'dam-compatible',models:[model],api:openAICompletionsApi(),auth:{apiKey:{name:'DAM connection',resolve:async()=>({auth:credential?.type==='api_key'?{apiKey:credential.key}:{}})}}})
 }else{
  const factories={openai:['openai','openaiProvider'],anthropic:['anthropic','anthropicProvider'],google:['google','googleProvider'],'openai-codex':['openai-codex','openaiCodexProvider'],'github-copilot':['github-copilot','githubCopilotProvider']},f=factories[c.providerKind];if(!f)throw Error('provider');const module=await import('@earendil-works/pi-ai/providers/'+f[0]);provider=module[f[1]]()
 }
 if(c.providerKind==='openai'){provider=createProvider({id:provider.id,name:provider.name,baseUrl:provider.baseUrl,models:provider.getModels(),api:openAIResponsesApi(),auth:{apiKey:provider.auth.apiKey,oauth:createChatGptAuth({priorCredential:credential,allowRefresh:input.allowAuthRefresh!==false,networkFactory:authNetworkFactory})}})}
 models.setProvider(provider)
 if(credential)await store.modify(provider.id,async()=>credential)
 if(input.kind==='login'){
  if(!provider.auth.oauth)throw Error('no oauth')
  const value=await models.login(provider.id,'oauth',{signal:abort.signal,notify:event=>send({type:'interaction',event}),prompt:p=>new Promise((resolve,reject)=>{const id=crypto.randomUUID(),prompt=normalizeAuthPrompt(p);prompts.set(id,{resolve,reject,prompt});send({type:'prompt',id,prompt});const stop=()=>{prompts.delete(id);send({type:'prompt-expired',id});reject(Error('cancel'))};abort.signal.addEventListener('abort',stop,{once:true});p.signal?.addEventListener('abort',stop,{once:true});if(abort.signal.aborted||p.signal?.aborted)stop()})},c.providerKind==='openai'?{getDeviceId:()=>input.deviceId}:undefined)
  const model=models.getModels(provider.id)[0],auth=c.providerKind==='openai'?undefined:await models.getAuth(provider.id,{signal:abort.signal}),endpoint=c.providerKind==='openai'?'https://api.openai.com/v1':auth?.auth.baseUrl??model?.baseUrl??provider.baseUrl;send({type:'credential',credential:(await store.read(provider.id))??value,refresh:false});send({type:'result',value:{loggedIn:true,endpoint,...(c.providerKind==='openai'?{registrationVerified:value.registration==='dam-siwc-v1',planUsageAuthorized:value.planUsageAuthorized}: {})}});return
 }
 if(input.kind==='models'){
  if(c.providerKind&&c.providerKind!=='openai-compatible'){send({type:'result',value:models.getModels(provider.id).map(m=>({id:m.id,name:m.name,input:m.input,contextWindow:m.contextWindow,maxTokens:m.maxTokens,source:'catalog',verified:false})).slice(0,1000)});return}
  const url=new URL(c.baseUrl);url.pathname=url.pathname.replace(/\/+$/,'')+'/models'
  const response=await fetch(url,{signal:abort.signal,redirect:'error',headers:credential?.type==='api_key'?{Authorization:'Bearer '+credential.key}:{}});if(!response.ok)throw Error('models')
  const reader=response.body.getReader(),chunks=[];let bytes=0;try{for(;;){const r=await reader.read();if(r.done)break;bytes+=r.value.length;if(bytes>512000)throw Error('models limit');chunks.push(r.value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
  const list=JSON.parse(Buffer.concat(chunks).toString()).data;if(!Array.isArray(list))throw Error('models');send({type:'result',value:list.slice(0,1000).filter(m=>typeof m?.id==='string'&&m.id.length<=256).map(m=>({id:m.id,name:m.id,input:['text'],contextWindow:0,maxTokens:0,source:'service',verified:false}))});return
 }
 const model=models.getModel(provider.id,input.model);if(!model||!model.input.includes('image'))throw Error('model')
 const auth=await models.getAuth(model,{signal:abort.signal});if(c.authMode!=='none'&&!auth)throw Error('auth')
 const refreshed=await store.read(provider.id);if(refreshed&&credential?.type==='oauth'&&JSON.stringify(refreshed)!==JSON.stringify(credential))send({type:'credential',credential:refreshed,refresh:true})
 const resolved=auth?.auth.baseUrl??model.baseUrl;const expected=new URL(c.baseUrl),actual=new URL(resolved);if(actual.origin!==expected.origin||actual.pathname.replace(/\/+$/,'')!==expected.pathname.replace(/\/+$/,''))throw Error('endpoint changed')
 sessionId=crypto.randomUUID()
 const approvedFetch=async(resource,options)=>{
  const address=new URL(typeof resource==='string'||resource instanceof URL?resource:resource.url);if(address.origin!==expected.origin)throw Error('destination');const headers=new Headers(options?.headers??(resource instanceof Request?resource.headers:undefined));if(c.authMode==='none')headers.delete('Authorization');
  const response=await fetch(resource,{...options,headers,redirect:'error',signal:abort.signal});if(!response.body)return response;const reader=response.body.getReader();let received=0;const body=new ReadableStream({async pull(controller){try{const next=await reader.read();if(next.done){controller.close();reader.releaseLock();return}received+=next.value.length;if(received>512000){await reader.cancel();abort.abort();controller.error(Error('response limit'));return}controller.enqueue(next.value)}catch(e){controller.error(e)}},cancel:()=>reader.cancel()});return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers})
 }
 const stream=models.stream(model,{systemPrompt:input.systemPrompt,messages:[{role:'user',timestamp:Date.now(),content:[{type:'text',text:input.userPrompt},{type:'image',data:input.imageDataUrl.split(',')[1],mimeType:'image/jpeg'}]}]},{signal:abort.signal,fetch:approvedFetch,apiKey:c.authMode==='none'?'dam-keyless':undefined,maxRetries:0,maxRetryDelayMs:0,maxTokens:input.maxTokens,temperature:input.temperature,sessionId,cacheRetention:'none',transport:'sse'})
 let events=0,bytes=0
 for await(const event of stream){if(++events>4096)throw Error('events');if(event.type.endsWith('_delta')){bytes+=Buffer.byteLength(event.delta??'');if(bytes>512000){abort.abort();throw Error('size')}}}
 const result=await stream.result();if(result.stopReason==='error'||result.stopReason==='aborted')throw Error('provider terminal')
 const text=result.content.filter(b=>b.type==='text').map(b=>b.text).join('');if(Buffer.byteLength(text)>512000)throw Error('size')
 send({type:'result',value:{choices:[{finish_reason:result.stopReason==='length'?'length':result.stopReason==='stop'?'stop':result.stopReason,message:{content:text}}],usage:result.usage}})
}

}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await startPiWorker()
