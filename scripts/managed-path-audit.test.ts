import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ManagedPaths } from '../src/shared/types/platform.types'
import {
  auditManagedPaths,
  auditPathSafety,
  detectHardcodedPathPattern,
  summarizeManagedPathAudit
} from '../src/main/platform/managed-path-audit'
import { pathCheck } from '../src/main/doctor/checks/path.check'
import { permissionCheck } from '../src/main/doctor/checks/permission.check'
import { createLegacyAppSettingsDefaults, createNewInstallAppSettingsDefaults } from '../src/main/services/settings/settings-defaults.builder'

const base = path.join(process.cwd(), 'dist-temp', 'managed-path-audit-tests')
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

await fs.rm(base, { recursive: true, force: true })
await fs.mkdir(userDataDir, { recursive: true })

const report = await auditManagedPaths(managedPaths)
const summary = summarizeManagedPathAudit(report)
assert.equal(report.checkedPaths.length, 9)
assert.equal(summary.errorCount, 0)
assert.ok(report.checkedPaths.every((item) => item.isInsideUserDataDir === true))
assert.ok(report.checkedPaths.every((item) => item.isWritable === undefined))

const untouchedProbeRoot = path.join(base, 'audit-write-probe')
await assert.rejects(() => fs.stat(untouchedProbeRoot))

const windowsHardcoded = detectHardcodedPathPattern(String.raw`C:\Users\designer\AppData\Local\DesignAssetManager`)
assert.equal(windowsHardcoded.hasWindowsDrive, true)
assert.equal(windowsHardcoded.hasWindowsAppData, true)
assert.equal(windowsHardcoded.hasWindowsBackslash, true)

const macHardcoded = detectHardcodedPathPattern('/Users/designer/Library/Application Support/DesignAssetManager')
assert.equal(macHardcoded.hasMacUsersPath, true)
assert.equal(macHardcoded.hasMacLibraryPath, true)

const escaped = await auditPathSafety(`${userDataDir}${path.sep}..${path.sep}outside`, {
  key: 'escaped',
  userDataDir,
  managedRoot: userDataDir
})
assert.equal(escaped.hasPathTraversal, true)
assert.ok(escaped.blockingIssues.some((issue) => issue.includes('path traversal')))

const illegal = await auditPathSafety(path.join(userDataDir, 'bad<name>'), {
  key: 'illegal',
  userDataDir,
  managedRoot: userDataDir
})
assert.equal(illegal.hasIllegalFilenameChars, true)

const assetLibraryDir = path.join(base, 'asset-library')
const modelRootDir = path.join(base, 'model-root')
await fs.mkdir(assetLibraryDir, { recursive: true })
await fs.mkdir(modelRootDir, { recursive: true })
const controlledProbeRoot = path.join(managedPaths.tempDir, 'audit-probe-root')
const writableReport = await auditManagedPaths(managedPaths, {
  checkWritable: true,
  writableProbeRoot: controlledProbeRoot
})
assert.ok(writableReport.checkedPaths.every((item) => item.isWritable === true))
await fs.stat(path.join(controlledProbeRoot, 'managed-path-audit'))
await assert.rejects(() => fs.stat(path.join(assetLibraryDir, 'managed-path-audit')))
await assert.rejects(() => fs.stat(path.join(modelRootDir, 'managed-path-audit')))

const doctorPathResult = await pathCheck.run({
  platformInfo: { platform: 'win32', arch: 'x64', profile: 'windows-x64' },
  managedPaths,
  timeoutMs: 1_000
})
assert.equal(doctorPathResult.id, 'path')
assert.match(JSON.stringify(doctorPathResult.details), /audit/)

const sentinel = path.join(managedPaths.userDataDir, 'sentinel.txt')
await fs.writeFile(sentinel, 'keep', 'utf8')
const permissionResult = await permissionCheck.run({
  platformInfo: { platform: 'win32', arch: 'x64', profile: 'windows-x64' },
  managedPaths,
  timeoutMs: 1_000
})
assert.equal(permissionResult.id, 'permission')
assert.match(JSON.stringify(permissionResult.details), /audit/)
assert.equal(await fs.readFile(sentinel, 'utf8'), 'keep')

const legacyDefaults = createLegacyAppSettingsDefaults()
const newInstallDefaults = createNewInstallAppSettingsDefaults()
assert.equal(newInstallDefaults.libraryPath, legacyDefaults.libraryPath)
assert.equal(newInstallDefaults.modelRootDir, legacyDefaults.modelRootDir)
assert.equal((newInstallDefaults as Record<string, unknown>).downloadPath, undefined)
assert.ok(newInstallDefaults.managedPaths?.logsDir)
assert.ok(newInstallDefaults.managedPaths?.cacheDir)
assert.ok(newInstallDefaults.managedPaths?.tempDir)
assert.ok(newInstallDefaults.managedPaths?.runtimeDir)
assert.ok(newInstallDefaults.managedPaths?.configDir)

const pathCheckSource = await fs.readFile('src/main/doctor/checks/path.check.ts', 'utf8')
const permissionCheckSource = await fs.readFile('src/main/doctor/checks/permission.check.ts', 'utf8')
const builderSource = await fs.readFile('src/main/services/settings/settings-defaults.builder.ts', 'utf8')
const defaultsSource = await fs.readFile('src/main/services/settings/settings-cross-platform-defaults.ts', 'utf8')
const auditSource = await fs.readFile('src/main/platform/managed-path-audit.ts', 'utf8')

assert.match(pathCheckSource, /auditManagedPaths/)
assert.match(permissionCheckSource, /auditManagedPaths/)
assert.doesNotMatch(permissionCheckSource, /asset|libraryPath|modelRootDir/)
assert.match(builderSource, /resolveManagedPaths\(\)/)
assert.match(defaultsSource, /managedPaths\.logsDir/)
assert.match(defaultsSource, /managedPaths\.cacheDir/)
assert.match(defaultsSource, /managedPaths\.tempDir/)
assert.match(defaultsSource, /managedPaths\.runtimeDir/)
assert.doesNotMatch(auditSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(auditSource, /startRuntime|restartRuntime|stopRuntime|child_process|execFile\s*\(/)

await fs.rm(base, { recursive: true, force: true })
