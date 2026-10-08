import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {performance} from 'node:perf_hooks'
import {createRequire} from 'node:module'
import {buildWindowsQualificationNative} from './windows-native-qualification-build'
import {withGuardedWindowsNativeArtifact, WindowsNativeLoadRetainedError} from './windows-backup-native-load'
import {openWindowsBackupMetadataProbe, type WindowsBackupMetadataAccess} from './windows-backup-metadata-probe'
import {getPreparedWindowsBackupNativeLoader} from './windows-backup-helper-process'

interface GuardianState {pid: number; creationTime: string; waitResult: number; win32Error: number; kernelSignaled: boolean; exitCodeAvailable: boolean; exitCode: number; productionQualified: false}
interface NativeRelease {
  retainGuardian(pid: number): object
  inspectGuardian(token: object): GuardianState
  closeGuardian(token: object): void
  firstMoveRoot(input: {root: string; process: object}): {succeeded: boolean; win32Error: number; ownedGuardianBeforeMove: GuardianState; productionQualified: false}
  inspectOwnRootHandles(root: string): {available: boolean; matchedCount?: number; matches?: unknown[]; hostPid: number; currentHostOnly: true; productionQualified: false}
  verifyLoadedModulePath(expected: string): true
}
let release: NativeRelease | undefined
export async function prepareWindowsBackupReleaseDiagnostic() {
  assert.equal(release, undefined)
  const artifact = await buildWindowsQualificationNative({sourcePath: path.resolve('scripts/fixtures/windows-backup-release-probe.cpp'), outputName: 'backup-release-probe.node', napi: true})
  const loader = getPreparedWindowsBackupNativeLoader()
  const guarded = await withGuardedWindowsNativeArtifact(artifact, {
    load: pin => {
      loader.verifyTransferredPins(pin.hostPins, artifact.artifactSha256)
      const module = createRequire(path.resolve('package.json'))(artifact.path) as NativeRelease
      assert.equal(module.verifyLoadedModulePath(artifact.path), true)
      return module
    }, closeTransferredHandles: handles => loader.closeTransferredHandles(handles)
  })
  release = guarded.value
  return {artifact: {artifactSha256: artifact.artifactSha256, sourceSha256: artifact.sourceSha256, compilerSha256: artifact.compilerSha256}, loadReceipt: guarded.receipt, productionQualified: false}
}

export async function observeWindowsBackupOwnHandlePositiveControl() {
  assert.ok(release)
  const artifact = await buildWindowsQualificationNative({sourcePath: path.resolve('scripts/fixtures/windows-backup-vfs-extension.c'), outputName: 'release-control-vfs.dll', libraries: ['bcrypt.lib'], includeDirectories: [path.resolve('node_modules/better-sqlite3/deps/sqlite3')]})
  const root = path.dirname(artifact.path)
  const opened = openWindowsBackupMetadataProbe({root, target: artifact.path, access: 'read-write'})
  assert.equal(opened.opened, true)
  let held: ReturnType<NativeRelease['inspectOwnRootHandles']>
  try {held = release.inspectOwnRootHandles(root)} finally {opened.session!.close()}
  const closed = release.inspectOwnRootHandles(root)
  console.log(JSON.stringify({releaseNativeDiagnosticPositiveControlObservation: {held: held!, closed, productionQualified: false}}))
  assert.equal(held!.available, true); assert.ok(held!.matchedCount! >= 2)
  assert.equal(closed.available, true); assert.equal(closed.matchedCount, 0)
  assert.throws(() => release!.inspectOwnRootHandles(path.dirname(root)), /RELEASE_ROOT_SCOPE_REFUSED/)
  assert.throws(() => release!.retainGuardian(process.pid), /RELEASE_PARENT_MISMATCH/)
  return {held: held!, closed, scopeRefusal: true, nonChildRefusal: true, productionQualified: false}
}

export type ReleaseDiagnosticMode = 'guardian-wait' | 'native-first-move'

/** Must run in a separate owned test Host: each intentional observer fault
 * leaves guarded preparation UNKNOWN and refuses every later preparation. */
export async function observeWindowsBackupObserverFault(fault: 'throw' | 'thenable') {
  assert.ok(release)
  const artifact = await buildWindowsQualificationNative({sourcePath: path.resolve('scripts/fixtures/windows-backup-vfs-extension.c'), outputName: 'release-observer-fault-vfs.dll', libraries: ['bcrypt.lib'], includeDirectories: [path.resolve('node_modules/better-sqlite3/deps/sqlite3')]})
  let guardian: object | undefined, loaderCalled = false
  try {
    let refusal: WindowsNativeLoadRetainedError | undefined
    await assert.rejects(withGuardedWindowsNativeArtifact(artifact, {
      observeOwnedGuardian: pid => {
        guardian = release!.retainGuardian(pid)
        if (fault === 'throw') throw Error('OWNED_SYNC_OBSERVER_FAULT')
        return Promise.resolve() as unknown as void
      }, load: () => {loaderCalled = true}
    }), error => {
      assert.ok(error instanceof WindowsNativeLoadRetainedError)
      refusal = error
      return true
    })
    assert.equal(loaderCalled, false); assert.ok(guardian); assert.ok(refusal)
    const physicalExit = await refusal.guardianPhysicalExit
    const state = release.inspectGuardian(guardian)
    assert.equal(state.kernelSignaled, true)
    await assert.rejects(withGuardedWindowsNativeArtifact(artifact, {load: () => {loaderCalled = true}}), /NATIVE_LOAD_PREPARATION_RETAINED_UNKNOWN/)
    assert.equal(loaderCalled, false)
    return {fault, loaderCalled, physicalExit, guardian: state, retained: refusal.retained, diagnostic: refusal.diagnostic, nextPreparation: 'REFUSED', productionQualified: false}
  } finally {if (guardian) release.closeGuardian(guardian)}
}

