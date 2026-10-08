import type {
  CooperativeWorkerModelStatus,
  CooperativeWorkerReadiness
} from '../types/model-artifact-readiness.types'

export type ModelArtifactReadinessDisplayTone = 'good' | 'warn' | 'bad' | 'muted'

export interface CooperativeModelReadinessDisplayInput {
  readiness?: CooperativeWorkerReadiness
  isDownloaded?: boolean
  runtimeLoaded?: boolean
}

export interface CooperativeModelReadinessDisplay {
  label: string
  tone: ModelArtifactReadinessDisplayTone
  detail: string
}

export interface CooperativeModelDownloadStateLike {
  isDownloaded?: boolean | null
  isDownloading?: boolean | null
  progress?: number | null
  message?: string | null
}

export interface CooperativeModelDownloadProgressDisplay {
  shouldShow: boolean
  progressPercent: number
  progressLabel: string
  messageLabel: string
}

export interface LocalGgufModelArtifactLike {
  name?: string | null
  isDownloaded?: boolean | null
  isDownloading?: boolean | null
  mmprojFilename?: string | null
}

export interface GgufArtifactTileDisplay {
  smokeValueLabel: string
  smokeCaptionLabel: string
  mmprojValueLabel: string
  mmprojCaptionLabel: string
}

export type ModelArtifactRowAction = 'cancel'

export interface ModelArtifactRowDisplayInput {
  isCooperative: boolean
  isDownloaded?: boolean
  isDownloading?: boolean
  isLoaded?: boolean
  sourceLabel: string
  localVersionEvidenceCount?: number
}

export interface ModelArtifactRowDisplay {
  sourceLabel: string
  localVersionEvidenceLabel: string
  runtimeStatusLabel: string
  runtimeStatusTone: ModelArtifactReadinessDisplayTone
  action: ModelArtifactRowAction | null
  actionLabel: string
}

export interface CooperativeModelRowDisplayInput {
  runtimeStatus?: CooperativeWorkerModelStatus
  downloadState?: CooperativeModelDownloadStateLike | null
  sourceLabel: string
  localVersionEvidenceCount?: number
}

export interface CooperativeModelRowDisplay {
  readiness: CooperativeModelReadinessDisplay
  downloadProgress: CooperativeModelDownloadProgressDisplay
  artifact: ModelArtifactRowDisplay
}

export interface ActivePromptModelArtifactInput {
  backendMode: 'native-qwen3vl' | 'llama-openai' | 'openai-compatible'
  nativeModelLoadedReal?: boolean
  llamaServerRunning?: boolean
  externalBackendEnabled?: boolean
}

export function projectCooperativeModelReadinessDisplay(
  input: CooperativeModelReadinessDisplayInput
): CooperativeModelReadinessDisplay {
  const readiness = input.readiness

  if (readiness?.state === 'ready_to_load' || (input.isDownloaded && !readiness)) {
    return {
      label: '本地文件 · 未验证',
      tone: 'warn',
      detail: readiness?.state === 'ready_to_load'
        ? 'Worker 可读取，但未经 Manifest 与摘要验证'
        : '未经 Manifest 与摘要验证'
    }
  }

  return {
    label: readiness?.label ?? '未检测到本地文件',
    tone: projectCooperativeModelReadinessTone(readiness?.state, input.runtimeLoaded),
    detail: projectCooperativeModelReadinessDetail(readiness)
  }
}

export function projectCooperativeModelDownloadProgressDisplay(
  state?: CooperativeModelDownloadStateLike | null
): CooperativeModelDownloadProgressDisplay {
  const progressPercent = normalizeModelDownloadProgress(state?.progress)
  const isDownloading = state?.isDownloading === true
  const shouldShow = isDownloading || (progressPercent > 0 && progressPercent < 100)

  return {
    shouldShow,
    progressPercent,
    progressLabel: `${progressPercent}%`,
    messageLabel: state?.message?.trim() || (isDownloading ? '下载中...' : '')
  }
}

export function projectCooperativeModelRowDisplay(
  input: CooperativeModelRowDisplayInput
): CooperativeModelRowDisplay {
  const isDownloaded = input.downloadState?.isDownloaded === true
    || input.runtimeStatus?.downloaded === true
  const isDownloading = input.downloadState?.isDownloading === true

  return {
    readiness: projectCooperativeModelReadinessDisplay({
      readiness: input.runtimeStatus?.readiness,
      isDownloaded,
      runtimeLoaded: input.runtimeStatus?.loaded
    }),
    downloadProgress: projectCooperativeModelDownloadProgressDisplay(input.downloadState),
    artifact: projectModelArtifactRowDisplay({
      isCooperative: true,
      isDownloaded,
      isDownloading,
      sourceLabel: input.sourceLabel,
      localVersionEvidenceCount: input.localVersionEvidenceCount
    })
  }
}

