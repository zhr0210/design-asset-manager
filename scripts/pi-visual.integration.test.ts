import {test} from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createTagExecutionController} from '../src/main/independent-tags/tag-execution-controller'
import {createVisualAiController} from '../src/main/visual-ai/visual-ai-controller'
import {createAiConnectionService} from '../src/main/ai-gateway/ai-connection-service'
import {createPiRuntimeHost} from '../src/main/ai-gateway/pi-runtime-host'
import {createCredentialVault} from '../src/main/ai-credentials/credential-vault'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {PiProcessUnconfirmedError} from '../src/main/ai-gateway/pi-runtime-host'
import {backendExecutionBinding} from '../src/main/ai-gateway/backend-binding'
import type {AiBackendConfig} from '../src/shared/types/ai-backend.types'
const wait=async(check:()=>Promise<boolean>)=>{for(let i=0;i<1500;i++){if(await check())return;await new Promise(r=>setTimeout(r,10))}throw Error('fixture wait timeout')}
async function fixture(mode='valid'){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-host-'))),library=path.join(root,'library'),file=path.join(root,'generated.png');await sharp({create:{width:80,height:80,channels:3,background:'#7799bb'}}).png().toFile(file)
 let calls=0,sent:any[]=[],release:(()=>void)|undefined
 const server=http.createServer(async(req,res)=>{calls++;const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString());sent.push(body);if(mode==='wait')await new Promise<void>(r=>{release=r});res.writeHead(200,{'Content-Type':'text/event-stream'});let colours:string[]=[];if(mode==='capability'){const bytes=Buffer.from(body.messages[1].content[1].image_url.url.split(',')[1],'base64'),pixels=await sharp(bytes).raw().toBuffer();for(const x of [0,48]){const rgb=[...pixels.subarray(x*3,x*3+3)];colours.push(['红色','绿色','蓝色'][rgb.indexOf(Math.max(...rgb))])}}const tags=body.messages[0].content.includes('标签助手'),output=mode==='capability'?{caption:'双色验证',ocrText:'',prompt:'Two colour blocks',tags:colours}:tags?{tags:['蓝色']}:{caption:'Pi生成描述',ocrText:'',prompt:'Generated geometric reference',tags:['蓝色']};res.write('data: '+JSON.stringify({id:'f',choices:[{index:0,delta:{role:'assistant',content:JSON.stringify(output)},finish_reason:null}]})+'\n\n');res.end('data: '+JSON.stringify({id:'f',choices:[{index:0,delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n')});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address() as any
 const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:file}]})}));const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('fixture');await host.confirmCreate(create.plan.receipt);const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('fixture');await host.dispatchAddAssets(add.plan.receipt);const asset=(await host.listAssets())[0],s=host.inspect(),scope={libraryIdentity:s.identity!,generation:s.generation!}
 const b:AiBackendConfig={id:'pi-fixture',name:'Pi fixture',type:'openai-compatible',transport:'pi',providerKind:'openai-compatible',authMode:'none',baseUrl:`http://127.0.0.1:${address.port}/v1`,defaultModel:'fixture',enabled:true,timeoutMs:15000,priority:0,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}
 let settings={...createNewInstallAppSettingsDefaults(),aiBackends:[b]},controller:ReturnType<typeof createVisualAiController>|undefined
 const vault=createCredentialVault({file:path.join(root,'vault.json'),protection:{available:()=>true,encrypt:v=>Buffer.from(v),decrypt:v=>v.toString()}}),runtime=createPiRuntimeHost({root:path.resolve('pi-runtime')}),connections=createAiConnectionService({reserveProbe:signal=>admission.reservePiProbe(signal),settings:{getSettings:()=>settings,saveSettings:n=>{settings={...settings,...n};return settings}},vault,runtime,changed:()=>controller?.invalidate()})
 const admission=createVisualAdmission();controller=createVisualAiController({host,settings:()=>settings,provider:connections.provider,admission,onChanged:()=>{}})
 const prepare=()=>controller!.prepare('main',{...scope,assetIds:[asset.id],backendId:b.id,model:'fixture',purpose:'analyze'})
 return{root,host,asset,scope,b,controller,connections,admission,prepare,get calls(){return calls},get sent(){return sent},get release(){return release},get settings(){return settings},set settings(v:typeof settings){settings=v},close:async()=>{release?.();await controller!.suspendAndDrain();await connections.drain();await host.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await fs.rm(root,{recursive:true,force:true})}}
}
await test('actual installed Pi -> controlled preview -> production Host save protects user caption and OCR',async()=>{
 const f=await fixture();try{await f.host.updateAssetCaption(f.asset.id,'User caption');const p=await f.prepare(),j=await f.controller.run('main',p.receipt);await wait(async()=>!['queued','running'].includes((await f.controller.inspect('main',j.id)).state));const job=await f.controller.inspect('main',j.id);assert.equal(job.state,'completed');assert.equal(f.calls,1);assert.equal((await f.host.listAssets())[0].aiCaption,'User caption');assert.equal(job.items[0].evidence?.output.prompt,'Generated geometric reference');assert.equal(f.admission.inspect().materialBytes,0);assert.ok(f.sent[0].messages[1].content[1].image_url.url.startsWith('data:image/jpeg;base64,'));await f.host.close();await f.host.reopen();assert.equal((await f.host.listVisualAiEvidence(f.asset.id)).length,1)}finally{await f.close()}
})
await test('credential change cancels owned Pi request and rejects late write, old review loses account binding',async()=>{
 const f=await fixture('wait');try{const old=backendExecutionBinding(f.b,'fixture'),p=await f.prepare(),j=await f.controller.run('main',p.receipt);await wait(async()=>f.calls===1);await f.connections.setApiKey({backendId:f.b.id,key:'fixture-key-only'});f.release?.();await wait(async()=>!['queued','running'].includes((await f.controller.inspect('main',j.id)).state));assert.equal((await f.host.listVisualAiEvidence(f.asset.id)).length,0);assert.notEqual(backendExecutionBinding(f.settings.aiBackends![0],'fixture'),old);assert.equal(f.admission.inspect().materialBytes,0);await assert.rejects(f.controller.run('main',p.receipt))}finally{await f.close()}
})
await test('UNKNOWN request holds actual admission resources until the delayed close token',async()=>{
 let release!:()=>void;const closed=new Promise<void>(r=>{release=r}),admission=createVisualAdmission({codec:async()=>({jpeg:new Uint8Array([1]),sourceBytes:1,decodedPixels:1,qualified:true} as any)}),lease=admission.open('fixture',{sessionToken:'s',leaseIdentity:'l'});await lease.prepare('a',async()=>new Uint8Array([1]));lease.consume();await assert.rejects(lease.withRequest('a','combined',new AbortController().signal,async()=>{throw new PiProcessUnconfirmedError(closed)}));lease.dispose();assert.equal(admission.inspect().requests,1);assert.ok(admission.inspect().materialBytes>0);release();await new Promise(r=>setImmediate(r));assert.equal(admission.inspect().requests,0);assert.equal(admission.inspect().materialBytes,0)
})
await test('selected local evidence is disclosed and frozen for a separately reviewed external refinement',async()=>{
 const f=await fixture();try{const localPlan=await f.prepare(),first=await f.controller.run('main',localPlan.receipt);await wait(async()=>(await f.controller.inspect('main',first.id)).state==='completed');const prior={...(await f.host.listVisualAiEvidence(f.asset.id))[0],id:'historical-with-ocr',output:{...(await f.host.listVisualAiEvidence(f.asset.id))[0].output,ocrText:'fixture-private-historical-OCR'}};await f.host.saveVisualAiEvidence(prior);f.settings={...f.settings,aiBackends:[f.b,{...f.b,id:'external-fixture',name:'External declared fixture',processingLocation:'external-service'}]};f.connections.invalidate();const plan=await f.controller.prepare('main',{...f.scope,assetIds:[f.asset.id],backendId:'external-fixture',model:'fixture',purpose:'analyze',refineEvidenceId:prior.id});assert.equal(plan.location,'external');assert.match(plan.inputDescription,/先前本机服务分析/);assert.equal(f.calls,1);const job=await f.controller.run('main',plan.receipt);await wait(async()=>(await f.controller.inspect('main',job.id)).state==='completed');assert.equal(f.calls,2);assert.match(f.sent[1].messages[1].content[0].text,/Pi生成描述/);assert.ok(!f.sent[1].messages[1].content[0].text.includes('fixture-private-historical-OCR'));const outputs=await f.host.listVisualAiEvidence(f.asset.id);assert.equal(outputs.length,3);assert.equal(outputs.find(e=>e.upstreamEvidenceId===prior.id)?.processingLocation,'external-service');await assert.rejects(f.controller.prepare('main',{...f.scope,assetIds:[f.asset.id],backendId:'external-fixture',model:'fixture',purpose:'analyze',refineEvidenceId:'unknown'}));assert.equal(f.calls,2)}finally{await f.close()}
})
await test('generated capability validation is separately reviewed, sends once, and never creates a library effect',async()=>{
 const f=await fixture();try{const before=(await f.host.listVisualAiEvidence(f.asset.id)).length,review=f.connections.prepareValidation(f.b.id);assert.equal(f.calls,0);assert.match(review.notice,/不读取资料库/);const result=await f.connections.confirmValidation(review.receipt);assert.equal(result.structuredOutputValid,true);assert.equal(result.colourChallengePassed,false);assert.equal(f.calls,1);assert.equal((await f.host.listVisualAiEvidence(f.asset.id)).length,before);assert.equal(f.settings.aiBackends![0].modelValidation?.vision,false);await assert.rejects(f.connections.confirmValidation(review.receipt));assert.equal(f.calls,1)}finally{await f.close()}
})
await test('correct generated-image challenge records capability evidence for exactly the reviewed model and credential binding',async()=>{
 const f=await fixture('capability');try{const review=f.connections.prepareValidation(f.b.id),proof=await f.connections.confirmValidation(review.receipt);assert.equal(proof.colourChallengePassed,true);assert.equal(f.calls,1);const b=f.settings.aiBackends![0];assert.equal(b.modelValidation?.bindingSha256,backendExecutionBinding(b,'fixture'));assert.equal(b.modelValidation?.vision,true);assert.equal((await f.host.listVisualAiEvidence(f.asset.id)).length,0);assert.equal(f.admission.inspect().materialBytes,0)}finally{await f.close()}
})

