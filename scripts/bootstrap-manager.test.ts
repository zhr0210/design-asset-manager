import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { DoctorReport } from '../src/shared/types/doctor.types'
import type { ManagedPaths } from '../src/shared/types/platform.types'
import { BootstrapManager } from '../src/main/bootstrap/bootstrap-manager'
import { resolveBootstrapRecommendation } from '../src/main/bootstrap/bootstrap-profile-resolver'
import { RuntimeRegistryService } from '../src/main/bootstrap/runtime-registry.service'

function makeManagedPaths(base: string): ManagedPaths {
  return {
    userDataDir: path.join(base, 'user-data'),
    configDir: path.join(base, 'user-data', 'config'),
    databaseDir: path.join(base, 'user-data', 'database'),
    logsDir: path.join(base, 'user-data', 'logs'),
    cacheDir: path.join(base, 'user-data', 'cache'),
    runtimeDir: path.join(base, 'user-data', 'runtime'),
    modelsDir: path.join(base, 'user-data', 'models'),
    tempDir: path.join(base, 'temp'),
    downloadsDir: path.join(base, 'downloads')
  }
}

function reportWith(checks: DoctorReport['checks']): DoctorReport {
  return {
    id: 'bootstrap-manager-test-report',
    generatedAt: '2026-06-01T00:00:00.000Z',
    platform: 'win32',
    arch: 'x64',
    profile: 'windows-x64',
    overallStatus: checks.some((check) => check.status === 'error') ? 'error' : checks.some((check) => check.status === 'warning') ? 'warning' : 'ok',
    checks
  }
}

const aiWorkerWarningReport = reportWith([
  { id: 'system', label: 'system', status: 'ok', message: 'ok', durationMs: 1 },
  { id: 'path', label: 'path', status: 'ok', message: 'ok', durationMs: 1 },
  { id: 'node', label: 'node', status: 'ok', message: 'ok', durationMs: 1 },
  { id: 'permission', label: 'permission', status: 'ok', message: 'ok', durationMs: 1 },
  { id: 'ai-worker', label: 'ai-worker', status: 'warning', message: 'offline', durationMs: 1 }
])

const base = path.join(process.cwd(), 'dist-temp', 'bootstrap-manager-tests')
await fs.rm(base, { recursive: true, force: true })

let runAllCount = 0
const registryService = new RuntimeRegistryService({
  managedPaths: makeManagedPaths(base),
  now: () => '2026-06-01T00:00:00.000Z'
})
const manager = new BootstrapManager({
  runtimeRegistryService: registryService,
  doctorService: {
    async runAll() {
      runAllCount += 1
      return aiWorkerWarningReport
    }
  }
})

const start = await manager.startCheck()
assert.equal(runAllCount, 1)
assert.equal(start.state.status, 'recommendation_ready')
assert.equal(start.recommendation.recommendedMode, 'lightweight')
assert.equal(start.recommendation.blockingIssues.length, 0)
assert.equal(start.registry.lastDoctorRunAt, aiWorkerWarningReport.generatedAt)
assert.equal(start.registry.lastDoctorStatus, 'warning')

const blockingRegistry = registryService.createDefault()
const blocking = resolveBootstrapRecommendation(
  reportWith([
    { id: 'path', label: 'path', status: 'error', message: 'not writable', durationMs: 1 },
    { id: 'permission', label: 'permission', status: 'error', message: 'denied', durationMs: 1 }
  ]),
  blockingRegistry
)
assert.equal(blocking.canContinue, false)
assert.equal(blocking.blockingIssues.length, 2)

const lightweight = await manager.confirmLightweightMode()
assert.equal(lightweight.state.selectedProfileId, 'lightweight')
assert.equal(lightweight.registry.selectedProfileId, 'lightweight')

const completed = await manager.completeBootstrapWithoutInstall()
assert.equal(completed.completed, true)
assert.equal(completed.state.status, 'completed')
assert.equal(completed.registry.initialized, true)
assert.equal(completed.registry.selectedProfileId, 'lightweight')

const externalBase = path.join(base, 'external')
const externalManager = new BootstrapManager({
  runtimeRegistryService: new RuntimeRegistryService({ managedPaths: makeManagedPaths(externalBase) }),
  doctorService: { async runAll() { return aiWorkerWarningReport } }
})
await externalManager.startCheck()
const external = await externalManager.confirmExternalInferenceOnlyMode()
assert.equal(external.state.selectedProfileId, 'external_inference_only')
assert.equal(external.registry.selectedProfileId, 'external_inference_only')

const skipBase = path.join(base, 'skip')
const skipRegistry = new RuntimeRegistryService({ managedPaths: makeManagedPaths(skipBase) })
const skipManager = new BootstrapManager({
  runtimeRegistryService: skipRegistry,
  doctorService: { async runAll() { return aiWorkerWarningReport } }
})
await skipManager.startCheck()
const skipped = await skipManager.skipBootstrap()
assert.equal(skipped.state.status, 'skipped')
assert.equal(skipped.registry.initialized, false)

const retryBase = path.join(base, 'retry')
const retryManager = new BootstrapManager({
  runtimeRegistryService: new RuntimeRegistryService({ managedPaths: makeManagedPaths(retryBase) }),
  doctorService: {
    async runAll() {
      throw new Error('doctor failed')
    }
  }
})
await assert.rejects(retryManager.startCheck(), /doctor failed/)
assert.equal(retryManager.getState().status, 'failed')
const retried = await retryManager.retryBootstrap()
assert.equal(retried.state.status, 'checking')
const reset = await retryManager.resetBootstrap()
assert.equal(reset.state.status, 'not_initialized')

const managerSource = await fs.readFile('src/main/bootstrap/bootstrap-manager.ts', 'utf8')
assert.doesNotMatch(managerSource, /ipcMain|ipcRenderer/)
assert.doesNotMatch(managerSource, /settingsSave|settingsLoad|Settings/)
assert.doesNotMatch(managerSource, /better-sqlite3|sqlite|database/i)
assert.doesNotMatch(managerSource, /download\w*\s*\(/i)
assert.doesNotMatch(managerSource, /install(Runtime|Package|Model|Python|Cuda|Dependency)\w*\s*\(/i)
assert.doesNotMatch(managerSource, /download(Runtime|Package|Model)\w*\s*\(/i)
assert.doesNotMatch(managerSource, /startServer|startWorker|runPromptReverse/i)

await fs.rm(base, { recursive: true, force: true })
