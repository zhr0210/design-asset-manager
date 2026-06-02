import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ManagedPaths } from '../src/shared/types/platform.types'
import {
  assertSafeCachePath,
  assertSafeTempPath,
  cleanupManagedCache,
  cleanupManagedTemp,
  readManagedCache,
  removeManagedCache,
  removeManagedTempFile,
  resolveCachePaths,
  resolveServiceCachePath,
  resolveServiceTempPath,
  resolveTempPaths,
  sanitizeCacheKey,
  writeManagedCache,
  writeManagedTempFile
} from '../src/main/platform'
import { pathCheck } from '../src/main/doctor/checks/path.check'

const base = path.join(process.cwd(), 'dist-temp', 'cache-temp-governance-tests')
const userDataDir = path.join(base, 'user-data')
const managedPaths: ManagedPaths = {
  userDataDir,
  configDir: path.join(userDataDir, 'config'),
  databaseDir: path.join(userDataDir, 'database'),
  logsDir: path.join(userDataDir, 'logs'),
  cacheDir: path.join(userDataDir, 'cache'),
  runtimeDir: path.join(userDataDir, 'runtime'),
  modelsDir: path.join(userDataDir, 'models'),
  tempDir: path.join(userDataDir, 'temp'),
  downloadsDir: path.join(userDataDir, 'downloads')
}
const assetLibraryDir = path.join(base, 'asset-library')
const modelRootDir = path.join(base, 'model-root')

await fs.rm(base, { recursive: true, force: true })
await fs.mkdir(userDataDir, { recursive: true })
await fs.mkdir(assetLibraryDir, { recursive: true })
await fs.mkdir(modelRootDir, { recursive: true })

const cachePaths = resolveCachePaths(managedPaths)
const tempPaths = resolveTempPaths(managedPaths)

assert.equal(cachePaths.cacheDir, path.resolve(managedPaths.cacheDir))
assert.equal(tempPaths.tempDir, path.resolve(managedPaths.tempDir))
assert.ok(cachePaths.diagnosticCacheDir.startsWith(cachePaths.cacheDir))
assert.ok(cachePaths.thumbnailCacheDir.startsWith(cachePaths.cacheDir))
assert.ok(cachePaths.aiRuntimeCacheDir.startsWith(cachePaths.cacheDir))
assert.ok(tempPaths.doctorTempDir.startsWith(tempPaths.tempDir))
assert.ok(tempPaths.bootstrapTempDir.startsWith(tempPaths.tempDir))
assert.ok(tempPaths.settingsMigrationTempDir.startsWith(tempPaths.tempDir))
assert.ok(tempPaths.testTempDir.startsWith(tempPaths.tempDir))

const serviceCachePath = resolveServiceCachePath('text/color:extractor?', { managedPaths })
assert.equal(path.basename(serviceCachePath), 'text_color_extractor_.cache')
assert.ok(serviceCachePath.startsWith(cachePaths.cacheDir))

const serviceTempPath = resolveServiceTempPath('text/color:extractor?', { managedPaths })
assert.equal(path.basename(serviceTempPath), 'text_color_extractor_.tmp')
assert.ok(serviceTempPath.startsWith(tempPaths.tempDir))

