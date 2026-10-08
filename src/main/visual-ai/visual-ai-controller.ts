import {requireBackendInference,backendInferenceAdmission} from '../../shared/constants/pi-provider-admission'
import {backendExecutionBinding} from '../ai-gateway/backend-binding'
import {requireReasoningConfiguration,reasoningNotice} from '../../shared/workflows/ai-reasoning.workflow'
import { createHash, randomUUID } from 'node:crypto'
import {VISUAL_ADMISSION_PROFILE,createVisualAdmission,type VisualAdmission,type VisualMaterialLease} from './visual-admission'
import type {TagAttemptClaim} from '../../shared/contracts/tag-execution.contract'
import type {BasicRequest,BasicClaim} from '../../shared/contracts/basic-analysis.contract'
import type { ActiveLibraryHost, ActiveLibraryAssetProjection } from '../../shared/contracts/active-library.contract'
import type { AppSettings } from '../../shared/types/settings.types'
import type { AiBackendConfig } from '../../shared/types/ai-backend.types'
import type { AiExecutionUsage,VisualAiEvidence, VisualAiJob, VisualAiPrepareRequest, VisualAiReview, VisualAiScope } from '../../shared/contracts/visual-ai.contract'
import { runVisionRequest } from './openai-vision.transport'
import {ConfirmedLocalOomError} from './local-oom-recovery'
import type { VisionProvider } from './openai-vision.provider'
import { systemVisualAiClock, type VisualAiClock } from './visual-ai-clock'

type Input = { asset: ActiveLibraryAssetProjection; sha: string; requestId?:string; claim?:TagAttemptClaim;captionClaim?:BasicClaim }
type Plan = { owner: string; input: VisualAiPrepareRequest; backend: AiBackendConfig; fingerprint: string; review: VisualAiReview; views: Input[]; material:VisualMaterialLease; priorAnalysis?:string }
type Job = { owner: string; value: VisualAiJob; abort: AbortController }
export const localEndpoint = (url: string) => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)

