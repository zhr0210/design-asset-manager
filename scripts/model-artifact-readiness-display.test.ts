import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  normalizeModelDownloadProgress,
  projectGgufArtifactTileDisplay,
  projectCooperativeModelDownloadProgressDisplay,
  projectCooperativeModelReadinessDetail,
  projectCooperativeModelReadinessDisplay,
  projectCooperativeModelRowDisplay,
  projectCooperativeModelReadinessTone,
  projectModelArtifactRowDisplay,
  resolveActivePromptModelArtifactReady
} from '../src/shared/workflows/model-artifact-readiness.workflow'

assert.equal(projectCooperativeModelReadinessTone('loaded_real'), 'good')
assert.equal(projectCooperativeModelReadinessTone('ready_to_load'), 'good')
assert.equal(projectCooperativeModelReadinessTone(undefined, true), 'good')
assert.equal(projectCooperativeModelReadinessTone('missing_dependencies'), 'bad')
assert.equal(projectCooperativeModelReadinessTone('missing_files'), 'bad')
assert.equal(projectCooperativeModelReadinessTone('loaded_mock_blocked'), 'bad')
assert.equal(projectCooperativeModelReadinessTone('not_downloaded'), 'muted')
assert.equal(projectCooperativeModelReadinessTone('unknown'), 'warn')

assert.equal(projectCooperativeModelReadinessDetail(undefined), 'Worker readiness 待刷新')
assert.equal(projectCooperativeModelReadinessDetail({ state: 'loaded_real', backend: 'ram-real' }), '真实后端：ram-real')
assert.equal(projectCooperativeModelReadinessDetail({ state: 'loaded_real' }), '真实后端：ready')
assert.equal(projectCooperativeModelReadinessDetail({ state: 'ready_to_load' }), '依赖与权重形态已满足')
assert.equal(projectCooperativeModelReadinessDetail({ state: 'loaded_mock_blocked' }), '生产 strict 模式已阻断 mock 输出')
assert.equal(projectCooperativeModelReadinessDetail({ state: 'missing_dependencies', missing_dependencies: ['torch', 'onnxruntime', 'transformers', 'pillow', 'ignored'] }), '依赖缺失：torch, onnxruntime, transformers, pillow')
assert.equal(projectCooperativeModelReadinessDetail({ state: 'missing_dependencies' }), '依赖缺失：unknown')
assert.equal(projectCooperativeModelReadinessDetail({ state: 'missing_files', missing_files: ['model.safetensors', 'config.json', 'tokenizer.json', 'ignored'] }), '权重缺失：model.safetensors, config.json, tokenizer.json')
assert.equal(projectCooperativeModelReadinessDetail({ state: 'missing_files' }), '权重缺失：unknown')
assert.equal(projectCooperativeModelReadinessDetail({ state: 'not_downloaded' }), '尚未下载权重')
assert.equal(projectCooperativeModelReadinessDetail({ state: 'custom', label: '自定义状态' }), '自定义状态')

assert.deepEqual(projectCooperativeModelReadinessDisplay({ isDownloaded: false }), {
  label: '未下载',
  tone: 'warn',
  detail: 'Worker readiness 待刷新'
})

assert.deepEqual(projectCooperativeModelReadinessDisplay({ isDownloaded: true }), {
  label: '等待 Worker 检查',
  tone: 'warn',
  detail: 'Worker readiness 待刷新'
})

assert.deepEqual(projectCooperativeModelReadinessDisplay({
  readiness: { state: 'missing_dependencies', label: '依赖缺失', missing_dependencies: ['torch'] },
  isDownloaded: true
}), {
  label: '依赖缺失',
  tone: 'bad',
  detail: '依赖缺失：torch'
})

assert.deepEqual(projectCooperativeModelDownloadProgressDisplay({
  isDownloading: true,
  progress: 24.6,
  message: '  下载 RAM++ 权重  '
}), {
  shouldShow: true,
  progressPercent: 25,
  progressLabel: '25%',
  messageLabel: '下载 RAM++ 权重'
})

assert.deepEqual(projectCooperativeModelRowDisplay({
  runtimeStatus: {
    loaded: false,
    downloaded: true,
    readiness: {
      state: 'missing_dependencies',
      label: '依赖缺失',
      missing_dependencies: ['torch']
    }
  },
  downloadState: {
    isDownloaded: false,
    isDownloading: true,
    progress: 32,
    message: '下载校验中'
  },
  sourceLabel: 'Python Worker',
  installedVersionCount: 1
}), {
  readiness: {
    label: '依赖缺失',
    tone: 'bad',
    detail: '依赖缺失：torch'
  },
  downloadProgress: {
    shouldShow: true,
    progressPercent: 32,
    progressLabel: '32%',
    messageLabel: '下载校验中'
  },
  artifact: {
    sourceLabel: '已安装 · 本地文件',
    installedVersionsLabel: '1 个已安装版本',
    runtimeStatusLabel: '',
    runtimeStatusTone: 'muted',
    action: 'delete',
    actionLabel: '删除'
  }
})

