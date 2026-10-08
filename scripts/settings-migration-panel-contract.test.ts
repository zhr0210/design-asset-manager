import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { registerDisabledAppIpc } from '../src/main/ipc/disabled-app.ipc'

const panelSource = await fs.readFile('src/renderer/components/settings/SettingsMigrationPanel.tsx', 'utf8')
const settingsRouteSource = await fs.readFile('src/renderer/routes/Settings.tsx', 'utf8')
const settingsStoreSource = await fs.readFile('src/renderer/stores/settings.store.ts', 'utf8')
const aiWorkspaceSource = await fs.readFile('src/renderer/routes/AiWorkspace.tsx', 'utf8')
const compositionSource = await fs.readFile('src/main/ipc/main-ipc-composition.ts', 'utf8')

// A retained panel is not a delivered migration path. Neither formal client
// mounts it, and every compatible legacy migration command is explicitly denied.
assert.doesNotMatch(settingsRouteSource, /SettingsMigrationPanel/)
assert.doesNotMatch(aiWorkspaceSource, /SettingsMigrationPanel/)
assert.match(compositionSource, /registerDisabledAppIpc\(dependencies\.handle\)/)
assert.doesNotMatch(compositionSource, /registerSettingsMigrationIpc\(/)
const disabled = new Map<string, (...args: any[]) => unknown>()
registerDisabledAppIpc((channel, handler) => { disabled.set(channel, handler) })
for (const channel of ['settingsMigration:createPlan', 'settingsMigration:dryRun', 'settingsMigration:analyze', 'settingsMigration:listBackups']) {
  assert.ok(disabled.has(channel), channel)
  assert.deepEqual(await disabled.get(channel)!({}), { success: false, error: 'This operation is unavailable while Active Library authority is active.', code: 'LIBRARY_FEATURE_DISABLED' }, channel)
}
assert.doesNotMatch(settingsRouteSource, /AiRuntimePanel/)

assert.match(panelSource, /getWorkspaceClient\(\)\?\.settingsMigration/)
assert.match(panelSource, /createPlan:/)
assert.match(panelSource, /dryRun:/)
assert.match(panelSource, /analyze:/)
assert.match(panelSource, /listBackups:/)
assert.match(panelSource, /SettingsMigrationPlan/)
assert.match(panelSource, /projectSettingsMigrationStatus/)
assert.match(panelSource, /resolvePlanPanelStatus/)
assert.match(panelSource, /resolveReportPanelStatus/)
assert.match(panelSource, /projectSettingsMigrationSummary/)
assert.match(panelSource, /projectSettingsMigrationBackups/)
assert.match(panelSource, /SETTINGS_MIGRATION_EMPTY_LABELS/)

assert.doesNotMatch(panelSource, /const statusStyles/)
assert.doesNotMatch(panelSource, /const statusLabels/)
assert.doesNotMatch(panelSource, /function getPlanPanelStatus/)
assert.doesNotMatch(panelSource, /function getReportPanelStatus/)
assert.doesNotMatch(panelSource, /function formatSize/)

assert.doesNotMatch(panelSource, /ipcRenderer/)
assert.doesNotMatch(panelSource, /process\.platform/)
assert.doesNotMatch(panelSource, /from ['"](?:node:)?fs['"]|require\(['"](?:node:)?fs['"]\)/)
assert.doesNotMatch(panelSource, /from ['"](?:node:)?path['"]|require\(['"](?:node:)?path['"]\)/)
assert.doesNotMatch(panelSource, /fetch\(|axios|XMLHttpRequest/)
assert.doesNotMatch(panelSource, /applySettingsMigration|rollbackSettingsMigration|applyMigrationFromFile|rollbackMigration/)
assert.doesNotMatch(panelSource, /writeFile|saveSettings|updateSettings/)
assert.doesNotMatch(panelSource, /downloadRuntime|installRuntime|runtimePackageInstaller/)

const effectBlocks = [...panelSource.matchAll(/useEffect\s*\([\s\S]*?\n\s*\}/g)].map((match) => match[0])
assert.equal(effectBlocks.length, 0, 'SettingsMigrationPanel must not auto-run migration checks on mount')

const saveHandlerStart = settingsRouteSource.indexOf('const handleSave')
const saveHandlerEnd = settingsRouteSource.indexOf('const handleClearCache', saveHandlerStart)
const saveHandlerBlock = settingsRouteSource.slice(saveHandlerStart, saveHandlerEnd)
assert.match(saveHandlerBlock, /updateSettings/)
assert.doesNotMatch(saveHandlerBlock, /settingsMigration|createPlan|dryRun|analyze|listBackups/)
assert.doesNotMatch(settingsStoreSource, /settingsMigration|settings-migration/)
console.log('settings-migration retained panel boundaries and formal absence passed')
