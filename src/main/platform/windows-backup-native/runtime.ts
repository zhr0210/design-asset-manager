import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import type Database from 'better-sqlite3'
import { captureWindowsBackupConnection, validateWindowsBackupSource, type WindowsBackupSourceEvidence } from '../windows-backup-source.internal'
import { WindowsBackupPhysicalExitUnconfirmedError } from '../windows-backup-lifecycle.internal'
import { WINDOWS_BACKUP_RUNTIME_DIRECTORY, WINDOWS_BACKUP_RUNTIME_MANIFEST_SHA256, WINDOWS_BACKUP_RUNTIME_SOURCE_DIGEST } from './source-identity'
import type { WindowsBackupNativeRuntime, WindowsBackupRuntimeIdentity, WindowsBackupTargetReceipt } from './contracts'

const localRequire = createRequire(typeof __filename === 'string' ? __filename : import.meta.url)
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const roles = { supervisor: 'supervisor.node', launcher: 'launcher.exe', target: 'target.exe', source: 'source.dll' } as const
interface Manifest {
  protocol: number; platform: string; arch: string; sourceDigest: string
  runtime: { electron: string; node: string; abi: string; napi: string; sqliteVersion: string; sqliteSource: string }
  sqliteNativeSha256: string
  artifacts: Record<keyof typeof roles, { name: string; bytes: number; sha256: string }>
  inputs: Array<{ name: string; sha256: string }>
  loadBoundary: string
  profile: { maxImageBytes: number; processCommitBytes: number; jobCommitBytes: number; rssHardLimited: boolean }
}
interface NativeExit {
  stdout: string; stderr: string; exited: boolean; pid: number; exitCode: number
  launcherPeakWorkingSet: number; launcherPeakCommit: number; jobPeakCommit: number
  processLimit: number; jobLimit: number; jobEmpty: boolean; killed: boolean
}
interface Supervisor {
  verifyLoadedModulePath(file: string): true
  launch(input: { launcher: string; target: string; supervisor: string; launcherSha256: string; targetSha256: string; supervisorSha256: string; environment: string }): object
  poll(owner: object, discard?: boolean): NativeExit
  write(owner: object, bytes: Buffer, callback: (error: Error | null) => void): void
  end(owner: object): void
  kill(owner: object): boolean
  release(owner: object): void
  reapUnknown(): boolean
}

/** Checked bytes belong to the application's trusted bundle. This is detection
 * of deployment drift, not atomic exclusion of hostile same-principal writers. */
function boundedFile(file: string, maximum: number): Buffer {
  const resolved = path.resolve(file), root = path.parse(resolved).root
  let parent = root
  for (const component of resolved.slice(root.length).split(path.sep)) {
    parent = path.join(parent, component)
    if (fs.lstatSync(parent).isSymbolicLink()) throw Error('BACKUP_RUNTIME_REPARSE_REFUSED')
  }
  const info = fs.lstatSync(resolved)
  if (!info.isFile() || info.nlink !== 1 || info.size < 1 || info.size > maximum) throw Error('BACKUP_RUNTIME_FILE_REFUSED')
  const bytes = fs.readFileSync(resolved)
  if (bytes.length !== info.size) throw Error('BACKUP_RUNTIME_FILE_CHANGED')
  return bytes
}

/** Must be called after actual admission. No compiler, installer, guardian,
 * provider, model, or runtime database is started/read by this loader. */