assert.deepEqual(projectCooperativeModelRowDisplay({
  runtimeStatus: {
    loaded: true,
    readiness: {
      state: 'loaded_real',
      label: '真实后端已加载',
      backend: 'onnx-coreml'
    }
  },
  sourceLabel: 'Python Worker'
}), {
  readiness: {
    label: '真实后端已加载',
    tone: 'good',
    detail: '真实后端：onnx-coreml'
  },
  downloadProgress: {
    shouldShow: false,
    progressPercent: 0,
    progressLabel: '0%',
    messageLabel: ''
  },
  artifact: {
    sourceLabel: 'HuggingFace 仓库',
    installedVersionsLabel: '0 个已安装版本',
    runtimeStatusLabel: '',
    runtimeStatusTone: 'muted',
    action: 'download',
    actionLabel: '下载'
  }
})

assert.deepEqual(projectCooperativeModelDownloadProgressDisplay({
  isDownloading: false,
  progress: 50,
  message: ''
}), {
  shouldShow: true,
  progressPercent: 50,
  progressLabel: '50%',
  messageLabel: ''
})

assert.deepEqual(projectCooperativeModelDownloadProgressDisplay({
  isDownloading: false,
  progress: 100,
  message: '下载完成'
}), {
  shouldShow: false,
  progressPercent: 100,
  progressLabel: '100%',
  messageLabel: '下载完成'
})

assert.deepEqual(projectCooperativeModelDownloadProgressDisplay({
  isDownloading: true,
  progress: Number.NaN,
  message: ''
}), {
  shouldShow: true,
  progressPercent: 0,
  progressLabel: '0%',
  messageLabel: '下载中...'
})

assert.equal(normalizeModelDownloadProgress(-1), 0)
assert.equal(normalizeModelDownloadProgress(101), 100)

assert.deepEqual(projectGgufArtifactTileDisplay(null), {
  smokeValueLabel: '未下载',
  smokeCaptionLabel: 'Qwen3-VL 2B Q4_K_M',
  mmprojValueLabel: '无需',
  mmprojCaptionLabel: 'mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf'
})

assert.deepEqual(projectGgufArtifactTileDisplay({
  name: '  Qwen3-VL smoke  ',
  isDownloaded: false,
  isDownloading: true,
  mmprojFilename: 'mmproj.gguf'
}), {
  smokeValueLabel: '下载中',
  smokeCaptionLabel: 'Qwen3-VL smoke',
  mmprojValueLabel: '下载中',
  mmprojCaptionLabel: 'mmproj.gguf'
})

assert.deepEqual(projectGgufArtifactTileDisplay({
  name: '',
  isDownloaded: true,
  isDownloading: false,
  mmprojFilename: 'mmproj.gguf'
}), {
  smokeValueLabel: '已下载',
  smokeCaptionLabel: '未命名 GGUF',
  mmprojValueLabel: '已就绪',
  mmprojCaptionLabel: 'mmproj.gguf'
})

assert.deepEqual(projectGgufArtifactTileDisplay({
  name: 'Text only',
  isDownloaded: false,
  isDownloading: false,
  mmprojFilename: ''
}), {
  smokeValueLabel: '未下载',
  smokeCaptionLabel: 'Text only',
  mmprojValueLabel: '无需',
  mmprojCaptionLabel: 'mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf'
})

assert.deepEqual(projectModelArtifactRowDisplay({
  isCooperative: true,
  isDownloaded: false,
  isDownloading: false,
  sourceLabel: 'ignored'
}), {
  sourceLabel: 'HuggingFace 仓库',
  installedVersionsLabel: '0 个已安装版本',
  runtimeStatusLabel: '',
  runtimeStatusTone: 'muted',
  action: 'download',
  actionLabel: '下载'
})

assert.deepEqual(projectModelArtifactRowDisplay({
  isCooperative: true,
  isDownloaded: false,
  isDownloading: true,
  sourceLabel: 'ignored',
  installedVersionCount: 2.9
}), {
  sourceLabel: 'HuggingFace 仓库',
  installedVersionsLabel: '2 个已安装版本',
  runtimeStatusLabel: '',
  runtimeStatusTone: 'muted',
  action: 'cancel',
  actionLabel: '取消'
})

