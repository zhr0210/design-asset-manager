import {test} from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {registerAiBackendIpc} from '../src/main/ipc/ai-backend.ipc'
import {createAiConnectionService} from '../src/main/ai-gateway/ai-connection-service'
import {createCredentialVault} from '../src/main/ai-credentials/credential-vault'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
await test('legacy authenticated catalog remains usable after explicit migration and unsaved destination gets no stored key',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-legacy-probe-'));let calls=0
 const server=http.createServer((req,res)=>{calls++;assert.equal(req.method,'GET');assert.equal(req.url,'/v1/models');assert.equal(req.headers.authorization,'Bearer synthetic-legacy-key');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:[{id:'synthetic'}]}))});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{
  let settings=createNewInstallAppSettingsDefaults();const b={...settings.aiBackends![0],enabled:true,baseUrl:`http://127.0.0.1:${(server.address() as any).port}/v1`,apiKey:'synthetic-legacy-key'};settings.aiBackends=[b]
  const vault=createCredentialVault({file:path.join(root,'vault.json'),protection:{available:()=>true,encrypt:v=>Buffer.from(v),decrypt:v=>v.toString()}}),store={getSettings:()=>settings,saveSettings:(n:any)=>{settings={...settings,...n};return settings}},connections=createAiConnectionService({settings:store,vault,runtime:{inspect:()=>({unknown:0})} as any,changed:()=>{}}),handlers=new Map<string,Function>()
  registerAiBackendIpc({connections,settings:store,isTrustedSender:()=>true,handle:(n,h)=>{handlers.set(n,h)}})
  const invoke=(n:string,request:any)=>handlers.get(n)!({},request)
  const publicBefore=(await invoke('ai-backend:list',undefined))[0];const first=await invoke('ai-backend:list-models',{backendId:b.id,config:publicBefore});assert.equal(first.success,true);assert.equal(calls,1)
  await connections.migrate({backendId:b.id,expectedRevision:0});assert.equal(settings.aiBackends![0].apiKey,undefined)
  const current=(await invoke('ai-backend:list',undefined))[0];assert.equal(current.apiKey,undefined)
  assert.equal((await invoke('ai-backend:health-check',{backendId:b.id,config:current})).success,true);assert.equal(calls,2)
  await assert.rejects(invoke('ai-backend:list-models',{backendId:b.id,config:{...current,baseUrl:current.baseUrl+'/other'}}),/AI_SAVE_CONFIG_BEFORE_PROBE/);assert.equal(calls,2)
  await assert.rejects(connections.models({...current,baseUrl:current.baseUrl+'/other'},new AbortController().signal),/AI_SAVE_CONFIG_BEFORE_PROBE/);assert.equal(calls,2)
  await connections.drain()
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await fs.rm(root,{recursive:true,force:true})}
})
