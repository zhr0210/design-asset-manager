import {publicBackend} from '../ai-credentials/public-settings'
import {requireReasoningConfiguration} from '../../shared/workflows/ai-reasoning.workflow'
import { isDeepStrictEqual } from 'node:util'
import type {AiConnectionService} from '../ai-gateway/ai-connection-service'
import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context'
import {
  CHANNEL_AI_BACKEND_DELETE,
  CHANNEL_AI_BACKEND_HEALTH_CHECK,
  CHANNEL_AI_BACKEND_LIST,
  CHANNEL_AI_BACKEND_LIST_MODELS,
  CHANNEL_AI_BACKEND_SAVE
} from '../../shared/contracts/ai-backend.contract'
import type { AiBackendActionRequest, AiBackendDeleteRequest, AiBackendSaveRequest } from '../../shared/contracts/ai-backend.contract'
import { ModelServiceProbe } from '../services/ai-backends/model-service-probe'
import { AiBackendSettingsService } from '../services/ai-backends/ai-backend-settings.service'
import type { SettingsServicePort } from './settings.ipc'
import type { MainIpcHandleRegistrar } from './ipc-registrar'
import type { AiBackendConfig } from '../../shared/types/ai-backend.types'

export function registerAiBackendIpc(dependencies: {
  connections?:AiConnectionService
  onChanged?():void
  settings: SettingsServicePort
  handle: MainIpcHandleRegistrar
  isTrustedSender(event: IpcMainInvokeEvent): boolean
  health?: Pick<ModelServiceProbe, 'healthCheck' | 'listModels'>
}) {
  const settingsService = new AiBackendSettingsService(dependencies.settings)
  const healthService = dependencies.health ?? new ModelServiceProbe()
  let writes: Promise<unknown> = Promise.resolve()
  const handle: MainIpcHandleRegistrar = (channel, handler) => dependencies.handle(channel, (event, ...args) => {
    if (!dependencies.isTrustedSender(event)) throw new Error('UNTRUSTED_SENDER')
    if (channel === CHANNEL_AI_BACKEND_SAVE || channel === CHANNEL_AI_BACKEND_DELETE) {
      const task = writes.then(() => handler(event, ...args)); writes = task.catch(() => {})
      return task
    }
    return handler(event, ...args)
  })

  handle(CHANNEL_AI_BACKEND_LIST, async () => {
    return settingsService.listBackends().map(publicBackend)
  })

  const checkExpected = (id: string, expected?: AiBackendConfig | null) => {
    const current = settingsService.getBackend(id)
    if (expected !== undefined && !isDeepStrictEqual(current ? publicBackend(current) : null, expected)) throw Error('BACKEND_CONFLICT: 连接已在另一界面变化，输入仍保留。请重新核对。')
  }
  handle(CHANNEL_AI_BACKEND_SAVE, async (_, config: AiBackendSaveRequest, expected?: AiBackendConfig | null) => {
    if(config?.id==='dam-local-qwen-cpu'||config?.runtimeFingerprint)throw Error('请在本地模型页面管理 DAM 托管模型。')
    checkExpected(requireId(config?.id), expected)
    const list=settingsService.saveBackend(requireBackend(config)).map(publicBackend);dependencies.onChanged?.();return list
  })

  handle(CHANNEL_AI_BACKEND_DELETE, async (_, request: AiBackendDeleteRequest, expected?: AiBackendConfig | null) => {
    if(request?.id==='dam-local-qwen-cpu')throw Error('请在本地模型页面停用 DAM 托管模型。')
    const id=requireId(request?.id);checkExpected(id, expected);await dependencies.connections?.clear(id);const list = settingsService.deleteBackend(id).map(publicBackend);dependencies.onChanged?.();return list
  })

  handle(CHANNEL_AI_BACKEND_HEALTH_CHECK, async (_, request: AiBackendActionRequest) => {
    requireId(request?.backendId)
    const config = request.config ? requireBackend(request.config) : settingsService.getBackend(request.backendId)
    if (!config) {
      return {
        success: false,
        backendId: request.backendId,
        backendType: 'custom',
        error: {
          code: 'BACKEND_NOT_CONFIGURED',
          message: '未找到外部 AI 后端配置。'
        }
      }
    }

    if(dependencies.connections&&config.transport==='pi'){if(config.providerKind&&config.providerKind!=='openai-compatible')return{success:false,backendId:config.id,backendType:config.type,error:{code:'STATIC_CATALOG_ONLY',message:'可读取内置模型目录；账号与实际服务连接仍需单独验证。'}};try{const models=await dependencies.connections.models(config,AbortSignal.timeout(config.timeoutMs));return{success:true,backendId:config.id,backendType:config.type,models:models.map(m=>m.id)}}catch{return{success:false,backendId:config.id,backendType:config.type,error:{code:'MODEL_CATALOG_UNAVAILABLE',message:'目录暂不可用；仍可填写模型 ID 后单独验证推理。'}}}}
    return dependencies.connections?dependencies.connections.legacyProbe(config,(saved,signal)=>healthService.healthCheck(saved,signal)):healthService.healthCheck(requireBackend(config))
  })

  handle(CHANNEL_AI_BACKEND_LIST_MODELS, async (_, request: AiBackendActionRequest) => {
    requireId(request?.backendId)
    const config = request.config ? requireBackend(request.config) : settingsService.getBackend(request.backendId)
    if (!config) {
      return {
        success: false,
        backendId: request.backendId,
        models: [],
        error: {
          code: 'BACKEND_NOT_CONFIGURED',
          message: '未找到外部 AI 后端配置。'
        }
      }
    }

    if(dependencies.connections&&config.transport==='pi'){try{return{success:true,backendId:config.id,models:await dependencies.connections.models(config,AbortSignal.timeout(config.timeoutMs))}}catch{return{success:false,backendId:config.id,models:[],error:{code:'MODEL_CATALOG_UNAVAILABLE',message:'目录暂不可用，可手动填写模型 ID。'}}}}
    return dependencies.connections?dependencies.connections.legacyProbe(config,(saved,signal)=>healthService.listModels(saved,signal)):healthService.listModels(requireBackend(config))
  })
}

