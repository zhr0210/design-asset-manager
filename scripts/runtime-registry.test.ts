import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { DoctorReport } from '../src/shared/types/doctor.types'
import type { ManagedPaths } from '../src/shared/types/platform.types'
import { isInsideDirectory } from '../src/main/platform/path-normalizer'
import {
  cleanupOldRegistryBackups,
  createRegistryBackup,
  listRegistryBackups,
  restoreRegistryBackup
} from '../src/main/bootstrap/runtime-registry.backup'
import { RuntimeRegistryService } from '../src/main/bootstrap/runtime-registry.service'
import {
  getRegistrySchemaVersion,
  isRuntimeRegistryCorrupted,
  validateRuntimeRegistry
} from '../src/main/bootstrap/runtime-registry.validator'

const base = path.join(process.cwd(), 'dist-temp', 'runtime-registry-tests')
await fs.rm(base, { recursive: true, force: true })

const managedPaths: ManagedPaths = {
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

let tick = 0
const service = new RuntimeRegistryService({
  managedPaths,
  now: () => `2026-06-01T00:00:${String(tick++).padStart(2, '0')}.000Z`
})

const missing = await service.read()
assert.equal(missing.initialized, false)
assert.equal(missing.schemaVersion, 1)
assert.equal(isInsideDirectory(managedPaths.userDataDir, service.getRegistryPath()), true)

await service.write(missing)
const afterWrite = await service.read()
assert.equal(afterWrite.paths.registryPath, service.getRegistryPath())

const updated = await service.update({ recommendedProfileId: 'recommended-runtime', metadata: { source: 'test' } })
assert.equal(updated.recommendedProfileId, 'recommended-runtime')
assert.equal(updated.metadata.source, 'test')

const initialized = await service.markInitialized('selected-runtime')
assert.equal(initialized.initialized, true)
assert.equal(initialized.selectedProfileId, 'selected-runtime')
assert.ok(initialized.initializedAt)

const report: DoctorReport = {
  id: 'doctor-runtime-registry-test',
  generatedAt: '2026-06-01T00:01:00.000Z',
  platform: 'win32',
  arch: 'x64',
  profile: 'windows-x64',
  overallStatus: 'warning',
  checks: []
}
const withDoctor = await service.updateDoctorSummary(report)
assert.equal(withDoctor.lastDoctorRunAt, report.generatedAt)
assert.equal(withDoctor.lastDoctorStatus, 'warning')

const runtimeSentinel = path.join(managedPaths.runtimeDir, 'sentinel.txt')
const modelSentinel = path.join(managedPaths.modelsDir, 'sentinel.txt')
await fs.mkdir(managedPaths.runtimeDir, { recursive: true })
await fs.mkdir(managedPaths.modelsDir, { recursive: true })
await fs.writeFile(runtimeSentinel, 'runtime', 'utf8')
await fs.writeFile(modelSentinel, 'model', 'utf8')
await service.reset()
assert.equal(await fs.readFile(runtimeSentinel, 'utf8'), 'runtime')
assert.equal(await fs.readFile(modelSentinel, 'utf8'), 'model')

await service.upsertPackage({
  id: 'python-runtime',
  version: '1.0.0',
  platform: 'win32',
  arch: 'x64',
  installedAt: '2026-06-01T00:02:00.000Z',
  installPath: path.join(managedPaths.runtimeDir, 'python-runtime'),
  sha256: 'abc',
  status: 'installed'
})
await service.upsertPackage({
  id: 'python-runtime',
  version: '1.0.0',
  platform: 'win32',
  arch: 'x64',
  installedAt: '2026-06-01T00:03:00.000Z',
  installPath: path.join(managedPaths.runtimeDir, 'python-runtime'),
  sha256: 'def',
  status: 'installed'
})
assert.equal((await service.listPackages()).length, 1)
assert.equal((await service.listPackages())[0].sha256, 'def')

await service.upsertModel({
  id: 'vision-model',
  version: '1.0.0',
  path: path.join(managedPaths.modelsDir, 'vision-model'),
  sha256: 'abc',
  status: 'available'
})
await service.upsertModel({
  id: 'vision-model',
  version: '1.0.0',
  path: path.join(managedPaths.modelsDir, 'vision-model'),
  sha256: 'def',
  status: 'available'
})
assert.equal((await service.listModels()).length, 1)
assert.equal((await service.listModels())[0].sha256, 'def')

const beforeInvalidWrite = await fs.readFile(service.getRegistryPath(), 'utf8')
await assert.rejects(
  service.write({ ...(await service.read()), schemaVersion: 999 }),
  /validation failed/
)
assert.equal(await fs.readFile(service.getRegistryPath(), 'utf8'), beforeInvalidWrite)

const backupPath = await createRegistryBackup(service.getRegistryPath())
assert.ok(backupPath)
assert.equal(path.basename(backupPath!).endsWith('.json'), true)
const backups = await listRegistryBackups(service.getRegistryPath())
assert.ok(backups.length >= 1)
await fs.writeFile(service.getRegistryPath(), '{"schemaVersion":1}', 'utf8')
await restoreRegistryBackup(backupPath!)
assert.equal((await service.read()).schemaVersion, 1)
await cleanupOldRegistryBackups(1, service.getRegistryPath())
assert.ok((await listRegistryBackups(service.getRegistryPath())).length <= 1)

assert.equal(getRegistrySchemaVersion(), 1)
assert.equal(validateRuntimeRegistry(await service.read()).valid, true)
assert.equal(isRuntimeRegistryCorrupted({ schemaVersion: 999 }), true)

await fs.writeFile(service.getRegistryPath(), '{broken json', 'utf8')
await assert.rejects(service.read(), /corrupted/)

const serviceSource = await fs.readFile('src/main/bootstrap/runtime-registry.service.ts', 'utf8')
assert.doesNotMatch(serviceSource, /download\w*\s*\(/i)
assert.doesNotMatch(serviceSource, /install\w*\s*\(/i)
assert.doesNotMatch(serviceSource, /aiWorker|AI Worker/)

await fs.rm(base, { recursive: true, force: true })