assert.deepEqual(projectModelArtifactRowDisplay({
  isCooperative: true,
  isDownloaded: true,
  isDownloading: true,
  sourceLabel: 'ignored'
}), {
  sourceLabel: '已安装 · 本地文件',
  installedVersionsLabel: '0 个已安装版本',
  runtimeStatusLabel: '',
  runtimeStatusTone: 'muted',
  action: 'delete',
  actionLabel: '删除'
})

assert.deepEqual(projectModelArtifactRowDisplay({
  isCooperative: false,
  isLoaded: true,
  sourceLabel: 'Python Worker',
  installedVersionCount: -2
}), {
  sourceLabel: 'Python Worker',
  installedVersionsLabel: '0 个已安装版本',
  runtimeStatusLabel: '已加载',
  runtimeStatusTone: 'good',
  action: null,
  actionLabel: ''
})

assert.equal(resolveActivePromptModelArtifactReady({
  backendMode: 'native-qwen3vl',
  nativeModelDownloaded: true
}), true)
assert.equal(resolveActivePromptModelArtifactReady({
  backendMode: 'native-qwen3vl',
  nativeModelDownloaded: false,
  externalBackendEnabled: true
}), false)
assert.equal(resolveActivePromptModelArtifactReady({
  backendMode: 'llama-openai',
  ggufModelDownloaded: false,
  llamaServerRunning: true
}), true)
assert.equal(resolveActivePromptModelArtifactReady({
  backendMode: 'openai-compatible',
  externalBackendEnabled: true
}), true)

const aiConsoleSource = await fs.readFile('src/renderer/routes/AiConsolePage.tsx', 'utf8')
assert.match(aiConsoleSource, /projectCooperativeModelRowDisplay/)
assert.match(aiConsoleSource, /projectGgufArtifactTileDisplay/)
assert.match(aiConsoleSource, /projectModelArtifactRowDisplay/)
assert.match(aiConsoleSource, /resolveActivePromptModelArtifactReady/)
assert.doesNotMatch(aiConsoleSource, /function cooperativeReadinessTone/)
assert.doesNotMatch(aiConsoleSource, /function cooperativeReadinessDetail/)
assert.doesNotMatch(aiConsoleSource, /readiness\.state === 'loaded_real'/)
assert.doesNotMatch(aiConsoleSource, /readiness\.missing_dependencies/)
assert.doesNotMatch(aiConsoleSource, /readiness\.missing_files/)
assert.doesNotMatch(aiConsoleSource, /downloadProgress\s*>\s*0/)
assert.doesNotMatch(aiConsoleSource, /downloadProgress\s*<\s*100/)
assert.doesNotMatch(aiConsoleSource, /coopState\?\.progress \?\? 0/)
assert.doesNotMatch(aiConsoleSource, /coopState\?\.message \?\? ''/)
assert.doesNotMatch(aiConsoleSource, /smokeGguf\?\.isDownloaded \? '已下载'/)
assert.doesNotMatch(aiConsoleSource, /smokeGguf\?\.isDownloading \? '下载中'/)
assert.doesNotMatch(aiConsoleSource, /smokeGguf\.isDownloaded \? '已就绪'/)
assert.doesNotMatch(aiConsoleSource, /smokeGguf\?\.mmprojFilename \|\|/)
assert.doesNotMatch(aiConsoleSource, /const currentModelReady = promptSettings\.backendMode/)
assert.doesNotMatch(aiConsoleSource, /isDownloaded \? '已安装 · 本地文件' : 'HuggingFace 仓库'/)
assert.doesNotMatch(aiConsoleSource, /loaded \? '已加载' : '未加载'/)
assert.doesNotMatch(aiConsoleSource, /type CooperativeModelReadiness\s*=/)
assert.doesNotMatch(aiConsoleSource, /type CooperativeRuntimeStatus = Record/)
assert.doesNotMatch(aiConsoleSource, /projectCooperativeModelReadinessDisplay\(\{/)
assert.doesNotMatch(aiConsoleSource, /projectCooperativeModelDownloadProgressDisplay\(coopState\)/)

const readinessMapperSource = await fs.readFile(
  'src/main/services/ai-runtime/model-artifact-readiness.mapper.ts',
  'utf8'
)
assert.match(readinessMapperSource, /WorkerModelStatusSnapshot/)
assert.doesNotMatch(readinessMapperSource, /type WorkerModelStatusLike\s*=/)

console.log('model-artifact-readiness-display passed')
