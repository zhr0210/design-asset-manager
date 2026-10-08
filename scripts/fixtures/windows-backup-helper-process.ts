import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { EventEmitter } from 'node:events'
import { PassThrough, Writable } from 'node:stream'
import { createRequire } from 'node:module'
import { buildWindowsQualificationNative, type WindowsNativeQualificationArtifact } from './windows-native-qualification-build'
import {WindowsBackupPhysicalExitUnconfirmedError} from '../../src/main/platform/windows-backup-lifecycle.internal'
import {withGuardedWindowsNativeArtifact, type WindowsNativeLoadPin, type WindowsNativeLoadReceipt} from './windows-backup-native-load'

const run = promisify(execFile)
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const compilations = new Map<string, Promise<CompiledHelper>>()
let preparedHelper: CompiledHelper | undefined
let preparedSupervisor: WindowsNativeQualificationArtifact | undefined
let loadedSupervisor: Supervisor | undefined
let supervisorLoad: WindowsNativeLoadReceipt | undefined
let helperPreparation: Promise<void> | undefined
const PROCESS_LIMIT = 128 * 1024 * 1024
const JOB_LIMIT = 256 * 1024 * 1024

interface CompiledHelper {
  launcher: string
  target: string
  launcherSha256: string
  targetSha256: string
  compilerSha256: string
  sourceSha256: string
}

export interface WindowsBackupHelperResourceReceipt {
  targetPeakWorkingSet: number
  targetPeakCommit: number
  jobPeakCommit: number
  processLimit: number
  jobLimit: number
  startupHardLimited: true
  launcherPeakWorkingSet: number
  launcherPeakCommit: number
  launcherTailUnmeasured: false
  launcherExited: true
  jobEmpty: true
  managedArtifactsPinned: true
  managedExecutablePathLaunchQualified: false
  supervisorModuleLoadQualified: false
  commitHardLimited: true
  rssHardLimited: false
  rssEvidence: 'postexit-kernel-high-water'
  targetExited: true
  targetExitCode: number
  compilerSha256: string
  sourceSha256: string
  launcherSha256: string
  targetSha256: string
  supervisorSha256: string
  supervisorSourceSha256: string
  supervisorCompilerSha256: string
}

