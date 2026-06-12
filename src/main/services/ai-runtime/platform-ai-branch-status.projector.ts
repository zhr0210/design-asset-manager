import type { AiRuntimeKind, AiRuntimeState } from '../../../shared/types/ai-runtime.types'
import type { AiModelArtifactReadiness } from '../../../shared/types/model-artifact-readiness.types'
import type {
  PlatformAiBranch,
  PlatformAiBranchStatus,
  PlatformAiBranchStatusResponse,
  PlatformAiMissingRequirement,
  PlatformAiNextAction,
  PlatformAiRuntimeLaneEvidence,
  PlatformAiStatusEvidence,
  PlatformAiWorkflow,
  PlatformAiWorkflowStatus
} from '../../../shared/types/platform-ai-branch-status.types'
import type { PlatformName } from '../../../shared/types/platform.types'

export interface PlatformAiBranchStatusProjectorInput {
  platformBranch: PlatformAiBranch
  currentPlatform: PlatformName
  generatedAt?: string
  runtimes: AiRuntimeState[]
  modelReadiness?: AiModelArtifactReadiness[]
}

interface WorkflowDefinition {
  workflow: PlatformAiWorkflow
  primaryRuntimeLane: string
  runtimeLanes: RuntimeLaneDefinition[]
}

type RuntimeLaneId =
  | 'python_mps'
  | 'python_cuda'
  | 'onnx_runtime'
  | 'llama_metal'
  | 'llama_cuda'
  | 'ollama'
  | 'external_http'

interface RuntimeLaneDefinition {
  lane: RuntimeLaneId
  label: string
  runtimeKinds: readonly AiRuntimeKind[]
}

interface RuntimeLaneMetadata {
  label: string
  runtimeKinds: readonly AiRuntimeKind[]
  branchRuntimeKinds?: Partial<Record<PlatformAiBranch, readonly AiRuntimeKind[]>>
}

const RUNTIME_LANE_METADATA: Record<RuntimeLaneId, RuntimeLaneMetadata> = {
  python_mps: {
    label: 'Python MPS Runtime',
    runtimeKinds: ['python-worker']
  },
  python_cuda: {
    label: 'Python CUDA Runtime',
    runtimeKinds: ['python-worker']
  },
  onnx_runtime: {
    label: 'ONNX Runtime',
    runtimeKinds: ['python-worker']
  },
  llama_metal: {
    label: 'Llama Metal',
    runtimeKinds: ['llama-app', 'custom-http']
  },
  llama_cuda: {
    label: 'Llama CUDA',
    runtimeKinds: ['llama-app', 'custom-http']
  },
  ollama: {
    label: 'Ollama',
    runtimeKinds: ['ollama']
  },
  external_http: {
    label: 'External HTTP',
    runtimeKinds: ['lm-studio', 'custom-http'],
    branchRuntimeKinds: {
      macos: ['ollama', 'lm-studio', 'custom-http']
    }
  }
}

function runtimeLane(
  platformBranch: PlatformAiBranch,
  lane: RuntimeLaneId,
  label?: string
): RuntimeLaneDefinition {
  const metadata = RUNTIME_LANE_METADATA[lane]
  return {
    lane,
    label: label ?? metadata.label,
    runtimeKinds: metadata.branchRuntimeKinds?.[platformBranch] ?? metadata.runtimeKinds
  }
}

const WORKFLOW_METADATA: Record<PlatformAiWorkflow, {
  title: string
  summary: Record<PlatformAiBranch, string>
}> = {
  ai_tag_task: {
    title: 'AI Tag Task',
    summary: {
      macos: 'RAM++, Florence-2, CLIP/SigLIP, and WD Tagger tagging routes for macOS.',
      windows: 'CUDA AI Worker tagging routes for RAM++, Florence-2, CLIP/SigLIP, and WD Tagger.'
    }
  },
  ai_prompt_task: {
    title: 'AI Prompt Task',
    summary: {
      macos: 'Qwen3-VL prompt reverse through Llama, native Python experiment, or external HTTP fallback.',
      windows: 'Qwen3-VL prompt reverse through CUDA legacy route, Llama CUDA, Ollama, or external HTTP fallback.'
    }
  },
  ocr_text_box: {
    title: 'OCR Text / Text Box',
    summary: {
      macos: 'RapidOCR, PaddleOCR, EasyOCR, or Qwen-VL text-block detection on macOS.',
      windows: 'RapidOCR, PaddleOCR, EasyOCR, or CUDA-backed text-block detection on Windows.'
    }
  },
  search_embedding: {
    title: 'Search Embedding',
    summary: {
      macos: 'CLIP/SigLIP embedding route for semantic Asset Library search.',
      windows: 'CLIP/SigLIP embedding route for semantic Asset Library search.'
    }
  }
}

