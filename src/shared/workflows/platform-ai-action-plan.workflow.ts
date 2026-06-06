import type { PlatformAiActionPlan } from '../types/platform-ai-action-plan.types'
import type { PlatformAiWorkflowStatus } from '../types/platform-ai-branch-status.types'

export function createPlatformAiActionPlan(workflow: PlatformAiWorkflowStatus): PlatformAiActionPlan {
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
    return createPlan(workflow, 'open_model_management', '管理模型制品', true, missing.kind, missing.id)
  }

  if (missing.kind === 'backend_configuration') {
    return createPlan(workflow, 'open_backend_management', '配置推理服务', true, missing.kind, missing.id)
  }

  if (missing.kind === 'runtime_dependency' || missing.kind === 'runtime_service') {
    return createPlan(workflow, 'open_runtime_management', '检查运行时与依赖', true, missing.kind, missing.id)
  }

  return createPlan(workflow, 'refresh_evidence', '重新收集状态证据', true, missing.kind, missing.id)
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
