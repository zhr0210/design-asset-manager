import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createAiConnectionService} from '../src/main/ai-gateway/ai-connection-service'
import {createCredentialVault} from '../src/main/ai-credentials/credential-vault'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
import {createLibraryQuiescence} from '../src/main/library-quiescence'
const gate=()=>{let resolve!:()=>void;return{promise:new Promise<void>(r=>{resolve=r}),resolve:()=>resolve()}}
const until=async(predicate:()=>boolean)=>{for(let i=0;i<400;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5))}throw Error('account fixture did not settle')}
const credential={type:'oauth' as const,access:'synthetic-access-private',refresh:'synthetic-refresh-private',expires:Date.now()+3600000,registration:'dam-siwc-v1',clientId:'fixture-client',idToken:'synthetic-id-token',identity:{issuer:'https://auth.openai.com',clientId:'fixture-client',subject:'synthetic-subject'},planUsageAuthorized:true,scopes:['resource.invoke','chatgpt.tokens.use.direct']}
async function fixture(block:'none'|'before'|'after'='none',available=true){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-account-lifecycle-')),wait=gate();let settings=createNewInstallAppSettingsDefaults(),spawns=0,entered=false,unknown=0,bad=false;const base={...settings.aiBackends![0],id:'account-a',transport:'pi' as const,providerKind:'openai' as const,authMode:'oauth' as const,enabled:true,baseUrl:'https://api.openai.com/v1'};settings.aiBackends=[base,{...base,id:'account-b'}]
 const vault=createCredentialVault({file:path.join(root,'vault.json'),protection:{available:()=>available,encrypt:v=>Buffer.from(v),decrypt:v=>v.toString()}})
 const wrapped={...vault,set:async(...args:Parameters<typeof vault.set>)=>{entered=true;if(block==='before')await wait.promise;const value=await vault.set(...args);if(block==='after')await wait.promise;return value}}
 const runtime={inspect:()=>({unknown,active:0}),execute:async(_input:any,signal:AbortSignal,callbacks:any)=>{spawns++;callbacks.authStage?.('awaiting-browser');callbacks.interaction?.({type:'auth_url',url:'https://auth.openai.com/authorize?private=synthetic'});const ready=gate(),cancel=()=>ready.resolve();signal.addEventListener('abort',cancel,{once:true});callbacks.prompt?.({id:'prompt-1',prompt:{type:'manual_code',message:'Synthetic callback'}},()=>ready.resolve());await ready.promise;signal.removeEventListener('abort',cancel);signal.throwIfAborted();callbacks.authStage?.('verifying-identity');await callbacks.credential({...credential,...(bad?{access:''}:{})},false,{endpoint:base.baseUrl,registrationVerified:true,planUsageAuthorized:true});return{loggedIn:true}}}
 const service=createAiConnectionService({settings:{getSettings:()=>settings,saveSettings:patch=>{settings={...settings,...patch};return settings}},vault:wrapped,runtime:runtime as any,hostIdentity:{getDeviceId:()=> '00000000-0000-4000-8000-000000000001'},changed:()=>{}})
 const begin=async()=>{const op=await service.login(base.id);await until(()=>service.loginStatus(op.id).state==='interaction'||service.loginStatus(op.id).state==='failed');return op}
 return{service,vault,base,begin,set malformedPlan(value:boolean){bad=value},file:path.join(root,'vault.json'),set quarantine(value:boolean){unknown=value?1:0},get settings(){return settings},get spawns(){return spawns},get entered(){return entered},release:wait.resolve,answer:(id:string)=>service.answer({id,promptId:'prompt-1',answer:'synthetic code'}),close:async()=>{unknown=0;wait.resolve();await service.drain();await fs.rm(root,{recursive:true,force:true})}}
}
function lifecycle(service:ReturnType<typeof createAiConnectionService>,close:()=>Promise<void>=async()=>{},isShutdownIdle=()=>true){
 return createLibraryQuiescence({current:()=>({visualAdmission:{hold:()=>()=>{}},activeLibraryHost:{inspect:()=>({state:'ready',identity:'synthetic-library',generation:'synthetic-generation'}),holdBusinessAdmission:()=>()=>{},readVisualSession:async()=>({sessionToken:'synthetic-session',leaseIdentity:'synthetic-lease'}),close},aiConnections:service}),isShutdownIdle,confirmSwitchDraftDiscard:()=>{}})
}
await test('app account attempt survives Library Quiescence and unrelated settings/connection changes',async()=>{
 const f=await fixture();try{const op=await f.begin(),quiescence=lifecycle(f.service);await quiescence.onAuthorityWillChange();assert.equal(f.service.currentLogin(f.base.id)?.id,op.id);assert.equal(f.service.loginStatus(op.id).state,'interaction');await quiescence.onAuthorityDidChange();assert.equal(f.service.loginStatus(op.id).state,'interaction');f.service.configurationChanged();assert.equal(f.service.loginStatus(op.id).state,'interaction');f.answer(op.id);await until(()=>f.service.loginStatus(op.id).state==='completed');assert.equal((await f.service.status(f.base.id)).identityVerified,true);assert.equal(f.spawns,1)}finally{await f.close()}
})
await test('cancel before real Vault commit rolls back and retains old revision',async()=>{
 const f=await fixture('before');try{const op=await f.begin();f.answer(op.id);await until(()=>f.entered);f.service.cancelLogin(op.id);f.release();await until(()=>f.service.loginStatus(op.id).state==='cancelled');assert.equal((await f.vault.status(f.base.id)).configured,false);assert.equal(f.settings.aiBackends![0].credentialRevision??0,0)}finally{await f.close()}
})
await test('late cancel after real Vault commit cannot claim old credentials retained; shutdown waits persistence completion',async()=>{
 const f=await fixture('after');try{const op=await f.begin();f.answer(op.id);await until(()=>f.settings.aiBackends![0].credentialRevision===1);f.service.cancelLogin(op.id);assert.notEqual(f.service.loginStatus(op.id).state,'cancelled');let drained=false,closed=0;const quiescence=lifecycle(f.service,async()=>{closed++},()=>false),drain=quiescence.drainForShutdown().then(()=>{drained=true});await new Promise(r=>setTimeout(r,20));assert.equal(drained,false);assert.equal(closed,0);f.release();await drain;assert.equal(f.service.loginStatus(op.id).state,'completed');assert.equal(closed,1);const status=await f.service.status(f.base.id);assert.equal(status.planUsageAuthorized,true);assert.ok(!JSON.stringify(status).includes('synthetic-access-private'))}finally{await f.close()}
})
await test('Library Quiescence shutdown cancels an uncommitted Main account before closing the Host',async()=>{
 const f=await fixture();try{const op=await f.begin();let closed=0;const quiescence=lifecycle(f.service,async()=>{assert.equal(f.service.loginStatus(op.id).state,'cancelled');assert.equal((await f.vault.status(f.base.id)).configured,false);closed++},()=>false);await quiescence.drainForShutdown();assert.equal(f.service.loginStatus(op.id).state,'cancelled');assert.equal(f.settings.aiBackends![0].credentialRevision??0,0);assert.equal(closed,1);assert.equal(f.spawns,1)}finally{await f.close()}
})
await test('unavailable secure storage fails before any Worker or browser URL is created',async()=>{
 const f=await fixture('none',false);try{const op=await f.begin();assert.equal(f.service.loginStatus(op.id).errorCode,'AI_SECRET_STORAGE_UNAVAILABLE');assert.equal(f.spawns,0);assert.equal(f.service.loginStatus(op.id).event,undefined)}finally{await f.close()}
})
await test('persisted verified identity-only account metadata survives a fresh Vault without exposing subject or token',async()=>{
 const f=await fixture();try{await f.vault.set(f.base.id,{...credential,access:'',refresh:'',identityOnly:true,planUsageAuthorized:false},0);const fresh=createCredentialVault({file:f.file,protection:{available:()=>true,encrypt:v=>Buffer.from(v),decrypt:v=>v.toString()}});const status=await fresh.status(f.base.id);assert.equal(status.identityVerified,true);assert.equal(status.planUsageAuthorized,false);assert.ok(!JSON.stringify(status).includes('synthetic-subject'));assert.ok(!JSON.stringify(status).includes('synthetic-id-token'))}finally{await f.close()}
})