const resolvedPaths = Object.values(cachePaths).concat(Object.values(tempPaths), [serviceCachePath, serviceTempPath])
for (const resolvedPath of resolvedPaths) {
  assert.doesNotMatch(resolvedPath, /C:\\Users\\kilian\\AppData/i)
  assert.doesNotMatch(resolvedPath, /C:\\/)
  assert.doesNotMatch(resolvedPath, /^\/Users\//)
}

assert.equal(sanitizeCacheKey('../bad:name.cache'), '.._bad_name.cache')
assert.throws(() => assertSafeCachePath(path.join(base, 'outside.cache'), managedPaths), /outside managed root/)
assert.throws(() => assertSafeTempPath(path.join(base, 'outside.tmp'), managedPaths), /outside managed root/)

const cacheWrite = await writeManagedCache(path.join('test', 'palette.cache'), 'cache-value', { managedPaths })
assert.ok(cacheWrite.path.startsWith(cachePaths.cacheDir))
assert.equal(await readManagedCache(path.join('test', 'palette.cache'), { managedPaths }), 'cache-value')

const tempWrite = await writeManagedTempFile(path.join('test', 'palette.tmp'), 'temp-value', { managedPaths })
assert.ok(tempWrite.path.startsWith(tempPaths.tempDir))
assert.equal(await fs.readFile(tempWrite.path, 'utf8'), 'temp-value')

await assert.rejects(() => fs.stat(path.join(assetLibraryDir, 'palette.cache')))
await assert.rejects(() => fs.stat(path.join(modelRootDir, 'palette.cache')))
await assert.rejects(() => fs.stat(path.join(managedPaths.databaseDir, 'palette.cache')))

await removeManagedCache(path.join('test', 'palette.cache'), { managedPaths })
await assert.rejects(() => fs.stat(cacheWrite.path))
await assert.rejects(() => fs.stat(path.join(assetLibraryDir, 'palette.cache')))

await removeManagedTempFile(path.join('test', 'palette.tmp'), { managedPaths })
await assert.rejects(() => fs.stat(tempWrite.path))
await assert.rejects(() => fs.stat(path.join(assetLibraryDir, 'palette.tmp')))

await writeManagedCache(path.join('test', 'cleanup.cache'), 'cleanup', { managedPaths })
await writeManagedTempFile(path.join('test', 'cleanup.tmp'), 'cleanup', { managedPaths })

const cleanupCacheDisabled = await cleanupManagedCache({ managedPaths, enabled: false })
const cleanupTempDisabled = await cleanupManagedTemp({ managedPaths, enabled: false })
assert.equal(cleanupCacheDisabled.skipped, true)
assert.equal(cleanupTempDisabled.skipped, true)
await fs.stat(path.join(cachePaths.cacheDir, 'test', 'cleanup.cache'))
await fs.stat(path.join(tempPaths.tempDir, 'test', 'cleanup.tmp'))

const cleanupCacheEnabled = await cleanupManagedCache({ managedPaths, enabled: true })
const cleanupTempEnabled = await cleanupManagedTemp({ managedPaths, enabled: true })
assert.equal(cleanupCacheEnabled.skipped, false)
assert.equal(cleanupTempEnabled.skipped, false)
assert.ok(cleanupCacheEnabled.removed.every((item) => item.startsWith(cachePaths.cacheDir)))
assert.ok(cleanupTempEnabled.removed.every((item) => item.startsWith(tempPaths.tempDir)))

await assert.rejects(() => fs.stat(path.join(assetLibraryDir, 'cleanup.cache')))
await assert.rejects(() => fs.stat(path.join(modelRootDir, 'cleanup.cache')))
await assert.rejects(() => fs.stat(path.join(managedPaths.databaseDir, 'cleanup.cache')))

const doctorPathResult = await pathCheck.run({
  platformInfo: { platform: 'win32', arch: 'x64', profile: 'windows-x64' },
  managedPaths,
  timeoutMs: 1_000
})
assert.match(JSON.stringify(doctorPathResult.details), /cacheDir/)
assert.match(JSON.stringify(doctorPathResult.details), /tempDir/)
assert.match(JSON.stringify(doctorPathResult.details), /diagnosticCacheDir/)
assert.match(JSON.stringify(doctorPathResult.details), /testTempDir/)

const resolverSource = await fs.readFile('src/main/platform/cache-path-resolver.ts', 'utf8')
const writerSource = await fs.readFile('src/main/platform/managed-cache-writer.ts', 'utf8')
assert.doesNotMatch(resolverSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(writerSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(resolverSource, /startRuntime|restartRuntime|stopRuntime|child_process|execFile\s*\(/)
assert.doesNotMatch(writerSource, /startRuntime|restartRuntime|stopRuntime|child_process|execFile\s*\(/)

await fs.rm(base, { recursive: true, force: true })
