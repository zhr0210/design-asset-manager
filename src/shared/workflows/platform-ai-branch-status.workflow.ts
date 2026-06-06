import type {
  PlatformAiBranch,
  PlatformAiBranchStatus,
  PlatformAiBranchStatusResponse,
  PlatformAiRuntimeLaneEvidence,
  PlatformAiWorkflow,
  PlatformAiWorkflowStatus
} from '../types/platform-ai-branch-status.types'
import type { PlatformAiActionPlan } from '../types/platform-ai-action-plan.types'
import { createPlatformAiActionPlan } from './platform-ai-action-plan.workflow'

export type PlatformAiBranchDisplayTone = 'good' | 'warn' | 'bad' | 'muted'

export interface PlatformAiRuntimeLaneDisplay {
  lane: string
  label: string
  status: PlatformAiBranchStatus
  statusLabel: string
  isPrimary: boolean
}

export interface PlatformAiWorkflowDisplay {
  workflow: PlatformAiWorkflow
  workflowLabel: string
  title: string
  summary: string
  status: PlatformAiBranchStatus
  statusLabel: string
  statusTone: PlatformAiBranchDisplayTone
  evidenceLabel: string
  missingLabel: string
  nextActionLabel: string
  actionPlan: PlatformAiActionPlan
  runtimeLanes: PlatformAiRuntimeLaneDisplay[]
}

export interface PlatformAiBranchStatusDisplay {
  panelTitle: string
  panelDescription: string
  evidencePrefix: string
  missingPrefix: string
  nextActionPrefix: string
  branchLabel: string
  generatedLabel: string
  headerStatusTone: PlatformAiBranchDisplayTone
  headerStatusLabel: string
  emptyLabel: string
  workflows: PlatformAiWorkflowDisplay[]
}

export interface PlatformAiRouteOverviewDisplay {
  title: string
  description: string
  priorityLabel: string
  showMacOSDiagnostics: boolean
  runtimeLanes: PlatformAiRuntimeLaneDisplay[]
}

export interface PlatformAiBranchStatusSelection {
  status: PlatformAiBranchStatusResponse
  availableWorkflowCount: number
  statusScore: number
  evidenceCount: number
  missingCount: number
}

const WORKFLOW_DISPLAY_COPY: Record<PlatformAiWorkflow, {
  label: string
  title: string
  summary: string
}> = {
  ai_tag_task: {
    label: '共享工作流 · AI 标签任务',
    title: 'AI 标签任务',
    summary: '通过平台适配的模型运行路线生成、融合并同步素材标签建议。'
  },
  ai_prompt_task: {
    label: '共享工作流 · AI 提示词任务',
    title: 'AI 提示词反推',
    summary: '通过本地或外部多模态运行路线生成可复用的视觉提示词。'
  },
  ocr_text_box: {
    label: '共享工作流 · OCR 与文字框',
    title: 'OCR 与文字区域识别',
    summary: '通过平台可用的 OCR 与视觉模型提取文字、文字框和版面证据。'
  },
  search_embedding: {
    label: '共享工作流 · 语义检索向量',
    title: '语义检索向量',
    summary: '通过 CLIP 或 SigLIP 运行路线生成素材库语义检索向量。'
  }
}

export function projectPlatformAiBranchStatusDisplay(
  status: PlatformAiBranchStatusResponse | null,
  formatGeneratedAt: (generatedAt: string) => string = defaultGeneratedAtLabel
): PlatformAiBranchStatusDisplay {
  const branchLabel = projectPlatformBranchLabel(status?.platformBranch)

  if (!status) {
    return {
      ...platformAiPanelCopy(branchLabel),
      branchLabel,
      generatedLabel: '未刷新',
      headerStatusTone: 'muted',
      headerStatusLabel: '等待投影',
      emptyLabel: '当前环境尚未返回平台 AI 分支状态。',
      workflows: []
    }
  }

  const generatedLabel = formatGeneratedAt(status.generatedAt)

  return {
    ...platformAiPanelCopy(branchLabel),
    branchLabel,
    generatedLabel,
    headerStatusTone: 'good',
    headerStatusLabel: `${branchLabel} · ${generatedLabel}`,
    emptyLabel: '当前环境尚未返回平台 AI 分支状态。',
    workflows: status.workflows.map(projectWorkflowDisplay)
  }
}

