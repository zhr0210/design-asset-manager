import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ManagedPaths } from '../src/shared/types/platform.types'
import type { RuntimeRegistry } from '../src/shared/types/runtime-registry.types'
import type { RuntimePackageEntry, RuntimePackageExecutionRequest } from '../src/shared/types/runtime-package.types'
import { RuntimeRegistryService } from '../src/main/bootstrap/runtime-registry.service'
import {
  FileSystemRuntimePackageExecutor,
  InMemoryRuntimePackageExecutor
} from '../src/main/runtime-package/runtime-package-executor'
import {
  createBundledRuntimePackageSource,
  createLocalRuntimePackageSource,
  createReservedRemoteRuntimePackageSource
} from '../src/main/runtime-package/runtime-package-source'

const base = path.join(process.cwd(), 'dist-temp', 'runtime-package-executor-tests')
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

const sourceDir = path.join(base, 'source')
await fs.mkdir(sourceDir, { recursive: true })
const archivePath = path.join(sourceDir, 'runtime.zip')
await writeStoredZip(archivePath, [
  { name: 'bin/runtime.txt', contents: Buffer.from('runtime-ready', 'utf8') },
  { name: 'config/default.json', contents: Buffer.from('{"enabled":true}', 'utf8') }
])

const archiveSha256 = createHash('sha256').update(await fs.readFile(archivePath)).digest('hex')
const entry: RuntimePackageEntry = {
  id: 'fixture-runtime',
  name: 'Fixture Runtime',
  description: 'Generated Runtime Package Executor fixture.',
  version: '1.0.0',
  type: 'runtime',
  status: 'available',
  requirement: 'optional',
  installMode: 'managed-runtime',
  platforms: ['all'],
  arch: ['all'],
  profiles: ['external-inference-only'],
  capabilities: ['runtime-package'],
  url: '',
  sha256: archiveSha256,
  sizeBytes: (await fs.stat(archivePath)).size,
  installPathHint: 'runtime/fixture-runtime',
  dependencies: [],
  conflicts: [],
  provides: ['fixture-runtime'],
  warnings: [],
  metadata: {}
}
const source = createLocalRuntimePackageSource('generated-fixtures', sourceDir)
const request: RuntimePackageExecutionRequest = {
  entry,
  source,
  archivePath,
  confirmed: true
}

const registry = new RuntimeRegistryService({
  managedPaths,
  now: () => '2026-06-14T00:00:00.000Z'
})
const executor = new FileSystemRuntimePackageExecutor({
  managedPaths,
  registry,
  now: () => '2026-06-14T00:00:01.000Z',
  createExecutionId: () => 'success'
})
const result = await executor.execute(request)
assert.equal(result.success, true)
assert.equal(result.stage, 'completed')
assert.equal(result.installedVersion, entry.version)
assert.equal(result.rolledBack, false)
assert.deepEqual(result.progress.map((event) => event.stage), [
  'validating',
  'verifying',
  'extracting',
  'promoting',
  'registering',
  'completed'
])
assert.equal('installPath' in result, false)

const installDirectory = path.join(managedPaths.runtimeDir, 'packages', entry.id, entry.version)
assert.equal(await fs.readFile(path.join(installDirectory, 'bin', 'runtime.txt'), 'utf8'), 'runtime-ready')
const installedPackages = await registry.listPackages()
assert.equal(installedPackages.length, 1)
assert.equal(installedPackages[0].sha256, archiveSha256)
assert.equal(installedPackages[0].status, 'installed')

const duplicate = await executor.execute(request)
assert.equal(duplicate.success, false)
assert.equal(duplicate.errorCode, 'INSTALL_TARGET_EXISTS')
assert.equal(duplicate.stage, 'blocked')

const checksumExecutor = new FileSystemRuntimePackageExecutor({
  managedPaths: withRuntimeRoot(managedPaths, 'checksum'),
  createExecutionId: () => 'checksum'
})
const checksumFailure = await checksumExecutor.execute({
  ...request,
  entry: { ...entry, sha256: '0'.repeat(64) }
})
assert.equal(checksumFailure.success, false)
assert.equal(checksumFailure.errorCode, 'CHECKSUM_MISMATCH')
assert.equal(checksumFailure.stage, 'blocked')