const WORKFLOWS: Record<PlatformAiBranch, WorkflowDefinition[]> = {
  macos: [
    {
      workflow: 'ai_tag_task',
      primaryRuntimeLane: 'python_mps',
      runtimeLanes: [
        runtimeLane('macos', 'python_mps'),
        runtimeLane('macos', 'onnx_runtime')
      ]
    },
    {
      workflow: 'ai_prompt_task',
      primaryRuntimeLane: 'llama_metal',
      runtimeLanes: [
        runtimeLane('macos', 'llama_metal'),
        runtimeLane('macos', 'external_http'),
        runtimeLane('macos', 'python_mps')
      ]
    },
    {
      workflow: 'ocr_text_box',
      primaryRuntimeLane: 'onnx_runtime',
      runtimeLanes: [
        runtimeLane('macos', 'onnx_runtime'),
        runtimeLane('macos', 'python_mps')
      ]
    },
    {
      workflow: 'search_embedding',
      primaryRuntimeLane: 'onnx_runtime',
      runtimeLanes: [
        runtimeLane('macos', 'onnx_runtime', 'CLIP/SigLIP ONNX'),
        runtimeLane('macos', 'python_mps', 'CLIP/SigLIP PyTorch')
      ]
    }
  ],
  windows: [
    {
      workflow: 'ai_tag_task',
      primaryRuntimeLane: 'python_cuda',
      runtimeLanes: [
        runtimeLane('windows', 'python_cuda'),
        runtimeLane('windows', 'onnx_runtime')
      ]
    },
    {
      workflow: 'ai_prompt_task',
      primaryRuntimeLane: 'llama_cuda',
      runtimeLanes: [
        runtimeLane('windows', 'llama_cuda'),
        runtimeLane('windows', 'ollama'),
        runtimeLane('windows', 'external_http'),
        runtimeLane('windows', 'python_cuda')
      ]
    },
    {
      workflow: 'ocr_text_box',
      primaryRuntimeLane: 'onnx_runtime',
      runtimeLanes: [
        runtimeLane('windows', 'onnx_runtime'),
        runtimeLane('windows', 'python_cuda')
      ]
    },
    {
      workflow: 'search_embedding',
      primaryRuntimeLane: 'python_cuda',
      runtimeLanes: [
        runtimeLane('windows', 'python_cuda', 'CLIP/SigLIP CUDA'),
        runtimeLane('windows', 'onnx_runtime', 'CLIP/SigLIP ONNX')
      ]
    }
  ]
}

export function createPlatformAiBranchStatus(input: PlatformAiBranchStatusProjectorInput): PlatformAiBranchStatusResponse {
  const platformSupported = isCurrentBranch(input.platformBranch, input.currentPlatform)
  const workflows = WORKFLOWS[input.platformBranch].map((definition) => projectWorkflow(
    definition,
    input.platformBranch,
    input.runtimes,
    platformSupported,
    input.modelReadiness ?? []
  ))

  return {
    platformBranch: input.platformBranch,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workflows
  }
}

