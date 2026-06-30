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

export type ModelArtifactRowAction = 'download' | 'cancel' | 'delete'

export interface ModelArtifactRowDisplayInput {
  isCooperative: boolean
  isDownloaded?: boolean
  isDownloading?: boolean
  isLoaded?: boolean
  sourceLabel: string
  installedVersionCount?: number
}

export interface ModelArtifactRowDisplay {
  sourceLabel: string
  installedVersionsLabel: string
  runtimeStatusLabel: string
  runtimeStatusTone: ModelArtifactReadinessDisplayTone
  action: ModelArtifactRowAction | null
  actionLabel: string
}

export interface CooperativeModelRowDisplayInput {
  runtimeStatus?: CooperativeWorkerModelStatus
  downloadState?: CooperativeModelDownloadStateLike | null
  sourceLabel: string
  installedVersionCount?: number
}

export interface CooperativeModelRowDisplay {
  readiness: CooperativeModelReadinessDisplay
  downloadProgress: CooperativeModelDownloadProgressDisplay
  artifact: ModelArtifactRowDisplay
}

export interface ActivePromptModelArtifactInput {
  backendMode: 'native-qwen3vl' | 'llama-openai' | 'openai-compatible'
  nativeModelDownloaded?: boolean
  ggufModelDownloaded?: boolean
  llamaServerRunning?: boolean
  externalBackendEnabled?: boolean
}

export function projectCooperativeModelReadinessDisplay(
  input: CooperativeModelReadinessDisplayInput
): CooperativeModelReadinessDisplay {
  const readiness = input.readiness
  return {
    label: readiness?.label ?? (input.isDownloaded ? '等待 Worker 检查' : '未下载'),
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
      installedVersionCount: input.installedVersionCount
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
    smokeValueLabel: isDownloaded ? '已下载' : isDownloading ? '下载中' : '未下载',
    smokeCaptionLabel: hasModel ? (model?.name?.trim() || '未命名 GGUF') : 'Qwen3-VL 2B Q4_K_M',
    mmprojValueLabel: mmprojFilename ? (isDownloaded ? '已就绪' : isDownloading ? '下载中' : '待下载') : '无需',
    mmprojCaptionLabel: mmprojFilename || 'mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf'
  }
}

export function projectModelArtifactRowDisplay(
  input: ModelArtifactRowDisplayInput
): ModelArtifactRowDisplay {
  const installedVersionCount = Math.max(0, Math.trunc(input.installedVersionCount ?? 0))

  if (input.isCooperative) {
    const action = input.isDownloaded
      ? 'delete'
      : input.isDownloading
        ? 'cancel'
        : 'download'

    return {
      sourceLabel: input.isDownloaded ? '已安装 · 本地文件' : 'HuggingFace 仓库',
      installedVersionsLabel: `${installedVersionCount} 个已安装版本`,
      runtimeStatusLabel: '',
      runtimeStatusTone: 'muted',
      action,
      actionLabel: {
        download: '下载',
        cancel: '取消',
        delete: '删除'
      }[action]
    }
  }

  return {
    sourceLabel: input.sourceLabel,
    installedVersionsLabel: `${installedVersionCount} 个已安装版本`,
    runtimeStatusLabel: input.isLoaded ? '已加载' : '未加载',
    runtimeStatusTone: input.isLoaded ? 'good' : 'muted',
    action: null,
    actionLabel: ''
  }
}

export function resolveActivePromptModelArtifactReady(
  input: ActivePromptModelArtifactInput
): boolean {
  if (input.backendMode === 'native-qwen3vl') return input.nativeModelDownloaded === true
  if (input.backendMode === 'llama-openai') {
    return input.ggufModelDownloaded === true || input.llamaServerRunning === true
  }
  return input.externalBackendEnabled === true
}

export function projectCooperativeModelReadinessTone(
  state?: string,
  runtimeLoaded?: boolean
): ModelArtifactReadinessDisplayTone {
  if (state === 'loaded_real' || state === 'ready_to_load' || runtimeLoaded) return 'good'
  if (state === 'missing_dependencies' || state === 'missing_files' || state === 'loaded_mock_blocked') return 'bad'
  if (state === 'not_downloaded') return 'muted'
  return 'warn'
}

export function projectCooperativeModelReadinessDetail(readiness?: CooperativeWorkerReadiness): string {
  if (!readiness) return 'Worker readiness 待刷新'
  if (readiness.state === 'loaded_real') return `真实后端：${readiness.backend || 'ready'}`
  if (readiness.state === 'ready_to_load') return '依赖与权重形态已满足'
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
