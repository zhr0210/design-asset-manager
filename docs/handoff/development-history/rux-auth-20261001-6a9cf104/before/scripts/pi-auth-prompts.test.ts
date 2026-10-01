import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createAiHostIdentityStore} from '../src/main/ai-credentials/host-identity'
import {parseAiLoginPrompt,validAiLoginAnswer} from '../src/shared/contracts/ai-login-prompt'
import {createAiConnectionService} from '../src/main/ai-gateway/ai-connection-service'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-auth-prompt-'))
try{
 await test('Main opaque host ID persists across fresh instances and refuses malformed/symlink records',async()=>{
  const file=path.join(root,'identity.json'),first=createAiHostIdentityStore(file).getDeviceId();assert.match(first,/^[0-9a-f-]{36}$/);assert.equal(createAiHostIdentityStore(file).getDeviceId(),first);assert.equal((await fs.stat(file)).mode&0o777,0o600)
  await fs.writeFile(file,'{}');assert.throws(()=>createAiHostIdentityStore(file).getDeviceId(),/AI_HOST_ID_INVALID/)
  await fs.symlink(file,path.join(root,'link.json'));assert.throws(()=>createAiHostIdentityStore(path.join(root,'link.json')).getDeviceId(),/AI_HOST_ID_INVALID/)
 })
 await test('select contract is bounded and cannot retain arbitrary SDK fields or accept unknown options',()=>{
  const p=parseAiLoginPrompt({id:'prompt-one',type:'select',message:'Select login',secret:'synthetic-private',options:[{id:'browser',label:'Browser',extra:'ignore'},{id:'device',label:'Device'}]});assert.equal('secret'in p,false);assert.equal('extra'in (p as any).options[0],false);assert.equal(validAiLoginAnswer(p,'browser'),true);assert.equal(validAiLoginAnswer(p,'unknown'),false)
  assert.throws(()=>parseAiLoginPrompt({...p,options:[{id:'browser',label:'One'},{id:'browser',label:'Two'}]}));assert.throws(()=>parseAiLoginPrompt({...p,options:Array.from({length:9},(_,i)=>({id:String(i),label:'Test'}))}));assert.throws(()=>parseAiLoginPrompt({...p,type:'file-upload'}));
 })
 await test('Main selection answers require active operation and current prompt; cancel and A-B-A late answers reject',async()=>{
  let settings=createNewInstallAppSettingsDefaults();settings.aiBackends=[{...settings.aiBackends![0],transport:'pi',providerKind:'openai-codex',authMode:'oauth'}];let calls:any[]=[],entered=0;const pending:()=>Promise<void>=async()=>{for(let i=0;i<100&&entered===0;i++)await new Promise(r=>setTimeout(r,1))}
  const runtime={inspect:()=>({unknown:0}),execute:async(_:unknown,signal:AbortSignal,c:any)=>{entered++;c.prompt({id:'select-current',prompt:{type:'select',message:'Login method',options:[{id:'browser',label:'Browser'},{id:'device',label:'Device'}]}},(a:string)=>calls.push(a));await new Promise<void>((_,reject)=>{if(signal.aborted)reject(Error('cancel'));else signal.addEventListener('abort',()=>reject(Error('cancel')),{once:true})})}}
  const service=createAiConnectionService({admission:()=>({allowed:true,code:'ISOLATED_CONTRACT_ONLY',message:''}),settings:{getSettings:()=>settings,saveSettings:n=>({...settings,...n})},vault:{resolve:async()=>undefined} as any,runtime:runtime as any,changed:()=>{}}),id=settings.aiBackends[0].id
  const a=await service.login(id);await pending();assert.equal(service.loginStatus(a.id).prompt?.type,'select');assert.throws(()=>service.answer({id:a.id,promptId:'select-current',answer:'invalid'}));assert.throws(()=>service.answer({id:a.id,promptId:'old-prompt',answer:'browser'}));service.answer({id:a.id,promptId:'select-current',answer:'device'});assert.deepEqual(calls,['device']);assert.throws(()=>service.answer({id:a.id,promptId:'select-current',answer:'device'}))
  service.cancelLogin(a.id);assert.throws(()=>service.answer({id:a.id,promptId:'select-current',answer:'browser'}));const b=await service.login(id);for(let i=0;i<100&&entered<2;i++)await new Promise(r=>setTimeout(r,1));service.cancelLogin(b.id);const next=await service.login(id);for(let i=0;i<100&&entered<3;i++)await new Promise(r=>setTimeout(r,1));assert.notEqual(next.id,a.id);assert.throws(()=>service.answer({id:a.id,promptId:'select-current',answer:'browser'}));assert.throws(()=>service.answer({id:b.id,promptId:'select-current',answer:'browser'}));service.answer({id:next.id,promptId:'select-current',answer:'browser'});assert.deepEqual(calls,['device','browser']);await service.drain()
 })
 await test('expired login prompt rejects answers immediately and keeps account configuration unchanged',async()=>{
  const settings=createNewInstallAppSettingsDefaults();settings.aiBackends=[{...settings.aiBackends![0],transport:'pi',providerKind:'openai-codex',authMode:'oauth',credentialRevision:7}];const before=JSON.stringify(settings);let answerCalls=0
  const runtime={inspect:()=>({unknown:0}),execute:async(_:unknown,signal:AbortSignal,c:any)=>{c.prompt({id:'expiring',prompt:{type:'select',message:'Synthetic method',options:[{id:'browser',label:'Browser'}]}},()=>{answerCalls++});await new Promise<void>((_,reject)=>{if(signal.aborted)reject(Error('expired'));else signal.addEventListener('abort',()=>reject(Error('expired')),{once:true})})}}
  const service=createAiConnectionService({loginTimeoutMs:20,admission:()=>({allowed:true,code:'ISOLATED_CONTRACT_ONLY',message:''}),settings:{getSettings:()=>settings,saveSettings:()=>{throw Error('must not save')}},vault:{resolve:async()=>undefined} as any,runtime:runtime as any,changed:()=>{}}),operation=await service.login(settings.aiBackends[0].id)
  for(let i=0;i<200&&service.loginStatus(operation.id).state!=='cancelled';i++)await new Promise(r=>setTimeout(r,2))
  assert.equal(service.loginStatus(operation.id).state,'cancelled');assert.throws(()=>service.answer({id:operation.id,promptId:'expiring',answer:'browser'}));assert.equal(answerCalls,0);assert.equal(JSON.stringify(settings),before);await service.drain()
 })
 await test('Main supplies one stable host ID for multiple contract Workers; registration still product-blocked',async()=>{
  const hostIdentity=createAiHostIdentityStore(path.join(root,'stable.json'));let settings=createNewInstallAppSettingsDefaults();settings.aiBackends=[{...settings.aiBackends![0],transport:'pi',providerKind:'openai',authMode:'oauth'}];const ids:string[]=[]
  const service=createAiConnectionService({admission:()=>({allowed:true,code:'ISOLATED_CONTRACT_ONLY',message:''}),hostIdentity,settings:{getSettings:()=>settings,saveSettings:n=>({...settings,...n})},vault:{resolve:async()=>undefined} as any,runtime:{inspect:()=>({unknown:0}),execute:async(r:any)=>{ids.push(r.deviceId);throw Error('isolated reject')}} as any,changed:()=>{}})
  for(let i=0;i<2;i++){const l=await service.login(settings.aiBackends[0].id);for(let n=0;n<100&&service.loginStatus(l.id).state==='starting';n++)await new Promise(r=>setTimeout(r,1))}
  assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);assert.equal(ids[0],hostIdentity.getDeviceId());await service.drain()
 })
}finally{await fs.rm(root,{recursive:true,force:true})}
