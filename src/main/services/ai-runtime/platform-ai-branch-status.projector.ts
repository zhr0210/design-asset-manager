import type { AiRuntimeKind, AiRuntimeState } from '../../../shared/types/ai-runtime.types'
import type { AiModelArtifactReadiness } from '../../../shared/types/model-artifact-readiness.types'
import type {
  PlatformAiBranch,
  PlatformAiBranchStatus,
  PlatformAiBranchStatusResponse,
  PlatformAiMissingRequirement,
  PlatformAiNextAction,
  PlatformAiRuntimeLaneId,
  PlatformAiRuntimeLaneEvidence,
  PlatformAiStatusEvidence,
  PlatformAiWorkflow,
  PlatformAiWorkflowStatus
} from '../../../shared/types/platform-ai-branch-status.types'
import type { PlatformName } from '../../../shared/types/platform.types'
import type { PythonExecutionEvidence } from './python-execution-evidence.store'

export interface PlatformAiBranchStatusProjectorInput {
  platformBranch: PlatformAiBranch
  currentPlatform: PlatformName
  generatedAt?: string
  runtimes: AiRuntimeState[]
  modelReadiness?: AiModelArtifactReadiness[]
  pythonExecutionEvidence?: PythonExecutionEvidence[]
}

interface WorkflowDefinition {
  workflow: PlatformAiWorkflow
  primaryRuntimeLane: PlatformAiRuntimeLaneId
  runtimeLanes: RuntimeLaneDefinition[]
}

interface WorkflowTopologyDefinition {
  workflow: PlatformAiWorkflow
  primaryRuntimeLane: PlatformAiRuntimeLaneId
  runtimeLanes: RuntimeLaneTopology[]
}

interface RuntimeLaneDefinition {
  lane: PlatformAiRuntimeLaneId
  label: string
  runtimeKinds: readonly AiRuntimeKind[]
}

interface RuntimeLaneTopology {
  lane: PlatformAiRuntimeLaneId
  label?: string
}

interface RuntimeLaneMetadata {
  label: string
  runtimeKinds: readonly AiRuntimeKind[]
  branchRuntimeKinds?: Partial<Record<PlatformAiBranch, readonly AiRuntimeKind[]>>
}

