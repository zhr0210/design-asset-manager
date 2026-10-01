import {backendExecutionBinding,backendLocation} from '../ai-gateway/backend-binding'
import {createHash,randomUUID} from 'node:crypto'
import type {ActiveLibraryHost} from '../../shared/contracts/active-library.contract'
import type {AppSettings} from '../../shared/types/settings.types'
import type {AiBackendConfig} from '../../shared/types/ai-backend.types'
import type {TagIntentScope} from '../../shared/contracts/independent-tag-intent.contract'
import type {TagRunPrepare,TagRunReview,TagRunJob,TagAttemptClaim,TagExecutionRequest} from '../../shared/contracts/tag-execution.contract'
import {VISUAL_ADMISSION_PROFILE} from '../visual-ai/visual-admission'
import type {VisualAdmission,VisualMaterialLease} from '../visual-ai/visual-admission'
import {systemVisualAiClock,type VisualAiClock} from '../visual-ai/visual-ai-clock'
import type {VisionProvider} from '../visual-ai/openai-vision.provider'
import {runIndependentTags} from './tag-recipe'
import {tagIntentId} from './tag-intent-storage'

const fingerprint=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
type Plan={owner:string;input:TagRunPrepare;request:TagExecutionRequest;backend:AiBackendConfig;fingerprint:string;review:TagRunReview;material:VisualMaterialLease|null;sessionToken:string}
type Job={owner:string;value:TagRunJob;abort:AbortController;settled?:Promise<void>}
export function createTagExecutionController(deps:{
 host:ActiveLibraryHost;settings():AppSettings;admission:VisualAdmission
 legacy:{suspendAndDrain():Promise<void>;resume():void}
 changed(scope:TagIntentScope):void;provider?:VisionProvider;clock?:VisualAiClock
}){
 const clock=deps.clock??systemVisualAiClock,plans=new Map<string,Plan>(),jobs=new Map<string,Job>(),materials=new Set<VisualMaterialLease>()
 const preparationSignals=new Map<string,AbortController>()
 const preparing=new Set<string>(),ownerEpoch=new Map<string,number>(),drainWaiters=new Set<()=>void>()
 let epoch=0,running=0,suspended=false,cutover:Promise<void>|undefined
 const notifyDrain=()=>{if(!running&&!preparing.size){for(const r of drainWaiters)r();drainWaiters.clear()}}
 // Only in-memory terminal handles are bounded; active work and durable effects stay intact.
 const pruneTerminalJobs=()=>{
  const terminal=(job:Job)=>!['running','queued'].includes(job.value.state)
  let excess=[...jobs.values()].filter(terminal).length-100
  if(excess<=0)return
  for(const [id,job]of jobs){if(terminal(job)){jobs.delete(id);if(--excess===0)break}}
 }
 const requireScope=(scope:TagIntentScope)=>{const s=deps.host.inspect();if(s.state!=='ready'||s.identity!==scope.libraryIdentity||s.generation!==scope.generation)throw Error('TAG_INTENT_SCOPE_EXPIRED')}
 const release=(m:VisualMaterialLease|null)=>{if(m){m.dispose();materials.delete(m)}}
 const configured=(id:string)=>{
  const b=deps.settings().aiBackends?.find(x=>x.id===id)
  if(!b?.enabled||!b.capabilities.vision)throw Error('TAG_BACKEND_UNAVAILABLE')
  const url=new URL(b.baseUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.hash)throw Error('TAG_BACKEND_UNAVAILABLE')
  return structuredClone(b)
 }
 const getJob=(owner:string,id:string)=>{const job=jobs.get(id);if(!job||owner!=='main'&&job.owner!==owner)throw Error('TAG_JOB_UNAVAILABLE');requireScope(job.value);return job}
 const cancelOwner=(owner:string)=>{ownerEpoch.set(owner,(ownerEpoch.get(owner)??0)+1);preparationSignals.get(owner)?.abort();for(const [key,p]of plans)if(p.owner===owner){release(p.material);plans.delete(key)}for(const m of materials)if(m.owner===`tags:${owner}`)release(m);for(const j of jobs.values())if(j.owner===owner)j.abort.abort()}
 const invalidate=()=>{epoch++;for(const signal of preparationSignals.values())signal.abort();plans.clear();for(const m of materials)m.dispose();materials.clear();for(const j of jobs.values())j.abort.abort()}
 async function activate(plan:Plan,signal:AbortSignal){
  const snapshot=await deps.host.readTagExecution(plan.input)
  signal.throwIfAborted();if(snapshot.schemaVersion>=10)return
  if(!cutover)cutover=(async()=>{
   const releaseBarrier=deps.admission.hold()
   try{await deps.legacy.suspendAndDrain();await deps.host.enableTagExecution({...plan.input,sessionToken:plan.sessionToken,expectedSchemaVersion:9,allowUpgrade:true},signal)}
   finally{
    // A committed/uncertain upgrade never restores the legacy writer. Its own run path reads v10.
    try{if(deps.host.inspect().state==='ready'){
     await deps.host.readVisualSession(plan.input)
     const known=await deps.host.readAssetContext([])
     if(known.schemaVersion>=9&&known.schemaVersion<=13){deps.legacy.resume();deps.admission.resume()}
    }}finally{releaseBarrier()}
   }
  })().finally(()=>{cutover=undefined})
  await cutover
 }
 async function publish(scope:TagIntentScope,sessionToken:string){
  try{for(const event of await deps.host.readTagOutbox({...scope,sessionToken})){deps.changed({...scope,assetId:event.assetId});await deps.host.ackTagOutbox({...scope,sessionToken},event.eventId)}}catch{/* Effect remains committed. A pending outbox is recoverable without inference. */}
 }
 return{
  async prepare(owner:string,input:TagRunPrepare):Promise<TagRunReview>{
   if(suspended||cutover)throw Error('TAG_EXECUTION_SUSPENDED')
   if(!input||Object.keys(input).some(k=>!['libraryIdentity','generation','assetId','requestId'].includes(k)))throw Error('TAG_INPUT_INVALID')
   tagIntentId(input.requestId);requireScope(input)
   for(const [key,p]of plans)if(p.owner===owner||Date.parse(p.review.expiresAt)<clock.now()){release(p.material);plans.delete(key)}
   if(preparing.has(owner)||preparing.size+plans.size>=4)throw Error('TAG_EXECUTION_BUSY')
   preparing.add(owner);const version=epoch,ownerVersion=ownerEpoch.get(owner)??0
   const preparationAbort=new AbortController();preparationSignals.set(owner,preparationAbort)
   let material:VisualMaterialLease|null=null
   const revokeMaterial=()=>release(material)
   try{
    const request=await deps.host.readTagExecutionRequest(input,input.requestId)
    if(!request.sourceMatches||request.recipeId!=='independent-tags-v1')throw Error('TAG_INTENT_SOURCE_CHANGED')
    if(['running','outcome-unknown','superseded'].includes(request.state))throw Error('TAG_EXECUTION_RECONFIRM_REQUIRED')
    const backend=configured(request.backendId),binding=backendExecutionBinding(backend,request.model)
    if(binding!==request.backendBindingSha256)throw Error('TAG_BACKEND_CHANGED')
    const session=await deps.host.readVisualSession(input),context=await deps.host.readTagIntentContext(input)
    if(request.state!=='succeeded'){
     preparationAbort.signal.throwIfAborted();material=deps.admission.open(`tags:${owner}`,session);materials.add(material);preparationAbort.signal.addEventListener('abort',revokeMaterial,{once:true})
     await material.prepare(input.assetId,()=>deps.host.readVisualPreview({...input,sessionToken:session.sessionToken,assetRevision:request.assetRevision,previewGeneration:request.previewGeneration}))
    }
    requireScope(input);if(version!==epoch||ownerVersion!==(ownerEpoch.get(owner)??0))throw Error('TAG_INTENT_SESSION_EXPIRED')
    const origin=new URL(backend.baseUrl),review:TagRunReview={receipt:randomUUID(),requestId:request.requestId,assetId:input.assetId,backendName:backend.name,providerOrigin:origin.origin,model:request.model,location:backendLocation(backend),inputDescription:'仅发送本次素材的受控预览：白底 JPEG，最长边1024；不发送原件、路径或其他素材。只生成标签，截断时同输入最多重试一次。',storageNotice:context.schemaVersion<10?'确认后停止在途旧视觉任务，备份并升级至 v10；旧版应用将无法打开，新旧入口统一管理当前标签。':'标签建议保存到当前资料库，不覆盖人工描述、OCR修订或已确认标签。',expiresAt:new Date(material?.expiresAt??clock.now()+300000).toISOString(),alreadySucceeded:request.state==='succeeded'}
    plans.set(review.receipt,{owner,input:structuredClone(input),request,backend,fingerprint:fingerprint(backend),review,material,sessionToken:session.sessionToken});return review
   }catch(error){release(material);throw error}finally{preparationAbort.signal.removeEventListener('abort',revokeMaterial);preparationSignals.delete(owner);preparing.delete(owner);notifyDrain()}
  },
  async run(owner:string,receipt:string):Promise<TagRunJob>{
   if(suspended||running>=1)throw Error('TAG_EXECUTION_BUSY')
   const plan=plans.get(receipt);if(!plan||plan.owner!==owner||Date.parse(plan.review.expiresAt)<clock.now())throw Error('TAG_INTENT_SESSION_EXPIRED')
   requireScope(plan.input);if(fingerprint(configured(plan.backend.id))!==plan.fingerprint)throw Error('TAG_BACKEND_CHANGED')
   running++;plans.delete(receipt)
   try{
    const session=await deps.host.readVisualSession(plan.input);if(session.sessionToken!==plan.sessionToken)throw Error('TAG_INTENT_SESSION_EXPIRED')
    plan.material?.consume()
    const job:Job={owner,value:{...plan.input,id:randomUUID(),state:plan.review.alreadySucceeded?'succeeded':'queued'},abort:new AbortController()};jobs.set(job.value.id,job)
    if(plan.review.alreadySucceeded){pruneTerminalJobs();running--;notifyDrain();return structuredClone(job.value)}
    const version=epoch
    job.settled=execute(plan,job,version).finally(()=>{running--;release(plan.material);notifyDrain()})
    return structuredClone(job.value)
   }catch(error){running--;release(plan.material);notifyDrain();throw error}
  },
  async waitIdle(signal:AbortSignal){
   signal.throwIfAborted();if(!running)return
   await new Promise<void>((resolve,reject)=>{const done=()=>{signal.removeEventListener('abort',cancel);drainWaiters.delete(done);resolve()},cancel=()=>{drainWaiters.delete(done);reject(Error('TAG_EXECUTION_CANCELLED'))};drainWaiters.add(done);signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel()})
  },
  async settle(owner:string,id:string){const job=getJob(owner,id);await job.settled;return structuredClone(job.value)},
  discardReview(owner:string,receipt:string){const p=plans.get(receipt);if(!p)return;if(p.owner!==owner)throw Error('TAG_REVIEW_UNAVAILABLE');plans.delete(receipt);release(p.material)},
  inspect(owner:string,id:string){return structuredClone(getJob(owner,id).value)},
  cancel(owner:string,id:string){const job=getJob(owner,id);job.abort.abort();return structuredClone(job.value)},
  async read(owner:string,scope:TagIntentScope){requireScope(scope);const snapshot=await deps.host.readTagExecution(scope);return{...snapshot,activeJobs:[...jobs.values()].filter(j=>(owner==='main'||j.owner===owner)&&j.value.libraryIdentity===scope.libraryIdentity&&j.value.generation===scope.generation&&j.value.assetId===scope.assetId&&['queued','running'].includes(j.value.state)).map(j=>structuredClone(j.value))}},
  cancelOwner,invalidate,
  async suspendAndDrain(){suspended=true;invalidate();if(running||preparing.size)await new Promise<void>(r=>drainWaiters.add(r))},
  resume(){suspended=false;deps.admission.resume()}
 }
 async function execute(plan:Plan,job:Job,version:number){
  let claim:TagAttemptClaim|undefined,sent=false,completedResponse=false
  const scope={...plan.input,sessionToken:plan.sessionToken}
  const abort=new AbortController(),cancel=()=>abort.abort();job.abort.signal.addEventListener('abort',cancel,{once:true})
  const timeout=clock.scheduleTimeout(cancel,Math.min(120000,Math.max(1000,Number.isFinite(plan.backend.timeoutMs)?plan.backend.timeoutMs:120000)))
  if(job.abort.signal.aborted)abort.abort()
  try{
   abort.signal.throwIfAborted();await activate(plan,abort.signal);requireScope(plan.input);abort.signal.throwIfAborted()
   if(suspended||version!==epoch)throw Error('TAG_EXECUTION_CANCELLED')
   claim=await deps.host.claimTagExecution({...scope,inputSha256:plan.material!.describe(plan.input.assetId).sha256,origin:'tags-only'})
   const tags=await plan.material!.withRequest(plan.input.assetId,'tags-only',abort.signal,async(jpeg,signal)=>{
    job.value.state='running'
    await deps.host.markTagExecutionSent({...scope,attemptToken:claim!.attemptToken});signal.throwIfAborted();sent=true
    return runIndependentTags({backend:plan.backend,model:plan.request.model,jpeg,signal},deps.provider)
   },plan.backend.transport==='pi'?VISUAL_ADMISSION_PROFILE.piWorkerBytes:0)
   completedResponse=true
   if(suspended||version!==epoch||abort.signal.aborted)throw Error('TAG_EXECUTION_CANCELLED')
   await deps.host.commitTagExecution({...scope,attemptToken:claim.attemptToken,tags},abort.signal)
   job.value.state='succeeded';await publish(plan.input,plan.sessionToken)
  }catch(error){
   const code=error instanceof Error?error.message:''
   const unknown=sent&&!completedResponse&&(abort.signal.aborted||!(code.startsWith('TAG_OUTPUT_')||code.startsWith('AI_HTTP_')))
   job.value.state=unknown?'outcome-unknown':job.abort.signal.aborted||version!==epoch?'cancelled':'failed'
   job.value.error=tagExecutionMessage(unknown?Error('TAG_OUTCOME_UNKNOWN'):error)
   if(claim)try{await deps.host.finishTagExecution({...scope,attemptToken:claim.attemptToken,state:job.value.state,errorCode:unknown?'REMOTE_OUTCOME_UNKNOWN':'TAG_ATTEMPT_FAILED'})}catch{/* Closing/replaced sessions are reconciled on reopen. */}
  }finally{
   timeout();job.abort.signal.removeEventListener('abort',cancel)
   pruneTerminalJobs()
  }
 }
}
export function tagExecutionMessage(error:unknown):string{
 const code=error instanceof Error?error.message:''
 if(code==='TAG_OUTCOME_UNKNOWN'||code==='TAG_EXECUTION_RECONFIRM_REQUIRED')return '远端执行结果尚不确定，本次不会自动重发；请核对任务状态。'
 if(code==='TAG_BACKEND_CHANGED')return '保存任务时的服务配置已变化，请重新保存并确认新任务。'
 if(code.startsWith('TAG_OUTPUT_'))return '模型没有返回完整有效的标签，本次未替换已保存结果。'
 if(code==='TAG_EXECUTION_BUSY'||code==='VISUAL_ADMISSION_BUSY')return '当前视觉任务或待确认操作已达上限，请完成或取消后重试。'
 if(code==='TAG_INTENT_ACK_UNCERTAIN')return '存储升级结果需要核对；本次未自动开始推理，请重新读取资料库状态。'
 if(code==='TAG_INTENT_SETTINGS_RESTORE_FAILED')return '资料库需要恢复检查，已停止新的标签操作。'
 return '标签任务未完成，请核对素材、资料库和服务配置后重试。'
}
