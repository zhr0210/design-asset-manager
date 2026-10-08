import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { registerDisabledAppIpc } from '../src/main/ipc/disabled-app.ipc'
import {
  CHANNEL_SETTINGS_MIGRATION_ANALYZE,
  CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN,
  CHANNEL_SETTINGS_MIGRATION_DRY_RUN,
  CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS
} from '../src/shared/contracts/settings-migration.contract'

assert.equal(CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN, 'settingsMigration:createPlan')
assert.equal(CHANNEL_SETTINGS_MIGRATION_DRY_RUN, 'settingsMigration:dryRun')
assert.equal(CHANNEL_SETTINGS_MIGRATION_ANALYZE, 'settingsMigration:analyze')
assert.equal(CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS, 'settingsMigration:listBackups')

const contractSource = await fs.readFile('src/shared/contracts/settings-migration.contract.ts', 'utf8')
assert.match(contractSource, /SettingsMigrationCreatePlanRequest/)
assert.match(contractSource, /SettingsMigrationDryRunRequest/)
assert.match(contractSource, /SettingsMigrationAnalyzeRequest/)
assert.match(contractSource, /SettingsMigrationListBackupsRequest/)
assert.match(contractSource, /SettingsMigrationIpcResponse/)
assert.match(contractSource, /SettingsMigrationPlan/)
assert.match(contractSource, /CompatibilityReport/)
assert.doesNotMatch(contractSource, /settingsMigration:apply|settingsMigration:rollback/)
assert.doesNotMatch(contractSource, /ApplyRequest|RollbackRequest/)

const handlerSource = await fs.readFile('src/main/ipc/settings-migration.ipc.ts', 'utf8')
assert.match(handlerSource, /registerSettingsMigrationIpc/)
assert.match(handlerSource, /CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN/)
assert.match(handlerSource, /CHANNEL_SETTINGS_MIGRATION_DRY_RUN/)
assert.match(handlerSource, /CHANNEL_SETTINGS_MIGRATION_ANALYZE/)
assert.match(handlerSource, /CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS/)
assert.match(handlerSource, /SettingsMigrationService/)
assert.doesNotMatch(handlerSource, /applyMigrationFromFile/)
assert.doesNotMatch(handlerSource, /rollbackMigration/)
assert.doesNotMatch(handlerSource, /applySettingsMigration/)
assert.doesNotMatch(handlerSource, /rollbackSettingsMigration/)
assert.doesNotMatch(handlerSource, /writeFile|rename|copyFile|saveSettings\(/)
assert.doesNotMatch(handlerSource, /better-sqlite3|runtime-registry|src\/main\/db|Database\(/)

const mainSource = await fs.readFile('src/main/index.ts', 'utf8')
const compositionSource = await fs.readFile('src/main/ipc/main-ipc-composition.ts', 'utf8')
assert.match(mainSource, /registerMainIpcComposition\(/)
assert.doesNotMatch(mainSource, /registerSettingsMigrationIpc\(/)
assert.match(compositionSource, /registerDisabledAppIpc\(dependencies\.handle\)/)
assert.doesNotMatch(compositionSource, /registerSettingsMigrationIpc\(/)
const disabled = new Map<string, (...args: any[]) => unknown>()
registerDisabledAppIpc((channel, handler) => { disabled.set(channel, handler) })
for (const channel of [CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN, CHANNEL_SETTINGS_MIGRATION_DRY_RUN, CHANNEL_SETTINGS_MIGRATION_ANALYZE, CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS]) {
  assert.ok(disabled.has(channel), channel)
  assert.deepEqual(await disabled.get(channel)!({}), { success: false, error: 'This operation is unavailable while Active Library authority is active.', code: 'LIBRARY_FEATURE_DISABLED' }, channel)
}

const preloadSource = (await fs.readFile('src/preload/index.ts', 'utf8')).replace(/\r\n/g, '\n')
const clientSource = (await fs.readFile('src/shared/client/workspace-client.ts', 'utf8')).replace(/\r\n/g, '\n')
assert.match(preloadSource, /createWorkspaceClient\(/)
assert.match(preloadSource, /exposeInMainWorld\(['"]damClient['"], client\)/)
assert.match(clientSource, /settingsMigration: \{/)
assert.match(clientSource, /createPlan: /)
assert.match(clientSource, /dryRun: /)
assert.match(clientSource, /analyze: /)
assert.match(clientSource, /listBackups: /)

const settingsMigrationBlockStart = clientSource.indexOf('settingsMigration: {')
const settingsMigrationBlockEnd = clientSource.indexOf('\n  },\n\n  // AI Model IPC API', settingsMigrationBlockStart)
assert.notEqual(settingsMigrationBlockStart, -1)
assert.notEqual(settingsMigrationBlockEnd, -1)
const settingsMigrationBlock = clientSource.slice(settingsMigrationBlockStart, settingsMigrationBlockEnd)
assert.doesNotMatch(settingsMigrationBlock, /apply|rollback/)
assert.doesNotMatch(settingsMigrationBlock, /transport\.invoke\(\s*(channel|request\.channel|.*\[.*\])/)
for (const constant of ['CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN', 'CHANNEL_SETTINGS_MIGRATION_DRY_RUN', 'CHANNEL_SETTINGS_MIGRATION_ANALYZE', 'CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS']) assert.match(settingsMigrationBlock, new RegExp('transport\\.invoke\\(' + constant))

const sharedIndexSource = await fs.readFile('src/shared/index.ts', 'utf8')
assert.match(sharedIndexSource, /settings-migration\.contract/)

const settingsRouteSource = await fs.readFile('src/renderer/routes/Settings.tsx', 'utf8')
const settingsStoreSource = await fs.readFile('src/renderer/stores/settings.store.ts', 'utf8')
const saveHandlerStart = settingsRouteSource.indexOf('const handleSave')
const saveHandlerEnd = settingsRouteSource.indexOf('const handleClearCache', saveHandlerStart)
const saveHandlerBlock = settingsRouteSource.slice(saveHandlerStart, saveHandlerEnd)
assert.doesNotMatch(saveHandlerBlock, /settingsMigration|settings-migration|createPlan|dryRun|analyze|listBackups/)
assert.doesNotMatch(settingsStoreSource, /settingsMigration|settings-migration/)
console.log('settings-migration retained narrow Client and formal disabled IPC passed')
