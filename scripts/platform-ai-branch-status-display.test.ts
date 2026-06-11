import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createPlatformAiBranchStatus } from '../src/main/services/ai-runtime/platform-ai-branch-status.projector'
import {
  projectPlatformAiBranchStatusDisplay,
  projectPlatformAiBranchStatusLabel,
  projectPlatformAiBranchStatusTone,
  projectPlatformAiRouteOverviewDisplay,
  projectPlatformBranchLabel,
  selectPlatformAiBranchStatus
} from '../src/shared/workflows/platform-ai-branch-status.workflow'
import { createPlatformAiActionPlan } from '../src/shared/workflows/platform-ai-action-plan.workflow'
import type { AiRuntimeState } from '../src/shared/types/ai-runtime.types'

function runtime(partial: Partial<AiRuntimeState>): AiRuntimeState {
  return {
    id: 'python-worker-runtime',
    kind: 'python-worker',
    status: 'running',
    healthStatus: 'ok',
    startedAt: '2026-06-04T00:00:00.000Z',
    stoppedAt: null,
    lastHealthCheckAt: '2026-06-04T00:00:01.000Z',
    lastError: null,
    pid: 123,
    baseUrl: 'http://127.0.0.1:8000',
    ...partial
  }
}

assert.equal(projectPlatformBranchLabel('macos'), 'macOS AI 分支')
assert.equal(projectPlatformBranchLabel('windows'), 'Windows AI 分支')
assert.equal(projectPlatformBranchLabel(undefined), '平台 AI 分支')
assert.equal(projectPlatformAiBranchStatusTone('runtime_probe_ready'), 'good')
assert.equal(projectPlatformAiBranchStatusTone('ready_to_load'), 'good')
assert.equal(projectPlatformAiBranchStatusTone('real_model_path'), 'good')
assert.equal(projectPlatformAiBranchStatusTone('planned_capability'), 'warn')
assert.equal(projectPlatformAiBranchStatusTone('evidence_insufficient'), 'muted')
assert.equal(projectPlatformAiBranchStatusTone('unavailable'), 'bad')
assert.equal(projectPlatformAiBranchStatusLabel('evidence_insufficient'), '证据不足')
assert.equal(projectPlatformAiBranchStatusLabel('planned_capability'), '规划能力')
assert.equal(projectPlatformAiBranchStatusLabel('runtime_probe_ready'), '运行时探测就绪')
assert.equal(projectPlatformAiBranchStatusLabel('ready_to_load'), '可尝试加载')
assert.equal(projectPlatformAiBranchStatusLabel('real_model_path'), '真实模型路径')
assert.equal(projectPlatformAiBranchStatusLabel('unavailable'), '不可用')

const emptyDisplay = projectPlatformAiBranchStatusDisplay(null)
assert.equal(emptyDisplay.panelTitle, '平台 AI 分支状态')
assert.match(emptyDisplay.panelDescription, /共享 AI 工作流/)
assert.equal(emptyDisplay.branchLabel, '平台 AI 分支')
assert.equal(emptyDisplay.headerStatusTone, 'muted')
assert.equal(emptyDisplay.headerStatusLabel, '等待投影')
assert.equal(emptyDisplay.emptyLabel, '当前环境尚未返回平台 AI 分支状态。')
assert.deepEqual(emptyDisplay.workflows, [])

const macosStatus = createPlatformAiBranchStatus({
  platformBranch: 'macos',
  currentPlatform: 'darwin',
  generatedAt: '2026-06-04T00:00:00.000Z',
  runtimes: [runtime({})]
})

