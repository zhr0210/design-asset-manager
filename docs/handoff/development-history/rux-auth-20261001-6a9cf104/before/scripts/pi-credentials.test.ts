import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto'
import {createCredentialVault} from '../src/main/ai-credentials/credential-vault'
import {publicSettings,mergePublicBackends} from '../src/main/ai-credentials/public-settings'
import {registerSettingsIpc} from '../src/main/ipc/settings.ipc'
import {createAiConnectionService} from '../src/main/ai-gateway/ai-connection-service'
import {backendExecutionBinding} from '../src/main/ai-gateway/backend-binding'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-vault-')),key=randomBytes(32)
const protection={available:()=>true,encrypt:(text:string)=>{const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv),bytes=Buffer.concat([c.update(text),c.final()]);return Buffer.concat([iv,c.getAuthTag(),bytes])},decrypt:(value:Buffer)=>{const c=createDecipheriv('aes-256-gcm',key,value.subarray(0,12));c.setAuthTag(value.subarray(12,28));return Buffer.concat([c.update(value.subarray(28)),c.final()]).toString()}}
await test('secrets encrypted, metadata public, refresh keeps account revision and clear revokes',async()=>{
 const file=path.join(root,'vault.json'),v=createCredentialVault({file,protection});await v.set('one',{type:'api_key',key:'fixture-key-never-public'});assert.ok(!(await fs.readFile(file,'utf8')).includes('fixture-key-never-public'));assert.equal((await v.status('one')).revision,1);assert.equal((await v.resolve('one',1))?.type,'api_key');await v.set('one',{type:'api_key',key:'rotated'},1,true);assert.equal((await v.status('one')).revision,1);await assert.rejects(v.resolve('one',0));await v.clear('one');assert.equal((await v.status('one')).revision,2);assert.equal(await v.resolve('one',2),undefined)
})
await test('Codex rejects unsupported key save and public settings auth before touching storage',async()=>{
 const saved=createNewInstallAppSettingsDefaults(),backend={...saved.aiBackends![0],transport:'pi' as const,providerKind:'openai-codex' as const,authMode:'oauth' as const};saved.aiBackends=[backend]
 const vault=createCredentialVault({file:path.join(root,'codex-reject.json'),protection}),service=createAiConnectionService({settings:{getSettings:()=>saved,saveSettings:()=>{throw Error('must not save')}},vault,runtime:{} as any,changed:()=>{}})
 await assert.rejects(service.setApiKey({backendId:backend.id,key:'synthetic-unsupported'}),/AI_AUTH_UNSUPPORTED/)
 assert.throws(()=>mergePublicBackends(saved.aiBackends!,[{...backend,authMode:'api-key'}]),/AI_AUTH_UNSUPPORTED/)
 assert.equal((await vault.status(backend.id)).configured,false)
})
await test('safe storage unavailable has no plaintext fallback',async()=>{
 const file=path.join(root,'unavailable.json'),v=createCredentialVault({file,protection:{...protection,available:()=>false}});await assert.rejects(v.set('one',{type:'api_key',key:'fixture-secret'}));await assert.rejects(fs.access(file));assert.equal((await v.status('one')).storageAvailable,false)
})
await test('serialized revisions reject stale writes and isolate two accounts',async()=>{
 const v=createCredentialVault({file:path.join(root,'races.json'),protection});const r=await Promise.allSettled([v.set('one',{type:'api_key',key:'one'},0),v.set('one',{type:'api_key',key:'race'},0)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);await v.set('two',{type:'api_key',key:'two'});assert.equal((await v.resolve('two') as any).key,'two');assert.equal((await v.resolve('one') as any).key,'one')
})
await test('ordinary settings routes are trusted, public and preserve un-migrated secrets',async()=>{
 let saved=createNewInstallAppSettingsDefaults();saved.aiBackends![0].apiKey='legacy-fixture-secret';const handlers=new Map<string,Function>();registerSettingsIpc({getSettings:()=>saved,saveSettings:next=>{saved={...saved,...next};return saved}},async()=>({canceled:true,path:''}),(n,h)=>{handlers.set(n,h)},e=>(e as any).trusted===true)
 await assert.rejects(handlers.get('settings:load')!({trusted:false}));const publicValue=await handlers.get('settings:load')!({trusted:true});assert.ok(!JSON.stringify(publicValue).includes('legacy-fixture-secret'));await handlers.get('settings:save')!({trusted:true},{aiBackends:publicValue.aiBackends});assert.equal(saved.aiBackends![0].apiKey,'legacy-fixture-secret');await assert.rejects(handlers.get('settings:save')!({trusted:true},{aiBackends:[{...publicValue.aiBackends[0],apiKey:'new-fixture'}]}))
})
await test('explicit legacy migration replaces JSON field only after encrypted save and changes execution binding',async()=>{
 let saved=createNewInstallAppSettingsDefaults();saved.aiBackends![0].apiKey='legacy-fixture-secret';const old=saved.aiBackends![0],binding=backendExecutionBinding(old,'fixture'),v=createCredentialVault({file:path.join(root,'migration.json'),protection});let changed=0
 const service=createAiConnectionService({settings:{getSettings:()=>saved,saveSettings:next=>{saved={...saved,...next};return saved}},vault:v,runtime:{} as any,changed:()=>{changed++}});const status=await service.migrate({backendId:old.id,expectedRevision:0});assert.equal(status.legacyPresent,false);assert.equal(saved.aiBackends![0].apiKey,undefined);assert.equal(status.configured,true);assert.notEqual(backendExecutionBinding(saved.aiBackends![0],'fixture'),binding);assert.equal(changed,1);assert.ok(!JSON.stringify(publicSettings(saved)).includes('legacy-fixture-secret'))
})
await test('failed vault save preserves legacy configuration',async()=>{
 let saved=createNewInstallAppSettingsDefaults();saved.aiBackends![0].apiKey='legacy-fixture-secret';const v=createCredentialVault({file:path.join(root,'bad.json'),protection:{...protection,available:()=>false}});const service=createAiConnectionService({settings:{getSettings:()=>saved,saveSettings:n=>{saved={...saved,...n};return saved}},vault:v,runtime:{} as any,changed:()=>{}});await assert.rejects(service.migrate({backendId:saved.aiBackends![0].id,expectedRevision:0}));assert.equal(saved.aiBackends![0].apiKey,'legacy-fixture-secret')
})
await test('settings failure rolls Vault back for replace/migrate/logout and preserves usable old key',async()=>{
 let saved=createNewInstallAppSettingsDefaults();saved.aiBackends![0].credentialRevision=1;saved.aiBackends![0].credentialRef=saved.aiBackends![0].id
 const id=saved.aiBackends![0].id,v=createCredentialVault({file:path.join(root,'compensate.json'),protection});await v.set(id,{type:'api_key',key:'old-fixture'});const service=createAiConnectionService({settings:{getSettings:()=>saved,saveSettings:()=>{throw Error('synthetic settings failure')}},vault:v,runtime:{} as any,changed:()=>{}})
 await assert.rejects(service.setApiKey({backendId:id,key:'new-fixture'}));assert.equal((await v.resolve(id,1) as any).key,'old-fixture');await assert.rejects(service.clear(id));assert.equal((await v.resolve(id,1) as any).key,'old-fixture');assert.equal((await v.status(id)).revision,1)
})
await test('encrypted pending transaction follows durable configuration revision after interruption',async()=>{
 const file=path.join(root,'pending.json'),v=createCredentialVault({file,protection});await v.set('one',{type:'api_key',key:'old-fixture'});const data=JSON.parse(await fs.readFile(file,'utf8')),old=data.rows.one;data.rows.one={revision:2,value:protection.encrypt(JSON.stringify({type:'api_key',key:'new-fixture'})).toString('base64'),kind:'api_key',pending:true,previous:old};await fs.writeFile(file,JSON.stringify(data));assert.equal((await v.resolve('one',1) as any).key,'old-fixture');assert.equal((await v.resolve('one',2) as any).key,'new-fixture');assert.ok(!(await fs.readFile(file,'utf8')).includes('old-fixture'))
})
await test('suspended connections refuse fresh work until explicitly resumed',async()=>{
 const saved=createNewInstallAppSettingsDefaults(),v=createCredentialVault({file:path.join(root,'suspend.json'),protection});let calls=0;const service=createAiConnectionService({settings:{getSettings:()=>saved,saveSettings:()=>saved},vault:v,runtime:{execute:async()=>{calls++;return[]},inspect:()=>({unknown:0})} as any,changed:()=>{}});await service.drain();await assert.rejects(service.models(saved.aiBackends![0],new AbortController().signal));assert.equal(calls,0);service.resume();await service.models(saved.aiBackends![0],new AbortController().signal);assert.equal(calls,1)
})
await test('authentication modes never silently reuse another credential type or a key in no-auth mode',async()=>{
 let settings=createNewInstallAppSettingsDefaults();const id=settings.aiBackends![0].id;settings.aiBackends![0]={...settings.aiBackends![0],transport:'pi',authMode:'none',credentialRef:id,credentialRevision:1};const v=createCredentialVault({file:path.join(root,'modes.json'),protection});await v.set(id,{type:'api_key',key:'fixture-key'});let received:any,calls=0
 const service=createAiConnectionService({settings:{getSettings:()=>settings,saveSettings:n=>{settings={...settings,...n};return settings}},vault:v,runtime:{execute:async r=>{received=r;calls++;return[]},inspect:()=>({unknown:0})} as any,changed:()=>{}});await service.models(settings.aiBackends![0],new AbortController().signal);assert.equal(received.credential,undefined);settings.aiBackends![0].authMode='oauth';await assert.rejects(service.models(settings.aiBackends![0],new AbortController().signal));assert.equal(calls,1)
})
import {piUsageSummary,validateUsageSummary} from '../src/main/ai-gateway/usage-summary'
await test('unknown usage is not zero cost and usage projection cannot retain arbitrary payload fields',()=>{assert.equal(piUsageSummary({input:0,output:0,cost:{total:0}},true).costEstimateUsd,null);assert.equal(piUsageSummary({input:10,output:3,cost:{total:.02}},false).costEstimateUsd,null);assert.deepEqual(validateUsageSummary({inputTokens:10,outputTokens:3,costEstimateUsd:null,source:'unpriced',private:'fixture'}),{inputTokens:10,outputTokens:3,costEstimateUsd:null,source:'unpriced'});assert.equal(validateUsageSummary({inputTokens:NaN,outputTokens:3,costEstimateUsd:0,source:'unpriced'}),undefined)})
for(const committed of [false,true])await test('continuing an interrupted credential transaction selects the durable baseline: '+committed,async()=>{
 const file=path.join(root,'resume-'+committed+'.json'),v=createCredentialVault({file,protection});await v.set('one',{type:'api_key',key:'old-fixture'});const data=JSON.parse(await fs.readFile(file,'utf8')),previous=data.rows.one;data.rows.one={revision:2,kind:'api_key',value:protection.encrypt(JSON.stringify({type:'api_key',key:'new-fixture'})).toString('base64'),pending:true,previous};await fs.writeFile(file,JSON.stringify(data));const revision=committed?2:1
 await assert.rejects(v.set('one',{type:'api_key',key:'third-fixture'},revision,false,()=>{throw Error('settings failure')}));assert.equal((await v.resolve('one',revision) as any).key,committed?'new-fixture':'old-fixture');await assert.rejects(v.clear('one',()=>{throw Error('settings failure')},revision));assert.equal((await v.resolve('one',revision) as any).key,committed?'new-fixture':'old-fixture')
})
