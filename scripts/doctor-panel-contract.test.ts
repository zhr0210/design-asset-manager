import assert from 'node:assert/strict'
import fs from 'node:fs'

const panelPath = 'src/renderer/components/settings/DoctorPanel.tsx'
assert.equal(fs.existsSync(panelPath), true)

const panelSource = fs.readFileSync(panelPath, 'utf8')
const settingsSource = fs.readFileSync('src/renderer/routes/Settings.tsx', 'utf8')

assert.match(settingsSource, /import DoctorPanel from '\.\.\/components\/settings\/DoctorPanel'/)
assert.match(settingsSource, /<DoctorPanel\s*\/>/)

assert.match(panelSource, /electronAPI\?\.doctor/)
assert.match(panelSource, /repairCheck/)
assert.match(panelSource, /一键修复/)
assert.match(panelSource, /import type \{ DoctorCheckResult, DoctorReport \}/)
assert.match(panelSource, /projectDoctorStatusDisplay/)
assert.match(panelSource, /projectDoctorCheckList/)
assert.match(panelSource, /projectDoctorReportSummaryDisplay/)
assert.match(panelSource, /projectDoctorDetailsLabel/)
assert.doesNotMatch(panelSource, /const\s+INFO_LABELS/)
assert.doesNotMatch(panelSource, /const\s+CHECK_LABELS/)
assert.doesNotMatch(panelSource, /const\s+STATUS_LABELS/)
assert.doesNotMatch(panelSource, /const\s+STATUS_STYLES/)
assert.doesNotMatch(panelSource, /function formatDate/)
assert.doesNotMatch(panelSource, /function stringifyDetails/)
assert.doesNotMatch(panelSource, /复制修复命令/)
assert.doesNotMatch(panelSource, /navigator\.clipboard/)

assert.doesNotMatch(panelSource, /ipcRenderer/)
assert.doesNotMatch(panelSource, /process\.platform/)
assert.doesNotMatch(panelSource, /from 'node:fs'|from "node:fs"|from 'fs'|from "fs"/)
assert.doesNotMatch(panelSource, /from 'node:path'|from "node:path"|from 'path'|from "path"/)
assert.doesNotMatch(panelSource, /Bootstrap/)
assert.doesNotMatch(panelSource, /runtime-registry/)
assert.doesNotMatch(panelSource, /\binstall\w*\s*\(/i)
assert.doesNotMatch(panelSource, /\bdownload\w*\s*\(/i)

const effectBlocks = panelSource.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?\},\s*\[\]\)/g) ?? []
assert.ok(effectBlocks.length > 0)
for (const block of effectBlocks) {
  assert.doesNotMatch(block, /\.runAll\(/)
}
