import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {createPiContractFixture} from './pi-contract-fixture.mjs'
import {createPiRuntimeHost} from '../src/main/ai-gateway/pi-runtime-host'
import {createAiConnectionService} from '../src/main/ai-gateway/ai-connection-service'
import {backendExecutionBinding} from '../src/main/ai-gateway/backend-binding'
import {mergePublicBackends,publicBackend,publicSettings} from '../src/main/ai-credentials/public-settings'
import {registerAiBackendIpc} from '../src/main/ipc/ai-backend.ipc'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
import {runVisionRequest} from '../src/main/visual-ai/openai-vision.transport'
import {runIndependentTags} from '../src/main/independent-tags/tag-recipe'
import {openAiVisionProvider,type VisionInvocation} from '../src/main/visual-ai/openai-vision.provider'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createVisualAiController} from '../src/main/visual-ai/visual-ai-controller'
import {createTagExecutionController} from '../src/main/independent-tags/tag-execution-controller'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import type {AiBackendConfig} from '../src/shared/types/ai-backend.types'
import type {AiReasoningLevel} from '../src/shared/workflows/ai-reasoning.workflow'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-reasoning-')))
const native:AiBackendConfig={...createNewInstallAppSettingsDefaults().aiBackends![0],id:'reasoning-fixture',name:'Reasoning fixture',enabled:true,transport:'pi',providerKind:'openai',authMode:'api-key',baseUrl:'https://api.openai.com/v1',defaultModel:'gpt-6-luna',timeoutMs:15000,credentialRef:'reasoning-fixture',credentialRevision:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:true,modelManagement:false}}
const jpeg=await sharp({create:{width:64,height:32,channels:3,background:'#7799bb'}}).jpeg().toBuffer()
const signal=()=>AbortSignal.timeout(20000)
const response=(value:unknown,finish_reason='stop')=>({choices:[{finish_reason,message:{content:JSON.stringify(value)}}]})
const output={caption:'生成图验证',ocrText:'',prompt:'Generated blue reference',tags:['蓝色']}
const invocation=(reasoning?:AiReasoningLevel):VisionInvocation=>({backendId:native.id,credentialRevision:1,reasoning,endpoint:native.baseUrl+'/chat/completions',model:native.defaultModel!,systemPrompt:'Return JSON',userPrompt:'Generated fixture only',imageDataUrl:'data:image/jpeg;base64,'+jpeg.toString('base64'),temperature:0,maxTokens:128,signal:signal()})
const wait=async(check:()=>Promise<boolean>)=>{for(let i=0;i<1000;i++){if(await check())return;await new Promise(r=>setTimeout(r,10))}throw Error('fixture timeout')}
let sequence=0
async function workerFixture(){
 const directory=path.join(root,'worker-'+(++sequence));await fs.mkdir(directory)
 const fixture=await createPiContractFixture(directory),events:any[]=[]
 const runtime=createPiRuntimeHost({root:path.resolve('pi-runtime'),spawn:fixture.spawnOverride})
 const execute=(reasoning:unknown,extra:Record<string,unknown>={},connection:Partial<AiBackendConfig>={})=>runtime.execute<any>({kind:'infer',connection:{...native,reasoning,...connection},reasoning,credential:{type:'api_key',key:'synthetic-not-real'},model:native.defaultModel,systemPrompt:'Return JSON',userPrompt:'Generated fixture only',imageDataUrl:'data:image/jpeg;base64,'+jpeg.toString('base64'),temperature:0,maxTokens:128,...extra},signal(),{interaction:event=>events.push(event)})
 return{runtime,execute,events}
}
function serviceFixture(reasoning?:AiReasoningLevel){
 let settings={...createNewInstallAppSettingsDefaults(),aiBackends:[{...native,...(reasoning!==undefined?{reasoning}:{})}]},calls:any[]=[],credentialReads=0
 const service=createAiConnectionService({settings:{getSettings:()=>settings,saveSettings:next=>{settings={...settings,...next};return settings}},vault:{resolve:async()=>{credentialReads++;return{type:'api_key',key:'synthetic-not-real'}}} as any,runtime:{inspect:()=>({unknown:0,active:0}),execute:async request=>{calls.push(request);return response(output)}} as any,changed:()=>{}})
 return{service,calls,get credentialReads(){return credentialReads},get settings(){return settings},set settings(value:typeof settings){settings=value}}
}

