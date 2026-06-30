import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { projectPromptReversePanelState } from '../src/shared/workflows/prompt-reverse.workflow'

assert.deepEqual(projectPromptReversePanelState({
  startingRuntime: true,
  aiPromptStatus: 'failed',
  selectedModelDownloaded: true
}).mode, 'starting_runtime')

assert.deepEqual(projectPromptReversePanelState({
  promptReverseLoading: true,
  selectedModelDownloaded: true
}).mode, 'running_inference')

assert.deepEqual(projectPromptReversePanelState({
  aiPromptStatus: 'running',
  selectedModelDownloaded: true
}).mode, 'running_inference')

const serverError = projectPromptReversePanelState({
  serverError: 'Llama local server failed',
  selectedModelDownloaded: true
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

const ready = projectPromptReversePanelState({
  selectedModelDownloaded: true,
  selectedModelName: 'Qwen3-VL 2B'
})
assert.equal(ready.mode, 'ready_to_run')
assert.equal(ready.primaryActionLabel, '开始图片反推')
assert.match(ready.detail, /Qwen3-VL 2B/)

const needsConfiguration = projectPromptReversePanelState({
  selectedModelName: 'Qwen3-VL 4B'
})
assert.equal(needsConfiguration.mode, 'needs_configuration')
assert.equal(needsConfiguration.showConfigureAction, true)
assert.equal(needsConfiguration.primaryActionLabel, '前往 AI 控制台配置')
assert.match(needsConfiguration.detail, /Qwen3-VL 4B/)

const panelSource = await fs.readFile('src/renderer/components/asset/AssetPromptReversePanel.tsx', 'utf8')
assert.match(panelSource, /projectPromptReversePanelState/)
assert.doesNotMatch(panelSource, /promptReverseLoading\s*\|\|\s*status\s*===\s*['"]running['"]/)
assert.doesNotMatch(panelSource, /serverError\s*\|\|\s*promptReverseError/)
assert.doesNotMatch(panelSource, /已就绪！当前高级反推激活模型为/)
assert.doesNotMatch(panelSource, /请先前往 AI 控制台配置或下载高级反推模型\s*\{/)

console.log('prompt-reverse-workflow passed')