await test('quarantined Runtime refuses new login without replacing the existing account operation',async()=>{
 const f=await fixture();try{const op=await f.begin();f.quarantine=true;await assert.rejects(f.service.login(f.base.id),/AI_PROCESS_EXIT_UNCONFIRMED/);assert.equal(f.service.currentLogin(f.base.id)?.id,op.id);assert.equal(f.spawns,1);assert.equal(f.service.loginStatus(op.id).workerCloseStatus,'pending');f.quarantine=false;f.service.cancelLogin(op.id)}finally{await f.close()}
})
await test('verified identity without plan permission rejects Main inference before another Worker spawn',async()=>{
 const f=await fixture();try{const op=await f.begin();f.answer(op.id);await until(()=>f.service.loginStatus(op.id).state==='completed');await f.vault.set(f.base.id,{...credential,access:'',refresh:'',identityOnly:true,planUsageAuthorized:false},1,true);await assert.rejects(f.service.provider.invokeOnce({backendId:f.base.id,credentialRevision:1,endpoint:'https://api.openai.com/v1/chat/completions',model:'fixture',systemPrompt:'generated',userPrompt:'generated',imageDataUrl:'data:image/jpeg;base64,AQID',maxTokens:64,temperature:0,signal:new AbortController().signal}),/AI_CHATGPT_PLAN_PERMISSION_REQUIRED/);assert.equal(f.spawns,1)}finally{await f.close()}
})

await test('malformed Worker cannot claim plan authorization with no access token or replace the old account',async()=>{
 const f=await fixture();try{f.malformedPlan=true;const op=await f.begin();f.answer(op.id);await until(()=>f.service.loginStatus(op.id).state==='failed');assert.equal((await f.vault.status(f.base.id)).configured,false);assert.equal(f.service.loginStatus(op.id).errorCode,'AI_AUTH_IDENTITY_INVALID');await assert.rejects(f.vault.set(f.base.id,{...credential,access:''},0),/AI_CREDENTIAL_INVALID/)}finally{await f.close()}
})