await test('installed Pi tags-only commits through production claim and duplicate succeeds without another inference',async()=>{
 const f=await fixture(),scope={...f.scope,assetId:f.asset.id},tags=createTagExecutionController({host:f.host,settings:()=>f.settings,admission:f.admission,legacy:f.controller,provider:f.connections.provider,changed:()=>{}})
 try{
  await f.host.updateAssetCaption(f.asset.id,'User retained caption')
  const context=await f.host.readTagIntentContext(scope)
  await f.host.saveTagIntent({...scope,sessionToken:context.sessionToken,expectedSchemaVersion:context.schemaVersion,allowUpgrade:true,requestId:'pi-independent-tags',assetRevision:f.asset.revision,previewGeneration:f.asset.thumbnailRef,backendId:f.b.id,model:'fixture',backendBindingSha256:backendExecutionBinding(f.b,'fixture'),recipeId:'independent-tags-v1',recipeVersion:'1'})
  const review=await tags.prepare('main',{...scope,requestId:'pi-independent-tags'})
  assert.equal(f.calls,0)
  const started=await tags.run('main',review.receipt)
  await wait(async()=>!['queued','running'].includes((await tags.inspect('main',started.id)).state))
  const finished=await tags.inspect('main',started.id)
  assert.equal(finished.state,'succeeded',finished.error)
  assert.equal(f.calls,1)
  assert.deepEqual((await tags.read('main',scope)).current?.tags,['蓝色'])
  assert.equal((await f.host.listAssets())[0].aiCaption,'User retained caption')
  assert.equal((await f.host.listVisualAiEvidence(f.asset.id)).length,0)
  const duplicate=await tags.prepare('main',{...scope,requestId:'pi-independent-tags'})
  assert.equal(duplicate.alreadySucceeded,true)
  assert.equal((await tags.run('main',duplicate.receipt)).state,'succeeded')
  assert.equal(f.calls,1)
  await tags.suspendAndDrain();await f.host.close();await f.host.reopen()
  assert.deepEqual((await f.host.readTagExecution(scope)).current?.tags,['蓝色'])
 }finally{await tags.suspendAndDrain();await f.close()}
})
