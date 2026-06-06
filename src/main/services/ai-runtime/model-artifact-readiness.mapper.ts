import type { CooperativeModel } from '../../../shared/types/cooperative-model.types'
import type {
  AiModelArtifactReadiness,
  WorkerModelStatusSnapshot
} from '../../../shared/types/model-artifact-readiness.types'
import type { PlatformAiWorkflow } from '../../../shared/types/platform-ai-branch-status.types'
import type { LlamaInstallStatus } from '../../../shared/types/llama-runtime.types'
import type { AiRuntimeOnnxModelLoadProbeResponse } from '../../../shared/contracts/ai-runtime.contract'

type LlamaLocalModelLike = {
  id: string
  name?: string
  filename?: string
  isDownloaded?: boolean
  isDownloading?: boolean
  ggufDownloadState?: 'missing' | 'downloading' | 'downloaded' | string
  mmprojDownloadState?: 'missing' | 'downloading' | 'downloaded' | string
}

const COOPERATIVE_MODEL_WORKFLOW_BY_FAMILY: Record<string, Array<{ workflow: PlatformAiWorkflow; runtimeLane: string }>> = {
  ram: [
    { workflow: 'ai_tag_task', runtimeLane: 'python_mps' },
    { workflow: 'ai_tag_task', runtimeLane: 'python_cuda' }
  ],
  florence2: [
    { workflow: 'ai_tag_task', runtimeLane: 'python_mps' },
    { workflow: 'ai_tag_task', runtimeLane: 'python_cuda' },
    { workflow: 'ocr_text_box', runtimeLane: 'python_mps' },
    { workflow: 'ocr_text_box', runtimeLane: 'python_cuda' }
  ],
  clip: [
    { workflow: 'ai_tag_task', runtimeLane: 'python_mps' },
    { workflow: 'ai_tag_task', runtimeLane: 'python_cuda' },
    { workflow: 'search_embedding', runtimeLane: 'onnx_runtime' },
    { workflow: 'search_embedding', runtimeLane: 'python_mps' },
    { workflow: 'search_embedding', runtimeLane: 'python_cuda' }
  ],
  wd_tagger: [{ workflow: 'ai_tag_task', runtimeLane: 'onnx_runtime' }]
}

export function createCooperativeModelArtifactReadiness(models: CooperativeModel[]): AiModelArtifactReadiness[] {
  return models.flatMap((model) => {
    const routes = COOPERATIVE_MODEL_WORKFLOW_BY_FAMILY[model.modelFamily] ?? []
    return routes.map((route) => ({
      workflow: route.workflow,
      runtimeLane: route.runtimeLane,
      artifactId: model.id,
      label: model.displayName,
      source: 'cooperative_model' as const,
      state: model.isDownloaded ? 'ready_to_load' as const : 'artifact_missing' as const,
      missing: model.isDownloaded
        ? []
        : [{
            id: model.id,
            label: `${model.displayName} 权重未就绪`,
            kind: 'model_artifact' as const
          }]
    }))
  })
}

export function createLlamaLocalModelArtifactReadiness(models: LlamaLocalModelLike[]): AiModelArtifactReadiness[] {
  return models.flatMap((model) => {
    const label = model.name || model.filename || model.id
    const state = model.isDownloaded
      ? 'ready_to_load'
      : model.isDownloading || model.ggufDownloadState === 'downloading' || model.mmprojDownloadState === 'downloading'
        ? 'artifact_downloading'
        : 'artifact_missing'

    return ['llama_metal', 'llama_cuda'].map((runtimeLane) => ({
      workflow: 'ai_prompt_task' as const,
      runtimeLane,
      artifactId: model.id,
      label,
      source: 'llama_local_model' as const,
      state,
      missing: state === 'ready_to_load'
        ? []
        : [{
            id: model.id,
            label: state === 'artifact_downloading' ? `${label} 下载尚未完成` : `${label} GGUF/mmproj 未就绪`,
            kind: 'model_artifact' as const
          }]
    }))
  })
}

