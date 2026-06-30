import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const panelSource = await fs.readFile('src/renderer/components/settings/SettingsMigrationPanel.tsx', 'utf8')
const settingsRouteSource = await fs.readFile('src/renderer/routes/Settings.tsx', 'utf8')
const settingsStoreSource = await fs.readFile('src/renderer/stores/settings.store.ts', 'utf8')

assert.match(settingsRouteSource, /SettingsMigrationPanel/)
assert.match(settingsRouteSource, /<SettingsMigrationPanel \/>/)
assert.doesNotMatch(settingsRouteSource, /AiRuntimePanel/)

assert.match(panelSource, /electronAPI\?\.\s*settingsMigration/)
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