/** Reproduce one fresh owned build's refusal/release path. Each specimen has
 * exactly one first rename attempt; failure is evidence, never retried away. */
export async function observeWindowsBackupImmediateRelease(input: {
  access: Extract<WindowsBackupMetadataAccess, 'read-write' | 'delete'>
  sample: number
  diagnosticMode?: ReleaseDiagnosticMode
}) {
  if (input.diagnosticMode) assert.ok(release)
  const artifact = await buildWindowsQualificationNative({
    sourcePath: path.resolve('scripts/fixtures/windows-backup-vfs-extension.c'),
    outputName: 'release-diagnostic-vfs.dll', libraries: ['bcrypt.lib'],
    includeDirectories: [path.resolve('node_modules/better-sqlite3/deps/sqlite3')]
  })
  const root = path.dirname(artifact.path)
  const opened = openWindowsBackupMetadataProbe({root, target: artifact.path, access: input.access})
  assert.equal(opened.opened, true)
  const held = opened.session!
  let guardian: object | undefined
  let loaderCalled = false, refusal = '', closeStarted = 0, closeFinished = 0
  const saved = root + '-owned-release-diagnostic'
  let renameStarted = 0, renameFinished = 0, renamed = false
  let failure: {code?: string; errno?: number; syscall?: string} | undefined
  let guardianBeforeMove: GuardianState | undefined, nativeWin32Error: number | undefined
  let ownRootHandles: ReturnType<NativeRelease['inspectOwnRootHandles']> | undefined
  let ownerSnapshotStarted = 0, ownerSnapshotFinished = 0
  try {
    try {
      await assert.rejects(withGuardedWindowsNativeArtifact(artifact, {
      load: () => {loaderCalled = true},
      observeOwnedGuardian: input.diagnosticMode ? pid => {guardian = release!.retainGuardian(pid)} : undefined
    }), error => {
      refusal = (error as Error).message
      return /GUARDIAN_NT_OPEN_REFUSED/.test(refusal)
    })
      assert.equal(loaderCalled, false)
    } finally {
      closeStarted = performance.now()
      held.close()
      closeFinished = performance.now()
    }
    renameStarted = performance.now()
    if (input.diagnosticMode === 'native-first-move') {
      assert.ok(guardian)
      const moved = release!.firstMoveRoot({root, process: guardian})
      renamed = moved.succeeded; nativeWin32Error = moved.win32Error; guardianBeforeMove = moved.ownedGuardianBeforeMove
      if (!renamed) failure = {syscall: 'MoveFileExW'}
    } else {
      if (guardian) guardianBeforeMove = release!.inspectGuardian(guardian)
      try {await fs.rename(root, saved); renamed = true}
      catch (error) {
        const e = error as NodeJS.ErrnoException
        failure = {code: e.code, errno: e.errno, syscall: e.syscall}
      }
    }
    renameFinished = performance.now()
    if (input.diagnosticMode) {
      ownerSnapshotStarted = performance.now()
      ownRootHandles = release!.inspectOwnRootHandles(renamed ? saved : root)
      ownerSnapshotFinished = performance.now()
    }
    const currentArtifact = renamed ? path.join(saved, path.basename(artifact.path)) : artifact.path
    const actualHash = createHash('sha256').update(await fs.readFile(currentArtifact)).digest('hex')
    assert.equal(actualHash, artifact.artifactSha256)
  } finally {
    // Restore only a successfully moved owned root. This never retries a
    // failed first rename. Independent PROCESS closure runs even if restore,
    // PSS, the guard assertion or probe closure fails.
    try {if (renamed) await fs.rename(saved, root)}
    finally {if (guardian) release!.closeGuardian(guardian)}
  }
  return {
    sample: input.sample, access: input.access, hostPid: process.pid,
    host: {platform: process.platform, arch: process.arch, versions: process.versions},
    artifact: {artifactSha256: artifact.artifactSha256, sourceSha256: artifact.sourceSha256, compilerSha256: artifact.compilerSha256},
    initial: opened.initial, refusal, loaderCalled, probeCloseReturned: true,
    closeDurationMs: closeFinished - closeStarted,
    closeToRenameMs: renameStarted - closeFinished, renameDurationMs: renameFinished - renameStarted,
    immediateRename: {succeeded: renamed, error: failure ?? null, nativeWin32Error}, bytesUnchanged: true,
    diagnosticMode: input.diagnosticMode ?? 'none', guardianBeforeMove, ownRootHandles,
    renameToOwnerSnapshotMs: ownerSnapshotStarted ? ownerSnapshotStarted - renameFinished : undefined,
    ownerSnapshotDurationMs: ownerSnapshotStarted ? ownerSnapshotFinished - ownerSnapshotStarted : undefined,
    productionQualified: false, releaseOwnerIdentified: false,
    limitation: input.diagnosticMode ? 'Observed bound owned child and later current-Host typed-File duplicates only. PSS captured numeric handles may change before SAME_ACCESS duplication; untyped/unqueryable handles are uncovered. No external owner identified. Instrumentation can alter timing.' : 'Node child close is current completion; no kernel-signaled process or external owner observation in this reproduction.'
  }
}
