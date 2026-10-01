import {backendExecutionBinding,backendLocation} from '../ai-gateway/backend-binding'
import { createHash, randomUUID } from 'node:crypto'
import type { ActiveLibraryHost } from '../../shared/contracts/active-library.contract'
import type { AppSettings } from '../../shared/types/settings.types'
import type { AiBackendConfig } from '../../shared/types/ai-backend.types'
import type { TagIntentPrepare, TagIntentReview, TagIntentCommit, TagIntentScope } from '../../shared/contracts/independent-tag-intent.contract'
import { tagIntentId } from './tag-intent-storage'

const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
type Plan = { owner: string; expires: number; input: TagIntentCommit; fingerprint: string }
export function tagIntentMessage(error: unknown): string {
  const code=error instanceof Error ? error.message : ''
  const messages: Record<string,string> = {
    TAG_INTENT_REQUEST_CONFLICT:'同一请求的内容已变化，请重新检查。',
    TAG_INTENT_UPGRADE_REQUIRED:'请先确认任务存储升级。',
    TAG_INTENT_REVIEW_STALE:'资料库结构已变化，请重新确认。',
    TAG_INTENT_SESSION_EXPIRED:'确认已失效，请重新选择素材。',
    TAG_INTENT_SCOPE_EXPIRED:'资料库已变化，请重新选择素材。',
    TAG_INTENT_SOURCE_CHANGED:'素材或资料库已变化，本次未新增任务。',
    TAG_INTENT_SPACE_REQUIRED:'备份和升级所需空间不足，本次未新增任务。',
    TAG_INTENT_BACKUP_UNSUPPORTED:'当前存储环境不支持已验证的备份流程，任务未保存。',
    TAG_INTENT_ACK_UNCERTAIN:'任务保存结果需要核对，请重新读取已保存任务。',
    TAG_INTENT_SETTINGS_RESTORE_FAILED:'资料库需要恢复检查，请保留现有内容。'
  }
  return messages[code] ?? '标签任务未保存，请检查素材、模型配置和资料库状态。'
}
export function createTagIntentController(deps: {
  host: Pick<ActiveLibraryHost,'readTagIntentContext'|'readTagIntents'|'saveTagIntent'>
  settings(): AppSettings
  changed(scope: TagIntentScope): void
  now?: () => number
}) {
  const plans=new Map<string,Plan>(),active=new Map<string,{ owner:string; abort:AbortController }>()
  const preparing=new Set<string>(),ownerEpoch=new Map<string,number>()
  let epoch=0
  const now=deps.now ?? Date.now
  const backend=(id:string):AiBackendConfig => {
    const b=deps.settings().aiBackends?.find(b=>b.id===id)
    if (!b?.enabled || !b.capabilities.vision) throw Error('TAG_INTENT_BACKEND_UNAVAILABLE')
    const u=new URL(b.baseUrl)
    if (!['http:','https:'].includes(u.protocol) || u.username || u.password || u.hash) throw Error('TAG_INTENT_BACKEND_UNAVAILABLE')
    return structuredClone(b)
  }
  return {
    async prepare(owner:string,input:TagIntentPrepare):Promise<TagIntentReview> {
      if (!input || Object.keys(input).some(k=>!['libraryIdentity','generation','assetId','requestId','backendId','model'].includes(k))) throw Error('TAG_INTENT_INPUT_INVALID')
      tagIntentId(input.requestId);tagIntentId(input.backendId);tagIntentId(input.assetId)
      for (const [id,p] of plans) if (p.owner===owner || p.expires<now()) plans.delete(id)
      if (preparing.has(owner) || plans.size+preparing.size>=4) throw Error('TAG_INTENT_BUSY')
      preparing.add(owner)
      const ownerVersion=ownerEpoch.get(owner)??0
      try {
      const version=epoch,b=backend(input.backendId),model=(input.model ?? b.defaultModel ?? '').trim()
      if (!model || model.length>256 || /[\x00-\x1f]/.test(model)) throw Error('TAG_INTENT_INPUT_INVALID')
      const context=await deps.host.readTagIntentContext(input)
      if (version!==epoch || ownerVersion!==(ownerEpoch.get(owner)??0)) throw Error('TAG_INTENT_SESSION_EXPIRED')
      const receipt=randomUUID(),expires=now()+300000
      plans.set(receipt,{ owner,expires,fingerprint:fingerprint(b),input:{
        libraryIdentity:input.libraryIdentity,generation:input.generation,assetId:input.assetId,requestId:input.requestId,
        sessionToken:context.sessionToken,expectedSchemaVersion:context.schemaVersion,allowUpgrade:true,
        assetRevision:context.asset.revision,previewGeneration:context.asset.previewGeneration,
        backendId:b.id,model,backendBindingSha256:backendExecutionBinding(b,model),
        recipeId:'independent-tags-v1',recipeVersion:'1'
      } })
      return { receipt,requestId:input.requestId,model,backendName:b.name,requiresUpgrade:context.schemaVersion<9,
        storageNotice:context.schemaVersion<9 ? '确认后先备份当前数据库，再启用 v9 任务存储；旧版应用将无法打开。此步骤只保存标签任务，尚不执行推理。' : '任务保存到当前资料库；此步骤尚不执行标签推理。',expiresAt:new Date(expires).toISOString() }
      } finally { preparing.delete(owner) }
    },
    async confirm(owner:string,receipt:string) {
      const p=plans.get(receipt)
      if (!p || p.owner!==owner || p.expires<now()) throw Error('TAG_INTENT_SESSION_EXPIRED')
      if (fingerprint(backend(p.input.backendId))!==p.fingerprint) throw Error('TAG_INTENT_REVIEW_STALE')
      plans.delete(receipt)
      const abort=new AbortController();active.set(receipt,{owner,abort})
      try {
        const saved=await deps.host.saveTagIntent(p.input,abort.signal)
        try { deps.changed(p.input) } catch { /* Persistent intent is already committed. */ }
        return saved
      } finally { active.delete(receipt) }
    },
    read:(scope:TagIntentScope)=>deps.host.readTagIntents(scope),
    cancelOwner(owner:string) { ownerEpoch.set(owner,(ownerEpoch.get(owner)??0)+1);for(const [id,p] of plans)if(p.owner===owner)plans.delete(id);for(const p of active.values())if(p.owner===owner)p.abort.abort() },
    invalidate() { epoch++;plans.clear();for(const p of active.values())p.abort.abort() }
  }
}
