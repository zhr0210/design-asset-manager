import type { ModelRecommendationPreference, GgufLoadMode } from './local-ai-resources.contract'
export type ManagedVisionModelId = 'qwen3-vl-2b-instruct' | 'qwen3-vl-4b-instruct' | 'qwen3-vl-8b-instruct'
export type ModelOwnership = 'reference' | 'managed-copy' | 'managed-download'
export interface ManagedModelSummary {
  id: string
  model: string
  modelId: ManagedVisionModelId
  format: 'transformers' | 'gguf'
  bytes: number
  fingerprint: string
  ownership: ModelOwnership
  source: 'user-import' | 'huggingface-upstream'
  revision: string | null
  license: string
  trust: 'accepted' | 'revoked'
  sourceBlock: string | null
  qualifiedAt: string | null
  active: boolean
  retired: boolean
  sourceFreshness: {
    kind: 'fresh' | 'stale' | 'unknown' | 'not-applicable'
    checkedAt: number | null
    error: string | null
  }
}
export interface ModelAcquisitionReview {
  review: string
  model: string
  ownership: ModelOwnership
  source: 'user-import' | 'huggingface-upstream'
  repository: string | null
  revision: string | null
  license: string
  bytes: number
  additionalBytes: number
  freeDiskBytes: number
  loadRamBytes: number
  notice: string
}
export interface ModelAcquisitionTask {
  id: string
  model: string
  kind: 'copy' | 'download'
  state: 'running' | 'paused' | 'interrupted' | 'failed' | 'complete' | 'abandoned'
  completedBytes: number
  totalBytes: number
  error: string | null
  modelEntryId: string | null
}
export interface ManagedModelLibrarySummary {
  models: ManagedModelSummary[]
  tasks: ModelAcquisitionTask[]
  catalog: Array<{
    id: ManagedVisionModelId
    model: string
    repository: string
    revision: string
    license: string
    bytes: number
    loadRamBytes: number
    installed: boolean
  }>
  discovery: HuggingFaceDiscoveryEntry[]
  catalogRefreshing: boolean
  catalogCheckedAt: string | null
  catalogError: string | null
  sourceNotice: string
}
export interface HuggingFaceDiscoveryEntry {
  catalogProvider?: 'modelscope-cn'
  id: string
  model: string
  family: string
  repository: string
  sourceKind: 'official' | 'community'
  revision: string | null
  license: string | null
  bytes: number | null
  support: 'managed-vision' | 'catalog-only'
  supportNotice: string
  state: 'available' | 'restricted' | 'unavailable'
  error: string | null
  checkedAt: string
  files: Array<{ name: string; bytes: number; sha256: string | null; downloadUrl: string | null }>
  bundles: HuggingFaceModelBundle[]
}
export interface HuggingFaceModelBundle {
  catalogProvider?: 'modelscope-cn'
  id: string
  repository: string
  revision: string
  size: string
  variant: 'Instruct' | 'Thinking'
  languageQuantization: string
  projectorQuantization: string
  bytes: number
  files: Array<{ name: string; bytes: number; sha256: string; downloadUrl: string | null }>
  support: 'catalog-only' | 'managed-gguf'
}
export type ManagedModelAction =
  | { kind: 'cancel-preparation' }
  | { kind: 'refresh-catalog' }
  | { kind: 'auto-select'; preference: 'efficient' | 'quality' }
  | { kind: 'review-import'; ownership: 'reference' | 'managed-copy' }
  | { kind: 'review-install'; modelId: ManagedVisionModelId }
  | { kind: 'review-gguf-install'; bundleId: string }
  | { kind: 'review-gguf-import'; bundleId: string; ownership: 'reference' | 'managed-copy' }
  | { kind: 'recommend-gguf'; preference: ModelRecommendationPreference }
  | { kind: 'activate-gguf'; modelEntryId: string; mode: GgufLoadMode; deviceId?: string }
  | { kind: 'confirm'; review: string; decision: 'import-reviewed-model' }
  | { kind: 'discard-review'; review: string }
  | { kind: 'pause' | 'resume' | 'abandon'; taskId: string }
  | { kind: 'activate' | 'revoke' | 'retire' | 'restore' | 'refresh-source'; modelEntryId: string }

