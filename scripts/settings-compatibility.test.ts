import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import type { AppSettings } from '../src/shared/types/settings.types'
import type { ManagedPaths } from '../src/shared/types/platform.types'
import {
  analyzeSettingsCompatibility,
  dryRunInjectAiRuntimeSettings,
  dryRunInjectCrossPlatformDefaults,
  dryRunNormalizeManagedPaths,
  dryRunUpgradeSettings,
  explainSettingsUpgradePlan
} from '../src/main/services/settings/settings-compatibility.dry-run'
import { createCrossPlatformSettingsDefaults } from '../src/main/services/settings/settings-cross-platform-defaults'

const managedPaths: ManagedPaths = {
  userDataDir: '/managed/user-data',
  configDir: '/managed/config',
  databaseDir: '/managed/database',
  logsDir: '/managed/logs',
  cacheDir: '/managed/cache',
  runtimeDir: '/managed/runtime',
  modelsDir: '/managed/models',
  tempDir: '/managed/temp',
  downloadsDir: '/managed/downloads'
}

const legacySettings = {
  libraryPath: '~/DesignAssetManager/library',
  concurrency: 3,
  delayInterval: 1.5,
  saveOriginalUrl: true,
  autoThumbnail: true,
  enableTextColorPalette: true,
  textDetectionProvider: 'none',
  textDetectionTimeoutMs: 3_000,
  maxTextBoxes: 30,
  minTextBoxConfidence: 0.5,
  enableTextColorAnalysis: true,
  textBoxProvider: 'easyocr',
  ocrTimeoutMs: 3_000,
  maxTextBoxesPerImage: 30,
  aiBackends: [{
    id: 'legacy-backend',
    name: 'Legacy Backend',
    type: 'llama-openai',
    enabled: true,
    baseUrl: 'http://127.0.0.1:8080/v1',
    timeoutMs: 20_000,
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
  },
  llamaAppConfig: {
    enabled: true,
    baseUrl: 'http://127.0.0.1:8080/v1'
  }
} as Partial<AppSettings> & Record<string, unknown>

const originalSnapshot = JSON.stringify(legacySettings)
const upgraded = dryRunUpgradeSettings(legacySettings, {
  platformProfile: 'linux-x64',
  managedPaths,
  runtimeProfileId: 'external-inference-only'
})

assert.equal(JSON.stringify(legacySettings), originalSnapshot)
assert.equal(upgraded.settings.schemaVersion, 2)
assert.equal(upgraded.settings.platformProfile, 'linux-x64')
assert.equal(upgraded.settings.managedPaths?.modelsDir, '/managed/models')
assert.ok(upgraded.settings.aiRuntimeSettings)
assert.ok(upgraded.settings.bootstrapSettings)
assert.ok(upgraded.settings.doctorSettings)
assert.equal(upgraded.report.wouldChange, true)

const withAiRuntime = dryRunInjectAiRuntimeSettings(legacySettings)
assert.ok(withAiRuntime.settings.aiRuntimeSettings)
assert.deepEqual((withAiRuntime.settings as Record<string, unknown>).llamaAppConfig, legacySettings.llamaAppConfig)
assert.deepEqual((withAiRuntime.settings as Record<string, unknown>).aiWorkerConfig, legacySettings.aiWorkerConfig)
assert.deepEqual(withAiRuntime.settings.aiBackends, legacySettings.aiBackends)

const existingRuntime = dryRunInjectAiRuntimeSettings({
  ...legacySettings,
  aiRuntimeSettings: {
    activeRuntimeId: 'new-runtime',
    defaultRuntimeKind: 'custom-http',
    allowExternalInference: true,
    allowLocalPythonWorker: false,
    healthCheckOnStartup: false,
    runtimes: [{
      id: 'new-runtime',
      kind: 'custom-http',
      enabled: true,
      displayName: 'New Runtime',
      baseUrl: 'http://127.0.0.1:3333',
      healthEndpoint: '/health',
      timeoutMs: 1_000
    }]
  }
})
assert.equal(existingRuntime.settings.aiRuntimeSettings?.activeRuntimeId, 'new-runtime')

const crossPlatform = dryRunInjectCrossPlatformDefaults(legacySettings, {
  platformProfile: 'linux-x64',
  managedPaths,
  runtimeProfileId: 'external-inference-only'
})
assert.equal(crossPlatform.settings.platformProfile, 'linux-x64')
assert.equal(crossPlatform.settings.managedPaths?.downloadsDir, '/managed/downloads')

const pathOnly = dryRunNormalizeManagedPaths({}, { managedPaths })
assert.equal(pathOnly.settings.managedPaths?.runtimeDir, '/managed/runtime')
assert.doesNotMatch(JSON.stringify(pathOnly.settings.managedPaths), /C:\\|\/Users\//)

const defaults = createCrossPlatformSettingsDefaults(
  { platform: 'linux', arch: 'x64', profile: 'linux-x64' },
  managedPaths,
  'external-inference-only'
)
assert.equal(defaults.platformProfile, 'linux-x64')
assert.equal(defaults.bootstrapSettings.recommendedProfileId, 'external-inference-only')
assert.equal(defaults.aiRuntimeSettings.defaultRuntimeKind, 'custom-http')

const report = analyzeSettingsCompatibility(legacySettings, {
  platformProfile: 'linux-x64',
  managedPaths
})
assert.equal(report.wouldChange, true)
assert.equal(report.safeToApplyLater, true)

const blocking = analyzeSettingsCompatibility({
  managedPaths: 'bad',
  aiRuntimeSettings: 'bad'
} as any)
assert.equal(blocking.safeToApplyLater, false)
assert.ok(blocking.blockingIssues.length >= 2)

const explanation = explainSettingsUpgradePlan(legacySettings, { managedPaths })
assert.ok(explanation.some((line) => line.includes('aiRuntimeSettings')))

const settingsTypesSource = await fs.readFile('src/shared/types/settings.types.ts', 'utf8')
assert.match(settingsTypesSource, /schemaVersion\?: number/)
assert.match(settingsTypesSource, /platformProfile\?: PlatformProfile/)
assert.match(settingsTypesSource, /managedPaths\?: Partial<ManagedPaths>/)
assert.match(settingsTypesSource, /aiRuntimeSettings\?: AiRuntimeSettings/)
assert.match(settingsTypesSource, /bootstrapSettings\?: AppBootstrapSettings/)
assert.match(settingsTypesSource, /doctorSettings\?: AppDoctorSettings/)

const helperSource = await fs.readFile('src/main/services/settings/settings-compatibility.dry-run.ts', 'utf8')
const defaultsSource = await fs.readFile('src/main/services/settings/settings-cross-platform-defaults.ts', 'utf8')
const validatorSource = await fs.readFile('src/main/services/settings/settings-compatibility.validator.ts', 'utf8')
const combinedSource = [helperSource, defaultsSource, validatorSource].join('\n')

assert.doesNotMatch(combinedSource, /SettingsService|getInstance|saveSettings|writeFile\s*\(|readFile\s*\(|mkdir\s*\(|rm\s*\(|unlink\s*\(|rename\s*\(/)
assert.doesNotMatch(combinedSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(combinedSource, /child_process|execFile\s*\(|runProcess|startRuntime|restartRuntime|stopRuntime/)
assert.doesNotMatch(combinedSource, /runtime-registry\.service|better-sqlite3|src\/main\/db|Database\(|new\s+Database/)

const settingsServiceSource = await fs.readFile('src/main/services/settings.service.ts', 'utf8')
const settingsRouteSource = await fs.readFile('src/renderer/routes/Settings.tsx', 'utf8')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')

assert.doesNotMatch(settingsServiceSource, /settings-compatibility|dryRunUpgradeSettings|schemaVersion/)
assert.match(settingsRouteSource, /updateSettings/)
assert.doesNotMatch(settingsRouteSource, /aiRuntimeSettings|bootstrapSettings|doctorSettings/)
assert.doesNotMatch(preloadSource, /settings-compatibility|test-settings-compatibility/)