const RUNTIME_LANE_METADATA: Record<PlatformAiRuntimeLaneId, RuntimeLaneMetadata> = {
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

const PLATFORM_BRANCH_PLATFORMS: Record<PlatformAiBranch, PlatformName> = {
  macos: 'darwin',
  windows: 'win32'
}

function resolveRuntimeLane(
  platformBranch: PlatformAiBranch,
  topology: RuntimeLaneTopology
): RuntimeLaneDefinition {
  const metadata = RUNTIME_LANE_METADATA[topology.lane]
  return {
    lane: topology.lane,
    label: topology.label ?? metadata.label,
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

const PLATFORM_WORKFLOW_TOPOLOGY: Record<PlatformAiBranch, WorkflowTopologyDefinition[]> = {
  macos: [
    {
      workflow: 'ai_tag_task',
      primaryRuntimeLane: 'python_mps',
      runtimeLanes: [
        { lane: 'python_mps' },
        { lane: 'onnx_runtime' }
      ]
    },
    {
      workflow: 'ai_prompt_task',
      primaryRuntimeLane: 'llama_metal',
      runtimeLanes: [
        { lane: 'llama_metal' },
        { lane: 'external_http' },
        { lane: 'python_mps' }
      ]
    },
    {
      workflow: 'ocr_text_box',
      primaryRuntimeLane: 'onnx_runtime',
      runtimeLanes: [
        { lane: 'onnx_runtime' },
        { lane: 'python_mps' }
      ]
    },
    {
      workflow: 'search_embedding',
      primaryRuntimeLane: 'onnx_runtime',
      runtimeLanes: [
        { lane: 'onnx_runtime', label: 'CLIP/SigLIP ONNX' },
        { lane: 'python_mps', label: 'CLIP/SigLIP PyTorch' }
      ]
    }
  ],
  windows: [
    {
      workflow: 'ai_tag_task',
      primaryRuntimeLane: 'python_cuda',
      runtimeLanes: [
        { lane: 'python_cuda' },
        { lane: 'onnx_runtime' }
      ]
    },
    {
      workflow: 'ai_prompt_task',
      primaryRuntimeLane: 'llama_cuda',
      runtimeLanes: [
        { lane: 'llama_cuda' },
        { lane: 'ollama' },
        { lane: 'external_http' },
        { lane: 'python_cuda' }
      ]
    },
    {
      workflow: 'ocr_text_box',
      primaryRuntimeLane: 'onnx_runtime',
      runtimeLanes: [
        { lane: 'onnx_runtime' },
        { lane: 'python_cuda' }
      ]
    },
    {
      workflow: 'search_embedding',
      primaryRuntimeLane: 'python_cuda',
      runtimeLanes: [
        { lane: 'python_cuda', label: 'CLIP/SigLIP CUDA' },
        { lane: 'onnx_runtime', label: 'CLIP/SigLIP ONNX' }
      ]
    }
  ]
}

export function createPlatformAiBranchStatus(input: PlatformAiBranchStatusProjectorInput): PlatformAiBranchStatusResponse {
  const platformSupported = isCurrentBranch(input.platformBranch, input.currentPlatform)
  const workflows = PLATFORM_WORKFLOW_TOPOLOGY[input.platformBranch].map((definition) => projectWorkflow(
    resolveWorkflowDefinition(input.platformBranch, definition),
    input.platformBranch,
    input.runtimes,
    platformSupported,
    input.modelReadiness ?? [],
    input.pythonExecutionEvidence ?? []
  ))

  return {
    platformBranch: input.platformBranch,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workflows
  }
}

function resolveWorkflowDefinition(
  platformBranch: PlatformAiBranch,
  definition: WorkflowTopologyDefinition
): WorkflowDefinition {
  return {
    workflow: definition.workflow,
    primaryRuntimeLane: definition.primaryRuntimeLane,
    runtimeLanes: definition.runtimeLanes.map((lane) => resolveRuntimeLane(platformBranch, lane))
  }
}

function projectWorkflow(
  definition: WorkflowDefinition,
  platformBranch: PlatformAiBranch,
  runtimes: AiRuntimeState[],
  platformSupported: boolean,
  modelReadiness: AiModelArtifactReadiness[],
  pythonExecutionEvidence: PythonExecutionEvidence[]
): PlatformAiWorkflowStatus {
  const metadata = WORKFLOW_METADATA[definition.workflow]
  const workflowModelReadiness = modelReadiness.filter((item) => item.workflow === definition.workflow)
  const runtimeLanes = definition.runtimeLanes.map((lane) => projectLane(
    lane,
    runtimes,
    platformSupported,
    workflowModelReadiness,
    pythonExecutionEvidence
  ))
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
  modelReadiness: AiModelArtifactReadiness[],
  pythonExecutionEvidence: PythonExecutionEvidence[]
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
  const executionEvidence = pythonExecutionEvidence.find((item) => item.lane === lane.lane)
  const projectedExecutionEvidence = executionEvidence
    ? pythonExecutionProbeToEvidence(executionEvidence)
    : []
  const executionStatus: PlatformAiBranchStatus = executionEvidence?.probe.status === 'executed_real'
    && executionEvidence.probe.success
    && executionEvidence.probe.resultFinite
    ? 'runtime_probe_ready'
    : 'evidence_insufficient'
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
        ...projectedExecutionEvidence,
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
      status: maxBranchStatus(['evidence_insufficient', executionStatus, readinessStatus]),
      evidence: [
        evidence('service_unavailable', `${lane.label} 已注册但当前未运行`, 'runtime_health', matched[0].id),
        evidence('service_unavailable', `${matched[0].id} 当前未运行`, 'runtime_health'),
        ...projectedExecutionEvidence,
        ...readinessEvidence
      ]
    }
  }

  const readinessEvidence = laneModelReadiness.flatMap(readinessToEvidence)
  const readinessStatus = projectReadinessStatus(laneModelReadiness)
  return {
    lane: lane.lane,
    label: lane.label,
    status: maxBranchStatus(['evidence_insufficient', executionStatus, readinessStatus]),
    evidence: [
      evidence('unknown', `${lane.label} 已定义，但尚无运行时或模型证据`, 'static_metadata'),
      ...projectedExecutionEvidence,
      ...readinessEvidence
    ]
  }
}

function pythonExecutionProbeToEvidence(
  executionEvidence: PythonExecutionEvidence
): PlatformAiStatusEvidence[] {
  const probe = executionEvidence.probe
  if (probe.status === 'executed_real' && probe.success && probe.resultFinite) {
    return [evidence(
      'runtime_probe_ready',
      `${executionEvidence.lane} 已完成真实固定张量执行`,
      'worker_probe',
      `${probe.runtime ?? executionEvidence.lane} · ${probe.operation} · ${probe.checkedAt}`
    )]
  }
  if (probe.status === 'dependency_missing') {
    return [evidence('dependency_missing', `${executionEvidence.lane} 缺少运行时依赖`, 'worker_probe', probe.errorCode ?? undefined)]
  }
  if (probe.status === 'backend_unavailable') {
    return [evidence('service_unavailable', `${executionEvidence.lane} 后端不可用`, 'worker_probe', probe.errorCode ?? undefined)]
  }
  return [evidence('unknown', `${executionEvidence.lane} 固定张量执行证据不足`, 'worker_probe', probe.errorCode ?? probe.status)]
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

  const modelMissing = modelReadiness.flatMap((item) => (item.missing ?? []).map((missing) => ({
    kind: missing.kind,
    id: missing.id,
    label: missing.label,
    detail: missing.detail
  } satisfies PlatformAiMissingRequirement)))

  if (runtimeLanes.some((lane) => lane.status === 'real_model_path')) {
    return []
  }

  if (runtimeLanes.some((lane) => lane.status === 'runtime_probe_ready' || lane.status === 'ready_to_load')) {
    return dedupeMissingRequirements(modelMissing)
  }

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
  return currentPlatform === PLATFORM_BRANCH_PLATFORMS[platformBranch]
}
