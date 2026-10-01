import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'
import {createAcceptanceService} from '../src/main/ai-acceptance/acceptance-service'
import {createAiConnectionService} from '../src/main/ai-gateway/ai-connection-service'
import {PiProcessUnconfirmedError,createPiRuntimeHost} from '../src/main/ai-gateway/pi-runtime-host'
import {createCredentialVault} from '../src/main/ai-credentials/credential-vault'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
async function fixture(truncate=false,unknownRelease?:Promise<void>){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-acceptance-host-'));let calls=0
 const server=http.createServer(async(req,res)=>{calls++;const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString());assert.ok(body.messages[1].content[1].image_url.url.startsWith('data:image/jpeg;base64,'));res.writeHead(200,{'content-type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{index:0,delta:{role:'assistant',content:JSON.stringify({caption:'验收生成图片',ocrText:'',prompt:'Generated acceptance',tags:['蓝色']})},finish_reason:truncate&&calls===1?'length':'stop'}]})+'\n\ndata: [DONE]\n\n')});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r))
 let settings=createNewInstallAppSettingsDefaults();const backend={...settings.aiBackends![0],id:'own-test',enabled:true,transport:'pi' as const,providerKind:'openai-compatible' as const,authMode:'none' as const,baseUrl:'http://127.0.0.1:'+(server.address() as any).port+'/v1',defaultModel:'synthetic',capabilities:{...settings.aiBackends![0].capabilities,vision:true,jsonOutput:true}};settings.aiBackends=[backend]
 const store={getSettings:()=>settings,saveSettings:(value:any)=>{settings={...settings,...value};return settings}},connections=createAiConnectionService({settings:store,vault:createCredentialVault({file:path.join(root,'vault.json'),protection:{available:()=>true,encrypt:v=>Buffer.from(v),decrypt:v=>v.toString()}}),runtime:createPiRuntimeHost({root:path.resolve('pi-runtime')}),changed:()=>{}}),acceptance=createAcceptanceService({directory:path.join(root,'acceptance'),settings:store,connections:unknownRelease?{...connections,invokeForAcceptance:async()=>{throw new PiProcessUnconfirmedError(unknownRelease)}}:connections,isSynthetic:true})
 const input={connectionRef:backend.id,model:'synthetic',maxPhysicalRequests:2,maxOutputTokens:3072,maxWallClockMs:30000,maxEstimatedCostUsd:0,estimatedCostPerRequestUsd:0};return{acceptance,input,get calls(){return calls},set changed(v:boolean){if(v)settings={...settings,aiBackends:[{...backend,defaultModel:'changed'}]}},close:async()=>{await acceptance.drain();await connections.drain();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await fs.rm(root,{recursive:true,force:true})}}
}
const wait=async(f:()=>any)=>{for(let i=0;i<1000;i++){const r=f();if(r.state!=='running')return r;await new Promise(r=>setTimeout(r,10))}throw Error('fixture wait timeout')}
await test('actual Gateway/Controller/Host accepts only reviewed generated input; successful evidence survives Host reopen and approval cannot replay',async()=>{
 const f=await fixture();try{const review=await f.acceptance.prepare(f.input);assert.equal(f.calls,0);const job=await f.acceptance.confirmForUserAction(review.receipt);await assert.rejects(f.acceptance.confirmForUserAction(review.receipt));const done=await wait(()=>f.acceptance.status(job.id));assert.equal(done.state,'succeeded');assert.equal(done.output.caption,'验收生成图片');assert.equal(done.spent,1);assert.equal(done.reopenedEvidenceCount,1);assert.equal(f.calls,1)}finally{await f.close()}
})
await test('real SDK truncation retry spends a second physical request in the same approval',async()=>{
 const f=await fixture(true);try{const review=await f.acceptance.prepare(f.input),job=await f.acceptance.confirmForUserAction(review.receipt),done=await wait(()=>f.acceptance.status(job.id));assert.equal(done.state,'succeeded');assert.equal(done.spent,2);assert.equal(f.calls,2)}finally{await f.close()}
})
await test('one-call budget rejects truncation retry, and changed connection rejects before a request',async()=>{
 const f=await fixture(true);try{const review=await f.acceptance.prepare({...f.input,maxPhysicalRequests:1}),job=await f.acceptance.confirmForUserAction(review.receipt),done=await wait(()=>f.acceptance.status(job.id));assert.equal(done.state,'failed');assert.equal(done.spent,1);assert.equal(f.calls,1);const next=await f.acceptance.prepare(f.input);f.changed=true;await assert.rejects(f.acceptance.confirmForUserAction(next.receipt));assert.equal(f.calls,1)}finally{await f.close()}
})

await test('concurrent preparations are capped and drain fences a confirming approval before any inference',async()=>{
 const f=await fixture();try{
  const outcomes=await Promise.allSettled([f.acceptance.prepare(f.input),f.acceptance.prepare(f.input),f.acceptance.prepare(f.input)]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,2);assert.equal(f.calls,0);
  const review=(outcomes.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<any>).value;
  const confirming=f.acceptance.confirmForUserAction(review.receipt);const observed=assert.rejects(confirming,/ACCEPTANCE_SUSPENDED/);
  await f.acceptance.drain();await observed;assert.equal(f.calls,0);
  await assert.rejects(f.acceptance.prepare(f.input),/ACCEPTANCE_BUSY/);
  f.acceptance.resume();const next=await f.acceptance.prepare(f.input);await f.acceptance.discard(next.receipt);assert.equal(f.calls,0);
 }finally{await f.close()}
})
await test('Main resumes acceptance only in an idle shutdown coordinator branch',async()=>{
 const source=await fs.readFile('src/main/index.ts','utf8');
 assert.match(source,/if\(shutdownCoordinator.state==='idle'\)\{aiConnections\?\.resume\(\);aiAcceptance\?\.resume\(\)\}/);
})

await test('unknown owned exit keeps completion and drain pending until release without refund or resend',async()=>{
 let release!:()=>void;const owned=new Promise<void>(r=>{release=r});const f=await fixture(false,owned);
 try{const review=await f.acceptance.prepare(f.input),job=await f.acceptance.confirmForUserAction(review.receipt);
  const terminal=await wait(()=>f.acceptance.status(job.id));assert.equal(terminal.state,'unknown');assert.equal(terminal.spent,1);assert.equal(f.calls,0);
  let drained=false;const draining=f.acceptance.drain().then(()=>{drained=true});await new Promise(r=>setTimeout(r,30));assert.equal(drained,false);
  f.acceptance.resume();await assert.rejects(f.acceptance.prepare(f.input),/ACCEPTANCE_BUSY/);
  release();await draining;assert.equal(f.acceptance.status(job.id).spent,1);assert.equal(f.calls,0);
 }finally{release();await f.close()}
})
