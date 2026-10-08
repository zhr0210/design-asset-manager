import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { projectPromptReversePanelState } from '../src/shared/workflows/prompt-reverse.workflow'

assert.deepEqual(projectPromptReversePanelState({
  startingRuntime: true,
  aiPromptStatus: 'failed',
  selectedModelLocalEvidence: true
}).mode, 'starting_runtime')

assert.deepEqual(projectPromptReversePanelState({
  promptReverseLoading: true,
  selectedModelLocalEvidence: true
}).mode, 'running_inference')

assert.deepEqual(projectPromptReversePanelState({
  aiPromptStatus: 'running',
  selectedModelLocalEvidence: true
}).mode, 'running_inference')

const serverError = projectPromptReversePanelState({
  serverError: 'Llama local server failed',
  selectedModelLocalEvidence: true
})
assert.equal(serverError.mode, 'error')
assert.equal(serverError.detail, 'Llama local server failed')
assert.equal(serverError.showRetryAction, true)
assert.equal(serverError.primaryActionLabel, '重试反推')

const oomError = projectPromptReversePanelState({
  promptReverseError: { code: 'CUDA_OUT_OF_MEMORY', message: 'raw error', stderr: 'stack' }
})
assert.equal(oomError.mode, 'error')
assert.match(oomError.detail, /显存不足/)
assert.equal(oomError.errorLog, 'stack')

const resultReady = projectPromptReversePanelState({
  hasPromptResult: true,
  selectedModelName: 'Qwen3-VL GGUF'
})
assert.equal(resultReady.mode, 'result_ready')
assert.equal(resultReady.primaryActionLabel, '重新反推')
assert.equal(resultReady.detail, '模型: Qwen3-VL GGUF')

const localEvidence = projectPromptReversePanelState({
  selectedModelLocalEvidence: true,
  selectedModelName: 'Qwen3-VL 2B'
})
assert.equal(localEvidence.mode, 'local_evidence_unverified')
assert.equal(localEvidence.title, '本地模型文件 · 未验证')
assert.equal(localEvidence.primaryActionLabel, '尝试运行')
assert.equal(localEvidence.showRunAction, true)
assert.match(localEvidence.detail, /Qwen3-VL 2B/)
assert.match(localEvidence.detail, /不代表模型制品已验证/)

const needsConfiguration = projectPromptReversePanelState({
  selectedModelName: 'Qwen3-VL 4B'
})
assert.equal(needsConfiguration.mode, 'needs_configuration')
assert.equal(needsConfiguration.showConfigureAction, true)
assert.equal(needsConfiguration.primaryActionLabel, '前往 AI 控制台配置')
assert.match(needsConfiguration.detail, /Qwen3-VL 4B/)
assert.doesNotMatch(needsConfiguration.detail, /下载/)

const panelSource = await fs.readFile('src/renderer/components/asset/AssetPromptReversePanel.tsx', 'utf8')
assert.match(panelSource, /projectPromptReversePanelState/)
assert.doesNotMatch(panelSource, /promptReverseLoading\s*\|\|\s*status\s*===\s*['"]running['"]/)
assert.doesNotMatch(panelSource, /serverError\s*\|\|\s*promptReverseError/)
assert.doesNotMatch(panelSource, /已就绪！当前高级反推激活模型为/)
assert.doesNotMatch(panelSource, /请先前往 AI 控制台配置或下载高级反推模型\s*\{/)
assert.match(panelSource, /selectedModelLocalEvidence/)
assert.doesNotMatch(panelSource, /selectedModelDownloaded/)
assert.doesNotMatch(panelSource, /isDownloaded: true/)

console.log('prompt-reverse-workflow passed')