export function createVisualAiController(deps: {
  host: Pick<ActiveLibraryHost, 'readVisualSession'|'readVisualPreview'|'saveTagIntent'|'claimTagExecution'|'markTagExecutionSent'|'finishTagExecution'|'commitTagExecution'|'inspect' | 'readAssetContext' | 'readPreview' | 'enableVisualAi' | 'saveVisualAiEvidence' | 'listVisualAiEvidence' | 'confirmVisualAiTag'>&Partial<Pick<ActiveLibraryHost,'beginBasicRequest'|'claimBasicAnalysis'|'markBasicAnalysisSent'|'finishBasicAnalysis'|'readTagExecutionRequest'|'readTagEffectReceipt'|'readBasicAttempts'>>
  settings(): AppSettings
  onChanged(scope: VisualAiScope & { assetId: string }): void
  transport?: typeof runVisionRequest
  provider?: VisionProvider
  admission?: VisualAdmission
  clock?: VisualAiClock
}) {
  const clock = deps.clock ?? systemVisualAiClock
  const transport = deps.transport ?? ((input: Parameters<typeof runVisionRequest>[0]) => runVisionRequest(input, deps.provider))
  const admission=deps.admission??createVisualAdmission({clock}),materials=new Set<VisualMaterialLease>()
  let suspended=false
  const drainWaiters=new Set<()=>void>()
  const notifyDrain=()=>{if(running===0&&preparing.size===0){for(const resolve of drainWaiters)resolve();drainWaiters.clear()}}
  const release=(material:VisualMaterialLease)=>{material.dispose();materials.delete(material)}
  const invalidate=()=>{epoch++;for(const signal of preparationSignals.values())signal.abort();plans.clear();for(const material of materials)material.dispose();materials.clear();for(const job of jobs.values())job.abort.abort()}
  const plans = new Map<string, Plan>(); const jobs = new Map<string, Job>()
  let epoch = 0; let running = 0
  const preparationSignals=new Map<string,AbortController>()
  const preparing = new Set<string>(); const ownerEpoch = new Map<string, number>()
  const matches = (scope: VisualAiScope) => { const current = deps.host.inspect(); return current.state === 'ready' && current.identity === scope.libraryIdentity && current.generation === scope.generation }
  const requireScope = (scope: VisualAiScope) => { if (!scope || !matches(scope)) throw new Error('资料库已变化，请重新选择素材。') }
  const location=(b:AiBackendConfig)=>b.processingLocation==='external-service'?'external' as const:localEndpoint(b.baseUrl)?'local' as const:'external' as const
  const configured = (id: string) => deps.settings().aiBackends?.find(backend => backend.id === id)
  const fingerprint = (backend: AiBackendConfig) => createHash('sha256').update(JSON.stringify(backend)).digest('hex')
  const inspectJob = (owner: string, id: string) => {
    const job = jobs.get(id)
    if (!job || owner !== 'main' && job.owner !== owner) throw new Error('任务不可用。')
    requireScope(job.value)
    return job
  }
  const cancelOwner = (owner: string) => {
    ownerEpoch.set(owner, (ownerEpoch.get(owner) ?? 0) + 1);preparationSignals.get(owner)?.abort()
    for (const [key, plan] of plans) if (plan.owner === owner) {plans.delete(key);release(plan.material)}
    for(const material of materials)if(material.owner===`combined:${owner}`)release(material)
    for (const job of jobs.values()) if (job.owner === owner) job.abort.abort()
  }
  return {
    backends() { return (deps.settings().aiBackends ?? []).filter(backend => backend.enabled && backend.capabilities.vision && backendInferenceAdmission(backend).allowed).flatMap(backend => {
      try { return [{ id: backend.id, name: backend.name, defaultModel: backend.defaultModel ?? '',taskModels:Object.fromEntries(Object.entries(deps.settings().aiTaskModels??{}).filter(([,v])=>v?.backendId===backend.id).map(([k,v])=>[k,v!.model])), location:location(backend) }] } catch { return [] }
    }) },
    async prepare(owner: string, input: VisualAiPrepareRequest): Promise<VisualAiReview> {
      for (const [id, plan] of plans) if (Date.parse(plan.review.expiresAt) < clock.now() || plan.owner === owner) {plans.delete(id);release(plan.material)}
      if(suspended)throw Error('视觉服务正在切换，请稍后重试。')
      if (preparing.has(owner) || preparing.size + plans.size >= 4) throw new Error('请先完成当前的分析确认。')
      preparing.add(owner)
      const ownerVersion = ownerEpoch.get(owner) ?? 0
      const preparationAbort=new AbortController();preparationSignals.set(owner,preparationAbort)
      let material:VisualMaterialLease|undefined
      const revokeMaterial=()=>{if(material)release(material)}
      try {
      if (!input || Object.keys(input).some(key => !['libraryIdentity', 'generation', 'assetIds', 'backendId', 'model', 'purpose','refineEvidenceId'].includes(key)) || !['analyze', 'reverse'].includes(input.purpose) || !Array.isArray(input.assetIds) || !input.assetIds.length || input.assetIds.length > 8 || new Set(input.assetIds).size !== input.assetIds.length || input.assetIds.some(id => typeof id !== 'string')) throw new Error('每批请选择 1–8 个素材。')
      requireScope(input)
      const configuredBackend = configured(input.backendId)
      const backend = configuredBackend ? structuredClone(configuredBackend) : undefined
      if (!backend?.enabled || !backend.capabilities.vision) throw new Error('请先配置并启用支持图像的模型服务。')
      requireBackendInference(backend)
      requireReasoningConfiguration(backend)
      const url = new URL(backend.baseUrl)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('模型服务地址无效。')
      const model = (input.model || backend.defaultModel || '').trim()
      if (!model || model.length > 256) throw new Error('请填写服务支持的模型名称。')
      for (const [id, plan] of plans) if (Date.parse(plan.review.expiresAt) < clock.now() || plan.owner === owner) {plans.delete(id);release(plan.material)}
      if (plans.size >= 4) throw new Error('待确认操作过多，请完成或关闭其他确认。')
      let priorAnalysis:string|undefined
      if(input.refineEvidenceId){if(input.assetIds.length!==1||location(backend)!=='external')throw Error('AI_REFINEMENT_INVALID');const asset=(await deps.host.readAssetContext(input.assetIds)).assets[0],evidence=(await deps.host.listVisualAiEvidence(input.assetIds[0])).find(e=>e.id===input.refineEvidenceId);if(!asset||!evidence||evidence.assetRevision!==asset.revision||evidence.previewGeneration!==asset.thumbnailRef||(!localEndpoint(evidence.providerOrigin)||evidence.processingLocation==='external-service'))throw Error('AI_REFINEMENT_SOURCE_CHANGED');priorAnalysis=JSON.stringify({caption:evidence.output.caption,prompt:evidence.output.prompt,tags:evidence.output.tags});if(priorAnalysis.length>16000)throw Error('AI_REFINEMENT_TOO_LARGE')}
      const before = epoch; const context = await deps.host.readAssetContext(input.assetIds); const assets = context.assets; const views: Input[] = []
      if(assets.some(asset=>asset.fileType==='mp4'))throw Error('视频不参与整图分析，请在工作集中选择参考帧；首帧预览不代表整段视频。')
      const session=await deps.host.readVisualSession(input)
      preparationAbort.signal.throwIfAborted();material=admission.open(`combined:${owner}`,session,'foreground',{modelBinding:backendExecutionBinding(backend,model)});materials.add(material);preparationAbort.signal.addEventListener('abort',revokeMaterial,{once:true})
      for (const id of input.assetIds) {
        const asset = assets.find(item => item.id === id)
        if (!asset) throw new Error('所选素材已不可用。')
        await material.prepare(id,()=>deps.host.readVisualPreview({libraryIdentity:input.libraryIdentity,generation:input.generation,assetId:id,sessionToken:material!.session.sessionToken,assetRevision:asset.revision,previewGeneration:asset.thumbnailRef}),{assetRevision:asset.revision,previewGeneration:asset.thumbnailRef})
        views.push({asset,sha:material.describe(id).sha256})
      }
      requireScope(input); if (before !== epoch || ownerVersion !== (ownerEpoch.get(owner) ?? 0)) throw new Error('操作已失效。')
      const review: VisualAiReview = { receipt: randomUUID(), backendName: backend.name, providerOrigin: url.origin, model, purpose: input.purpose,
        location:location(backend), assets: views.map(view => ({ id: view.asset.id, title: view.asset.title })), inputScope: 'controlled-preview-rgb',
        inputDescription: reasoningNotice(backend.reasoning)+(priorAnalysis?'另发送用户选定的先前本机服务分析（描述/提示词/标签），其推断只供核对。 ':'')+'发送所选素材的整张受控预览：白底 RGB JPEG，最长边不超过 1024 像素。输出截断时，向同一服务和模型自动重试一次；不发送原件、路径或其他素材。文字识别请使用专用 OCR。',
        storageNotice: context.schemaVersion === 1 ? '如需新增 AI 证据表，当前库将升级到 v2，旧版应用无法打开；已有较新结构保持其版本。原件与手工内容保留，标签先作为建议。' : '分析证据保存到当前库，保持已有库版本。原件与手工内容保留，标签先作为建议。', expiresAt: new Date(material.expiresAt).toISOString() }
      plans.set(review.receipt, { owner, input: structuredClone(input), backend: structuredClone(backend), fingerprint: fingerprint(backend), review, views, material,priorAnalysis })
      return review
      } catch(error){if(material)release(material);throw error} finally {preparationAbort.signal.removeEventListener('abort',revokeMaterial);preparationSignals.delete(owner);preparing.delete(owner);notifyDrain() }
    },
    async run(owner: string, receipt: string): Promise<VisualAiJob> {
      if(suspended)throw Error('视觉服务正在切换，请稍后重试。')
      const plan = plans.get(receipt)
      if (!plan || plan.owner !== owner || Date.parse(plan.review.expiresAt) < clock.now()) throw new Error('确认已过期，请重新检查本次操作。')
      requireScope(plan.input)
      const backend = configured(plan.backend.id)
      if (!backend || fingerprint(backend) !== plan.fingerprint) throw new Error('模型服务配置已变化，请重新确认。')
      if (running >= 2) throw new Error('已有两个分析批次运行，请稍后重试。')
      const before = epoch; const ownerVersion = ownerEpoch.get(owner) ?? 0
      plan.material.consume();plans.delete(receipt); running++
      try {
        await deps.host.enableVisualAi()
        requireScope(plan.input)
        if (epoch !== before || ownerVersion !== (ownerEpoch.get(owner) ?? 0)) throw new Error('资料库已变化。')
        const context=await deps.host.readAssetContext(plan.views.map(v=>v.asset.id))
        if(context.schemaVersion>=10)for(const view of plan.views){
          const requestId=randomUUID();view.requestId=requestId
          await deps.host.saveTagIntent({libraryIdentity:plan.input.libraryIdentity,generation:plan.input.generation,assetId:view.asset.id,sessionToken:plan.material.session.sessionToken,expectedSchemaVersion:context.schemaVersion,allowUpgrade:false,requestId,assetRevision:view.asset.revision,previewGeneration:view.asset.thumbnailRef,backendId:plan.backend.id,model:plan.review.model,backendBindingSha256:backendExecutionBinding(plan.backend,plan.review.model),recipeId:'visual-ai-v1',recipeVersion:'1'})
          view.claim=await deps.host.claimTagExecution({libraryIdentity:plan.input.libraryIdentity,generation:plan.input.generation,assetId:view.asset.id,sessionToken:plan.material.session.sessionToken,requestId,inputSha256:view.sha,origin:'combined'})
          if(context.schemaVersion>=14){const r:BasicRequest={...plan.input,assetId:view.asset.id,sessionToken:plan.material.session.sessionToken,requestId:'caption:'+requestId,capability:'caption',assetRevision:view.asset.revision,previewGeneration:view.asset.thumbnailRef,backendId:plan.backend.id,model:plan.review.model,bindingSha256:backendExecutionBinding(plan.backend,plan.review.model),recipe:'visual-ai-v1',location:location(plan.backend),...(plan.backend.reasoning!==undefined?{reasoning:plan.backend.reasoning}:{})};await deps.host.beginBasicRequest!(r);view.captionClaim=await deps.host.claimBasicAnalysis!({...r,inputSha256:view.sha})}
        }
        if(epoch!==before||ownerVersion!==(ownerEpoch.get(owner)??0))throw Error('资料库已变化。')
      } catch (error) { for(const view of plan.views)await finishClaim(plan,view,'cancelled');running--;release(plan.material);plan.views = [];notifyDrain();throw error }
      const value: VisualAiJob = { id: randomUUID(), libraryIdentity: plan.input.libraryIdentity, generation: plan.input.generation, state: 'queued', items: plan.views.map(view => ({ assetId: view.asset.id, state: 'queued' })) }
      const job = { owner, value, abort: new AbortController() }; jobs.set(value.id, job)
      void execute(plan, job).finally(() => { running--; release(plan.material);plan.views = [];notifyDrain() })
      return structuredClone(value)
    },
    discardReview(owner:string,receipt:string){const p=plans.get(receipt);if(!p)return;if(p.owner!==owner)throw Error('确认不属于当前窗口。');plans.delete(receipt);release(p.material)},
    inspect(owner: string, id: string) { return structuredClone(inspectJob(owner, id).value) },
    cancel(owner: string, id: string) { const job = inspectJob(owner, id); job.abort.abort(); return structuredClone(job.value) },
    async results(scope: VisualAiScope & { assetId: string }) { requireScope(scope); return deps.host.listVisualAiEvidence(scope.assetId) },
    async confirmTag(scope: VisualAiScope & { assetId: string; evidenceId: string; tag: string }) { requireScope(scope); await deps.host.confirmVisualAiTag(scope.assetId, scope.evidenceId, scope.tag); try { deps.onChanged(scope) } catch { /* The confirmed tag is already committed. */ } },
    cancelOwner,
    invalidate,
    async suspendAndDrain(){suspended=true;invalidate();if(running||preparing.size)await new Promise<void>(resolve=>drainWaiters.add(resolve))},
    resume(){suspended=false;admission.resume()}
  }
  function claimScope(plan:Plan,view:Input){return{libraryIdentity:plan.input.libraryIdentity,generation:plan.input.generation,assetId:view.asset.id,sessionToken:plan.material.session.sessionToken,requestId:view.requestId!}}
  async function finishClaim(plan:Plan,view:Input,state:'failed'|'cancelled'|'outcome-unknown'){
    if(view.captionClaim)try{await deps.host.finishBasicAnalysis!(view.captionClaim,state==='outcome-unknown'?'unknown':state)}catch{}
    if(!view.claim)return
    try{await deps.host.finishTagExecution({...claimScope(plan,view),attemptToken:view.claim.attemptToken,state,errorCode:'VISUAL_ATTEMPT_INTERRUPTED'})}catch{/* A closing Host cannot accept new records; reopen reconciles its durable attempt. */}
  }
  async function execute(plan: Plan, job: Job) {
    job.value.state = 'running'
    try {
      for (const [index, view] of plan.views.entries()) {
        const item = job.value.items[index]
        if (job.abort.signal.aborted || !matches(plan.input)) { item.state = 'cancelled';await finishClaim(plan,view,'cancelled');continue }
        item.state = 'running'
        let sent=false,completedResponse=false,usage:AiExecutionUsage|undefined
        const requestAbort = new AbortController()
        const abort = () => requestAbort.abort()
        job.abort.signal.addEventListener('abort', abort, { once: true })
        const timeoutMs = Number.isFinite(plan.backend.timeoutMs) ? plan.backend.timeoutMs : 120_000
        const cancelTimeout = clock.scheduleTimeout(abort, Math.min(Math.max(timeoutMs, 1000), 120_000))
        try {
          const current = (await deps.host.readAssetContext([view.asset.id])).assets.find(asset => asset.id === view.asset.id)
          if (!current || current.revision !== view.asset.revision || current.thumbnailRef !== view.asset.thumbnailRef || job.abort.signal.aborted) throw new Error('AI_SOURCE_CHANGED')
          await deps.provider?.prepare?.(plan.backend.id,requestAbort.signal)
          const output = await plan.material.withRequest(view.asset.id,'combined',requestAbort.signal,async(jpeg,signal)=>{
            if(view.captionClaim)await deps.host.markBasicAnalysisSent!(view.captionClaim)
            if(view.claim)await deps.host.markTagExecutionSent({...claimScope(plan,view),attemptToken:view.claim.attemptToken})
            signal.throwIfAborted()
            sent=true
            return transport({backend:plan.backend,model:plan.review.model,purpose:plan.input.purpose,priorAnalysis:plan.priorAnalysis,onUsage:value=>{usage=value},jpeg,signal,
              operationId:view.claim?.attemptId??view.captionClaim?.attemptId,
              mayRecover:async()=>{signal.throwIfAborted();if(suspended||!matches(plan.input)||!view.claim||!deps.host.readTagExecutionRequest||!deps.host.readTagEffectReceipt)return false
                const scope=claimScope(plan,view),session=await deps.host.readVisualSession(plan.input),request=await deps.host.readTagExecutionRequest(scope,view.requestId!),effect=await deps.host.readTagEffectReceipt(scope)
                if(session.sessionToken!==plan.material.session.sessionToken||!request.sourceMatches||request.state!=='running'||request.requestGeneration!==view.claim.requestGeneration||effect.receipt)return false
                if(view.captionClaim){if(!deps.host.readBasicAttempts)return false;const attempts=await deps.host.readBasicAttempts({...plan.input,assetId:view.asset.id}),attempt=attempts.items.find(v=>v.attemptId===view.captionClaim!.attemptId)
                  if(attempts.sessionToken!==view.captionClaim.sessionToken||!attempt?.sourceMatches||attempt.hasReceipt||attempt.state!=='sent')return false}
                return true}})
          },plan.backend.transport==='pi'?VISUAL_ADMISSION_PROFILE.piWorkerBytes:0,plan.backend.runtimeFingerprint?1024**3:0)
          completedResponse=true
          if (job.abort.signal.aborted || !matches(plan.input)) { item.state = 'cancelled';await finishClaim(plan,view,'cancelled');continue }
          if (requestAbort.signal.aborted) throw new Error('AI_TIMEOUT')
          const evidence: VisualAiEvidence = { ...(usage?{usage}:{}),...(plan.backend.reasoning!==undefined?{reasoning:plan.backend.reasoning}:{}),id: randomUUID(), assetId: view.asset.id, assetRevision: view.asset.revision, previewGeneration: view.asset.thumbnailRef, inputSha256: view.sha,
            upstreamEvidenceId:plan.input.refineEvidenceId,processingLocation:location(plan.backend)==='local'?'local-service':'external-service',backendId: plan.backend.id, providerOrigin: plan.review.providerOrigin, model: plan.review.model, purpose: plan.input.purpose, inputScope: 'controlled-preview-rgb', recipe: 'visual-ai-v1', createdAt: new Date(clock.now()).toISOString(), output }
          if(view.claim)await deps.host.commitTagExecution({...claimScope(plan,view),attemptToken:view.claim.attemptToken,tags:output.tags,combinedEvidence:evidence,captionClaim:view.captionClaim},job.abort.signal)
          else await deps.host.saveVisualAiEvidence(evidence, job.abort.signal)
          item.state = 'completed'; item.evidence = evidence; try { deps.onChanged({ libraryIdentity: plan.input.libraryIdentity, generation: plan.input.generation, assetId: view.asset.id }) } catch { /* Evidence is already committed. */ }
        } catch (error) {
          item.state = job.abort.signal.aborted || !matches(plan.input) ? 'cancelled' : 'failed'
          const code=error instanceof Error?error.message:''
          const unknown=sent&&!completedResponse&&!(error instanceof ConfirmedLocalOomError)&&(requestAbort.signal.aborted||!(code.startsWith('AI_RESPONSE_')||code.startsWith('AI_HTTP_')))
          await finishClaim(plan,view,unknown?'outcome-unknown':item.state==='cancelled'?'cancelled':'failed')
          item.error = item.state === 'failed' ? visionFailureMessage(requestAbort.signal.aborted ? new Error('AI_TIMEOUT') : error) : undefined
          if(view.claim&&unknown)item.error=(item.error?item.error+' ':'')+'请求可能已在服务端执行，远端结果尚不确定；不会自动重发。'
        } finally { cancelTimeout(); job.abort.signal.removeEventListener('abort', abort) }
      }
    } catch {
      for (const item of job.value.items) if (['queued', 'running'].includes(item.state)) {
        item.state = job.abort.signal.aborted ? 'cancelled' : 'failed'
        item.error = item.state === 'failed' ? '任务意外中断，请重试。' : undefined
      }
    } finally {
      const done = job.value.items.filter(item => item.state === 'completed').length
      job.value.state = done === job.value.items.length ? 'completed' : done ? 'partial' : job.abort.signal.aborted ? 'cancelled' : 'failed'
      if (jobs.size > 100) for (const [id, record] of jobs) { if (jobs.size <= 100) break; if (!['running', 'queued'].includes(record.value.state) && record !== job) jobs.delete(id) }
    }
  }
}