export function projectPlatformBranchLabel(platformBranch?: PlatformAiBranch): string {
  if (platformBranch === 'windows') return 'Windows AI 分支'
  if (platformBranch === 'macos') return 'macOS AI 分支'
  return '平台 AI 分支'
}

export function projectPlatformAiRouteOverviewDisplay(
  status: PlatformAiBranchStatusResponse | null
): PlatformAiRouteOverviewDisplay {
  if (!status) {
    return {
      title: '平台路线概览',
      description: '等待当前平台返回 AI 运行路线状态。',
      priorityLabel: '当前平台路线证据不足。',
      showMacOSDiagnostics: false,
      runtimeLanes: []
    }
  }

  const display = projectPlatformAiBranchStatusDisplay(status)
  const runtimeLanes = dedupeRuntimeLanes(display.workflows.flatMap((workflow) => workflow.runtimeLanes))

  if (status.platformBranch === 'macos') {
    return {
      title: 'macOS 路线概览',
      description: '把 Python MPS、ONNX Runtime 和 Llama 路线放到同一屏里查看。',
      priorityLabel: '当前 macOS 目标模型优先级：Qwen3-VL GGUF > Qwen3-VL MLX > Qwen2.5-VL Ollama fallback > external HTTP fallback。',
      showMacOSDiagnostics: true,
      runtimeLanes
    }
  }

  return {
    title: 'Windows 路线概览',
    description: '汇总 Python CUDA、ONNX Runtime、Llama CUDA 与外部推理路线。',
    priorityLabel: '当前 Windows 路线优先使用可验证的 CUDA / ONNX / Llama 运行时，证据不足时再使用已配置的外部服务。',
    showMacOSDiagnostics: false,
    runtimeLanes
  }
}

export function selectPlatformAiBranchStatus(
  candidates: readonly (PlatformAiBranchStatusResponse | null | undefined)[]
): PlatformAiBranchStatusResponse | null {
  const selections = candidates
    .map((status, index) => status ? { index, ...scorePlatformAiBranchStatus(status) } : null)
    .filter((selection): selection is PlatformAiBranchStatusSelection & { index: number } => Boolean(selection))
    .filter((selection) => selection.availableWorkflowCount > 0)
    .sort((left, right) => {
      if (right.statusScore !== left.statusScore) return right.statusScore - left.statusScore
      if (right.availableWorkflowCount !== left.availableWorkflowCount) return right.availableWorkflowCount - left.availableWorkflowCount
      if (right.evidenceCount !== left.evidenceCount) return right.evidenceCount - left.evidenceCount
      if (left.missingCount !== right.missingCount) return left.missingCount - right.missingCount
      return left.index - right.index
    })

  return selections[0]?.status ?? null
}

export function projectPlatformAiBranchStatusTone(status: PlatformAiBranchStatus): PlatformAiBranchDisplayTone {
  if (status === 'real_model_path' || status === 'ready_to_load' || status === 'runtime_probe_ready') return 'good'
  if (status === 'unavailable') return 'bad'
  if (status === 'evidence_insufficient') return 'muted'
  return 'warn'
}

export function projectPlatformAiBranchStatusLabel(status: PlatformAiBranchStatus): string {
  return {
    evidence_insufficient: '证据不足',
    planned_capability: '规划能力',
    runtime_probe_ready: '运行时探测就绪',
    ready_to_load: '可尝试加载',
    real_model_path: '真实模型路径',
    unavailable: '不可用'
  }[status]
}

function scorePlatformAiBranchStatus(
  status: PlatformAiBranchStatusResponse
): PlatformAiBranchStatusSelection {
  return {
    status,
    availableWorkflowCount: status.workflows.filter((workflow) => workflow.status !== 'unavailable').length,
    statusScore: status.workflows.reduce((total, workflow) => total + platformAiBranchStatusScore(workflow.status), 0),
    evidenceCount: status.workflows.reduce((total, workflow) => (
      total
      + workflow.evidence.length
      + workflow.runtimeLanes.reduce((laneTotal, lane) => laneTotal + lane.evidence.length, 0)
    ), 0),
    missingCount: status.workflows.reduce((total, workflow) => total + workflow.missing.length, 0)
  }
}

