import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { SettingsMigrationService } from '../src/main/services/settings/settings-migration.service'
import {
  createSettingsBackup,
  listSettingsBackups,
  restoreSettingsBackup
} from '../src/main/services/settings/settings-migration.backup'

const root = path.resolve('dist-temp', 'settings-migration-tests')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(root, { recursive: true })

const service = new SettingsMigrationService()
const originalSettings = {
  libraryPath: '~/DesignAssetManager/custom-library',
  modelRootDir: '~/DesignAssetManager/custom-models',
  selectedPromptModelPath: '~/DesignAssetManager/custom-models/qwen/custom',
  concurrency: 3,
  delayInterval: 1.5,
  saveOriginalUrl: true,
  autoThumbnail: true,
  enableTextColorPalette: true,
  textDetectionProvider: 'none',
  textDetectionTimeoutMs: 3000,
  maxTextBoxes: 30,
  minTextBoxConfidence: 0.5,
  enableTextColorAnalysis: true,
  textBoxProvider: 'easyocr',
  ocrTimeoutMs: 3000,
  maxTextBoxesPerImage: 30,
  aiBackends: [{
    id: 'legacy-enabled-backend',
    name: 'Legacy Enabled Backend',
    type: 'llama-openai',
    enabled: true,
    baseUrl: 'http://127.0.0.1:8080/v1',
    timeoutMs: 20000,
    capabilities: {
      chat: true,
      vision: false,
      embeddings: false,
      jsonOutput: true,
      modelList: true,
      modelManagement: false
    },
    priority: 50
  }],
  aiWorkerConfig: {
    enabled: true,
    pythonPath: 'python',
    scriptPath: 'ai-service/app.py',
    workingDirectory: 'ai-service'
  }
}

const originalSnapshot = JSON.stringify(originalSettings)
const plan = service.createMigrationPlan(originalSettings as any)
assert.equal(JSON.stringify(originalSettings), originalSnapshot)
assert.equal(plan.status, 'safe_to_apply')
assert.equal(plan.canApply, true)
assert.equal(plan.backupRequired, true)
assert.equal(plan.dryRunResult.settings.libraryPath, originalSettings.libraryPath)
assert.equal(plan.dryRunResult.settings.modelRootDir, originalSettings.modelRootDir)
assert.equal(plan.dryRunResult.settings.selectedPromptModelPath, originalSettings.selectedPromptModelPath)
assert.equal(plan.dryRunResult.settings.aiRuntimeSettings?.allowLocalPythonWorker, false)
assert.equal(plan.dryRunResult.settings.aiRuntimeSettings?.allowExternalInference, false)
assert.ok(plan.dryRunResult.settings.aiRuntimeSettings?.runtimes.every((runtime) => runtime.kind !== 'python-worker' || runtime.enabled === false))
assert.ok(plan.dryRunResult.settings.aiRuntimeSettings?.runtimes.every((runtime) => !['ollama', 'lm-studio', 'llama-app', 'custom-http'].includes(runtime.kind) || runtime.enabled === false))

const dryRun = service.dryRunFromSettings(originalSettings as any)
assert.equal(JSON.stringify(originalSettings), originalSnapshot)
assert.equal(dryRun.canApply, true)

const blocked = service.createMigrationPlan({ managedPaths: 'bad' } as any)
assert.equal(blocked.status, 'blocked')
assert.equal(blocked.canApply, false)
assert.equal(service.canApplyMigration(blocked), false)

const settingsPath = path.join(root, 'settings.json')
await fs.writeFile(settingsPath, JSON.stringify(originalSettings, null, 2), 'utf8')

const beforeApplyRaw = await fs.readFile(settingsPath, 'utf8')
const applyResult = await service.applyMigrationFromFile(settingsPath)
assert.equal(applyResult.success, true)
assert.ok(applyResult.backupPath)
assert.equal(path.dirname(applyResult.backupPath!), path.join(root, 'settings-backups'))

const afterApply = JSON.parse(await fs.readFile(settingsPath, 'utf8'))
assert.equal(afterApply.libraryPath, originalSettings.libraryPath)
assert.equal(afterApply.modelRootDir, originalSettings.modelRootDir)
assert.equal(afterApply.selectedPromptModelPath, originalSettings.selectedPromptModelPath)
assert.equal(afterApply.aiRuntimeSettings.allowLocalPythonWorker, false)
assert.equal(afterApply.aiRuntimeSettings.allowExternalInference, false)
assert.ok(afterApply.schemaVersion)

const backups = await listSettingsBackups(settingsPath)
assert.equal(backups.length, 1)
assert.equal(await fs.readFile(backups[0], 'utf8'), beforeApplyRaw)
assert.equal((await fs.readdir(root)).includes('settings.json'), true)

const sidecarPath = path.join(root, 'keep.txt')
await fs.writeFile(sidecarPath, 'keep', 'utf8')
const rollbackResult = await service.rollbackMigration(settingsPath, applyResult.backupPath!)
assert.equal(rollbackResult.success, true)
assert.equal(await fs.readFile(settingsPath, 'utf8'), beforeApplyRaw)
assert.equal(await fs.readFile(sidecarPath, 'utf8'), 'keep')

const manualBackup = await createSettingsBackup(settingsPath)
await fs.writeFile(settingsPath, JSON.stringify({ changed: true }, null, 2), 'utf8')
await restoreSettingsBackup(settingsPath, manualBackup)
assert.equal(await fs.readFile(settingsPath, 'utf8'), beforeApplyRaw)

const brokenPath = path.join(root, 'broken-settings.json')
await fs.writeFile(brokenPath, '{ broken json', 'utf8')
const brokenResult = await service.applyMigrationFromFile(brokenPath)
assert.equal(brokenResult.success, false)
assert.equal(await fs.readFile(brokenPath, 'utf8'), '{ broken json')

const settingsServiceSource = await fs.readFile('src/main/services/settings.service.ts', 'utf8')
const migrationSource = await fs.readFile('src/main/services/settings/settings-migration.service.ts', 'utf8')
const backupSource = await fs.readFile('src/main/services/settings/settings-migration.backup.ts', 'utf8')
const combinedSource = [migrationSource, backupSource].join('\n')

const getSettingsStart = settingsServiceSource.indexOf('public getSettings()')
const getSettingsEnd = settingsServiceSource.indexOf('public saveSettings', getSettingsStart)
const getSettingsBlock = settingsServiceSource.slice(getSettingsStart, getSettingsEnd)
assert.doesNotMatch(getSettingsBlock, /applyMigrationFromFile|applySettingsMigration|rollbackSettingsMigration/)

const saveSettingsStart = settingsServiceSource.indexOf('public saveSettings')
const saveSettingsBlock = settingsServiceSource.slice(saveSettingsStart)
assert.doesNotMatch(saveSettingsBlock, /applyMigrationFromFile|applySettingsMigration|rollbackSettingsMigration/)

assert.match(settingsServiceSource, /createMigrationPlan\(\)/)
assert.match(settingsServiceSource, /applySettingsMigration\(\)/)
assert.match(settingsServiceSource, /rollbackSettingsMigration\(backupPath: string\)/)

assert.doesNotMatch(combinedSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(combinedSource, /child_process|execFile\s*\(|runProcess|startRuntime|restartRuntime|stopRuntime/)
assert.doesNotMatch(combinedSource, /runtime-registry\.service|better-sqlite3|src\/main\/db|Database\(|new\s+Database/)
assert.doesNotMatch(combinedSource, /ai-service\/app\.py|llama-runtime-install|ocr-dependency/)

assert.equal((await fs.readdir(root)).includes('keep.txt'), true)
