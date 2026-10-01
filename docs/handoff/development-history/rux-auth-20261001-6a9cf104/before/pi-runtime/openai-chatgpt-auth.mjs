import {randomBytes,createHash,createPublicKey,verify,constants} from 'node:crypto'
import {createServer} from 'node:http'
const ISSUER='https://auth.openai.com',RESOURCE='https://api.openai.com/v1',TOKEN=ISSUER+'/api/accounts/oauth/token',JWKS=ISSUER+'/.well-known/jwks.json',SCOPES='openid profile email offline_access resource.invoke chatgpt.tokens.use.direct'
const fail=()=>{throw Error('AI_AUTH_IDENTITY_INVALID')},random=()=>randomBytes(32).toString('base64url')
const issued=id=>typeof id==='string'&&id.length>0&&id.length<=200&&id!=='dynamic_agent_client'&&!/[\s\x00-\x1f]/.test(id)
export function verifyIdentity(token,keys,{clientId,nonce,subject,now=Date.now()/1000}){
 if(typeof token!=='string'||token.length>32768)fail();const parts=token.split('.');if(parts.length!==3||parts.some(p=>!p||!/^[A-Za-z0-9_-]+$/.test(p)))fail()
 let header,payload;try{header=JSON.parse(Buffer.from(parts[0],'base64url'));payload=JSON.parse(Buffer.from(parts[1],'base64url'))}catch{fail()}
 if(!header||!payload||header.crit||!['RS256','ES256'].includes(header.alg)||typeof header.kid!=='string'||header.kid.length>200||!Array.isArray(keys?.keys)||keys.keys.length>64)fail()
 const matches=keys.keys.filter(k=>k.kid===header.kid&&(!k.alg||k.alg===header.alg)&&(!k.use||k.use==='sig')&&(!k.key_ops||k.key_ops.includes('verify')))
 if(matches.length!==1)fail();const jwk=matches[0];if(jwk.d||header.alg==='RS256'&&jwk.kty!=='RSA'||header.alg==='ES256'&&(jwk.kty!=='EC'||jwk.crv!=='P-256'))fail()
 let key,ok;try{key=createPublicKey({key:jwk,format:'jwk'});if(header.alg==='RS256'&&(key.asymmetricKeyDetails.modulusLength<2048||key.asymmetricKeyDetails.modulusLength>4096))fail();ok=verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),header.alg==='RS256'?{key,padding:constants.RSA_PKCS1_PADDING}:{key,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url'))}catch{fail()}
 const audiences=Array.isArray(payload.aud)?payload.aud:[payload.aud]
 if(!ok||payload.iss!==ISSUER||!audiences.includes(clientId)||audiences.length>1&&payload.azp!==clientId||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>300||!Number.isFinite(payload.exp)||payload.exp<=now-5||!Number.isFinite(payload.iat)||payload.iat>now+5||Number.isFinite(payload.nbf)&&payload.nbf>now+5||nonce!==undefined&&payload.nonce!==nonce||subject!==undefined&&payload.sub!==subject)fail()
 return{issuer:ISSUER,clientId,subject:payload.sub,validatedAt:Date.now()}
}
export function createControlledAuthNetwork({fetch:baseFetch=globalThis.fetch,signal,maxRequests=6,now=Date.now}){
 let calls=0;const start=now()
 return{get calls(){return calls},async json(url,options={}){
  signal?.throwIfAborted();if(now()-start>300000||calls>=maxRequests||![[TOKEN,'POST'],[JWKS,'GET']].some(([u,m])=>url===u&&(options.method??'GET')===m))throw Error('AI_AUTH_NETWORK_REJECTED')
  calls++;const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)
  const response=await baseFetch(url,{...options,redirect:'error',signal:requestSignal});if(!response.ok){await response.body?.cancel();throw Error('AI_AUTH_NETWORK_FAILED')}
  if(!response.body)throw Error('AI_AUTH_NETWORK_FAILED');const reader=response.body.getReader(),chunks=[];let bytes=0
  try{for(;;){requestSignal.throwIfAborted();const r=await reader.read();if(r.done)break;bytes+=r.value.length;if(bytes>65536)throw Error('AI_AUTH_RESPONSE_TOO_LARGE');chunks.push(r.value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
  let value;try{value=JSON.parse(Buffer.concat(chunks).toString())}catch{throw Error('AI_AUTH_RESPONSE_INVALID')}if(!value||typeof value!=='object'||Array.isArray(value))throw Error('AI_AUTH_RESPONSE_INVALID');return value
 }}
}
export function parseCallback(input,{redirectUri,state,priorClientId}){
 let url;try{url=new URL(input)}catch{throw Error('AI_AUTH_CALLBACK_INVALID')}
 const expected=new URL(redirectUri);if(url.origin!==expected.origin||url.pathname!==expected.pathname||url.username||url.password||url.hash||url.searchParams.getAll('state').length!==1||url.searchParams.getAll('code').length>1||url.searchParams.getAll('client_id').length>1||url.searchParams.get('state')!==state)throw Error('AI_AUTH_CALLBACK_INVALID')
 if(url.searchParams.has('error'))throw Error('AI_AUTH_DECLINED')
 const code=url.searchParams.get('code'),client=url.searchParams.get('client_id')??priorClientId;if(!code||code.length>4096||!issued(client)||priorClientId&&client!==priorClientId)throw Error('AI_AUTH_REGISTRATION_INVALID')
 return{code,clientId:client}
}
async function callbackListener(signal,parse){
 let doneResolve,doneReject;const result=new Promise((resolve,reject)=>{doneResolve=resolve;doneReject=reject});result.catch(()=>{})
 let redirectUri,consumed=false,requests=0
 const server=createServer((request,response)=>{response.setHeader('Content-Type','text/html; charset=utf-8');response.setHeader('Cache-Control','no-store');if(++requests>32||request.method!=='GET'||!redirectUri||request.url.length>8192||request.headers.host!==new URL(redirectUri).host||!request.url.startsWith('/auth/callback?')){response.writeHead(400);response.end('Authentication callback rejected');return}if(consumed){response.writeHead(409);response.end('Callback already consumed');return}
  try{const value=parse(new URL(request.url,redirectUri).href,redirectUri);consumed=true;response.end('DAM: sign-in received. Return to the application.');doneResolve(value)}catch{response.writeHead(400);response.end('Authentication callback rejected')}
 })
 const close=()=>new Promise(resolve=>{server.closeAllConnections();server.close(()=>resolve())}),abort=()=>{doneReject(Error('AI_CANCELLED'));void close()}
 signal?.throwIfAborted();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});redirectUri='http://127.0.0.1:'+server.address().port+'/auth/callback';signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort()
 return{redirectUri,result,async close(){signal?.removeEventListener('abort',abort);await close()}}
}
function validRegistration(c){return c?.type==='oauth'&&c.registration==='dam-siwc-v1'&&issued(c.clientId)&&c.identity?.issuer===ISSUER&&c.identity.clientId===c.clientId&&typeof c.identity.subject==='string'&&typeof c.idToken==='string'&&Array.isArray(c.scopes)}
export function createChatGptAuth({priorCredential,allowRefresh=true,networkFactory=createControlledAuthNetwork}={}){
 const tokenCredential=async(token,clientId,network,expected)=>{
  if(typeof token.access_token!=='string'||!token.access_token||typeof token.refresh_token!=='string'||!token.refresh_token||!Number.isFinite(token.expires_in)||token.expires_in<=0||token.expires_in>86400||token.token_type?.toLowerCase()!=='bearer')throw Error('AI_AUTH_TOKEN_INVALID')
  let identity=expected.prior?.identity,idToken=expected.prior?.idToken
  if(token.id_token!==undefined){const keys=await network.json(JWKS);identity=verifyIdentity(token.id_token,keys,{clientId,nonce:expected.nonce,subject:expected.prior?.identity.subject});idToken=token.id_token}else if(!expected.prior)throw Error('AI_AUTH_IDENTITY_MISSING')
  const scopes=typeof token.scope==='string'?token.scope.split(/\s+/).filter(Boolean):expected.prior?.scopes??[]
  return{type:'oauth',access:token.access_token,refresh:token.refresh_token,expires:Date.now()+token.expires_in*1000-30000,registration:'dam-siwc-v1',clientId,identity,idToken,scopes,planUsageAuthorized:scopes.includes('chatgpt.tokens.use.direct')&&scopes.includes('resource.invoke')}
 }
 return{name:'ChatGPT plan',isSubscription:true,loginLabel:'Continue with ChatGPT',async login(interaction,options){
  const id=options?.getDeviceId?.();if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('AI_HOST_ID_INVALID')
  const prior=validRegistration(priorCredential)?priorCredential:undefined,state=random(),nonce=random(),verifier=random(),challenge=createHash('sha256').update(verifier).digest('base64url'),network=networkFactory({signal:interaction.signal})
  const listener=await callbackListener(interaction.signal,(url,redirectUri)=>parseCallback(url,{redirectUri,state,priorClientId:prior?.clientId}))
  const manualAbort=new AbortController(),params=new URLSearchParams({client_id:prior?.clientId??'dynamic_agent_client',ext_agent_host_id:'urn:uuid:'+id.toLowerCase(),response_type:'code',redirect_uri:listener.redirectUri,scope:SCOPES,resource:RESOURCE,state,nonce,code_challenge:challenge,code_challenge_method:'S256'})
  if(prior)params.set('id_token_hint',prior.idToken);else params.set('agent_name_hint','DAM')
  try{
   interaction.signal.throwIfAborted();interaction.notify({type:'auth_url',url:ISSUER+'/api/accounts/authorize?'+params.toString()})
   const manual=interaction.prompt({type:'manual_code',message:'完成系统浏览器登录；如未自动返回，请粘贴完整回调网址。',signal:manualAbort.signal}).then(value=>parseCallback(value,{redirectUri:listener.redirectUri,state,priorClientId:prior?.clientId}));manual.catch(()=>{})
   const received=await Promise.race([listener.result,manual]);manualAbort.abort();interaction.signal.throwIfAborted()
   const token=await network.json(TOKEN,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:received.clientId,code:received.code,code_verifier:verifier,redirect_uri:listener.redirectUri,resource:RESOURCE})})
   return await tokenCredential(token,received.clientId,network,{nonce,prior})
  }finally{manualAbort.abort();await listener.close()}
 },async refresh(credential,signal){
  if(!allowRefresh)throw Error('AI_AUTH_FRESH_LOGIN_REQUIRED');if(!validRegistration(credential))throw Error('AI_AUTH_REAUTH_REQUIRED');const network=networkFactory({signal,maxRequests:3}),token=await network.json(TOKEN,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:credential.clientId,refresh_token:credential.refresh,resource:RESOURCE})})
  return tokenCredential({...token,refresh_token:token.refresh_token??credential.refresh},credential.clientId,network,{prior:credential})
 },async toAuth(credential){if(!validRegistration(credential)||!credential.planUsageAuthorized)throw Error('AI_CHATGPT_PLAN_PERMISSION_REQUIRED');return{apiKey:credential.access,baseUrl:RESOURCE}}
 }
}
