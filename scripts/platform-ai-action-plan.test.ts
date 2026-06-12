import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  createPlatformAiActionPlan,
  resolvePlatformAiActionCommand
} from '../src/shared/workflows/platform-ai-action-plan.workflow'
import type { PlatformAiActionPlan } from '../src/shared/types/platform-ai-action-plan.types'
import type { PlatformAiWorkflowStatus } from '../src/shared/types/platform-ai-branch-status.types'

function workflow(partial: Partial<PlatformAiWorkflowStatus>): PlatformAiWorkflowStatus {
  return {
    workflow: 'ai_tag_task',
    status: 'evidence_insufficient',
    title: 'Display-only title',
    summary: 'Display-only summary',
    primaryRuntimeLane: 'python_mps',
    runtimeLanes: [],
    evidence: [],
    missing: [],
    nextAction: {
      kind: 'run_health_check',
      label: 'Display-only action'
    },
    ...partial
  }
}

function plan(partial: Partial<PlatformAiActionPlan>): PlatformAiActionPlan {
  return {
    workflow: 'ai_tag_task',
    status: 'evidence_insufficient',
    kind: 'refresh_evidence',
    label: '重新收集状态证据',
    enabled: true,
    ...partial
  }
}

assert.deepEqual(
  createPlatformAiActionPlan(workflow({
    missing: [{ kind: 'model_artifact', id: 'wd-tagger', label: 'WD Tagger 模型缺失' }]
  })),
  {
    workflow: 'ai_tag_task',
    status: 'evidence_insufficient',
    kind: 'open_model_management',
    label: '下载模型',
    enabled: true,
    reasonKind: 'model_artifact',
    targetId: 'wd-tagger'
  }
)

assert.deepEqual(
  resolvePlatformAiActionCommand(plan({ enabled: false, kind: 'open_model_management' })),
  { kind: 'none' }
)
assert.deepEqual(
  resolvePlatformAiActionCommand(plan({ kind: 'refresh_evidence' })),
  { kind: 'refresh_evidence' }
)
assert.deepEqual(
  resolvePlatformAiActionCommand(plan({ kind: 'open_model_management' })),
  { kind: 'open_tab', targetTab: 'models' }
)
assert.deepEqual(
  resolvePlatformAiActionCommand(plan({ kind: 'open_runtime_management' }), 'windows'),
  { kind: 'open_tab', targetTab: 'runtime' }
)
assert.deepEqual(
  resolvePlatformAiActionCommand(plan({ kind: 'open_backend_management' })),
  { kind: 'open_tab', targetTab: 'services' }
)
assert.deepEqual(
  resolvePlatformAiActionCommand(plan({
    workflow: 'ai_prompt_task',
    kind: 'open_model_management'
  })),
  { kind: 'start_llama_install' }
)
assert.deepEqual(
  resolvePlatformAiActionCommand(plan({
    workflow: 'ai_prompt_task',
    kind: 'open_runtime_management'
  })),
  { kind: 'start_llama_install' }
)
assert.deepEqual(
  resolvePlatformAiActionCommand(plan({
    workflow: 'ocr_text_box',
    kind: 'open_runtime_management'
  })),
  { kind: 'install_ocr_runtime' }
)
assert.deepEqual(
  resolvePlatformAiActionCommand(plan({
    workflow: 'ai_tag_task',
    kind: 'open_runtime_management'
  }), 'macos'),
  { kind: 'install_ai_runtime_dependencies' }
)
assert.deepEqual(
  resolvePlatformAiActionCommand(plan({
    workflow: 'ai_tag_task',
    kind: 'open_runtime_management'
  }), 'windows'),
  { kind: 'open_tab', targetTab: 'runtime' }
)
assert.deepEqual(
  resolvePlatformAiActionCommand(plan({
    workflow: 'ai_tag_task',
    kind: 'open_runtime_management'
  })),
  { kind: 'open_tab', targetTab: 'runtime' }
)

const actionPlanWorkflowSource = await fs.readFile(
  'src/shared/workflows/platform-ai-action-plan.workflow.ts',
  'utf8'
)
assert.match(
  actionPlanWorkflowSource,
  /const PLATFORM_ACTION_COMMAND_OVERRIDES: Record<PlatformAiBranch, PlatformActionCommandOverrides>/
)
assert.match(
  actionPlanWorkflowSource,
  /PLATFORM_ACTION_COMMAND_OVERRIDES\[platformBranch\]\[actionPlan\.workflow\]\?\.\[actionPlan\.kind\]/
)
assert.doesNotMatch(actionPlanWorkflowSource, /platformBranch === 'macos'/)

const aiConsoleSource = await fs.readFile('src/renderer/routes/AiConsolePage.tsx', 'utf8')
assert.match(aiConsoleSource, /resolvePlatformAiActionCommand/)
assert.match(aiConsoleSource, /onAction\(workflow\.actionPlan\)/)
assert.doesNotMatch(aiConsoleSource, /onAction\(workflow\.actionPlan\.kind/)
assert.doesNotMatch(aiConsoleSource, /workflow === 'ai_prompt_task'/)
assert.doesNotMatch(aiConsoleSource, /workflow === 'ocr_text_box'/)
assert.doesNotMatch(aiConsoleSource, /workflow === 'ai_tag_task'/)
assert.doesNotMatch(aiConsoleSource, /kind === 'open_model_management'/)
assert.doesNotMatch(aiConsoleSource, /kind === 'open_runtime_management'/)
assert.doesNotMatch(aiConsoleSource, /kind === 'open_backend_management'/)

console.log('platform-ai-action-plan passed')