/** Never expose service response bodies, credentials, image content or local paths. */
function visionFailureMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : ''
  if (code === 'AI_RESPONSE_TRUNCATED') return '模型输出达到长度上限，自动重试后仍未完整生成；本次结果未保存。请检查服务的上下文容量或选择更适合的模型。'
  if (code === 'AI_TIMEOUT') return '分析超过本次等待时间，结果未保存；请检查本地模型速度或服务超时设置。'
  if (code === 'AI_HTTP_401' || code === 'AI_HTTP_403') return '模型服务拒绝访问；请检查 API 密钥或服务权限。本次结果未保存。'
  if (code === 'AI_HTTP_404') return '模型服务地址或模型不存在；请检查兼容接口地址与模型名称。本次结果未保存。'
  if (code === 'AI_HTTP_400' || code === 'AI_HTTP_413' || code === 'AI_HTTP_422') return '模型服务拒绝本次请求；请检查图像能力、上下文容量与请求参数。本次结果未保存。'
  if (code === 'AI_HTTP_429') return '模型服务繁忙或已达到调用限额，请稍后重试。本次结果未保存。'
  if (code === 'AI_RESPONSE_INVALID' || code === 'AI_RESPONSE_EMPTY') return '模型未返回完整有效的分析结构，本次结果未保存；请检查模型的图像与 JSON 输出能力。'
  if (code === 'AI_RESPONSE_TOO_LARGE') return '模型返回内容过大，本次结果未保存；请使用能遵循简短输出要求的模型。'
  if (code === 'AI_SOURCE_CHANGED') return '素材版本已变化，本次结果未保存；请重新选择素材。'
  return '分析未完成，请检查服务、模型图像能力或素材版本后重试。'
}