async function compileHelper(): Promise<CompiledHelper> {
  assert.equal(process.platform, 'win32')
  assert.equal(process.arch, 'x64')
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows'
  const compiler = path.join(systemRoot, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe')
  const sources = [path.resolve('scripts/fixtures/windows-backup-helper-launcher.cs'), path.resolve('scripts/fixtures/windows-backup-native-target.cs')]
  const [compilerBytes, launcherBytes, targetBytes] = await Promise.all([fs.readFile(compiler), fs.readFile(sources[0]), fs.readFile(sources[1])])
  const compilerSha256 = hash(compilerBytes)
  const sourceSha256 = hash(Buffer.concat([Buffer.from('launcher\0'), launcherBytes, Buffer.from('\0target\0'), targetBytes]))
  const key = compilerSha256 + ':' + sourceSha256
  let compiled = compilations.get(key)
  if (!compiled) {
    compiled = (async () => {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-backup-helper-build-'))
      const sourceCopies = [path.join(directory, 'launcher.cs'), path.join(directory, 'target.cs')]
      const launcher = path.join(directory, 'launcher.exe'), target = path.join(directory, 'target.exe')
      // These captured bytes, rather than later mutable workspace paths, define
      // the exact compiler input and cache identity. Compilation is a build step;
      // it occurs before the tracer child and is not claimed as runtime admission.
      await Promise.all([fs.writeFile(sourceCopies[0], launcherBytes, { flag: 'wx' }), fs.writeFile(sourceCopies[1], targetBytes, { flag: 'wx' })])
      const results = await Promise.allSettled([launcher, target].map((output, index) => run(compiler, ['/nologo', '/target:exe', '/platform:x64', '/optimize+', ...(index === 1 ? ['/reference:System.Web.Extensions.dll'] : []), '/out:' + output, sourceCopies[index]], {
        env: { SystemRoot: systemRoot, WINDIR: systemRoot, TEMP: os.tmpdir(), TMP: os.tmpdir() }, windowsHide: true, timeout: 30000, maxBuffer: 8192
      })))
      for (const result of results) if (result.status === 'rejected') throw result.reason
      const [launcherOutput, targetOutput] = await Promise.all([fs.readFile(launcher), fs.readFile(target)])
      return { launcher, target, launcherSha256: hash(launcherOutput), targetSha256: hash(targetOutput), compilerSha256, sourceSha256 }
    })()
    compilations.set(key, compiled)
    // A failed compile is retryable, and concurrent callers share its rejection.
    void compiled.catch(() => { if (compilations.get(key) === compiled) compilations.delete(key) })
  }
  return compiled
}

/** Explicit pre-test build preparation. No compiler executes under a backup
 * runtime permit; launch refuses if this step has not finished successfully. */
export async function prepareWindowsBackupHelper(): Promise<void> {
  helperPreparation ??= (async () => {
    const results = await Promise.all([compileHelper(), buildWindowsQualificationNative({ sourcePath: path.resolve('scripts/fixtures/windows-backup-helper-supervisor.cpp'), outputName: 'backup-helper-supervisor.node', napi: true, libraries: ['bcrypt.lib', 'psapi.lib'] })])
    const artifact = results[1]
    let firstLoaded: Supervisor | undefined
    const guarded = await withGuardedWindowsNativeArtifact(artifact, {
      load: pin => {
        firstLoaded = createRequire(path.resolve('package.json'))(artifact.path) as Supervisor
        firstLoaded.verifyTransferredPins(pin.hostPins, artifact.artifactSha256)
        firstLoaded.verifyLoadedModulePath(artifact.path)
        return firstLoaded
      },
      closeTransferredHandles: handles => {
        if (!firstLoaded) return false
        firstLoaded.closeTransferredHandles(handles)
      }
    })
    loadedSupervisor = guarded.value
    supervisorLoad = guarded.receipt
    preparedHelper = results[0]; preparedSupervisor = artifact
  })()
  try {await helperPreparation} catch (error) {helperPreparation = undefined; throw error}
}

/** Narrow synthetic loader authority, available only after guarded preparation. */
export function getPreparedWindowsBackupNativeLoader(): Pick<Supervisor, 'verifyTransferredPins'|'closeTransferredHandles'> {
  if (!loadedSupervisor) throw Error('BACKUP_HELPER_NOT_PRECOMPILED')
  return loadedSupervisor
}

/** Read-only evidence for owned fixture fault cuts. No production consumer. */
export function inspectPreparedWindowsBackupHelper(): Readonly<CompiledHelper & { supervisor: WindowsNativeQualificationArtifact; supervisorLoad: WindowsNativeLoadReceipt }> {
  if (!preparedHelper || !preparedSupervisor || !supervisorLoad) throw Error('BACKUP_HELPER_NOT_PRECOMPILED')
  return Object.freeze({ ...preparedHelper, supervisor: Object.freeze({ ...preparedSupervisor }), supervisorLoad })
}

export interface WindowsBackupHelperPhysicalExit {
  exitCode: number; launcherPeakWorkingSet: number; launcherPeakCommit: number;
  jobPeakCommit: number; processLimit: number; jobLimit: number; jobEmpty: true;
  killed: boolean; managedArtifactsPinned: true; pid: number
}
interface Supervisor {
  verifyTransferredPins(pins: WindowsNativeLoadPin['hostPins'], expectedArtifactSha256: string): {hostPinsMatched:true;leafSha256:string}
  verifyLoadedModulePath(expectedAbsolutePath:string): true
  closeTransferredHandles(handles:readonly string[]): void
  launch(input: { launcher: string; target: string; supervisor: string; launcherSha256: string; targetSha256: string; supervisorSha256: string; environment: string; injectLaunchUnknown: boolean }): object
  poll(owner: object, discard?: boolean): WindowsBackupHelperPhysicalExit & { stdout: string; stderr: string; exited: boolean }
  write(owner: object, bytes: Buffer, callback: (error: Error | null) => void): void; end(owner: object): void; kill(owner: object): boolean; release(owner: object): void
  reapUnknown(): boolean
}
export interface WindowsBackupHelperChild extends EventEmitter { stdin: Writable; stdout: PassThrough; stderr: PassThrough; kill(): boolean }

/** Test-only Host module retains every process/Job/artifact handle until actual
 * exit. The Host caller's existing permit must cover this module and pipe work;
 * it cannot release that permit on a receipt or cancellation request alone. */
export async function launchWindowsBackupHelper(input: { env: NodeJS.ProcessEnv; injectLaunchUnknown?: boolean }): Promise<{
  child: WindowsBackupHelperChild
  completion: Promise<WindowsBackupHelperResourceReceipt>
  physicalExit: Promise<WindowsBackupHelperPhysicalExit>
}> {
  const compiled = preparedHelper
  const supervisorArtifact = preparedSupervisor
  if (!compiled || !supervisorArtifact || !loadedSupervisor) throw Error('BACKUP_HELPER_NOT_PRECOMPILED')
  const [launcherSource, targetSource] = await Promise.all([fs.readFile(path.resolve('scripts/fixtures/windows-backup-helper-launcher.cs')), fs.readFile(path.resolve('scripts/fixtures/windows-backup-native-target.cs'))])
  if (hash(Buffer.concat([Buffer.from('launcher\0'), launcherSource, Buffer.from('\0target\0'), targetSource])) !== compiled.sourceSha256) throw Error('BACKUP_HELPER_PRECOMPILED_SOURCE_CHANGED')
  const [launcherBytes, targetBytes] = await Promise.all([fs.readFile(compiled.launcher), fs.readFile(compiled.target)])
  assert.equal(hash(launcherBytes), compiled.launcherSha256, 'owned launcher artifact changed')
  assert.equal(hash(targetBytes), compiled.targetSha256, 'owned target artifact changed')
  assert.equal(hash(await fs.readFile(path.resolve('scripts/fixtures/windows-backup-helper-supervisor.cpp'))), supervisorArtifact.sourceSha256, 'owned supervisor source changed')
  assert.equal(hash(await fs.readFile(supervisorArtifact.path)), supervisorArtifact.artifactSha256, 'owned Host supervisor artifact changed')
  // First native load and its guardian are preparation, outside Runtime permits.
  const supervisor = loadedSupervisor
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-backup-helper-run-'))
  const receiptPath = path.join(directory, 'resource.json')
  const environment = Object.entries({ ...input.env, DAM_BACKUP_HELPER_TARGET_PATH: compiled.target, DAM_BACKUP_HELPER_RESOURCE_PATH: receiptPath }).filter((entry): entry is [string, string] => typeof entry[1] === 'string').sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => {
    if (key.includes('=') || key.includes('\0') || value.includes('\0')) throw Error('BACKUP_HELPER_ENVIRONMENT_REFUSED')
    return key + '=' + value
  }).join('\0') + '\0'
  let owner: object
  try {owner = supervisor.launch({ launcher: compiled.launcher, target: compiled.target, supervisor: supervisorArtifact.path, launcherSha256: compiled.launcherSha256, targetSha256: compiled.targetSha256, supervisorSha256: supervisorArtifact.artifactSha256, environment, injectLaunchUnknown: input.injectLaunchUnknown === true })}
  catch (error) {
    if (!(error instanceof Error) || !error.message.includes('PHYSICAL_EXIT_UNKNOWN_RETAINED')) throw error
    const released = new Promise<void>(resolve => {
      const reaper = setInterval(() => {try {if (supervisor.reapUnknown()) {clearInterval(reaper);resolve()}} catch {/* Unknown remains retained. */}}, 100)
    })
    throw new WindowsBackupPhysicalExitUnconfirmedError(released, error.message)
  }
  const emitter = new EventEmitter()
  const stdout = new PassThrough(), stderr = new PassThrough()
  const stdin = new Writable({ write(chunk, _encoding, callback) { try { supervisor.write(owner, Buffer.from(chunk), error => callback(error ?? undefined)) } catch (error) { callback(error as Error) } }, final(callback) { try { supervisor.end(owner); callback() } catch (error) { callback(error as Error) } } })
  // Same private harness interface; no OS child spawned by Node outside the Job.
  const child: WindowsBackupHelperChild = Object.assign(emitter, { stdin, stdout, stderr, kill: () => supervisor.kill(owner) })
  let resolveExit!: (result: WindowsBackupHelperPhysicalExit) => void, rejectExit!: (error: Error) => void
  const physicalExit = new Promise<WindowsBackupHelperPhysicalExit>((resolve, reject) => { resolveExit = resolve; rejectExit = reject })
  let receiptText = '', buffered = '', pollingFailure: Error | undefined, killed = false
  const poll = () => {
    try {
      const observed = supervisor.poll(owner, !!pollingFailure)
      buffered += observed.stdout
      let newline: number
      while ((newline = buffered.indexOf('\n')) >= 0) {
        const line = buffered.slice(0, newline + 1); buffered = buffered.slice(newline + 1)
        if (line.startsWith('RESOURCE ')) { if (receiptText) throw Error('BACKUP_HELPER_DUPLICATE_RESOURCE_RECEIPT'); receiptText = line.slice(9).trim() }
        else stdout.write(line)
      }
      if (observed.stderr) stderr.write(observed.stderr)
      if (!observed.exited) return
      clearInterval(timer)
      if (buffered) stdout.write(buffered)
      supervisor.release(owner); stdout.end(); stderr.end()
      const result = { ...observed }; delete (result as Partial<typeof observed>).stdout; delete (result as Partial<typeof observed>).stderr; delete (result as Partial<typeof observed>).exited
      if (pollingFailure) rejectExit(pollingFailure); else resolveExit(result)
      child.emit('exit', observed.exitCode, null); child.emit('close', observed.exitCode, null)
    } catch (error) {
      pollingFailure ??= error as Error
      if (!killed) { killed = true; try { supervisor.kill(owner) } catch {} }
      // Continue polling to prove physical completion. Failure never grants a
      // resource receipt or returns an ordinary success from this path.
    }
  }
  const timer = setInterval(poll, 10)
  const completion = new Promise<WindowsBackupHelperResourceReceipt>((resolve, reject) => {
    child.once('close', (code, signal) => {
      void (async () => {
        const full = await physicalExit
        if (signal || code === null) throw Error('BACKUP_HELPER_TERMINATED_WITHOUT_RESOURCE_RECEIPT')
        if (full.killed || !receiptText || receiptText.length > 2048) throw Error('BACKUP_HELPER_TERMINATED_WITHOUT_RESOURCE_RECEIPT')
        // Receipt comes from pinned executable code through the retained pipe;
        // a pathname resource.json is deliberately not a trusted input.
        const receipt = JSON.parse(receiptText)
        if (receipt.protocol !== 1 || receipt.startupHardLimited !== false || receipt.launcherTailUnmeasured !== true || receipt.targetExited !== true || receipt.targetExitCode !== code ||
          receipt.processLimit !== PROCESS_LIMIT || receipt.jobLimit !== JOB_LIMIT ||
          ![receipt.targetPeakWorkingSet, receipt.targetPeakCommit, full.launcherPeakWorkingSet, full.launcherPeakCommit, full.jobPeakCommit].every(value => Number.isSafeInteger(value) && value > 0) ||
          receipt.targetPeakCommit > PROCESS_LIMIT || full.launcherPeakCommit > PROCESS_LIMIT || full.jobPeakCommit > JOB_LIMIT || full.processLimit !== PROCESS_LIMIT || full.jobLimit !== JOB_LIMIT ||
          receipt.targetPeakWorkingSet + full.launcherPeakWorkingSet > JOB_LIMIT || full.jobEmpty !== true || full.managedArtifactsPinned !== true) throw Error('BACKUP_HELPER_RESOURCE_RECEIPT_INVALID')
        return { targetPeakWorkingSet: receipt.targetPeakWorkingSet, targetPeakCommit: receipt.targetPeakCommit, jobPeakCommit: full.jobPeakCommit,
          processLimit: full.processLimit, jobLimit: full.jobLimit, startupHardLimited: true as const,
          launcherPeakWorkingSet: full.launcherPeakWorkingSet, launcherPeakCommit: full.launcherPeakCommit,
          launcherTailUnmeasured: false as const, launcherExited: true as const, jobEmpty: true as const, managedArtifactsPinned: true as const,
          managedExecutablePathLaunchQualified: false as const, supervisorModuleLoadQualified: false as const,
          commitHardLimited: true as const, rssHardLimited: false as const, rssEvidence: 'postexit-kernel-high-water' as const,
          targetExited: true as const, targetExitCode: receipt.targetExitCode,
          compilerSha256: compiled.compilerSha256, sourceSha256: compiled.sourceSha256, launcherSha256: compiled.launcherSha256, targetSha256: compiled.targetSha256,
          supervisorSha256: supervisorArtifact.artifactSha256, supervisorSourceSha256: supervisorArtifact.sourceSha256, supervisorCompilerSha256: supervisorArtifact.compilerSha256 }
      })().then(resolve, reject)
    })
  })
  // The harness awaits this only after its physical close listener; avoid an
  // unhandled rejection during that intentional interval.
  void completion.catch(() => {})
  void physicalExit.catch(() => {})
  return { child, completion, physicalExit }
}