export function loadWindowsBackupRuntime(input: { bundleDirectory: string; assertPermit(): void }): WindowsBackupNativeRuntime {
  input.assertPermit()
  if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('BACKUP_RUNTIME_PLATFORM_REFUSED')
  if (!/^bundle-[A-Za-z0-9]+$/u.test(WINDOWS_BACKUP_RUNTIME_DIRECTORY)) throw Error('BACKUP_RUNTIME_DIRECTORY_REFUSED')
  const directory = path.join(path.resolve(input.bundleDirectory), WINDOWS_BACKUP_RUNTIME_DIRECTORY)
  const manifestBytes = boundedFile(path.join(directory, 'manifest.json'), 16384)
  if (sha(manifestBytes) !== WINDOWS_BACKUP_RUNTIME_MANIFEST_SHA256) throw Error('BACKUP_RUNTIME_MANIFEST_MISMATCH')
  const manifest = JSON.parse(manifestBytes.toString('utf8')) as Manifest
  if (manifest.protocol !== 1 || manifest.platform !== 'win32' || manifest.arch !== 'x64' || manifest.sourceDigest !== WINDOWS_BACKUP_RUNTIME_SOURCE_DIGEST ||
    manifest.loadBoundary !== 'trusted-application-bundle' || manifest.profile.maxImageBytes !== 4194304 || manifest.profile.processCommitBytes !== 134217728 ||
    manifest.profile.jobCommitBytes !== 268435456 || manifest.profile.rssHardLimited !== false ||
    ['electron', 'node', 'abi', 'napi'].some(key => manifest.runtime[key as keyof Manifest['runtime']] !== process.versions[key === 'abi' ? 'modules' : key])) throw Error('BACKUP_RUNTIME_IDENTITY_MISMATCH')
  const sqliteNative = localRequire.resolve('better-sqlite3/build/Release/better_sqlite3.node')
  if (sha(boundedFile(sqliteNative, 16777216)) !== manifest.sqliteNativeSha256) throw Error('BACKUP_RUNTIME_SQLITE_NATIVE_MISMATCH')
  const artifactPaths = {} as Record<keyof typeof roles, string>
  for (const role of Object.keys(roles) as Array<keyof typeof roles>) {
    const artifact = manifest.artifacts[role]
    if (artifact.name !== roles[role] || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 1 || artifact.bytes > 1048576) throw Error('BACKUP_RUNTIME_ARTIFACT_REFUSED')
    artifactPaths[role] = path.join(directory, artifact.name)
    const bytes = boundedFile(artifactPaths[role], 1048576)
    if (bytes.length !== artifact.bytes || sha(bytes) !== artifact.sha256) throw Error('BACKUP_RUNTIME_ARTIFACT_MISMATCH')
  }
  input.assertPermit()
  const native = localRequire(artifactPaths.supervisor) as Supervisor
  native.verifyLoadedModulePath(artifactPaths.supervisor)
  const identity: WindowsBackupRuntimeIdentity = Object.freeze({ protocol: 1, manifestSha256: sha(manifestBytes), sourceDigest: manifest.sourceDigest,
    sqliteVersion: manifest.runtime.sqliteVersion, sqliteSource: manifest.runtime.sqliteSource, sqliteNativeSha256: manifest.sqliteNativeSha256,
    artifacts: Object.freeze(Object.fromEntries(Object.entries(manifest.artifacts).map(([key, value]) => [key, value.sha256])) as WindowsBackupRuntimeIdentity['artifacts']),
    loadBoundary: 'trusted-application-bundle', rssHardLimited: false })
  let poison = false, activeTargets = 0, sourcePins = 0
  const loaded = new WeakSet<Database.Database>()
  const assertReady = () => { input.assertPermit(); if (poison || !native.reapUnknown()) throw Error('BACKUP_RUNTIME_RELEASE_UNKNOWN') }
  const bindSource: WindowsBackupNativeRuntime['bindSource'] = (database, control) => {
    assertReady()
    const connection = captureWindowsBackupConnection(database, control)
    const version = database.prepare('SELECT sqlite_version() AS version').get() as { version: string }
    const source = database.prepare('SELECT sqlite_source_id() AS source').get() as { source: string }
    if (version.version !== identity.sqliteVersion || source.source !== identity.sqliteSource) throw Error('BACKUP_RUNTIME_SQLITE_SOURCE_MISMATCH')
    if (!loaded.has(database)) { database.loadExtension(artifactPaths.source); loaded.add(database) }
    // Prepare while binding the settled connection, before caller hooks can
    // place sidecars. Reservation must not introduce a new schema read merely
    // to compile the private scalar dispatcher.
    const sourceStatement = database.prepare('SELECT dam_windows_backup_source(?,?)').pluck()
    const query = (operation: string, parameter: string | null = null) => sourceStatement.get(operation, parameter)
    const parse = (value: unknown) => {
      if (typeof value !== 'string' || Buffer.byteLength(value) > 4096) throw Error('BACKUP_RUNTIME_SOURCE_RECEIPT_REFUSED')
      const evidence = JSON.parse(value) as WindowsBackupSourceEvidence
      validateWindowsBackupSource(evidence, captureWindowsBackupConnection(database, control))
      return evidence
    }
    let before: WindowsBackupSourceEvidence
    try { before = parse(query('pin', path.resolve(control, 'library.sqlite'))); validateWindowsBackupSource(before, connection) }
    catch (error) {
      try { if (query('close') !== 1) throw Error('BACKUP_SOURCE_CLOSE_UNKNOWN') }
      catch {
        poison = true
        // The binding has not reached the caller, so the failure itself must
        // carry the unresolved physical release and retain its reservation.
        throw new WindowsBackupPhysicalExitUnconfirmedError(new Promise(() => {}), 'BACKUP_SOURCE_CLOSE_UNKNOWN')
      }
      throw error
    }
    sourcePins++
    let closed = false, journalReserved = false, journalHandedOff = false
    return { before, recheck: () => { assertReady(); if (closed) throw Error('BACKUP_SOURCE_ALREADY_CLOSED'); return parse(query('read')) },
      reserveJournal: () => {
        assertReady()
        // Native sidecar refusal precedes any SQLite read that could consume
        // an existing journal/WAL. The immutable connection snapshot is held.
        if(closed||journalReserved||database.readonly||database.inTransaction)
          throw Error('BACKUP_SOURCE_JOURNAL_RESERVATION_REFUSED')
        if(query('reserve-journal')!==1)throw Error('BACKUP_SOURCE_JOURNAL_RESERVATION_REFUSED')
        journalReserved=true
      },
      handoffJournal: () => {
        assertReady()
        if(closed||!journalReserved||journalHandedOff||database.readonly||!database.inTransaction||database.pragma('locking_mode',{simple:true})!=='normal'||database.pragma('user_version',{simple:true})!==connection.schemaVersion)
          throw Error('BACKUP_SOURCE_JOURNAL_HANDOFF_REFUSED')
        // SQLite's same-value header write opens its actual rollback journal.
        // Native code verifies the overlapping win32 handle before releasing
        // our no-delete-sharing reservation; domain writes follow this handoff.
        database.pragma(`user_version = ${connection.schemaVersion}`)
        if(query('handoff-journal')!==1)throw Error('BACKUP_SOURCE_JOURNAL_HANDOFF_REFUSED')
        journalHandedOff=true
      },
      close: () => {
        if (closed) return
        closed = true
        try { if (!database.open || query('close') !== 1) throw Error('BACKUP_SOURCE_CLOSE_UNKNOWN'); sourcePins-- }
        catch {
          poison = true
          throw new WindowsBackupPhysicalExitUnconfirmedError(new Promise(() => {}), 'BACKUP_SOURCE_CLOSE_UNKNOWN')
        }
      } }
  }

  const runTarget: WindowsBackupNativeRuntime['runTarget'] = async targetInput => {
    assertReady()
    const { control, operation, image, signal } = targetInput
    if (path.resolve(control) !== control || !/^[A-Za-z]:\\/u.test(control) || !/^tag-intent-[a-f0-9]{32}$/u.test(operation) ||
      !Buffer.isBuffer(image) || image.length < 100 || image.length > 4194304) throw Error('BACKUP_RUNTIME_TARGET_INPUT_REFUSED')
    signal.throwIfAborted()
    const systemRoot = process.env.SystemRoot ?? 'C:\\Windows'
    const environment = Object.entries({ SystemRoot: systemRoot, WINDIR: systemRoot, DAM_BACKUP_HELPER_TARGET_PATH: artifactPaths.target,
      DAM_BACKUP_CONTROL: control, DAM_BACKUP_OPERATION: operation }).map(([key, value]) => {
      if (value.includes('\0')) throw Error('BACKUP_RUNTIME_ENVIRONMENT_REFUSED')
      return key + '=' + value
    }).join('\0') + '\0'
    let owner: object
    try { owner = native.launch({ launcher: artifactPaths.launcher, target: artifactPaths.target, supervisor: artifactPaths.supervisor,
      launcherSha256: identity.artifacts.launcher, targetSha256: identity.artifacts.target, supervisorSha256: identity.artifacts.supervisor, environment }) }
    catch (error) {
      if (!native.reapUnknown()) { poison = true; throw new WindowsBackupPhysicalExitUnconfirmedError(new Promise(() => {})) }
      throw error
    }
    activeTargets++
    let released = false, terminationRequested = false, pendingSource: { resolve(evidence: WindowsBackupSourceEvidence): void; reject(error: Error): void } | undefined
    let confirmRelease!: () => void, rejectTarget: ((error: Error) => void) | undefined
    const actualRelease = new Promise<void>(resolve => { confirmRelease = resolve })
    let releaseDeadline: ReturnType<typeof setTimeout> | undefined
    let graceDeadline: ReturnType<typeof setTimeout> | undefined
    let output = '', receiptLine = '', resourceLine = '', sourceSent = false, heldSeen = false, callbackSettled = false, failure: Error | undefined
    const killAndObserve = () => {
      if (released || terminationRequested) return
      terminationRequested = true
      try { native.kill(owner) } catch { /* Physical observation below retains unknown. */ }
      releaseDeadline = setTimeout(() => rejectTarget?.(new WindowsBackupPhysicalExitUnconfirmedError(actualRelease)), 5000)
    }
    const fail = (error: unknown, gracefulCancellation = false) => {
      if (failure) return
      failure = error instanceof Error ? error : Error('BACKUP_RUNTIME_TARGET_FAILED')
      pendingSource?.reject(failure); pendingSource = undefined
      if (gracefulCancellation && heldSeen) {
        // Existing command 0 finishes a held target without granting DDL. A
        // queued source request can emit its one reply; failure-mode polling
        // discards that reply while the logical request is already rejected.
        void writing.then(() => write(Buffer.from([0]))).then(() => native.end(owner)).catch(killAndObserve)
        graceDeadline = setTimeout(killAndObserve, 5000)
      } else killAndObserve()
      // Every deadline leaves the exact owner, pipes, image and permit charged
      // until the continuing observer confirms physical release.
    }
    const write = (bytes: Buffer) => new Promise<void>((resolve, reject) => {
      try { native.write(owner, bytes, error => error ? reject(error) : resolve()) } catch (error) { reject(error) }
    })
    let writing = Promise.resolve()
    const frame = (bytes: Buffer) => {
      const header = Buffer.alloc(4); header.writeInt32LE(bytes.length)
      writing = writing.then(() => write(header)).then(() => write(bytes))
      void writing.catch(fail)
    }
    const recheckSource = () => new Promise<WindowsBackupSourceEvidence>((resolve, reject) => {
      if (pendingSource || !heldSeen || released || failure) { reject(Error('BACKUP_RUNTIME_SOURCE_REQUEST_REFUSED')); return }
      pendingSource = { resolve, reject }
      writing = writing.then(() => write(Buffer.from([2])))
      void writing.catch(fail)
    })
    const line = (value: string) => {
      if (Buffer.byteLength(value) > 8192) throw Error('BACKUP_RUNTIME_OUTPUT_BOUND_REFUSED')
      if (value.startsWith('PINNED ')) {
        if (sourceSent || heldSeen) throw Error('BACKUP_RUNTIME_PROTOCOL_REFUSED')
        sourceSent = true
        const binding = targetInput.onSource(JSON.parse(value.slice(7)) as WindowsBackupSourceEvidence)
        const bytes = Buffer.from(binding, 'utf8')
        if (!bytes.length || bytes.length > 4096) throw Error('BACKUP_RUNTIME_BINDING_REFUSED')
        const captured = JSON.parse(binding)
        if (captured.operation !== operation || captured.imageSha256 !== sha(image)) throw Error('BACKUP_RUNTIME_BINDING_REFUSED')
        frame(bytes)
      } else if (value.startsWith('SOURCE ')) {
        if (!pendingSource) throw Error('BACKUP_RUNTIME_PROTOCOL_REFUSED')
        const request = pendingSource; pendingSource = undefined
        request.resolve(JSON.parse(value.slice(7)) as WindowsBackupSourceEvidence)
      } else if (value.startsWith('HELD ')) {
        if (!sourceSent || heldSeen || !/^[a-f0-9]{64}$/u.test(value.slice(5))) throw Error('BACKUP_RUNTIME_PROTOCOL_REFUSED')
        heldSeen = true
        void Promise.resolve().then(() => targetInput.whileHeld(value.slice(5), recheckSource)).then(async decision => {
          if (released || failure) return
          if (decision !== 0 && decision !== 1) throw Error('BACKUP_RUNTIME_DECISION_REFUSED')
          await writing; await write(Buffer.from([decision])); native.end(owner)
        }).catch(fail).finally(() => { callbackSettled = true })
      } else if (value.startsWith('RESOURCE ')) {
        if (resourceLine) throw Error('BACKUP_RUNTIME_PROTOCOL_REFUSED')
        resourceLine = value.slice(9)
      } else {
        if (receiptLine) throw Error('BACKUP_RUNTIME_PROTOCOL_REFUSED')
        receiptLine = value
      }
    }
    const abort = () => fail(signal.reason ?? Error('BACKUP_RUNTIME_CANCELLED'), true)
    signal.addEventListener('abort', abort, { once: true })
    const deadline = setTimeout(() => fail(Error('BACKUP_RUNTIME_TARGET_TIMEOUT')), 20000)
    frame(image)
    try {
      return await new Promise<WindowsBackupTargetReceipt>((resolve, reject) => {
        rejectTarget = reject
        const timer = setInterval(() => {
          try {
            const observed = native.poll(owner, !!failure)
            if (!failure) {
              output += observed.stdout
              if (observed.stderr) throw Error('BACKUP_RUNTIME_TARGET_STDERR')
              let newline: number
              while ((newline = output.indexOf('\n')) >= 0) { const value = output.slice(0, newline).replace(/\r$/u, ''); output = output.slice(newline + 1); line(value) }
            }
            if (!observed.exited) return
            clearInterval(timer)
            pendingSource?.reject(Error('BACKUP_RUNTIME_SOURCE_CLOSED')); pendingSource = undefined
            try { native.release(owner); released = true; activeTargets--; confirmRelease(); clearTimeout(releaseDeadline); clearTimeout(graceDeadline) } catch { poison = true; reject(new WindowsBackupPhysicalExitUnconfirmedError(actualRelease, 'BACKUP_RUNTIME_NATIVE_CLOSE_UNKNOWN')); return }
            if (failure) { reject(failure); return }
            if (output.trim() || !receiptLine || !resourceLine || observed.killed || observed.exitCode !== 0 || !observed.jobEmpty ||
              !callbackSettled || observed.processLimit !== 134217728 || observed.jobLimit !== 268435456 || observed.jobPeakCommit > observed.jobLimit) throw Error('BACKUP_RUNTIME_EXIT_RECEIPT_REFUSED')
            const resource = JSON.parse(resourceLine)
            if (resource.protocol !== 1 || resource.targetExited !== true || resource.targetExitCode !== 0 || resource.processLimit !== 134217728 || resource.jobLimit !== 268435456 ||
              !Number.isSafeInteger(resource.targetPeakCommit) || resource.targetPeakCommit <= 0 || resource.targetPeakCommit > resource.processLimit ||
              !Number.isSafeInteger(observed.launcherPeakCommit) || observed.launcherPeakCommit <= 0 || observed.launcherPeakCommit > observed.processLimit) throw Error('BACKUP_RUNTIME_RESOURCE_RECEIPT_REFUSED')
            const receipt = JSON.parse(receiptLine) as WindowsBackupTargetReceipt
            if (receipt.Outcome !== 'target-verified' && receipt.Outcome !== 'refused' || receipt.HandlesReleased !== true || !Array.isArray(receipt.FlushOrder)) throw Error('BACKUP_RUNTIME_TARGET_RECEIPT_REFUSED')
            resolve(receipt)
          } catch (error) {
            if (released) { clearInterval(timer); reject(error); return }
            fail(error)
          }
        }, 10)
      })
    } finally { clearTimeout(deadline); signal.removeEventListener('abort', abort) }
  }
  return { identity, bindSource, runTarget, inspectReleased: () => !poison && activeTargets === 0 && sourcePins === 0 && native.reapUnknown() }
}
