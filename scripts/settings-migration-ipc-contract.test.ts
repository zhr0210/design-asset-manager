import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
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
assert.match(mainSource, /registerSettingsMigrationIpc/)

const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
assert.match(preloadSource, /settingsMigration: \{/)
assert.match(preloadSource, /createPlan: /)
assert.match(preloadSource, /dryRun: /)
assert.match(preloadSource, /analyze: /)
assert.match(preloadSource, /listBackups: /)

const settingsMigrationBlockStart = preloadSource.indexOf('settingsMigration: {')
const settingsMigrationBlockEnd = preloadSource.indexOf('\n  },\n\n  // AI Model IPC API', settingsMigrationBlockStart)
const settingsMigrationBlock = preloadSource.slice(settingsMigrationBlockStart, settingsMigrationBlockEnd)
assert.doesNotMatch(settingsMigrationBlock, /apply|rollback/)
assert.doesNotMatch(settingsMigrationBlock, /ipcRenderer\.invoke\(\s*(channel|request\.channel|.*\[.*\])/)

const sharedIndexSource = await fs.readFile('src/shared/index.ts', 'utf8')
assert.match(sharedIndexSource, /settings-migration\.contract/)

const settingsRouteSource = await fs.readFile('src/renderer/routes/Settings.tsx', 'utf8')
const settingsStoreSource = await fs.readFile('src/renderer/stores/settings.store.ts', 'utf8')
assert.doesNotMatch(settingsRouteSource, /settingsMigration|settings-migration/)
assert.doesNotMatch(settingsStoreSource, /settingsMigration|settings-migration/)