export function projectGgufArtifactTileDisplay(
  model?: LocalGgufModelArtifactLike | null
): GgufArtifactTileDisplay {
  const hasModel = Boolean(model)
  const isDownloaded = model?.isDownloaded === true
  const isDownloading = model?.isDownloading === true
  const mmprojFilename = model?.mmprojFilename?.trim() || ''

  return {
    smokeValueLabel: isDownloaded ? '本地文件 · 未验证' : isDownloading ? '旧下载进行中' : '未检测到本地文件',
    smokeCaptionLabel: hasModel ? (model?.name?.trim() || '未命名 GGUF') : 'Qwen3-VL 2B Q4_K_M',
    mmprojValueLabel: mmprojFilename ? (isDownloaded ? '本地文件 · 未验证' : isDownloading ? '旧下载进行中' : '未检测到本地文件') : '无需',
    mmprojCaptionLabel: mmprojFilename || 'mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf'
  }
}

export function projectModelArtifactRowDisplay(
  input: ModelArtifactRowDisplayInput
): ModelArtifactRowDisplay {
  const localVersionEvidenceCount = Math.max(0, Math.trunc(input.localVersionEvidenceCount ?? 0))

  if (input.isCooperative) {
    const action = input.isDownloading ? 'cancel' : null
    const hasLocalEvidence = input.isDownloaded === true || localVersionEvidenceCount > 0
    const unverifiedSuffix = localVersionEvidenceCount > 0 ? ' · 未验证' : ''
    const localEvidenceLabel = localVersionEvidenceCount > 0
      ? `${localVersionEvidenceCount} 个本地版本${unverifiedSuffix}`
      : input.isDownloaded
        ? '本地文件证据 · 未验证'
        : '0 个本地版本'

    return {
      sourceLabel: hasLocalEvidence ? '本地文件 · 未验证' : '未检测到本地文件',
      localVersionEvidenceLabel: localEvidenceLabel,
      runtimeStatusLabel: '',
      runtimeStatusTone: 'muted',
      action,
      actionLabel: action === 'cancel' ? '取消' : ''
    }
  }

  return {
    sourceLabel: input.sourceLabel,
    localVersionEvidenceLabel: localVersionEvidenceCount > 0
      ? `${localVersionEvidenceCount} 个本地版本 · 未验证`
      : '0 个本地版本',
    runtimeStatusLabel: input.isLoaded ? '已加载' : '未加载',
    runtimeStatusTone: input.isLoaded ? 'good' : 'muted',
    action: null,
    actionLabel: ''
  }
}

export function resolveActivePromptModelArtifactReady(
  input: ActivePromptModelArtifactInput
): boolean {
  if (input.backendMode === 'native-qwen3vl') return input.nativeModelLoadedReal === true
  if (input.backendMode === 'llama-openai') return input.llamaServerRunning === true
  return input.externalBackendEnabled === true
}

export function projectCooperativeModelReadinessTone(
  state?: string,
  _runtimeLoaded?: boolean
): ModelArtifactReadinessDisplayTone {
  if (state === 'loaded_real') return 'good'
  if (state === 'ready_to_load') return 'warn'
  if (state === 'missing_dependencies' || state === 'missing_files' || state === 'loaded_mock_blocked') return 'bad'
  if (state === 'not_downloaded') return 'muted'
  return 'warn'
}

export function projectCooperativeModelReadinessDetail(readiness?: CooperativeWorkerReadiness): string {
  if (!readiness) return 'Worker readiness 待刷新'
  if (readiness.state === 'loaded_real') return `真实后端：${readiness.backend || 'ready'}`
  if (readiness.state === 'ready_to_load') return 'Worker 形态检查通过，Artifact 未验证'
  if (readiness.state === 'loaded_mock_blocked') return '生产 strict 模式已阻断 mock 输出'
  if (readiness.state === 'missing_dependencies') {
    return `依赖缺失：${(readiness.missing_dependencies ?? []).slice(0, 4).join(', ') || 'unknown'}`
  }
  if (readiness.state === 'missing_files') {
    return `权重缺失：${(readiness.missing_files ?? []).slice(0, 3).join(', ') || 'unknown'}`
  }
  if (readiness.state === 'not_downloaded') return '尚未下载权重'
  return readiness.label || '等待 Worker 检查'
}

export function normalizeModelDownloadProgress(progress?: number | null): number {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return 0
  return Math.max(0, Math.min(100, Math.round(progress)))
}