function requireId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(value)) throw new Error('INVALID_BACKEND_REQUEST')
  return value
}

function requireBackend(input: unknown): AiBackendConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_BACKEND_REQUEST')
  const value = input as AiBackendConfig
  if(Object.keys(value).some(key=>!['id','name','type','enabled','baseUrl','apiKey','defaultModel','reasoning','timeoutMs','capabilities','priority','notes','modelValidation','processingLocation','transport','providerKind','authMode','credentialRef','credentialRevision'].includes(key)))throw Error('INVALID_BACKEND_REQUEST')
  requireId(value.id)
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 256 ||
    !['native-python', 'openai-compatible', 'llama-openai', 'lm-studio', 'ollama', 'custom'].includes(value.type) ||
    typeof value.enabled !== 'boolean' || !Number.isFinite(value.timeoutMs) || value.timeoutMs <= 0 || value.timeoutMs > 3600000 ||
    !Number.isFinite(value.priority) || typeof value.baseUrl !== 'string' || value.baseUrl.length > 4096 ||
    [value.apiKey, value.defaultModel, value.notes].some(field => field !== undefined && (typeof field !== 'string' || field.length > 65536)) ||
    !value.capabilities || ['chat', 'vision', 'embeddings', 'jsonOutput', 'modelList', 'modelManagement'].some(key => typeof value.capabilities[key as keyof AiBackendConfig['capabilities']] !== 'boolean')) throw new Error('INVALID_BACKEND_REQUEST')
  let url: URL
  try { url = new URL(value.baseUrl) } catch { throw new Error('INVALID_BACKEND_URL') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('INVALID_BACKEND_URL')
  if(value.processingLocation!==undefined&&!['local-service','external-service'].includes(value.processingLocation))throw Error('INVALID_BACKEND_REQUEST')
  if(value.transport!==undefined&&!['pi','legacy'].includes(value.transport)||value.providerKind!==undefined&&!['openai-compatible','openai','anthropic','google','openai-codex','github-copilot'].includes(value.providerKind)||value.authMode!==undefined&&!['none','api-key','oauth'].includes(value.authMode))throw Error('INVALID_BACKEND_REQUEST')
  requireReasoningConfiguration(value)
  return { ...value, capabilities: { ...value.capabilities } }
}