function projectWorkflow(
  definition: WorkflowDefinition,
  platformBranch: PlatformAiBranch,
  runtimes: AiRuntimeState[],
  platformSupported: boolean,
  modelReadiness: AiModelArtifactReadiness[]
): PlatformAiWorkflowStatus {
  const metadata = WORKFLOW_METADATA[definition.workflow]
  const workflowModelReadiness = modelReadiness.filter((item) => item.workflow === definition.workflow)
  const runtimeLanes = definition.runtimeLanes.map((lane) => projectLane(lane, runtimes, platformSupported, workflowModelReadiness))
  const status = projectWorkflowStatus(runtimeLanes, platformSupported)
  const missing = projectMissingRequirements(definition, runtimeLanes, platformSupported, workflowModelReadiness)

  return {
    workflow: definition.workflow,
    status,
    title: metadata.title,
    summary: metadata.summary[platformBranch],
    primaryRuntimeLane: definition.primaryRuntimeLane,
    runtimeLanes,
    evidence: runtimeLanes.flatMap((lane) => lane.evidence),
    missing,
    nextAction: createDisplayNextAction(status, missing)
  }
}

function projectLane(
  lane: WorkflowDefinition['runtimeLanes'][number],
  runtimes: AiRuntimeState[],
  platformSupported: boolean,
  modelReadiness: AiModelArtifactReadiness[]
): PlatformAiRuntimeLaneEvidence {
  if (!platformSupported) {
    return {
      lane: lane.lane,
      label: lane.label,
      status: 'unavailable',
      evidence: [evidence('platform_unsupported', '当前平台不属于该 Platform AI Branch', 'static_metadata')]
    }
  }

  const laneModelReadiness = modelReadiness.filter((item) => item.runtimeLane === lane.lane)
  const matched = runtimes.filter((runtime) => lane.runtimeKinds.includes(runtime.kind))
  const running = matched.find((runtime) => runtime.status === 'running')
  if (running) {
    const readinessEvidence = laneModelReadiness.flatMap(readinessToEvidence)
    const readinessStatus = projectReadinessStatus(laneModelReadiness)
    return {
      lane: lane.lane,
      label: lane.label,
      status: maxBranchStatus(['runtime_probe_ready', readinessStatus]),
      evidence: [
        evidence('runtime_probe_ready', `${lane.label} 有运行时状态`, 'runtime_health', running.id),
        evidence('service_running', `${running.id} 正在运行`, 'runtime_health'),
        ...readinessEvidence
      ]
    }
  }

  if (matched.length > 0) {
    const readinessEvidence = laneModelReadiness.flatMap(readinessToEvidence)
    const readinessStatus = projectReadinessStatus(laneModelReadiness)
    return {
      lane: lane.lane,
      label: lane.label,
      status: maxBranchStatus(['evidence_insufficient', readinessStatus]),
      evidence: [
        evidence('service_unavailable', `${lane.label} 已注册但当前未运行`, 'runtime_health', matched[0].id),
        evidence('service_unavailable', `${matched[0].id} 当前未运行`, 'runtime_health'),
        ...readinessEvidence
      ]
    }
  }

  const readinessEvidence = laneModelReadiness.flatMap(readinessToEvidence)
  const readinessStatus = projectReadinessStatus(laneModelReadiness)
  return {
    lane: lane.lane,
    label: lane.label,
    status: maxBranchStatus(['evidence_insufficient', readinessStatus]),
    evidence: [
      evidence('unknown', `${lane.label} 已定义，但尚无运行时或模型证据`, 'static_metadata'),
      ...readinessEvidence
    ]
  }
}

function projectWorkflowStatus(runtimeLanes: PlatformAiRuntimeLaneEvidence[], platformSupported: boolean): PlatformAiBranchStatus {
  if (!platformSupported) return 'unavailable'
  if (runtimeLanes.some((lane) => lane.status === 'real_model_path')) return 'real_model_path'
  if (runtimeLanes.some((lane) => lane.status === 'ready_to_load')) return 'ready_to_load'
  if (runtimeLanes.some((lane) => lane.status === 'runtime_probe_ready')) return 'runtime_probe_ready'
  return 'evidence_insufficient'
}

