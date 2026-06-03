import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  createLegacyAppSettingsDefaults,
  createNewInstallAppSettingsDefaults
} from '../src/main/services/settings/settings-defaults.builder'
import {
  createDefaultLlamaBackendConfig,
  createDefaultPromptReverseSettings
} from '../src/main/services/settings.service'

const legacyDefaults = createLegacyAppSettingsDefaults()
const newInstallDefaults = createNewInstallAppSettingsDefaults()

assert.equal(legacyDefaults.schemaVersion, undefined)
assert.equal(legacyDefaults.platformProfile, undefined)
assert.equal(legacyDefaults.managedPaths, undefined)
assert.equal(legacyDefaults.aiRuntimeSettings, undefined)
assert.equal(legacyDefaults.bootstrapSettings, undefined)
assert.equal(legacyDefaults.doctorSettings, undefined)

assert.equal(newInstallDefaults.schemaVersion, 2)
assert.ok(newInstallDefaults.platformProfile)
assert.ok(newInstallDefaults.managedPaths)
assert.ok(newInstallDefaults.aiRuntimeSettings)
assert.ok(newInstallDefaults.bootstrapSettings)
assert.ok(newInstallDefaults.doctorSettings)

assert.equal(newInstallDefaults.libraryPath, legacyDefaults.libraryPath)
assert.equal(newInstallDefaults.modelRootDir, legacyDefaults.modelRootDir)
assert.equal(newInstallDefaults.selectedPromptModelPath, legacyDefaults.selectedPromptModelPath)

assert.equal(newInstallDefaults.aiRuntimeSettings?.allowLocalPythonWorker, false)
assert.equal(newInstallDefaults.aiRuntimeSettings?.allowExternalInference, false)
assert.equal(newInstallDefaults.aiRuntimeSettings?.healthCheckOnStartup, false)
assert.equal(newInstallDefaults.aiRuntimeSettings?.defaultRuntimeKind, 'disabled')
assert.ok(newInstallDefaults.aiRuntimeSettings?.runtimes.every((runtime) => runtime.kind !== 'python-worker' || runtime.enabled === false))
assert.ok(newInstallDefaults.aiRuntimeSettings?.runtimes.every((runtime) => !['ollama', 'lm-studio', 'llama-app', 'custom-http'].includes(runtime.kind) || runtime.enabled === false))

assert.equal(newInstallDefaults.bootstrapSettings?.status, 'not_initialized')
assert.equal(newInstallDefaults.bootstrapSettings?.mode, 'manual')
assert.equal(newInstallDefaults.doctorSettings?.lastRunAt, null)
assert.equal(newInstallDefaults.doctorSettings?.showInSettings, true)

assert.equal(createDefaultLlamaBackendConfig().enabled, false)
assert.equal(createDefaultPromptReverseSettings().backendMode, 'llama-openai')

const settingsServiceSource = await fs.readFile('src/main/services/settings.service.ts', 'utf8')
const builderSource = await fs.readFile('src/main/services/settings/settings-defaults.builder.ts', 'utf8')
const combinedSource = [settingsServiceSource, builderSource].join('\n')

assert.doesNotMatch(builderSource, /C:\\|\/Users\/|\/Applications\/|\/usr\/local/)

assert.match(settingsServiceSource, /const newInstallDefaults = createNewInstallAppSettingsDefaults\(\)/)
assert.match(settingsServiceSource, /if \(!fs\.existsSync\(this\.configPath\)\)/)
assert.doesNotMatch(settingsServiceSource, /dryRunUpgradeSettings|dryRunInjectCrossPlatformDefaults|runtime-registry/)

const existingReadStart = settingsServiceSource.indexOf("const data = fs.readFileSync(this.configPath, 'utf8')")
const existingReadEnd = settingsServiceSource.indexOf('return this.cache!', existingReadStart)
const existingReadBlock = settingsServiceSource.slice(existingReadStart, existingReadEnd)

assert.doesNotMatch(existingReadBlock, /createNewInstallAppSettingsDefaults|dryRunUpgradeSettings|schemaVersion:|platformProfile:|managedPaths:|aiRuntimeSettings:|bootstrapSettings:|doctorSettings:/)
assert.doesNotMatch(existingReadBlock, /writeFileSync|saveSettings\(/)
assert.match(existingReadBlock, /modelRootDirVal = parsed\.modelRootDir \?\? defaults\.modelRootDir/)
assert.match(existingReadBlock, /aiBackendsVal = Array\.isArray\(parsed\.aiBackends\)/)

assert.doesNotMatch(combinedSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(combinedSource, /child_process|execFile\s*\(|runProcess|startRuntime|restartRuntime|stopRuntime/)
assert.doesNotMatch(combinedSource, /runtime-registry\.service|better-sqlite3|src\/main\/db|Database\(|new\s+Database/)
assert.doesNotMatch(builderSource, /\bwriteFile\s*\(|\breadFile\s*\(|\bmkdir\s*\(|\brm\s*\(|\bunlink\s*\(|\brename\s*\(/)
