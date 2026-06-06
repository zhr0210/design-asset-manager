import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const summaryPath = 'src/renderer/components/settings/PathGovernanceSummary.tsx'
const doctorPanelPath = 'src/renderer/components/settings/DoctorPanel.tsx'
const settingsPath = 'src/renderer/routes/Settings.tsx'

const summarySource = await fs.readFile(summaryPath, 'utf8')
const doctorPanelSource = await fs.readFile(doctorPanelPath, 'utf8')
const settingsSource = await fs.readFile(settingsPath, 'utf8')

assert.ok(summarySource.length > 0)
assert.match(doctorPanelSource, /PathGovernanceSummary/)
assert.match(doctorPanelSource, /<PathGovernanceSummary report=\{report\} \/>/)
assert.match(summarySource, /projectDoctorPathSummaryDisplay/)
assert.doesNotMatch(summarySource, /const\s+STATUS_STYLE/)
assert.doesNotMatch(summarySource, /MANAGED_PATH_KEYS/)
assert.doesNotMatch(summarySource, /function buildSummary/)
assert.doesNotMatch(summarySource, /function collectPaths/)
assert.doesNotMatch(summarySource, /function maskPath/)
assert.doesNotMatch(summarySource, /Path governance/)
assert.doesNotMatch(summarySource, /No Doctor report has been loaded yet/)

assert.doesNotMatch(summarySource, /ipcRenderer|electronAPI|window\.electronAPI/)
assert.doesNotMatch(summarySource, /process\.platform/)
assert.doesNotMatch(summarySource, /from ['"](?:node:)?fs['"]|from ['"](?:node:)?path['"]|require\(['"](?:node:)?fs['"]\)|require\(['"](?:node:)?path['"]\)/)
assert.doesNotMatch(summarySource, /writeFile|unlink|rename|openPath|revealInFolder/)
assert.doesNotMatch(summarySource, /\brm\s*\(|\brmSync\s*\(/)
assert.doesNotMatch(summarySource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(summarySource, /startRuntime|restartRuntime|stopRuntime|child_process|execFile\s*\(/)
assert.doesNotMatch(summarySource, />[^<]*(cleanup|migrate|repair)[^<]*</i)
assert.doesNotMatch(summarySource, /button/i)

const effectBlocks = doctorPanelSource.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\)/g) ?? []
assert.ok(effectBlocks.every((block) => !block.includes('runAll')))
assert.match(doctorPanelSource, /api\.runAll\(\)/)
assert.match(doctorPanelSource, /api\.getLastReport\(\)/)
assert.match(doctorPanelSource, /api\.clearLastReport\(\)/)
assert.match(doctorPanelSource, /api\.listChecks\(\)/)

assert.match(settingsSource, /updateSettings\(\{/)
assert.doesNotMatch(settingsSource, /PathGovernanceSummary/)
assert.doesNotMatch(settingsSource, /test-path-governance-panel/)
