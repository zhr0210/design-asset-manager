import type { PlatformAiActionCommand, PlatformAiActionPlan } from '../types/platform-ai-action-plan.types'
import type {
  PlatformAiBranch,
  PlatformAiWorkflow,
  PlatformAiWorkflowStatus
} from '../types/platform-ai-branch-status.types'

type PlatformActionCommandOverrides = Partial<Record<
  PlatformAiWorkflow,
  Partial<Record<PlatformAiActionPlan['kind'], PlatformAiActionCommand>>
>>

const PLATFORM_ACTION_COMMAND_OVERRIDES: Record<PlatformAiBranch, PlatformActionCommandOverrides> = {
  macos: {
    ai_tag_task: {
      open_runtime_management: { kind: 'install_ai_runtime_dependencies' }
    }
  },
  windows: {}
}

export function createPlatformAiActionPlan(workflow: PlatformAiWorkflowStatus): PlatformAiActionPlan {
  if (workflow.status === 'planned_capability') {
    return createPlan(workflow, 'none', '尚未实现', false)
  }

  if (workflow.status === 'real_model_path') {
    return createPlan(workflow, 'none', '真实模型路径已就绪', false)
  }

  if (workflow.status === 'unavailable') {
    return createPlan(workflow, 'none', '当前平台不支持此分支', false)
  }

  const missing = selectActionableMissing(workflow)
  if (!missing) {
    return createPlan(workflow, 'refresh_evidence', '重新收集状态证据', true)
  }

  if (missing.kind === 'model_artifact') {
    return createPlan(workflow, 'open_model_management', '下载模型', true, missing.kind, missing.id)
  }

  if (missing.kind === 'backend_configuration') {
    return createPlan(workflow, 'open_backend_management', '配置推理服务', true, missing.kind, missing.id)
  }

  if (missing.kind === 'runtime_dependency' || missing.kind === 'runtime_service') {
    return createPlan(workflow, 'open_runtime_management', '安装依赖', true, missing.kind, missing.id)
  }

  return createPlan(workflow, 'refresh_evidence', '重新收集状态证据', true, missing.kind, missing.id)
}

export function resolvePlatformAiActionCommand(
  actionPlan: PlatformAiActionPlan,
  platformBranch?: PlatformAiBranch
): PlatformAiActionCommand {
  if (!actionPlan.enabled || actionPlan.kind === 'none') return { kind: 'none' }
  if (actionPlan.kind === 'refresh_evidence') return { kind: 'refresh_evidence' }

  if (
    actionPlan.workflow === 'ai_prompt_task'
    && (actionPlan.kind === 'open_model_management' || actionPlan.kind === 'open_runtime_management')
  ) {
    return { kind: 'start_llama_install' }
  }

  if (actionPlan.workflow === 'ocr_text_box' && actionPlan.kind === 'open_runtime_management') {
    return { kind: 'install_ocr_runtime' }
  }

  const platformOverride = platformBranch
    ? PLATFORM_ACTION_COMMAND_OVERRIDES[platformBranch][actionPlan.workflow]?.[actionPlan.kind]
    : undefined
  if (platformOverride) return { ...platformOverride }

  if (actionPlan.kind === 'open_model_management') return { kind: 'open_tab', targetTab: 'models' }
  if (actionPlan.kind === 'open_runtime_management') return { kind: 'open_tab', targetTab: 'runtime' }
  if (actionPlan.kind === 'open_backend_management') return { kind: 'open_tab', targetTab: 'services' }

  return { kind: 'none' }
}

function selectActionableMissing(workflow: PlatformAiWorkflowStatus) {
  const priority = {
    model_artifact: 0,
    runtime_dependency: 1,
    runtime_service: 2,
    backend_configuration: 3,
    unknown: 4,
    platform_support: 5
  } as const

  return [...workflow.missing].sort((left, right) => priority[left.kind] - priority[right.kind])[0]
}

function createPlan(
  workflow: PlatformAiWorkflowStatus,
  kind: PlatformAiActionPlan['kind'],
  label: string,
  enabled: boolean,
  reasonKind?: PlatformAiActionPlan['reasonKind'],
  targetId?: string
): PlatformAiActionPlan {
  return {
    workflow: workflow.workflow,
    status: workflow.status,
    kind,
    label,
    enabled,
    reasonKind,
    targetId
  }
}
