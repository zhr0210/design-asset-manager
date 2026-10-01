import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createHash} from 'node:crypto'
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import type {spawn} from 'node:child_process'
import {createPiRuntimeHost} from '../src/main/ai-gateway/pi-runtime-host'
import {createAiConnectionService} from '../src/main/ai-gateway/ai-connection-service'
import {createCredentialVault} from '../src/main/ai-credentials/credential-vault'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-oauth-')),sha=(b:string)=>createHash('sha256').update(b).digest('hex')
async function transport(){
 const r=path.join(root,crypto.randomUUID());await fs.mkdir(path.join(r,'runtime','fixture'),{recursive:true});await fs.mkdir(path.join(r,'node_modules'));await fs.writeFile(path.join(r,'runtime/fixture/node'),'fixture');await fs.writeFile(path.join(r,'worker.mjs'),'fixture');const release=JSON.stringify({schema:1,piVersion:'0.99.1',platform:process.platform,arch:process.arch,nodeVersion:'24.21.0',nodePath:'runtime/fixture/node',files:{'runtime/fixture/node':sha('fixture'),'worker.mjs':sha('fixture')}});await fs.writeFile(path.join(r,'release.json'),release)
 const signals:string[]=[],child=Object.assign(new EventEmitter(),{pid:123,stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),kill:(name:string)=>{signals.push(name);return true}})
 const host=createPiRuntimeHost({root:r,releaseSha256:sha(release),spawn:(()=>child) as unknown as typeof spawn,closeMs:35})
 const started=async()=>{for(let i=0;i<100&&!child.stdout.listenerCount('data');i++)await new Promise(r=>setTimeout(r,1));child.stdout.write(JSON.stringify({type:'ready',nodeVersion:'24.21.0',piVersion:'0.99.1'})+'\n')}
 const send=(v:unknown)=>child.stdout.write(JSON.stringify(v)+'\n');const close=(code=0)=>{child.emit('exit',code);child.emit('close',code)}
 return{host,child,signals,started,send,close}
}
await test('OAuth credential messages are not committed until a successful result and actual close',async()=>{
 const f=await transport();let writes=0;const p=f.host.execute({kind:'login',connection:{id:'fixture'}},new AbortController().signal,{credential:async()=>{writes++}});await f.started();f.send({type:'credential',credential:{type:'oauth',access:'synthetic-only',refresh:'synthetic-only',expires:1},refresh:false});await new Promise(r=>setImmediate(r));assert.equal(writes,0);f.send({type:'result',value:{loggedIn:true}});assert.equal(writes,0);f.close();await p;assert.equal(writes,1)
})
for(const outcome of ['nonzero','cancel','protocol'])await test('OAuth '+outcome+' cannot replace an old credential',async()=>{
 const f=await transport(),a=new AbortController();let writes=0;const p=f.host.execute({kind:'login',connection:{id:'fixture'}},a.signal,{credential:async()=>{writes++}}).catch(e=>e);await f.started();f.send({type:'credential',credential:{type:'oauth',access:'synthetic-only',refresh:'synthetic-only',expires:1},refresh:false});f.send({type:'result',value:{loggedIn:true}});if(outcome==='cancel')a.abort();if(outcome==='protocol')f.send({type:'illegal'});f.close(outcome==='nonzero'?1:0);assert.ok(await p instanceof Error);assert.equal(writes,0)
})
await test('no close is bounded UNKNOWN and no fresh spawn until the late close',async()=>{
 const f=await transport(),a=new AbortController();const p=f.host.execute({kind:'login'},a.signal).catch(e=>e);await f.started();a.abort();const e=await p;assert.equal(e.message,'AI_PROCESS_EXIT_UNCONFIRMED');assert.equal(f.host.inspect().unknown,1);await assert.rejects(f.host.execute({},new AbortController().signal));f.close(1);await e.released;assert.equal(f.host.inspect().unknown,0)
})
await test('Main login status has no token, prompt answer is scoped and cancel preserves original Vault',async()=>{
 let settings=createNewInstallAppSettingsDefaults();settings.aiBackends![0]={...settings.aiBackends![0],transport:'pi',providerKind:'openai-codex',authMode:'oauth',credentialRef:settings.aiBackends![0].id,credentialRevision:1}
 const id=settings.aiBackends![0].id,vault=createCredentialVault({file:path.join(root,'vault.json'),protection:{available:()=>true,encrypt:s=>Buffer.from(s),decrypt:b=>b.toString()}});await vault.set(id,{type:'oauth',access:'old-fixture',refresh:'old-fixture',expires:1});let entered!:()=>void;const started=new Promise<void>(r=>{entered=r})
 const runtime={execute:async(_:unknown,signal:AbortSignal,callbacks:any)=>{callbacks.interaction({type:'auth_url',url:'https://auth.openai.com/authorize?fixture=true'});callbacks.prompt({id:'prompt-one',prompt:{type:'manual_code',message:'Synthetic code'}},()=>{});entered();await new Promise<void>((_,reject)=>signal.addEventListener('abort',()=>reject(Error('cancel')),{once:true}))},inspect:()=>({unknown:0})}
 const service=createAiConnectionService({admission:()=>({allowed:true,code:'ISOLATED_CONTRACT_ONLY',message:''}),settings:{getSettings:()=>settings,saveSettings:n=>{settings={...settings,...n};return settings}},vault,runtime:runtime as any,changed:()=>{}}),login=await service.login(id);await started;const status=service.loginStatus(login.id);assert.ok(!JSON.stringify(status).includes('old-fixture'));assert.throws(()=>service.answer({id:login.id,promptId:'wrong',answer:'fixture-code'}));service.cancelLogin(login.id);await service.drain();assert.equal((await vault.resolve(id,1) as any).access,'old-fixture');assert.equal(service.loginStatus(login.id).state,'cancelled')
})
await test('successful token refresh is retained even when the subsequent inference fails',async()=>{
 const f=await transport();let writes=0;const p=f.host.execute({kind:'infer'},new AbortController().signal,{credential:async(v,refresh)=>{assert.equal(refresh,true);writes++;assert.equal((v as any).access,'refreshed-fixture')}}).catch(e=>e);await f.started();f.send({type:'credential',credential:{type:'oauth',access:'refreshed-fixture',refresh:'rotated-fixture',expires:10},refresh:true});f.send({type:'error',code:'AI_PROVIDER_FAILED'});f.close(1);assert.ok(await p instanceof Error);assert.equal(writes,1)
})
await test('at most two supervised workers reserve capacity, including before verification completes',async()=>{
 const f=await transport(),a=new AbortController(),b=new AbortController();const first=f.host.execute({},a.signal).catch(e=>e),second=f.host.execute({},b.signal).catch(e=>e);await assert.rejects(f.host.execute({},new AbortController().signal),/PI_RUNTIME_BUSY/);for(let i=0;i<100&&f.child.listenerCount('close')<2;i++)await new Promise(r=>setTimeout(r,1));await f.started();a.abort();b.abort();f.close(1);await Promise.all([first,second]);assert.equal(f.host.inspect().active,0)
})
await test('OAuth account-derived endpoint is stored with new credential revision and old selection invalidates',async()=>{
 let settings=createNewInstallAppSettingsDefaults();const id=settings.aiBackends![0].id;settings.aiBackends![0]={...settings.aiBackends![0],transport:'pi',providerKind:'github-copilot',authMode:'oauth',baseUrl:'https://api.individual.githubcopilot.com'};const vault=createCredentialVault({file:path.join(root,'derived-endpoint.json'),protection:{available:()=>true,encrypt:s=>Buffer.from(s),decrypt:b=>b.toString()}})
 const runtime={execute:async(_:unknown,_signal:AbortSignal,callbacks:any)=>{await callbacks.credential({type:'oauth',access:'fixture-only',refresh:'fixture-only',expires:1000},false,{loggedIn:true,endpoint:'https://api.business.githubcopilot.com'});return{loggedIn:true}},inspect:()=>({unknown:0})},service=createAiConnectionService({admission:()=>({allowed:true,code:'ISOLATED_CONTRACT_ONLY',message:''}),settings:{getSettings:()=>settings,saveSettings:n=>{settings={...settings,...n};return settings}},vault,runtime:runtime as any,changed:()=>{}});const login=await service.login(id);for(let i=0;i<100&&service.loginStatus(login.id).state==='starting';i++)await new Promise(r=>setTimeout(r,1));assert.equal(service.loginStatus(login.id).state,'completed');assert.equal(settings.aiBackends![0].baseUrl,'https://api.business.githubcopilot.com');assert.equal(settings.aiBackends![0].credentialRevision,1)
})
