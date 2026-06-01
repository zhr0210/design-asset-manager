import type { AppSettings } from '../../../shared/types/settings.types'
import type { AiBackendConfig, PromptReverseBackendMode } from '../../../shared/types/ai-backend.types'

export type PromptReverseRoute =
  | { mode: 'native-qwen3vl'; backend: null }
  | { mode: 'llama-openai' | 'openai-compatible'; backend: AiBackendConfig | null }

export function resolvePromptReverseRoute(settings: Pick<AppSettings, 'aiBackends' | 'promptReverseSettings'>): PromptReverseRoute {
  const mode = settings.promptReverseSettings?.backendMode ?? 'native-qwen3vl'
  if (mode === 'native-qwen3vl') {
    return { mode, backend: null }
  }

  const backend = resolveExternalBackend(settings.aiBackends ?? [], mode, settings.promptReverseSettings?.selectedExternalBackendId)
  return { mode, backend }
}

export function resolveExternalBackend(
  backends: AiBackendConfig[],
  backendMode: Exclude<PromptReverseBackendMode, 'native-qwen3vl'>,
  selectedBackendId?: string
): AiBackendConfig | null {
  const selected = selectedBackendId
    ? backends.find((backend) => backend.id === selectedBackendId)
    : backends.find((backend) => backend.type === backendMode)

  if (!selected) return null
  return { ...selected, type: backendMode === 'llama-openai' ? 'llama-openai' : selected.type }
}

