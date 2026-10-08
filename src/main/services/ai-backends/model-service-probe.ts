import type { AiBackendConfig, AiBackendHealthResult, AiModelListResult } from '../../../shared/types/ai-backend.types'

/** Configuration probes have no filesystem, process, inference or database dependency. */
export class ModelServiceProbe {
  async listModels(config: AiBackendConfig, signal?:AbortSignal): Promise<AiModelListResult> {
    const failure = (code: string, message: string, statusCode?: number): AiModelListResult => ({ success: false, backendId: config.id, models: [], error: { code, message, ...(statusCode ? { statusCode } : {}) } })
    if (!config.enabled) return failure('BACKEND_DISABLED', '该服务尚未启用。')
    const url = new URL(config.baseUrl)
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/models`
    try {
      const response = await fetch(url, {
        method: 'GET', redirect: 'error', signal: signal?AbortSignal.any([signal,AbortSignal.timeout(config.timeoutMs)]):AbortSignal.timeout(config.timeoutMs),
        headers: { Accept: 'application/json', ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}) }
      })
      if (!response.ok) { await response.body?.cancel(); return failure('BACKEND_MODEL_LIST_FAILED', '读取模型列表失败。', response.status) }
      let payload: unknown
      try { payload = await response.json() } catch { return failure('BACKEND_MODEL_LIST_INVALID', '服务没有返回有效的 JSON 模型列表。') }
      if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) return failure('BACKEND_MODEL_LIST_INVALID', '服务没有返回兼容的模型列表。')
      const models = payload.data.flatMap((item: unknown) => {
        if (!item || typeof item !== 'object' || !('id' in item) || typeof item.id !== 'string' || !item.id) return []
        return [{ id: item.id, ...('name' in item && typeof item.name === 'string' ? { name: item.name } : {}) }]
      })
      return { success: true, backendId: config.id, models }
    } catch { return failure('BACKEND_UNREACHABLE', '无法连接模型服务，请检查地址、服务状态与超时设置。') }
  }

  async healthCheck(config: AiBackendConfig, signal?:AbortSignal): Promise<AiBackendHealthResult> {
    const start = Date.now()
    const result = await this.listModels(config,signal)
    return {
      success: result.success, backendId: config.id, backendType: config.type, latencyMs: Date.now() - start,
      ...(result.success ? { models: result.models.map(model => model.id) } : { error: result.error })
    }
  }
}
