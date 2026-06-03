import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const panelPath = 'src/renderer/components/settings/AiRuntimePanel.tsx'
const matrixPath = 'src/renderer/components/settings/MacOSAiCapabilityMatrix.tsx'
const settingsPath = 'src/renderer/routes/Settings.tsx'
const aiConsolePath = 'src/renderer/routes/AiConsolePage.tsx'
const doctorPanelPath = 'src/renderer/components/settings/DoctorPanel.tsx'

const panelSource = await fs.readFile(panelPath, 'utf8')
const matrixSource = await fs.readFile(matrixPath, 'utf8')
const settingsSource = await fs.readFile(settingsPath, 'utf8')
const aiConsoleSource = await fs.readFile(aiConsolePath, 'utf8')
const doctorPanelSource = await fs.readFile(doctorPanelPath, 'utf8')

assert.ok(panelSource.length > 0)
assert.doesNotMatch(settingsSource, /AiRuntimePanel/)
assert.match(aiConsoleSource, /AiRuntimePanel/)
assert.match(aiConsoleSource, /<AiRuntimePanel \/>/)
assert.match(aiConsoleSource, /'runtime', 'AI 运行时管理'/)
assert.match(settingsSource, /<DoctorPanel \/>/)

assert.match(panelSource, /electronAPI\?\.aiRuntime/)
assert.match(panelSource, /listRuntimes/)
assert.match(panelSource, /getActiveRuntime/)
assert.match(panelSource, /getMacOSCapabilities/)
assert.match(panelSource, /getPythonMpsStatus/)
assert.match(panelSource, /getClipSiglipOnnxStatus/)
assert.match(panelSource, /selectActiveRuntime/)
assert.match(panelSource, /startRuntime/)
assert.match(panelSource, /stopRuntime/)
assert.match(panelSource, /restartRuntime/)
assert.match(panelSource, /healthCheck/)
assert.match(panelSource, /healthCheckAll/)

assert.doesNotMatch(panelSource, /ipcRenderer/)
assert.doesNotMatch(panelSource, /process\.platform/)
assert.doesNotMatch(panelSource, /from ['"]fs['"]|from ['"]path['"]|require\(['"]fs['"]\)|require\(['"]path['"]\)/)
assert.doesNotMatch(panelSource, /\bfetch\s*\(|axios|XMLHttpRequest/)
assert.doesNotMatch(panelSource, /child_process|execFile|runProcess|pythonPath\s*=|ai-service\/app\.py/)
assert.doesNotMatch(panelSource, /\.(download|install)\s*\(|downloadModel|installRuntime|startInstall|runtimePackage[A-Z]/)
assert.doesNotMatch(panelSource, /settingsSave|updateSettings|saveSettings/)

const firstEffectStart = panelSource.indexOf('  useEffect(()')
const firstEffectEnd = panelSource.indexOf('}, [])', firstEffectStart)
const firstEffectBlock = panelSource.slice(firstEffectStart, firstEffectEnd)
assert.match(firstEffectBlock, /loadRuntimes/)
assert.doesNotMatch(firstEffectBlock, /startRuntime|restartRuntime|healthCheck/)

assert.match(panelSource, /AiRuntimeState/)
assert.match(panelSource, /AiRuntimeConfig/)
assert.match(panelSource, /macOS AI 分支/)
assert.match(panelSource, /MacOSAiBranchRuntimeMetadata/)
assert.match(panelSource, /metadata\?\.macosAiBranch/)
assert.match(panelSource, /MacOSAiWorkerProbeResult/)
assert.match(panelSource, /macOS Worker 实时探测/)
assert.match(panelSource, /Python MPS 兼容性检查/)
assert.match(panelSource, /CLIP\/SigLIP ONNX/)
assert.match(panelSource, /CLIP\/SigLIP ONNX 兼容性检查/)
assert.match(panelSource, /MacOSAiCapabilityMatrix/)
assert.match(matrixSource, /macOS 细项能力矩阵/)
assert.match(matrixSource, /probe\.lanes\.map/)
assert.match(matrixSource, /capability\.modelFamily \?\? capability\.backend \?\? capability\.role/)
assert.match(matrixSource, /capability\.label/)

assert.match(doctorPanelSource, /export default function DoctorPanel/)
assert.match(doctorPanelSource, /doctor/)

const handleSaveStart = settingsSource.indexOf('const handleSave')
const handleSaveEnd = settingsSource.indexOf('const handleClearCache', handleSaveStart)
const handleSaveBlock = settingsSource.slice(handleSaveStart, handleSaveEnd)
assert.match(handleSaveBlock, /updateSettings/)
assert.doesNotMatch(handleSaveBlock, /aiRuntime|aiRuntimeSettings|startRuntime|healthCheck/)