try{
 await test('native catalog qualifies exact Luna levels and non-reasoning off; new runtime helper is sealed and packaged',async()=>{
  const f=await workerFixture(),models=await f.runtime.execute<any[]>({kind:'models',connection:native},signal())
  assert.deepEqual(models.find(m=>m.id==='gpt-6-luna').reasoningLevels,['off','low','medium','high','xhigh','max'])
  assert.deepEqual(models.find(m=>m.id==='gpt-4.1-mini').reasoningLevels,['off'])
  assert.equal(f.events.length,0)
  const pkg=JSON.parse(await fs.readFile('package.json','utf8'))
  assert.ok(pkg.build.extraResources.find((r:any)=>r.from==='pi-runtime').filter.includes('model-reasoning.mjs'))
  const release=JSON.parse(await fs.readFile('pi-runtime/release.json','utf8'))
  assert.equal(release.files['model-reasoning.mjs'],createHash('sha256').update(await fs.readFile('pi-runtime/model-reasoning.mjs')).digest('hex'))
 })
 // Pi 0.99.1 raw stream already defaults this model to wire effort none.
 for(const [level,effort] of [[undefined,'none'],['off','none'],['low','low'],['medium','medium'],['high','high'],['xhigh','xhigh'],['max','max']] as const){
  await test('installed Luna SDK payload '+(level??'model default')+' preserves selected effort without clamping',async()=>{
   const f=await workerFixture(),result=await f.execute(level)
   assert.equal(result.choices[0].finish_reason,'stop')
   assert.equal(f.events.filter(e=>e.type==='contract-network').length,1)
   assert.deepEqual(f.events.filter(e=>e.type==='contract-payload'),[{type:'contract-payload',model:'gpt-6-luna',reasoningEffort:effort}])
   assert.deepEqual(f.runtime.inspect(),{active:0,unknown:0})
  })
 }
 for(const [level,code] of [['minimal','AI_REASONING_UNSUPPORTED'],['unexpected','AI_REASONING_INVALID']] as const){
  await test('unsupported/invalid effort rejects before an expired OAuth refresh or network: '+level,async()=>{
   const f=await workerFixture()
   const credential={type:'oauth',registration:'dam-siwc-v1',clientId:'synthetic-client',access:'synthetic-not-real',refresh:'synthetic-not-real',expires:0,identity:{issuer:'https://auth.openai.com',clientId:'synthetic-client',subject:'synthetic',expiresAt:0},idToken:'synthetic',scopes:['resource.invoke','chatgpt.tokens.use.direct'],planUsageAuthorized:true}
   await assert.rejects(f.execute(level,{credential},{authMode:'oauth'}),new RegExp(code))
   assert.equal(f.events.length,0)
  })
 }
 await test('compatible endpoint and non-reasoning model reject explicit unsupported strength before request',async()=>{
  const f=await workerFixture()
  await assert.rejects(f.execute('low',{}, {providerKind:'openai-compatible',authMode:'none'}),/AI_REASONING_UNSUPPORTED/)
  await assert.rejects(f.execute('high',{model:'gpt-4.1-mini'}),/AI_REASONING_UNSUPPORTED/)
  await assert.rejects(f.execute('low',{reasoning:'high'}),/AI_CONNECTION_CHANGED/)
  assert.equal(f.events.length,0)
 })
 await test('omitted reasoning retains legacy binding; explicit strengths bind independently',()=>{
  const b=native,old={baseUrl:b.baseUrl,type:b.type,model:'gpt-6-luna',vision:b.capabilities.vision,transport:b.transport,processingLocation:b.processingLocation??null,providerKind:b.providerKind,authMode:b.authMode,credentialRef:b.credentialRef,credentialRevision:b.credentialRevision}
  const oldHash=createHash('sha256').update(JSON.stringify(old)).digest('hex')
  assert.equal(backendExecutionBinding(b,'gpt-6-luna'),oldHash)
  assert.equal(backendExecutionBinding({...b,reasoning:undefined},'gpt-6-luna'),oldHash)
  assert.notEqual(backendExecutionBinding({...b,reasoning:'low'},'gpt-6-luna'),oldHash)
  assert.notEqual(backendExecutionBinding({...b,reasoning:'low'},'gpt-6-luna'),backendExecutionBinding({...b,reasoning:'high'},'gpt-6-luna'))
 })
 await test('public and dedicated settings persist reasoning, preserve secure revision, invalidate old proof and reject invalid configurations',async()=>{
  let settings=createNewInstallAppSettingsDefaults();const validation={model:native.defaultModel!,bindingSha256:backendExecutionBinding(native,native.defaultModel!),vision:true,jsonOutput:true,testedAt:new Date().toISOString(),generatedInput:true as const}
  settings.aiBackends=[{...native,apiKey:'synthetic-secret',modelValidation:validation}]
  const projection=publicSettings(settings);assert.equal(projection.aiBackends![0].apiKey,undefined)
  const next=mergePublicBackends(settings.aiBackends,[{...projection.aiBackends![0],reasoning:'low',credentialRevision:99}])[0]
  assert.equal(next.reasoning,'low');assert.equal(next.apiKey,'synthetic-secret');assert.equal(next.credentialRevision,1);assert.equal(next.credentialRef,native.id);assert.equal(next.modelValidation,undefined)
  const handlers=new Map<string,Function>()
  registerAiBackendIpc({settings:{getSettings:()=>settings,saveSettings:value=>{settings={...settings,...value};return settings}},handle:(name,handler)=>{handlers.set(name,handler)},isTrustedSender:event=>(event as any).trusted===true})
  const draft={...projection.aiBackends![0],reasoning:'low'}
  assert.throws(()=>handlers.get('ai-backend:save')!({trusted:false},draft),/UNTRUSTED_SENDER/)
  const saved=await handlers.get('ai-backend:save')!({trusted:true},draft,projection.aiBackends![0])
  assert.equal(saved[0].reasoning,'low');assert.equal(settings.aiBackends![0].reasoning,'low');assert.equal(saved[0].credentialRevision,1)
  for(const bad of [{reasoning:'bad'},{reasoning:3},{reasoning:'low',transport:'legacy'},{reasoning:'low',providerKind:'openai-compatible'}]){
   assert.throws(()=>mergePublicBackends(settings.aiBackends!,[{...publicBackend(native),...bad} as any]),/AI_REASONING_(INVALID|UNSUPPORTED)/)
   await assert.rejects(handlers.get('ai-backend:save')!({trusted:true},{...publicBackend(native),...bad}),/AI_REASONING_(INVALID|UNSUPPORTED)/)
  }
  assert.equal(settings.aiBackends![0].reasoning,'low')
 })
 await test('changed strength invalidates prepared probe; capability proof and current binding retain exactly selected strength',async()=>{
  const f=serviceFixture('low'),review=f.service.prepareValidation(native.id)
  assert.match(review.notice,/思考强度：低（low）/);assert.equal(f.calls.length,0)
  f.settings={...f.settings,aiBackends:[{...native,reasoning:'high'}]}
  await assert.rejects(f.service.confirmValidation(review.receipt),/AI_VALIDATION_EXPIRED/)
  assert.equal(f.calls.length,0);assert.equal(f.credentialReads,0)
  const second=f.service.prepareValidation(native.id),proof=await f.service.confirmValidation(second.receipt)
  assert.equal(proof.reasoning,'high');assert.equal(f.calls[0].reasoning,'high');assert.equal(f.calls[0].connection.reasoning,'high')
  assert.equal(f.settings.aiBackends![0].modelValidation?.reasoning,'high')
  assert.equal(f.settings.aiBackends![0].modelValidation?.bindingSha256,backendExecutionBinding(f.settings.aiBackends![0],native.defaultModel!))
  await assert.rejects(f.service.confirmValidation(second.receipt));assert.equal(f.calls.length,1)
 })
 await test('a frozen invocation cannot adopt a newly selected strength or call credentials',async()=>{
  const f=serviceFixture('high')
  await assert.rejects(f.service.provider.invokeOnce(invocation('low')),/AI_CONNECTION_CHANGED/)
  assert.equal(f.calls.length,0);assert.equal(f.credentialReads,0)
  await f.service.provider.invokeOnce(invocation('high'))
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].reasoning,'high')
 })
 for(const purpose of ['analyze','reverse'] as const)await test('vision '+purpose+' retry freezes selected effort, bytes, model and deadline',async()=>{
  const captured:VisionInvocation[]=[],request={backend:{...native,reasoning:'low' as const},model:native.defaultModel!,purpose,jpeg,signal:signal()}
  const result=await runVisionRequest(request,{invokeOnce:async input=>{captured.push(input);return response(output,captured.length===1?'length':'stop')}})
  assert.equal(result.prompt,output.prompt);assert.equal(captured.length,2)
  assert.deepEqual(captured.map(i=>i.reasoning),['low','low'])
  assert.equal(captured[0].imageDataUrl,captured[1].imageDataUrl);assert.equal(captured[0].signal,captured[1].signal);assert.equal(captured[0].model,captured[1].model)
 })
 await test('tags retry retains strength; legacy direct provider never silently drops it',async()=>{
  const captured:VisionInvocation[]=[]
  const tags=await runIndependentTags({backend:{...native,reasoning:'high'},model:native.defaultModel!,jpeg,signal:signal()},{invokeOnce:async input=>{captured.push(input);return response({tags:['蓝色']},captured.length===1?'length':'stop')}})
  assert.deepEqual(tags,['蓝色']);assert.deepEqual(captured.map(i=>i.reasoning),['high','high']);assert.equal(captured[0].imageDataUrl,captured[1].imageDataUrl)
  await assert.rejects(openAiVisionProvider.invokeOnce(invocation('low')),/AI_REASONING_UNSUPPORTED/)
 })
 await test('formal Host reviews reject changed effort and evidence keeps strength across library reopen',async()=>{
  const directory=path.join(root,'formal'),library=path.join(directory,'library'),file=path.join(directory,'generated.png');await fs.mkdir(directory);await fs.writeFile(file,await sharp(jpeg).png().toBuffer())
  const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:file}]})}))
  const admission=createVisualAdmission();let settings={...createNewInstallAppSettingsDefaults(),aiBackends:[{...native,reasoning:'low' as AiReasoningLevel}]},calls=0
  const provider={invokeOnce:async(input:VisionInvocation)=>{assert.equal(input.reasoning,settings.aiBackends![0].reasoning);calls++;return response(output)}}
  const controller=createVisualAiController({host,settings:()=>settings,provider,admission,onChanged:()=>{}})
  const tags=createTagExecutionController({host,settings:()=>settings,provider,admission,legacy:controller,changed:()=>{}})
  try{
   const create=await host.prepareCreate();assert.equal(create.kind,'planned');if(create.kind!=='planned')throw Error('fixture');await host.confirmCreate(create.plan.receipt)
   const add=await host.prepareAddAssets();assert.equal(add.kind,'planned');if(add.kind!=='planned')throw Error('fixture');await host.dispatchAddAssets(add.plan.receipt)
   const asset=(await host.listAssets())[0],s=host.inspect(),scope={libraryIdentity:s.identity!,generation:s.generation!}
   await host.updateAssetCaption(asset.id,'User caption retained')
   const plan=await controller.prepare('main',{...scope,assetIds:[asset.id],backendId:native.id,model:native.defaultModel!,purpose:'reverse'})
   assert.match(plan.inputDescription,/思考强度：低（low）/)
   settings={...settings,aiBackends:[{...native,reasoning:'high'}]}
   await assert.rejects(controller.run('main',plan.receipt),/配置已变化/);assert.equal(calls,0)
   const current=await controller.prepare('main',{...scope,assetIds:[asset.id],backendId:native.id,model:native.defaultModel!,purpose:'reverse'}),job=await controller.run('main',current.receipt)
   await wait(async()=>!['queued','running'].includes((await controller.inspect('main',job.id)).state));assert.equal((await controller.inspect('main',job.id)).state,'completed');assert.equal(calls,1)
   const evidence=(await host.listVisualAiEvidence(asset.id))[0];assert.equal(evidence.reasoning,'high');assert.equal((await host.listAssets())[0].aiCaption,'User caption retained')
   const tagScope={...scope,assetId:asset.id},context=await host.readTagIntentContext(tagScope)
   await host.saveTagIntent({...tagScope,sessionToken:context.sessionToken,expectedSchemaVersion:context.schemaVersion,allowUpgrade:true,requestId:'reasoning-tags',assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,backendId:native.id,model:native.defaultModel!,backendBindingSha256:backendExecutionBinding(settings.aiBackends[0],native.defaultModel!),recipeId:'independent-tags-v1',recipeVersion:'1'})
   const tagReview=await tags.prepare('main',{...tagScope,requestId:'reasoning-tags'});assert.match(tagReview.inputDescription,/思考强度：高（high）/)
   settings={...settings,aiBackends:[{...native,reasoning:'low'}]}
   await assert.rejects(tags.run('main',tagReview.receipt),/TAG_BACKEND_CHANGED/);assert.equal(calls,1)
   await tags.suspendAndDrain();await controller.suspendAndDrain();await host.close();await host.reopen()
   assert.equal((await host.listVisualAiEvidence(asset.id))[0].reasoning,'high');assert.equal(admission.inspect().materialBytes,0)
  }finally{await tags.suspendAndDrain();await controller.suspendAndDrain();await host.close()}
 })
}finally{await fs.rm(root,{recursive:true,force:true})}