export function createWorkerModelStatusArtifactReadiness(
  status: WorkerModelStatusSnapshot | null | undefined
): AiModelArtifactReadiness[] {
  if (!status) return []

  return Object.entries(status.cooperative_models ?? {}).flatMap(([modelId, modelStatus]) => {
    const family = cooperativeFamilyFromModelId(modelId)
    const routes = family ? COOPERATIVE_MODEL_WORKFLOW_BY_FAMILY[family] ?? [] : []
    const label = cooperativeLabelFromModelId(modelId)
    const readinessState = modelStatus.readiness?.state
    const state = modelStatus.loaded && !modelStatus.is_mock
      ? 'loaded_real'
      : readinessState === 'ready_to_load'
        ? 'ready_to_load'
        : readinessState === 'missing_dependencies'
          ? 'dependency_missing'
          : readinessState === 'missing_files' || readinessState === 'not_downloaded'
            ? 'artifact_missing'
            : 'unknown'

    return routes.map((route) => ({
      workflow: route.workflow,
      runtimeLane: route.runtimeLane,
      artifactId: modelId,
      label,
      source: 'worker_runtime' as const,
      state,
      detail: modelStatus.backend,
      missing: state === 'dependency_missing'
        ? (modelStatus.readiness?.missing_dependencies ?? ['unknown']).map((id) => ({
            id,
            label: `${label} 缺少依赖 ${id}`,
            kind: 'runtime_dependency' as const
          }))
        : state === 'artifact_missing'
          ? (modelStatus.readiness?.missing_files ?? [modelId]).map((id) => ({
              id,
              label: `${label} 缺少模型 artifact`,
              kind: 'model_artifact' as const
            }))
          : []
    }))
  })
}

export function createLlamaRuntimeStatusArtifactReadiness(status: LlamaInstallStatus | null | undefined): AiModelArtifactReadiness[] {
  if (!status) return []

  const state = status.serverRunning || status.serverPid
    ? 'loaded_real'
    : status.modelPath && status.phase === 'complete'
      ? 'ready_to_load'
      : status.phase === 'downloading' || status.phase === 'extracting' || status.phase === 'installing'
        ? 'artifact_downloading'
        : 'unknown'

  return ['llama_metal', 'llama_cuda'].map((runtimeLane) => ({
    workflow: 'ai_prompt_task' as const,
    runtimeLane,
    artifactId: 'llama-runtime-current-model',
    label: 'Llama 当前模型',
    source: 'llama_local_model' as const,
    state,
    detail: status.serverRunning || status.serverPid ? 'llama-server running' : status.phase,
    missing: state === 'artifact_downloading'
      ? [{
          id: 'llama-runtime-current-model',
          label: 'Llama 当前模型下载或安装尚未完成',
          kind: 'model_artifact' as const
        }]
      : []
  }))
}

export function createOnnxModelLoadProbeArtifactReadiness(
  probe: AiRuntimeOnnxModelLoadProbeResponse | null | undefined
): AiModelArtifactReadiness[] {
  if (!probe) return []

  const state = probe.status === 'loaded_real'
    ? 'loaded_real'
    : probe.status === 'dependency_missing'
      ? 'dependency_missing'
      : probe.status === 'artifact_missing' || probe.status === 'artifact_invalid'
        ? 'artifact_missing'
        : 'unknown'

  return [{
    workflow: 'ai_tag_task',
    runtimeLane: 'onnx_runtime',
    artifactId: 'wd-vit-tagger-v3',
    label: 'WD Tagger v3 ONNX',
    source: 'explicit_load_probe',
    state,
    detail: probe.status === 'loaded_real'
      ? `${probe.providers.join(' / ') || 'ONNX Runtime'} · ${probe.inputCount} input / ${probe.outputCount} output`
      : probe.errorCode ?? probe.status,
    missing: state === 'dependency_missing'
      ? [{ id: 'onnxruntime', label: 'WD Tagger 缺少 ONNX Runtime', kind: 'runtime_dependency' }]
      : state === 'artifact_missing'
        ? [{ id: 'wd-vit-tagger-v3', label: 'WD Tagger ONNX artifact 未就绪', kind: 'model_artifact' }]
        : []
  }]
}

function cooperativeFamilyFromModelId(modelId: string): string | null {
  if (/ram/i.test(modelId)) return 'ram'
  if (/florence/i.test(modelId)) return 'florence2'
  if (/clip|siglip/i.test(modelId)) return 'clip'
  if (/wd|tagger/i.test(modelId)) return 'wd_tagger'
  return null
}

function cooperativeLabelFromModelId(modelId: string): string {
  if (modelId === 'ram-plus') return 'RAM++'
  if (modelId === 'florence-2-large') return 'Florence-2 Large'
  if (modelId === 'clip-vit-b-32') return 'CLIP ViT-B/32'
  if (modelId === 'wd-vit-tagger-v3') return 'WD Tagger v3'
  return modelId
}
