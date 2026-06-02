import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { ManagedPaths } from '../src/shared/types/platform.types'
import {
  appendManagedLog,
  assertSafeLogPath,
  cleanupManagedLogs,
  readManagedLogTail,
  resolveDebugLogPath,
  resolveLogPaths,
  resolveServiceLogPath,
  sanitizeLogFileName,
  writeManagedLog
} from '../src/main/platform'
import { pathCheck } from '../src/main/doctor/checks/path.check'
import { TextColorExtractor } from '../src/main/services/text-color-extractor.service'

const base = path.join(os.tmpdir(), 'design-asset-manager-log-path-governance-tests')
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

const logPaths = resolveLogPaths(managedPaths)
assert.equal(logPaths.logsDir, path.resolve(managedPaths.logsDir))
assert.ok(logPaths.debugDir.startsWith(logPaths.logsDir))
assert.ok(logPaths.doctorLogsDir.startsWith(logPaths.logsDir))
assert.ok(logPaths.aiRuntimeLogsDir.startsWith(logPaths.logsDir))
assert.ok(logPaths.bootstrapLogsDir.startsWith(logPaths.logsDir))
assert.ok(logPaths.settingsMigrationLogsDir.startsWith(logPaths.logsDir))
assert.ok(logPaths.legacyLogsDir.startsWith(logPaths.logsDir))

const serviceLogPath = resolveServiceLogPath('text/color:extractor?', { managedPaths })
assert.equal(path.basename(serviceLogPath), 'text_color_extractor_.log')
assert.ok(serviceLogPath.startsWith(logPaths.logsDir))

const debugLogPath = resolveDebugLogPath('debug/id:one?', { managedPaths, extension: 'jsonl' })
assert.equal(path.basename(debugLogPath), 'debug_id_one_.jsonl')
assert.ok(debugLogPath.startsWith(logPaths.debugDir))

const resolvedPaths = Object.values(logPaths).concat([serviceLogPath, debugLogPath])
for (const resolvedPath of resolvedPaths) {
  assert.doesNotMatch(resolvedPath, /C:\\Users\\kilian\\AppData/i)
  assert.doesNotMatch(resolvedPath, /C:\\/)
  assert.doesNotMatch(resolvedPath, /^\/Users\//)
}

assert.equal(sanitizeLogFileName('../bad:name.log'), '.._bad_name.log')
assert.throws(() => assertSafeLogPath(path.join(base, 'outside.log'), managedPaths), /outside managed root/)

const writeResult = await writeManagedLog(
  {
    level: 'info',
    source: 'text-color-extractor',
    message: 'test log',
    details: { ok: true },
    correlationId: 'test-correlation'
  },
  { managedPaths, fileName: path.join('test', 'writer.log') }
)
assert.ok(writeResult.path.startsWith(logPaths.logsDir))
assert.match(await fs.readFile(writeResult.path, 'utf8'), /test log/)

const appendResult = await appendManagedLog(path.join('test', 'append.log'), 'hello\n', { managedPaths })
assert.ok(appendResult.path.startsWith(logPaths.logsDir))
assert.equal(await readManagedLogTail(path.join('test', 'append.log'), 5, { managedPaths }), 'ello\n')

await assert.rejects(() => fs.stat(path.join(assetLibraryDir, 'writer.log')))
await assert.rejects(() => fs.stat(path.join(modelRootDir, 'writer.log')))
await assert.rejects(() => fs.stat(path.join(managedPaths.databaseDir, 'writer.log')))

const cleanupDisabled = await cleanupManagedLogs({ managedPaths, fileName: 'ignored.log', enabled: false })
assert.equal(cleanupDisabled.skipped, true)
assert.deepEqual(cleanupDisabled.removed, [])
await fs.stat(writeResult.path)

await fs.writeFile(path.join(logPaths.logsDir, 'cleanup-target.log'), 'remove', 'utf8')
const cleanupEnabled = await cleanupManagedLogs({ managedPaths, fileName: 'ignored.log', enabled: true })
assert.equal(cleanupEnabled.skipped, false)
assert.ok(cleanupEnabled.removed.every((item) => item.startsWith(logPaths.logsDir)))
await assert.rejects(() => fs.stat(path.join(assetLibraryDir, 'cleanup-target.log')))
await assert.rejects(() => fs.stat(path.join(modelRootDir, 'cleanup-target.log')))
await assert.rejects(() => fs.stat(path.join(managedPaths.databaseDir, 'cleanup-target.log')))

const textColorSource = await fs.readFile('src/main/services/text-color-extractor.service.ts', 'utf8')
assert.doesNotMatch(textColorSource, /APPDATA|\.gemini|scratch|antigravity/)
assert.match(textColorSource, /resolveLogPaths/)
assert.match(textColorSource, /assertSafeLogPath/)

const extractor = new TextColorExtractor()
const extractionResult = await extractor.extractTextPalette({
  image_path: path.join(base, 'missing-image.png'),
  text_boxes: [],
  provider: 'test'
})
assert.equal(extractionResult.status, 'failed')
assert.equal(extractionResult.provider, 'test')
assert.ok(Array.isArray(extractionResult.colors))
assert.ok(Array.isArray(extractionResult.background_colors))
assert.ok(Array.isArray(extractionResult.warnings))

const doctorPathResult = await pathCheck.run({
  platformInfo: { platform: 'win32', arch: 'x64', profile: 'windows-x64' },
  managedPaths,
  timeoutMs: 1_000
})
assert.match(JSON.stringify(doctorPathResult.details), /logsDir/)
assert.match(JSON.stringify(doctorPathResult.details), /debugDir/)

const resolverSource = await fs.readFile('src/main/platform/log-path-resolver.ts', 'utf8')
const writerSource = await fs.readFile('src/main/platform/managed-log-writer.ts', 'utf8')
assert.doesNotMatch(resolverSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(writerSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(resolverSource, /startRuntime|restartRuntime|stopRuntime|child_process|execFile\s*\(/)
assert.doesNotMatch(writerSource, /startRuntime|restartRuntime|stopRuntime|child_process|execFile\s*\(/)

await fs.rm(base, { recursive: true, force: true })