/** Exact Main boundary; paths and caller-reported verification are never accepted. */
export function parseManagedModelAction(value: unknown): ManagedModelAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('MODEL_ACTION_INVALID')
  const record = value as Record<string, unknown>, keys = Object.keys(record).sort().join(',')
  if (record.kind === 'cancel-preparation' && keys === 'kind') return { kind: record.kind }
  if (record.kind === 'refresh-catalog' && keys === 'kind') return { kind: record.kind }
  if (record.kind === 'recommend-gguf' && keys === 'kind,preference' &&
    (record.preference === 'balanced' || record.preference === 'efficient' || record.preference === 'quality'))
    return { kind: record.kind, preference: record.preference }
  if (record.kind === 'activate-gguf' && (keys === 'kind,mode,modelEntryId' || keys === 'deviceId,kind,mode,modelEntryId') &&
    typeof record.modelEntryId === 'string' && /^model-entry:[a-f0-9-]{36}$/.test(record.modelEntryId) &&
    (record.mode === 'cpu' || record.mode === 'gpu' || record.mode === 'hybrid') &&
    (record.deviceId === undefined || typeof record.deviceId === 'string' && /^\d{1,2}:GPU-[a-f0-9-]{36}$/i.test(record.deviceId)))
    return { kind: record.kind, modelEntryId: record.modelEntryId, mode: record.mode,
      ...(record.deviceId === undefined ? {} : { deviceId: record.deviceId }) }
  if (record.kind === 'auto-select' && keys === 'kind,preference' && (record.preference === 'efficient' || record.preference === 'quality'))
    return { kind: record.kind, preference: record.preference }
  if (record.kind === 'review-import' && keys === 'kind,ownership' && ['reference', 'managed-copy'].includes(String(record.ownership)))
    return { kind: record.kind, ownership: record.ownership as 'reference' | 'managed-copy' }
  if (record.kind === 'review-install' && keys === 'kind,modelId' && ['qwen3-vl-2b-instruct', 'qwen3-vl-4b-instruct'].includes(String(record.modelId)))
    return { kind: record.kind, modelId: record.modelId as ManagedVisionModelId }
  if (typeof record.bundleId === 'string' && /^hf-bundle:[a-f0-9]{64}$/.test(record.bundleId)) {
    if (record.kind === 'review-gguf-install' && keys === 'bundleId,kind') return { kind: record.kind, bundleId: record.bundleId }
    if (record.kind === 'review-gguf-import' && keys === 'bundleId,kind,ownership' &&
      (record.ownership === 'reference' || record.ownership === 'managed-copy'))
      return { kind: record.kind, bundleId: record.bundleId, ownership: record.ownership }
  }
  if (record.kind === 'confirm' && keys === 'decision,kind,review' && record.decision === 'import-reviewed-model' &&
    typeof record.review === 'string' && /^model-import-review:[a-f0-9-]{36}$/.test(record.review))
    return { kind: record.kind, review: record.review, decision: record.decision }
  if (record.kind === 'discard-review' && keys === 'kind,review' && typeof record.review === 'string' && /^model-import-review:[a-f0-9-]{36}$/.test(record.review))
    return { kind: record.kind, review: record.review }
  if (['pause', 'resume', 'abandon'].includes(String(record.kind)) && keys === 'kind,taskId' &&
    typeof record.taskId === 'string' && /^model-transfer:[a-f0-9-]{36}$/.test(record.taskId)) return record as ManagedModelAction
  if (['activate', 'revoke', 'retire', 'restore', 'refresh-source'].includes(String(record.kind)) && keys === 'kind,modelEntryId' &&
    typeof record.modelEntryId === 'string' && /^model-entry:[a-f0-9-]{36}$/.test(record.modelEntryId)) return record as ManagedModelAction
  throw Error('MODEL_ACTION_INVALID')
}
