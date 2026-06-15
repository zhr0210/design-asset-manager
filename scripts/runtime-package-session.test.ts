import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ManagedPaths } from '../src/shared/types/platform.types'
import type { RuntimePackageEntry, RuntimePackageManifest } from '../src/shared/types/runtime-package.types'
import { RuntimeRegistryService } from '../src/main/bootstrap/runtime-registry.service'
import { FileSystemRuntimePackageExecutor } from '../src/main/runtime-package/runtime-package-executor'
import { RuntimePackageSessionService } from '../src/main/runtime-package/runtime-package-session.service'

const base = path.join(process.cwd(), 'dist-temp', 'runtime-package-session-tests')
await fs.rm(base, { recursive: true, force: true })
await fs.mkdir(base, { recursive: true })

const managedPaths = createManagedPaths(base, 'managed')
const packageDir = path.join(base, 'selected-package')
await fs.mkdir(packageDir, { recursive: true })

const archivePath = path.join(packageDir, 'fixture-runtime.zip')
await writeStoredZip(archivePath, [
  { name: 'bin/runtime.txt', contents: Buffer.from('runtime-ready', 'utf8') }
])
const archiveSha256 = createHash('sha256').update(await fs.readFile(archivePath)).digest('hex')
const archiveSize = (await fs.stat(archivePath)).size
const entry: RuntimePackageEntry = {
  id: 'session-runtime',
  name: 'Session Runtime',
  description: 'Runtime Package Session fixture.',
  version: '1.0.0',
  type: 'runtime',
  status: 'available',
  requirement: 'optional',
  installMode: 'managed-runtime',
  platforms: ['all'],
  arch: ['all'],
  profiles: ['external-inference-only'],
  capabilities: ['runtime-package'],
  url: 'fixture-runtime.zip',
  sha256: archiveSha256,
  sizeBytes: archiveSize,
  installPathHint: 'runtime/session-runtime',
  dependencies: [],
  conflicts: [],
  provides: ['session-runtime'],
  warnings: ['Fixture warning.'],
  metadata: {}
}
const manifestPath = path.join(packageDir, 'runtime-package.json')
await fs.writeFile(manifestPath, JSON.stringify(createManifest([entry]), null, 2))

const progressStages: string[] = []
const registry = new RuntimeRegistryService({ managedPaths })
const service = new RuntimePackageSessionService({
  executor: new FileSystemRuntimePackageExecutor({
    managedPaths,
    registry,
    createExecutionId: () => 'executor-success'
  }),
  now: () => Date.parse('2026-06-15T00:00:00.000Z'),
  createSelectionId: () => 'selection-1',
  createExecutionId: () => 'execution-1',
  onProgress: (snapshot) => progressStages.push(snapshot.stage)
})

const selected = await service.selectLocalManifest(manifestPath)
assert.equal(selected.success, true)
assert.equal(selected.selection?.selectionId, 'selection-1')
assert.equal(selected.selection?.archiveFileName, 'fixture-runtime.zip')
assert.equal(selected.selection?.sha256, archiveSha256)
assert.equal(JSON.stringify(selected).includes(base), false)
assert.equal('archivePath' in (selected.selection ?? {}), false)

const executeResponse = await service.executeSelection({ selectionId: 'selection-1', confirmed: true })
assert.equal(executeResponse.accepted, true)
assert.equal(executeResponse.execution?.executionId, 'execution-1')
assert.equal(executeResponse.execution?.terminal, false)
assert.equal(JSON.stringify(executeResponse).includes(base), false)

const finalSnapshot = await service.waitForExecution('execution-1')
assert.equal(finalSnapshot?.terminal, true)
assert.equal(finalSnapshot?.result?.success, true)
assert.equal(finalSnapshot?.result?.stage, 'completed')
assert.equal(JSON.stringify(finalSnapshot).includes(base), false)
assert.ok(progressStages.includes('completed'))
assert.equal(await fs.readFile(path.join(managedPaths.runtimeDir, 'packages', entry.id, entry.version, 'bin', 'runtime.txt'), 'utf8'), 'runtime-ready')
assert.equal((await registry.listPackages())[0].id, entry.id)

const reused = await service.executeSelection({ selectionId: 'selection-1', confirmed: true })
assert.equal(reused.accepted, false)
assert.equal(reused.errorCode, 'SELECTION_EXPIRED')

const noConfirmService = new RuntimePackageSessionService({
  now: () => Date.parse('2026-06-15T00:00:00.000Z'),
  createSelectionId: () => 'selection-no-confirm'
})
await noConfirmService.selectLocalManifest(manifestPath)
const noConfirm = await noConfirmService.executeSelection({ selectionId: 'selection-no-confirm', confirmed: false })
assert.equal(noConfirm.accepted, false)
assert.equal(noConfirm.errorCode, 'CONFIRMATION_REQUIRED')