const macosDisplay = projectPlatformAiBranchStatusDisplay(macosStatus, () => '00:00:00')
const macosRouteOverview = projectPlatformAiRouteOverviewDisplay(macosStatus)
assert.equal(macosDisplay.branchLabel, 'macOS AI 分支')
assert.equal(macosDisplay.generatedLabel, '00:00:00')
assert.equal(macosDisplay.headerStatusLabel, 'macOS AI 分支 · 00:00:00')
assert.equal(macosDisplay.workflows[0].workflow, 'ai_tag_task')
assert.equal(macosDisplay.workflows[0].workflowLabel, '共享工作流 · AI 标签任务')
assert.equal(macosDisplay.workflows[0].title, 'AI 标签任务')
assert.match(macosDisplay.workflows[0].summary, /素材标签建议/)
assert.equal(macosDisplay.workflows[0].statusTone, 'good')
assert.equal(macosDisplay.workflows[0].statusLabel, '运行时探测就绪')
assert.equal(macosDisplay.workflows[0].evidenceLabel, 'Python MPS Runtime 有运行时状态')
assert.equal(macosDisplay.workflows[0].missingLabel, '无明确缺口')
assert.equal(macosDisplay.workflows[0].runtimeLanes[0].isPrimary, true)
assert.equal(macosDisplay.workflows[0].runtimeLanes[0].statusLabel, '运行时探测就绪')
assert.equal(macosDisplay.workflows[0].actionPlan.kind, 'refresh_evidence')
assert.equal(macosDisplay.workflows[0].actionPlan.enabled, true)
assert.equal(macosRouteOverview.title, 'macOS 路线概览')
assert.equal(macosRouteOverview.showMacOSDiagnostics, true)
assert.equal(macosRouteOverview.installDependenciesLabel, '安装 macOS AI 依赖')
assert.equal(macosRouteOverview.installingDependenciesLabel, '正在安装依赖')
assert.equal(macosRouteOverview.primaryRuntimeLaneCaption, '主要运行路线')
assert.equal(macosRouteOverview.candidateRuntimeLaneCaption, '候选运行路线')
assert.deepEqual(macosRouteOverview.diagnosticTiles, {
  mpsLabel: 'MPS',
  pythonCompatibilityLabel: 'Python MPS 兼容性',
  onnxRuntimeLabel: 'ONNX Runtime',
  clipSiglipOnnxLabel: 'CLIP/SigLIP ONNX',
  clipSiglipCompatibilityLabel: 'CLIP/SigLIP 兼容性'
})
assert.match(macosRouteOverview.priorityLabel, /Qwen3-VL GGUF/)
assert.doesNotMatch(macosRouteOverview.priorityLabel, /MLX/)

const windowsOnMacStatus = createPlatformAiBranchStatus({
  platformBranch: 'windows',
  currentPlatform: 'darwin',
  generatedAt: '2026-06-04T00:00:00.000Z',
  runtimes: [runtime({})]
})

const windowsDisplay = projectPlatformAiBranchStatusDisplay(windowsOnMacStatus, () => '00:00:00')
const windowsRouteOverview = projectPlatformAiRouteOverviewDisplay(windowsOnMacStatus)
assert.equal(windowsDisplay.branchLabel, 'Windows AI 分支')
assert.equal(windowsDisplay.workflows[0].statusTone, 'bad')
assert.equal(windowsDisplay.workflows[0].statusLabel, '不可用')
assert.equal(windowsDisplay.workflows[0].missingLabel, '当前操作系统不匹配')
assert.equal(windowsDisplay.workflows[0].actionPlan.kind, 'none')
assert.equal(windowsDisplay.workflows[0].actionPlan.enabled, false)
assert.equal(windowsRouteOverview.title, 'Windows 路线概览')
assert.equal(windowsRouteOverview.showMacOSDiagnostics, false)
assert.deepEqual(
  windowsRouteOverview.runtimeLanes.map((lane) => lane.lane),
  ['python_cuda', 'onnx_runtime', 'llama_cuda', 'ollama', 'external_http']
)
assert.match(windowsRouteOverview.priorityLabel, /CUDA \/ ONNX \/ Llama/)

const emptyRouteOverview = projectPlatformAiRouteOverviewDisplay(null)
assert.equal(emptyRouteOverview.title, '平台路线概览')
assert.equal(emptyRouteOverview.showMacOSDiagnostics, false)
assert.equal(emptyRouteOverview.primaryRuntimeLaneCaption, '主要运行路线')
assert.deepEqual(emptyRouteOverview.runtimeLanes, [])

assert.equal(
  selectPlatformAiBranchStatus([windowsOnMacStatus, macosStatus])?.platformBranch,
  'macos'
)
assert.equal(
  selectPlatformAiBranchStatus([null, undefined, windowsOnMacStatus]),
  null
)

const plannedMacosStatus = structuredClone(macosStatus)
plannedMacosStatus.workflows.forEach((workflow) => {
  workflow.status = 'planned_capability'
  workflow.evidence = []
  workflow.runtimeLanes.forEach((lane) => {
    lane.status = 'planned_capability'
    lane.evidence = []
  })
})
const realWindowsStatus = structuredClone(macosStatus)
realWindowsStatus.platformBranch = 'windows'
realWindowsStatus.workflows.forEach((workflow) => {
  workflow.status = 'real_model_path'
  workflow.title = 'Display-only title should not affect selection'
  workflow.summary = 'Display-only summary should not affect selection'
  workflow.nextAction = {
    kind: 'none',
    label: 'Display-only action should not affect selection'
  }
})
const realWindowsDisplay = projectPlatformAiBranchStatusDisplay(realWindowsStatus, () => '00:00:00')
assert.equal(realWindowsDisplay.workflows[0].title, 'AI 标签任务')
assert.equal(realWindowsDisplay.workflows[0].nextActionLabel, '当前工作流已有真实模型路径')
assert.equal(realWindowsDisplay.workflows[0].actionPlan.kind, 'none')
assert.equal(
  selectPlatformAiBranchStatus([plannedMacosStatus, realWindowsStatus])?.platformBranch,
  'windows'
)

