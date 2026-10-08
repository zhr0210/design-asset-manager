import {test} from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPairSync,sign} from 'node:crypto'
import {createChatGptAuth,createControlledAuthNetwork,verifyIdentity,parseCallback} from '../pi-runtime/openai-chatgpt-auth.mjs'
const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'synthetic',alg:'RS256',use:'sig'},keys={keys:[jwk]},client='oaiapp_synthetic'
const jwt=(patch={},headerPatch={})=>{const h=Buffer.from(JSON.stringify({alg:'RS256',kid:'synthetic',...headerPatch})).toString('base64url'),p=Buffer.from(JSON.stringify({iss:'https://auth.openai.com',aud:client,sub:'synthetic-account',iat:Date.now()/1000,exp:Date.now()/1000+600,nonce:'synthetic-nonce',...patch})).toString('base64url');return h+'.'+p+'.'+sign('sha256',Buffer.from(h+'.'+p),pair.privateKey).toString('base64url')}
await test('real crypto verifies signature/issuer/audience/expiry/nonce/account and rejects unsigned variants',()=>{
 assert.equal(verifyIdentity(jwt(),keys,{clientId:client,nonce:'synthetic-nonce'}).subject,'synthetic-account')
 for(const patch of [{iss:'wrong'},{aud:'other'},{exp:0},{nonce:'other'},{sub:'other'}])assert.throws(()=>verifyIdentity(jwt(patch),keys,{clientId:client,nonce:'synthetic-nonce',subject:'synthetic-account'}))
 assert.throws(()=>verifyIdentity(jwt({}, {alg:'none'}),keys,{clientId:client}));const bad=jwt().split('.');bad[2]='invalid';assert.throws(()=>verifyIdentity(bad.join('.'),keys,{clientId:client}))
})
await test('controlled auth transport checks destinations/methods, raw bytes, redirects and retained spent attempts',async()=>{
 let calls=0;const network=createControlledAuthNetwork({maxRequests:2,fetch:async(_u,o)=>{calls++;assert.equal(o.redirect,'error');return new Response(JSON.stringify(keys))}})
 await assert.rejects(network.json('https://other.invalid/'));assert.equal(calls,0);await network.json('https://auth.openai.com/.well-known/jwks.json');await network.json('https://auth.openai.com/.well-known/jwks.json');await assert.rejects(network.json('https://auth.openai.com/.well-known/jwks.json'));assert.equal(calls,2)
 const huge=createControlledAuthNetwork({fetch:async()=>new Response('x'.repeat(66000))});await assert.rejects(huge.json('https://auth.openai.com/.well-known/jwks.json'),/TOO_LARGE/);assert.equal(huge.calls,1)
 const redirect=createControlledAuthNetwork({fetch:async()=>new Response('',{status:302,headers:{location:'https://other.invalid'}})});await assert.rejects(redirect.json('https://auth.openai.com/.well-known/jwks.json'));assert.equal(redirect.calls,1)
})
await test('callback enforces exact loopback, state, issued registration and one selected client',()=>{
 const opts={redirectUri:'http://127.0.0.1:12345/auth/callback',state:'synthetic-state'},good=opts.redirectUri+'?code=synthetic&state=synthetic-state&client_id='+client;assert.equal(parseCallback(good,opts).clientId,client)
 for(const bad of [good.replace('127.0.0.1','localhost'),good.replace('synthetic-state','wrong'),good.replace(client,'dynamic_agent_client'),good+'&code=other'])assert.throws(()=>parseCallback(bad,opts))
 assert.throws(()=>parseCallback(good,{...opts,priorClientId:'other'}))
})
async function login(prior,patch={}){
 let authorization,requests=[],tokenCalls=0
 const networkFactory=({signal})=>createControlledAuthNetwork({signal,fetch:async(url,options)=>{
  requests.push({url,method:options.method??'GET'});if(url.endsWith('/jwks.json'))return new Response(JSON.stringify(keys));tokenCalls++;const body=new URLSearchParams(options.body);assert.equal(body.get('client_id'),client);assert.equal(body.get('redirect_uri'),authorization.searchParams.get('redirect_uri'))
  return new Response(JSON.stringify({token_type:'Bearer',access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600,id_token:jwt({nonce:authorization.searchParams.get('nonce'),...patch}),scope:'openid resource.invoke chatgpt.tokens.use.direct'}))
 }})
 const auth=createChatGptAuth({priorCredential:prior,networkFactory});const credential=await auth.login({signal:new AbortController().signal,notify:event=>{if(event.type==='auth_url')authorization=new URL(event.url)},prompt:async()=>authorization.searchParams.get('redirect_uri')+'?code=synthetic&state='+authorization.searchParams.get('state')+'&client_id='+client},{getDeviceId:()=> '00000000-0000-4000-8000-000000000001'})
 return{credential,authorization,requests,tokenCalls}
}
await test('full public-client sign-in uses stable host and DAM registration, validates identity before result, reuses issued client',async()=>{
 const first=await login();assert.equal(first.credential.registration,'dam-siwc-v1');assert.equal(first.credential.planUsageAuthorized,true);assert.equal(first.authorization.searchParams.get('client_id'),'dynamic_agent_client');assert.equal(first.authorization.searchParams.get('agent_name_hint'),'DAM');assert.equal(first.requests.length,2)
 const second=await login(first.credential);assert.equal(second.authorization.searchParams.get('client_id'),client);assert.equal(second.authorization.searchParams.has('agent_name_hint'),false);assert.equal(second.authorization.searchParams.get('ext_agent_host_id'),first.authorization.searchParams.get('ext_agent_host_id'));await assert.rejects(login(first.credential,{sub:'different-account'}))
})
await test('refresh preserves client/verified identity/hint when no new ID token; wrong replacement identity rejects',async()=>{
 const first=(await login()).credential;let calls=0
 const auth=createChatGptAuth({networkFactory:({signal})=>createControlledAuthNetwork({signal,fetch:async(url,o)=>{calls++;if(url.endsWith('jwks.json'))return new Response(JSON.stringify(keys));assert.equal(new URLSearchParams(o.body).get('client_id'),client);return new Response(JSON.stringify({access_token:'synthetic-refreshed',expires_in:3600,token_type:'Bearer'}))}})})
 const next=await auth.refresh(first,new AbortController().signal);assert.equal(next.refresh,first.refresh);assert.deepEqual(next.identity,first.identity);assert.equal(next.idToken,first.idToken);assert.equal(next.planUsageAuthorized,true);assert.equal(calls,1)
})
await test('verified identity without plan permission is kept but cannot derive inference auth',async()=>{
 let authorization;const auth=createChatGptAuth({networkFactory:({signal})=>createControlledAuthNetwork({signal,fetch:async url=>url.endsWith('jwks.json')?new Response(JSON.stringify(keys)):new Response(JSON.stringify({token_type:'Bearer',access_token:'synthetic',refresh_token:'synthetic',expires_in:3600,id_token:jwt({nonce:authorization.searchParams.get('nonce')}),scope:'openid'}))})})
 const credential=await auth.login({signal:new AbortController().signal,notify:e=>{if(e.type==='auth_url')authorization=new URL(e.url)},prompt:async()=>authorization.searchParams.get('redirect_uri')+'?code=synthetic&state='+authorization.searchParams.get('state')+'&client_id='+client},{getDeviceId:()=> '00000000-0000-4000-8000-000000000001'});assert.equal(credential.planUsageAuthorized,false);await assert.rejects(auth.toAuth(credential),/PLAN_PERMISSION/)
})
await test('signed refresh identity for another account cannot replace original registration',async()=>{
 const first=(await login()).credential;const auth=createChatGptAuth({networkFactory:({signal})=>createControlledAuthNetwork({signal,fetch:async url=>url.endsWith('jwks.json')?new Response(JSON.stringify(keys)):new Response(JSON.stringify({token_type:'Bearer',access_token:'synthetic',refresh_token:'synthetic',expires_in:3600,id_token:jwt({sub:'other-account'})}))})});await assert.rejects(auth.refresh(first,new AbortController().signal),/IDENTITY_INVALID/)
})
await test('cancel during login releases owned callback and makes zero token requests',async()=>{
 let calls=0,prompted;const ready=new Promise(r=>{prompted=r}),abort=new AbortController(),auth=createChatGptAuth({networkFactory:({signal})=>createControlledAuthNetwork({signal,fetch:async()=>{calls++;throw Error('must not send')}})})
 const pending=auth.login({signal:abort.signal,notify:()=>{},prompt:()=>{prompted();return new Promise(()=>{})}},{getDeviceId:()=> '00000000-0000-4000-8000-000000000001'}).catch(e=>e);await ready;abort.abort();assert.ok(await pending instanceof Error);assert.equal(calls,0)
})
await test('auth 429 has one physical attempt, no automatic retry and no raw error body',async()=>{
 const net=createControlledAuthNetwork({fetch:async()=>new Response('synthetic-private-body',{status:429})});await assert.rejects(net.json('https://auth.openai.com/api/accounts/oauth/token',{method:'POST'}),error=>error.message==='AI_AUTH_NETWORK_FAILED');assert.equal(net.calls,1)
})
await test('signed identity-only response has no plan inference auth and refresh requires re-login without network',async()=>{
 let authorization,calls=0
 const auth=createChatGptAuth({networkFactory:({signal})=>createControlledAuthNetwork({signal,fetch:async url=>{
  calls++
  return new Response(JSON.stringify(url.endsWith('jwks.json')?keys:{id_token:jwt({nonce:authorization.searchParams.get('nonce')}),scope:'openid resource.invoke chatgpt.tokens.use.direct'}))
 }})})
 const credential=await auth.login({signal:new AbortController().signal,notify:e=>{if(e.type==='auth_url')authorization=new URL(e.url)},prompt:async()=>authorization.searchParams.get('redirect_uri')+'?code=synthetic&state='+authorization.searchParams.get('state')+'&client_id='+client},{getDeviceId:()=> '00000000-0000-4000-8000-000000000001'})
 assert.equal(credential.identityOnly,true)
 assert.equal(credential.access,'')
 assert.equal(credential.refresh,'')
 assert.equal(credential.planUsageAuthorized,false)
 assert.equal(credential.expires,credential.identity.expiresAt)
 await assert.rejects(auth.toAuth(credential),/PLAN_PERMISSION/)
 const before=calls
 await assert.rejects(auth.refresh(credential,new AbortController().signal),/REAUTH_REQUIRED/)
 assert.equal(calls,before)
 assert.equal(calls,2)
})