let expiredNow = Date.parse('2026-06-15T00:00:00.000Z')
const expiredService = new RuntimePackageSessionService({
  selectionTtlMs: 1,
  now: () => expiredNow,
  createSelectionId: () => 'selection-expired'
})
const expiredSelection = await expiredService.selectLocalManifest(manifestPath)
assert.equal(expiredSelection.success, true)
expiredNow = Date.parse('2026-06-15T00:00:00.002Z')
const expiredExecution = await expiredService.executeSelection({ selectionId: 'selection-expired', confirmed: true })
assert.equal(expiredExecution.accepted, false)
assert.equal(expiredExecution.errorCode, 'SELECTION_EXPIRED')

const badChecksumManifestPath = path.join(packageDir, 'bad-checksum.json')
await fs.writeFile(
  badChecksumManifestPath,
  JSON.stringify(createManifest([{ ...entry, id: 'bad-checksum-runtime', sha256: '0'.repeat(64) }]), null, 2)
)
const badChecksum = await service.selectLocalManifest(badChecksumManifestPath)
assert.equal(badChecksum.success, false)
assert.equal(badChecksum.errorCode, 'CHECKSUM_MISMATCH')

const invalidJsonManifestPath = path.join(packageDir, 'invalid-json.json')
await fs.writeFile(invalidJsonManifestPath, '{not-json')
const invalidJson = await service.selectLocalManifest(invalidJsonManifestPath)
assert.equal(invalidJson.success, false)
assert.equal(invalidJson.errorCode, 'MANIFEST_INVALID')

const multiPackageManifestPath = path.join(packageDir, 'multi-package.json')
await fs.writeFile(
  multiPackageManifestPath,
  JSON.stringify(
    createManifest([
      entry,
      {
        ...entry,
        id: 'session-runtime-alt',
        name: 'Session Runtime Alt',
        provides: ['session-runtime-alt']
      }
    ]),
    null,
    2
  )
)
const ambiguousPackage = await service.selectLocalManifest(multiPackageManifestPath)
assert.equal(ambiguousPackage.success, false)
assert.equal(ambiguousPackage.errorCode, 'PACKAGE_NOT_FOUND')
const selectedAltPackage = await service.selectLocalManifest(multiPackageManifestPath, 'session-runtime-alt')
assert.equal(selectedAltPackage.success, true)
assert.equal(selectedAltPackage.selection?.packageId, 'session-runtime-alt')
assert.equal(JSON.stringify(selectedAltPackage).includes(base), false)

const nestedArchiveManifestPath = path.join(packageDir, 'nested-archive.json')
await fs.writeFile(
  nestedArchiveManifestPath,
  JSON.stringify(createManifest([{ ...entry, id: 'nested-archive-runtime', url: 'nested/fixture-runtime.zip' }]), null, 2)
)
const nestedArchive = await service.selectLocalManifest(nestedArchiveManifestPath)
assert.equal(nestedArchive.success, false)
assert.equal(nestedArchive.errorCode, 'ARCHIVE_INVALID')

const modelManifestPath = path.join(packageDir, 'model.json')
await fs.writeFile(
  modelManifestPath,
  JSON.stringify(createManifest([{ ...entry, id: 'model-runtime', type: 'model' }]), null, 2)
)
const modelSelection = await service.selectLocalManifest(modelManifestPath)
assert.equal(modelSelection.success, false)
assert.equal(modelSelection.errorCode, 'PACKAGE_NOT_SELECTABLE')

await fs.rm(base, { recursive: true, force: true })

function createManifest(packages: RuntimePackageEntry[]): RuntimePackageManifest {
  return {
    schemaVersion: 1,
    manifestVersion: '1.0.0',
    generatedAt: '2026-06-15T00:00:00.000Z',
    packages,
    profiles: ['external-inference-only'],
    metadata: {}
  }
}

function createManagedPaths(root: string, suffix: string): ManagedPaths {
  const userDataDir = path.join(root, suffix, 'user-data')
  return {
    userDataDir,
    configDir: path.join(userDataDir, 'config'),
    databaseDir: path.join(userDataDir, 'database'),
    logsDir: path.join(userDataDir, 'logs'),
    cacheDir: path.join(userDataDir, 'cache'),
    runtimeDir: path.join(userDataDir, 'runtime'),
    modelsDir: path.join(userDataDir, 'models'),
    tempDir: path.join(root, suffix, 'temp'),
    downloadsDir: path.join(root, suffix, 'downloads')
  }
}

async function writeStoredZip(
  target: string,
  entries: Array<{ name: string; contents: Buffer; mode?: number }>
): Promise<void> {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const crc = crc32(entry.contents)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(entry.contents.length, 18)
    local.writeUInt32LE(entry.contents.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    localParts.push(local, name, entry.contents)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(0x0314, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(entry.contents.length, 20)
    central.writeUInt32LE(entry.contents.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE((((entry.mode ?? 0o100644) & 0xffff) << 16) >>> 0, 38)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)

    offset += local.length + name.length + entry.contents.length
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  await fs.writeFile(target, Buffer.concat([...localParts, ...centralParts, end]))
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}
