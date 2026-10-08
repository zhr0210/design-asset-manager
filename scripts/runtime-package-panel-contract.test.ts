import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const panelSource = await fs.readFile(
  'src/renderer/components/settings/RuntimePackagePanel.tsx',
  'utf8'
)
const consoleSource = await fs.readFile('src/renderer/routes/AiConsolePage.tsx', 'utf8')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')

assert.match(consoleSource, /import RuntimePackagePanel from/)
assert.match(consoleSource, /activeTab === 'runtime'[\s\S]*<AiRuntimePanel[\s\S]*<RuntimePackagePanel \/>/)
assert.match(panelSource, /data-testid="runtime-package-panel"/)
assert.match(panelSource, /max-w-\[calc\(100vw-32px\)\]/)
assert.match(panelSource, /data-testid="runtime-package-select"/)
assert.match(panelSource, /data-testid="runtime-package-confirm"/)
assert.match(panelSource, /data-testid="runtime-package-progress"/)
assert.match(panelSource, /getRuntimePackageApi/)
assert.match(panelSource, /window\.setTimeout\(poll, POLL_INTERVAL_MS\)/)
assert.match(panelSource, /window\.clearTimeout\(timer\)/)
assert.match(panelSource, /response\.data\.terminal/)
assert.match(panelSource, /confirmed: true/)
assert.match(panelSource, /本地运行时包/)
assert.match(panelSource, /选择清单/)
assert.match(panelSource, /确认安装/)
assert.doesNotMatch(panelSource, /\.manifestPath|\.archivePath|\.installPath|\.stagingPath|\.sha256/)

assert.match(preloadSource, /runtimePackage:\s*\{/)
assert.match(preloadSource, /selectLocalManifest: \(\) => ipcRenderer\.invoke\(CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST\)/)
assert.match(preloadSource, /executeSelection: \(request: RuntimePackageExecuteSelectionRequest\)/)
assert.match(preloadSource, /getExecutionStatus: \(request: RuntimePackageGetExecutionStatusRequest\)/)

console.log('runtime-package-panel-contract passed')