const traversalPaths = withRuntimeRoot(managedPaths, 'traversal')
const traversalArchive = path.join(sourceDir, 'traversal.zip')
await writeStoredZip(traversalArchive, [
  { name: '../escape.txt', contents: Buffer.from('blocked', 'utf8') }
])
const traversalSha = createHash('sha256').update(await fs.readFile(traversalArchive)).digest('hex')
const traversalFailure = await new FileSystemRuntimePackageExecutor({
  managedPaths: traversalPaths,
  createExecutionId: () => 'traversal'
}).execute({
  ...request,
  archivePath: traversalArchive,
  entry: { ...entry, id: 'traversal-runtime', sha256: traversalSha }
})
assert.equal(traversalFailure.success, false)
assert.equal(traversalFailure.errorCode, 'ARCHIVE_ENTRY_UNSAFE')
assert.equal(await pathExists(path.join(base, 'escape.txt')), false)

const windowsPathArchive = path.join(sourceDir, 'windows-path.zip')
await writeStoredZip(windowsPathArchive, [
  { name: 'C:\\outside.txt', contents: Buffer.from('blocked', 'utf8') }
])
const windowsPathFailure = await new FileSystemRuntimePackageExecutor({
  managedPaths: withRuntimeRoot(managedPaths, 'windows-path'),
  createExecutionId: () => 'windows-path'
}).execute({
  ...request,
  archivePath: windowsPathArchive,
  entry: {
    ...entry,
    id: 'windows-path-runtime',
    sha256: createHash('sha256').update(await fs.readFile(windowsPathArchive)).digest('hex')
  }
})
assert.equal(windowsPathFailure.errorCode, 'ARCHIVE_ENTRY_UNSAFE')

const collisionArchive = path.join(sourceDir, 'collision.zip')
await writeStoredZip(collisionArchive, [
  { name: 'bin/Runtime.txt', contents: Buffer.from('one', 'utf8') },
  { name: 'bin/runtime.txt', contents: Buffer.from('two', 'utf8') }
])
const collisionFailure = await new FileSystemRuntimePackageExecutor({
  managedPaths: withRuntimeRoot(managedPaths, 'collision'),
  createExecutionId: () => 'collision'
}).execute({
  ...request,
  archivePath: collisionArchive,
  entry: {
    ...entry,
    id: 'collision-runtime',
    sha256: createHash('sha256').update(await fs.readFile(collisionArchive)).digest('hex')
  }
})
assert.equal(collisionFailure.errorCode, 'ARCHIVE_ENTRY_UNSAFE')

const symlinkArchive = path.join(sourceDir, 'symlink.zip')
await writeStoredZip(symlinkArchive, [
  { name: 'bin/runtime-link', contents: Buffer.from('../outside', 'utf8'), mode: 0o120777 }
])
const symlinkFailure = await new FileSystemRuntimePackageExecutor({
  managedPaths: withRuntimeRoot(managedPaths, 'symlink'),
  createExecutionId: () => 'symlink'
}).execute({
  ...request,
  archivePath: symlinkArchive,
  entry: {
    ...entry,
    id: 'symlink-runtime',
    sha256: createHash('sha256').update(await fs.readFile(symlinkArchive)).digest('hex')
  }
})
assert.equal(symlinkFailure.errorCode, 'ARCHIVE_ENTRY_UNSAFE')

const entryLimitFailure = await new FileSystemRuntimePackageExecutor({
  managedPaths: withRuntimeRoot(managedPaths, 'entry-limit'),
  createExecutionId: () => 'entry-limit',
  maxArchiveEntries: 1
}).execute({
  ...request,
  entry: { ...entry, id: 'entry-limit-runtime' }
})
assert.equal(entryLimitFailure.errorCode, 'ARCHIVE_ENTRY_UNSAFE')

const expandedSizeFailure = await new FileSystemRuntimePackageExecutor({
  managedPaths: withRuntimeRoot(managedPaths, 'expanded-size'),
  createExecutionId: () => 'expanded-size',
  maxUncompressedBytes: 1
}).execute({
  ...request,
  entry: { ...entry, id: 'expanded-size-runtime' }
})
assert.equal(expandedSizeFailure.errorCode, 'ARCHIVE_ENTRY_UNSAFE')