const modelMissingWorkflow = structuredClone(macosStatus.workflows[0])
modelMissingWorkflow.status = 'evidence_insufficient'
modelMissingWorkflow.missing = [{
  kind: 'model_artifact',
  id: 'ram-plus',
  label: 'RAM++ 模型缺失'
}]
assert.deepEqual(createPlatformAiActionPlan(modelMissingWorkflow), {
  workflow: 'ai_tag_task',
  status: 'evidence_insufficient',
  kind: 'open_model_management',
  label: '下载模型',
  enabled: true,
  reasonKind: 'model_artifact',
  targetId: 'ram-plus'
})

const plannedWorkflow = structuredClone(modelMissingWorkflow)
plannedWorkflow.status = 'planned_capability'
assert.deepEqual(createPlatformAiActionPlan(plannedWorkflow), {
  workflow: 'ai_tag_task',
  status: 'planned_capability',
  kind: 'none',
  label: '尚未实现',
  enabled: false,
  reasonKind: undefined,
  targetId: undefined
})

const dependencyMissingWorkflow = structuredClone(modelMissingWorkflow)
dependencyMissingWorkflow.missing = [{
  kind: 'runtime_dependency',
  id: 'onnxruntime',
  label: 'ONNX Runtime 缺失'
}]
assert.equal(createPlatformAiActionPlan(dependencyMissingWorkflow).kind, 'open_runtime_management')
assert.equal(createPlatformAiActionPlan(dependencyMissingWorkflow).label, '安装依赖')

const backendMissingWorkflow = structuredClone(modelMissingWorkflow)
backendMissingWorkflow.missing = [{
  kind: 'backend_configuration',
  id: 'ollama',
  label: 'Ollama 尚未配置'
}]
assert.equal(createPlatformAiActionPlan(backendMissingWorkflow).kind, 'open_backend_management')

const tiedMacosStatus = structuredClone(plannedMacosStatus)
const tiedWindowsStatus = structuredClone(plannedMacosStatus)
tiedWindowsStatus.platformBranch = 'windows'
tiedWindowsStatus.workflows.forEach((workflow) => {
  workflow.title = 'Different title'
  workflow.summary = 'Different summary'
})
assert.equal(
  selectPlatformAiBranchStatus([tiedMacosStatus, tiedWindowsStatus])?.platformBranch,
  'macos'
)

const aiConsoleSource = await fs.readFile('src/renderer/routes/AiConsolePage.tsx', 'utf8')
assert.match(aiConsoleSource, /projectPlatformAiBranchStatusDisplay/)
assert.match(aiConsoleSource, /workflow\.actionPlan\.enabled/)
assert.match(aiConsoleSource, /onAction\(workflow\.actionPlan\)/)
assert.match(aiConsoleSource, /projectPlatformAiRouteOverviewDisplay/)
assert.match(aiConsoleSource, /routeOverviewDisplay\.showMacOSDiagnostics/)
assert.match(aiConsoleSource, /routeOverviewDisplay\.runtimeLanes\.map/)
assert.match(aiConsoleSource, /selectPlatformAiBranchStatus/)
assert.doesNotMatch(aiConsoleSource, /function branchStatusTone/)
assert.doesNotMatch(aiConsoleSource, /function branchStatusLabel/)
assert.doesNotMatch(aiConsoleSource, /function branchWorkflowTitle/)
assert.doesNotMatch(aiConsoleSource, /workflow\.missing\.map/)
assert.doesNotMatch(aiConsoleSource, /workflow\.evidence\[0\]/)
assert.doesNotMatch(aiConsoleSource, /\.find\(\(branch: PlatformAiBranchStatusResponse/)
assert.doesNotMatch(aiConsoleSource, /branch\?\.workflows\.some/)
assert.doesNotMatch(aiConsoleSource, />Platform AI Branch Status</)
assert.doesNotMatch(aiConsoleSource, /按共享 AI workflow/)
assert.doesNotMatch(aiConsoleSource, /\{workflow\.workflow\}<\/div>/)

console.log('platform-ai-branch-status-display passed')