function platformAiBranchStatusScore(status: PlatformAiBranchStatus): number {
  return {
    unavailable: 0,
    evidence_insufficient: 1,
    planned_capability: 2,
    runtime_probe_ready: 3,
    ready_to_load: 4,
    real_model_path: 5
  }[status]
}

function projectWorkflowDisplay(workflow: PlatformAiWorkflowStatus): PlatformAiWorkflowDisplay {
  const primaryLane = workflow.runtimeLanes.find((lane) => lane.lane === workflow.primaryRuntimeLane) ?? workflow.runtimeLanes[0]
  const copy = WORKFLOW_DISPLAY_COPY[workflow.workflow]
  return {
    workflow: workflow.workflow,
    workflowLabel: copy.label,
    title: copy.title,
    summary: copy.summary,
    status: workflow.status,
    statusLabel: projectPlatformAiBranchStatusLabel(workflow.status),
    statusTone: projectPlatformAiBranchStatusTone(workflow.status),
    evidenceLabel: workflow.evidence[0]?.label ?? '暂无证据',
    missingLabel: workflow.missing.map((item) => item.label).slice(0, 2).join(' / ') || '无明确缺口',
    nextActionLabel: projectNextActionLabel(workflow),
    actionPlan: createPlatformAiActionPlan(workflow),
    runtimeLanes: workflow.runtimeLanes.map((lane) => projectRuntimeLaneDisplay(lane, primaryLane))
  }
}

function platformAiPanelCopy(branchLabel: string): Pick<
  PlatformAiBranchStatusDisplay,
  'panelTitle' | 'panelDescription' | 'evidencePrefix' | 'missingPrefix' | 'nextActionPrefix'
> {
  return {
    panelTitle: '平台 AI 分支状态',
    panelDescription: `按共享 AI 工作流展示 ${branchLabel} 的产品状态；运行时路线差异仅作为证据显示。`,
    evidencePrefix: '证据',
    missingPrefix: '缺口',
    nextActionPrefix: '下一步'
  }
}

function projectNextActionLabel(workflow: PlatformAiWorkflowStatus): string {
  const action = workflow.nextAction
  if (!action) return ''
  if (workflow.status === 'real_model_path') return '当前工作流已有真实模型路径'
  if (action.kind === 'install_dependencies') return '安装缺失的运行时依赖'
  if (action.kind === 'download_model_artifact') return '下载缺失的模型制品'
  if (action.kind === 'start_runtime') return '启动对应的推理运行时'
  if (action.kind === 'configure_external_backend') return '配置外部推理服务'
  if (action.kind === 'run_health_check') return '刷新运行时状态证据'
  if (workflow.status === 'unavailable') return '切换到匹配的平台分支查看状态'
  return action.label
}

function projectRuntimeLaneDisplay(
  lane: PlatformAiRuntimeLaneEvidence,
  primaryLane?: PlatformAiRuntimeLaneEvidence
): PlatformAiRuntimeLaneDisplay {
  return {
    lane: lane.lane,
    label: lane.label,
    status: lane.status,
    statusLabel: projectPlatformAiBranchStatusLabel(lane.status),
    isPrimary: lane.lane === primaryLane?.lane
  }
}

function dedupeRuntimeLanes(
  runtimeLanes: readonly PlatformAiRuntimeLaneDisplay[]
): PlatformAiRuntimeLaneDisplay[] {
  const lanes = new Map<string, PlatformAiRuntimeLaneDisplay>()

  for (const lane of runtimeLanes) {
    const existing = lanes.get(lane.lane)
    if (!existing || platformAiBranchStatusScore(lane.status) > platformAiBranchStatusScore(existing.status)) {
      lanes.set(lane.lane, lane)
    } else if (lane.isPrimary && !existing.isPrimary) {
      lanes.set(lane.lane, { ...existing, isPrimary: true })
    }
  }

  return [...lanes.values()]
}

function defaultGeneratedAtLabel(generatedAt: string): string {
  return new Date(generatedAt).toLocaleTimeString()
}