const repeatedSeparatorArchive = path.join(sourceDir, 'repeated-separator.zip')
await writeStoredZip(repeatedSeparatorArchive, [
  { name: 'bin//runtime.txt', contents: Buffer.from('blocked', 'utf8') }
])
const repeatedSeparatorFailure = await new FileSystemRuntimePackageExecutor({
  managedPaths: withRuntimeRoot(managedPaths, 'repeated-separator'),
  createExecutionId: () => 'repeated-separator'
}).execute({
  ...request,
  archivePath: repeatedSeparatorArchive,
  entry: {
    ...entry,
    id: 'repeated-separator-runtime',
    sha256: createHash('sha256').update(await fs.readFile(repeatedSeparatorArchive)).digest('hex')
  }
})
assert.equal(repeatedSeparatorFailure.errorCode, 'ARCHIVE_ENTRY_UNSAFE')

const nestedSourceDir = path.join(sourceDir, 'nested')
await fs.mkdir(nestedSourceDir, { recursive: true })
const outsideSourceFailure = await new FileSystemRuntimePackageExecutor({
  managedPaths: withRuntimeRoot(managedPaths, 'outside-source'),
  createExecutionId: () => 'outside-source'
}).execute({
  ...request,
  source: createLocalRuntimePackageSource('nested-source', nestedSourceDir),
  entry: { ...entry, id: 'outside-source-runtime' }
})
assert.equal(outsideSourceFailure.errorCode, 'ARCHIVE_OUTSIDE_SOURCE')

const linkedParentPaths = withRuntimeRoot(managedPaths, 'linked-parent')
const linkedPackagesRoot = path.join(linkedParentPaths.runtimeDir, 'packages')
const outsideInstallRoot = path.join(base, 'linked-parent-outside')
await fs.mkdir(linkedPackagesRoot, { recursive: true })
await fs.mkdir(outsideInstallRoot, { recursive: true })
await fs.symlink(
  outsideInstallRoot,
  path.join(linkedPackagesRoot, 'linked-parent-runtime'),
  process.platform === 'win32' ? 'junction' : 'dir'
)
const linkedParentFailure = await new FileSystemRuntimePackageExecutor({
  managedPaths: linkedParentPaths,
  createExecutionId: () => 'linked-parent'
}).execute({
  ...request,
  entry: { ...entry, id: 'linked-parent-runtime' }
})
assert.equal(linkedParentFailure.errorCode, 'MANAGED_PATH_UNSAFE')
assert.equal(await pathExists(path.join(outsideInstallRoot, entry.version)), false)

const bundledRoot = path.join(base, 'bundled-root')
const bundledSourceDir = path.join(bundledRoot, 'runtime-packages')
const bundledArchive = path.join(bundledSourceDir, 'runtime.zip')
await fs.mkdir(bundledSourceDir, { recursive: true })
await fs.copyFile(archivePath, bundledArchive)
const bundledFailureWithoutRoot = await new FileSystemRuntimePackageExecutor({
  managedPaths: withRuntimeRoot(managedPaths, 'bundled-without-root')
}).execute({
  ...request,
  source: createBundledRuntimePackageSource('bundled', 'runtime-packages'),
  archivePath: bundledArchive,
  entry: { ...entry, id: 'bundled-without-root-runtime' }
})
assert.equal(bundledFailureWithoutRoot.errorCode, 'SOURCE_NOT_ALLOWED')

const bundledResult = await new FileSystemRuntimePackageExecutor({
  managedPaths: withRuntimeRoot(managedPaths, 'bundled'),
  bundledResourceRoot: bundledRoot,
  createExecutionId: () => 'bundled'
}).execute({
  ...request,
  source: createBundledRuntimePackageSource('bundled', 'runtime-packages'),
  archivePath: bundledArchive,
  entry: { ...entry, id: 'bundled-runtime' }
})
assert.equal(bundledResult.success, true)

const concurrentPaths = withRuntimeRoot(managedPaths, 'concurrent')
const concurrentRegistry = new RuntimeRegistryService({ managedPaths: concurrentPaths })
const [concurrentA, concurrentB] = await Promise.all([
  new FileSystemRuntimePackageExecutor({
    managedPaths: concurrentPaths,
    registry: concurrentRegistry,
    createExecutionId: () => 'concurrent-a'
  }).execute({
    ...request,
    entry: { ...entry, id: 'concurrent-runtime-a' }
  }),
  new FileSystemRuntimePackageExecutor({
    managedPaths: concurrentPaths,
    registry: concurrentRegistry,
    createExecutionId: () => 'concurrent-b'
  }).execute({
    ...request,
    entry: { ...entry, id: 'concurrent-runtime-b' }
  })
])
assert.equal(concurrentA.success, true)
assert.equal(concurrentB.success, true)
assert.deepEqual(
  (await concurrentRegistry.listPackages()).map((item) => item.id).sort(),
  ['concurrent-runtime-a', 'concurrent-runtime-b']
)