function projectMissingRequirements(
  definition: WorkflowDefinition,
  runtimeLanes: PlatformAiRuntimeLaneEvidence[],
  platformSupported: boolean,
  modelReadiness: AiModelArtifactReadiness[]
): PlatformAiMissingRequirement[] {
  if (!platformSupported) {
    return [{
      kind: 'platform_support',
      id: definition.workflow,
      label: '当前操作系统不匹配'
    }]
  }

  if (runtimeLanes.some((lane) => lane.status === 'runtime_probe_ready' || lane.status === 'ready_to_load' || lane.status === 'real_model_path')) {
    return []
  }

  const modelMissing = modelReadiness.flatMap((item) => (item.missing ?? []).map((missing) => ({
    kind: missing.kind,
    id: missing.id,
    label: missing.label,
    detail: missing.detail
  } satisfies PlatformAiMissingRequirement)))

  return dedupeMissingRequirements([...modelMissing, {
    kind: 'runtime_service',
    id: definition.primaryRuntimeLane,
    label: '等待运行时状态证据'
  }])
}

function createDisplayNextAction(status: PlatformAiBranchStatus, missing: PlatformAiMissingRequirement[]): PlatformAiNextAction | undefined {
  if (status === 'real_model_path') {
    return { kind: 'none', label: '当前工作流已有 Real Model Path' }
  }
  const firstMissing = missing[0]
  if (!firstMissing) return undefined
  if (firstMissing.kind === 'platform_support') {
    return {
      kind: 'none',
      label: '切换到匹配的平台分支查看状态',
      target: { kind: 'workflow', id: firstMissing.id }
    }
  }
  return {
    kind: 'run_health_check',
    label: '刷新运行时状态证据',
    target: { kind: 'runtime_lane', id: firstMissing.id }
  }
}

function evidence(
  code: PlatformAiStatusEvidence['code'],
  label: string,
  source: PlatformAiStatusEvidence['source'],
  detail?: string
): PlatformAiStatusEvidence {
  return { code, label, source, detail }
}

function readinessToEvidence(readiness: AiModelArtifactReadiness): PlatformAiStatusEvidence[] {
  if (readiness.state === 'loaded_real') {
    return [evidence('real_backend_loaded', `${readiness.label} 已由真实后端加载`, 'model_readiness', readiness.detail)]
  }
  if (readiness.state === 'external_backend_healthy') {
    return [evidence('external_backend_healthy', `${readiness.label} 外部后端健康`, 'model_readiness', readiness.detail)]
  }
  if (readiness.state === 'ready_to_load') {
    return [evidence('artifact_ready', `${readiness.label} artifact 形态已就绪`, 'model_readiness', readiness.detail)]
  }
  if (readiness.state === 'dependency_missing') {
    return [evidence('dependency_missing', `${readiness.label} 依赖缺失`, 'model_readiness', readiness.detail)]
  }
  if (readiness.state === 'artifact_missing') {
    return [evidence('artifact_missing', `${readiness.label} artifact 缺失`, 'model_readiness', readiness.detail)]
  }
  if (readiness.state === 'artifact_downloading') {
    return [evidence('artifact_missing', `${readiness.label} artifact 下载未完成`, 'model_readiness', readiness.detail)]
  }
  return [evidence('unknown', `${readiness.label} 证据不足`, 'model_readiness', readiness.detail)]
}

function projectReadinessStatus(readiness: AiModelArtifactReadiness[]): PlatformAiBranchStatus {
  if (readiness.some((item) => item.state === 'loaded_real' || item.state === 'external_backend_healthy')) return 'real_model_path'
  if (readiness.some((item) => item.state === 'ready_to_load')) return 'ready_to_load'
  return 'evidence_insufficient'
}

function maxBranchStatus(statuses: PlatformAiBranchStatus[]): PlatformAiBranchStatus {
  const priority: Record<PlatformAiBranchStatus, number> = {
    unavailable: 0,
    evidence_insufficient: 1,
    planned_capability: 2,
    runtime_probe_ready: 3,
    ready_to_load: 4,
    real_model_path: 5
  }
  return statuses.reduce((best, next) => priority[next] > priority[best] ? next : best, 'evidence_insufficient')
}

function dedupeMissingRequirements(items: PlatformAiMissingRequirement[]): PlatformAiMissingRequirement[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.kind}:${item.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isCurrentBranch(platformBranch: PlatformAiBranch, currentPlatform: PlatformName): boolean {
  if (platformBranch === 'macos') return currentPlatform === 'darwin'
  return currentPlatform === 'win32'
}