const mismatchedAccessFailure = await new InMemoryRuntimePackageExecutor().execute({
  ...request,
  source: { ...source, access: 'app-resource' }
})
assert.equal(mismatchedAccessFailure.errorCode, 'SOURCE_NOT_ALLOWED')

const remoteFailure = await new InMemoryRuntimePackageExecutor().execute({
  ...request,
  source: createReservedRemoteRuntimePackageSource('remote', 'https://example.invalid/runtime.zip')
})
assert.equal(remoteFailure.success, false)
assert.equal(remoteFailure.errorCode, 'SOURCE_NOT_ALLOWED')

const modelFailure = await new InMemoryRuntimePackageExecutor().execute({
  ...request,
  entry: { ...entry, type: 'model' }
})
assert.equal(modelFailure.success, false)
assert.equal(modelFailure.errorCode, 'PACKAGE_NOT_ALLOWED')

const platformFailure = await new InMemoryRuntimePackageExecutor({
  platform: 'darwin',
  arch: 'arm64'
}).execute({
  ...request,
  entry: { ...entry, platforms: ['win32'], arch: ['x64'] }
})
assert.equal(platformFailure.success, false)
assert.equal(platformFailure.errorCode, 'PACKAGE_NOT_ALLOWED')

const confirmationFailure = await new InMemoryRuntimePackageExecutor().execute({
  ...request,
  confirmed: false
})
assert.equal(confirmationFailure.success, false)
assert.equal(confirmationFailure.errorCode, 'CONFIRMATION_REQUIRED')

const memoryProgress: string[] = []
const memoryResult = await new InMemoryRuntimePackageExecutor().execute(
  { ...request, entry: { ...entry, id: 'memory-runtime' } },
  (event) => memoryProgress.push(event.stage)
)
assert.equal(memoryResult.success, true)
assert.deepEqual(memoryProgress, ['validating', 'verifying', 'extracting', 'promoting', 'registering', 'completed'])

const rollbackPaths = withRuntimeRoot(managedPaths, 'rollback')
const rollbackRegistryService = new RuntimeRegistryService({ managedPaths: rollbackPaths })
let registryWriteCount = 0
const failOnceRegistry = {
  read: () => rollbackRegistryService.read(),
  write: async (next: RuntimeRegistry) => {
    registryWriteCount += 1
    if (registryWriteCount === 1) throw new Error('injected registry failure')
    await rollbackRegistryService.write(next)
  }
}
const rollbackResult = await new FileSystemRuntimePackageExecutor({
  managedPaths: rollbackPaths,
  registry: failOnceRegistry,
  createExecutionId: () => 'rollback'
}).execute({
  ...request,
  entry: { ...entry, id: 'rollback-runtime' }
})
assert.equal(rollbackResult.success, false)
assert.equal(rollbackResult.errorCode, 'REGISTRY_WRITE_FAILED')
assert.equal(rollbackResult.stage, 'rolled_back')
assert.equal(rollbackResult.rolledBack, true)
assert.equal(
  await pathExists(path.join(rollbackPaths.runtimeDir, 'packages', 'rollback-runtime', entry.version)),
  false
)
assert.equal((await rollbackRegistryService.listPackages()).length, 0)

await fs.rm(base, { recursive: true, force: true })

function withRuntimeRoot(paths: ManagedPaths, suffix: string): ManagedPaths {
  const userDataDir = path.join(base, suffix, 'user-data')
  return {
    userDataDir,
    configDir: path.join(userDataDir, 'config'),
    databaseDir: path.join(userDataDir, 'database'),
    logsDir: path.join(userDataDir, 'logs'),
    cacheDir: path.join(userDataDir, 'cache'),
    runtimeDir: path.join(userDataDir, 'runtime'),
    modelsDir: path.join(userDataDir, 'models'),
    tempDir: path.join(base, suffix, 'temp'),
    downloadsDir: path.join(base, suffix, 'downloads')
  }
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
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
    central.writeUInt32LE(((entry.mode ?? 0o100644) << 16) >>> 0, 38)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)

    offset += local.length + name.length + entry.contents.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  await fs.writeFile(target, Buffer.concat([...localParts, centralDirectory, end]))
}

function crc32(input: Buffer): number {
  let crc = 0xffffffff
  for (const value of input) {
    crc ^= value
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}
