import {createHash, randomUUID} from 'node:crypto'
import path from 'node:path'
import type {VisualAdmission} from '../visual-ai/visual-admission'
import type {HostMaintenanceStorage} from '../library-lifecycle/host-schema-maintenance.internal'
import {verifyLibraryBackupSnapshot} from '../library-lifecycle/library-backup-snapshot.internal'
import {prepareTagIntentBackup, tagIntentSpacePolicy, withTagIntentGrowthCap} from '../independent-tags/tag-intent-backup'
import {tagIntentFail} from '../independent-tags/tag-intent-storage'
import {prepareWindowsBackupLifecycle, WindowsBackupPhysicalExitUnconfirmedError} from './windows-backup-lifecycle.internal'
import {captureWindowsBackupConnection, validateWindowsBackupSource, requireWindowsBackupSpace, recheckWindowsBackupSource, type WindowsBackupSourceEvidence} from './windows-backup-source.internal'
import {serializeWindowsBackupBinding, type WindowsBackupBinding} from './windows-backup-recovery.internal'
import {writeWindowsBackupCommitMarker} from './windows-backup-commit.internal'
import {loadWindowsBackupRuntime} from './windows-backup-native/runtime'
import type {WindowsBackupNativeRuntime, WindowsBackupSourceBinding} from './windows-backup-native/contracts'

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const unconfirmed = () => new WindowsBackupPhysicalExitUnconfirmedError(new Promise<void>(()=>{}), 'BACKUP_SOURCE_CLOSE_UNCONFIRMED')

/** The existing Host remains the business and SQLite transaction authority.
 * A fixed application bundle supplies Windows I/O; no compiler, OS service,
 * credentials, model or restoration permission is available at this seam. */
export function createWindowsSchemaMaintenanceStorage(input: {
  admission: VisualAdmission
  bundleDirectory?: string
}): HostMaintenanceStorage {
  return {
    withGrowthCap: withTagIntentGrowthCap,
    prepareBackup: async (active, checkCurrent, signal, hooks) => {
      if (process.platform !== 'win32') return prepareTagIntentBackup(active, checkCurrent, signal, hooks)
      checkCurrent()
      const cancellation = signal ?? new AbortController().signal
      cancellation.throwIfAborted()
      const connection = captureWindowsBackupConnection(active.database, active.control)
      const bytes = connection.pages * connection.pageSize
      const policy = tagIntentSpacePolicy(connection.pages, connection.pageSize, BigInt(bytes), hooks?.growthLimitBytes)
      const hold = input.admission.backupHold()
      let runtime: WindowsBackupNativeRuntime | undefined, source: WindowsBackupSourceBinding | undefined
      let sourceBefore: WindowsBackupSourceEvidence | undefined, sourceRecheck: (()=>Promise<WindowsBackupSourceEvidence>) | undefined
      let binding: WindowsBackupBinding | undefined, image: Buffer | undefined, permitLive = false, sourceClosed = false
      const closeSource = () => {
        if (!source || sourceClosed) return
        // An unknown handle is never retried under a potentially reused number.
        sourceClosed = true
        try {source.close()} catch {throw unconfirmed()}
      }
      const space = async (evidence: WindowsBackupSourceEvidence, required: bigint) => {
        requireWindowsBackupSpace(evidence, required)
        if (hooks?.availableBytes) {
          // Fault hooks can reduce measured capacity, never grant qualification.
          const injected = await hooks.availableBytes()
          requireWindowsBackupSpace({...evidence, available: injected.toString()}, required)
        }
      }
      const operation = `tag-intent-${randomUUID().replaceAll('-','')}`
      let lifecycle: Awaited<ReturnType<typeof prepareWindowsBackupLifecycle>> | undefined
      try {
        lifecycle = await prepareWindowsBackupLifecycle({
          hold, imageBytes: bytes, signal: cancellation,
          createImage: async () => {
            permitLive = true
            try {
              try {
                runtime = loadWindowsBackupRuntime({bundleDirectory: input.bundleDirectory ?? path.resolve('build/windows-backup-runtime/win32-x64'), assertPermit: () => {
                  if (!permitLive) throw Error('BACKUP_RUNTIME_WITHOUT_PERMIT')
                }})
              } catch (error) {throw new Error('BACKUP_RUNTIME_NOT_AVAILABLE', {cause: error})}
              checkCurrent(); cancellation.throwIfAborted()
              source = runtime.bindSource(active.database, active.control)
              sourceBefore = source.before
              validateWindowsBackupSource(sourceBefore, connection)
              await space(sourceBefore, policy.beforeBackup)
              checkCurrent(); cancellation.throwIfAborted()
              image = active.database.serialize()
              validateWindowsBackupSource(source.recheck(), connection, image)
              // Complete validation precedes any target write or transfer. The
              // private image is never passed to hooks or a public caller.
              verifyLibraryBackupSnapshot(image, {declaration: active.manifestDeclaration, generation: active.generation,
                schemaVersion: connection.schemaVersion, nativeReadbackSha256: sha(image)})
              return image
            } catch (error) {closeSource(); throw error}
          },
          verifyImage: (snapshot, hash) => {
            verifyLibraryBackupSnapshot(snapshot, {declaration: active.manifestDeclaration, generation: active.generation,
              schemaVersion: connection.schemaVersion, nativeReadbackSha256: hash})
          },
          runTarget: async (snapshot, whileHeld) => {
            let decision: number | undefined
            try {
              const receipt = await runtime!.runTarget({control: active.control, operation, image: snapshot, signal: cancellation,
                onSource: evidence => {
                  checkCurrent()
                  validateWindowsBackupSource(evidence, connection, snapshot)
                  recheckWindowsBackupSource(sourceBefore!, evidence, connection, captureWindowsBackupConnection(active.database, active.control), snapshot)
                  binding = {format: 1, operation, library: active.identity, lineage: active.manifestDeclaration.lineageIdentity,
                    controlStore: active.manifestDeclaration.controlStoreIdentity, generation: active.generation,
                    source: evidence, connection, imageSha256: sha(snapshot)}
                  return serializeWindowsBackupBinding(binding)
                },
                whileHeld: async (hash, recheckSource) => {
                  sourceRecheck = recheckSource
                  decision = await whileHeld(hash)
                  return decision
                }
              })
              if (!receipt.HandlesReleased || receipt.Outcome !== 'target-verified' && !(decision === 0 && receipt.Reason === 'CANCELLED_WHILE_HELD'))
                throw Error('BACKUP_TARGET_RECEIPT_REFUSED')
            } finally {closeSource()}
          }
        })
        await hooks?.afterBackup?.()
        cancellation.throwIfAborted()
        // Reserve before any further SQLite read: a pager may otherwise clean
        // a preexisting WAL/SHM name before the platform can refuse it.
        source!.reserveJournal()
        checkCurrent(); cancellation.throwIfAborted(); lifecycle.checkHeld()
        if (!sourceBefore || !sourceRecheck || !image || !binding) throw Error('BACKUP_TARGET_NOT_BOUND')
        const targetSource = await sourceRecheck()
        checkCurrent(); lifecycle.checkHeld()
        recheckWindowsBackupSource(sourceBefore, source!.recheck(), connection, captureWindowsBackupConnection(active.database, active.control), image)
        recheckWindowsBackupSource(sourceBefore, targetSource, connection, captureWindowsBackupConnection(active.database, active.control), image)
        await space(targetSource, policy.beforeDdl)
        checkCurrent(); cancellation.throwIfAborted(); lifecycle.checkHeld()
        if (sha(active.database.serialize()) !== sha(image)) return tagIntentFail('TAG_INTENT_SOURCE_CHANGED')
        return {
          pageCap: policy.pageCap,
          beginTransaction: () => {lifecycle!.checkHeld(); source!.handoffJournal()},
          recordCommit: () => {
            // Domain checks ran before the synchronous transaction. Their old
            // revision/schema expectation is no longer true after write().
            lifecycle!.checkHeld()
            writeWindowsBackupCommitMarker(active.database, {binding: binding!, targetSchemaVersion: Number(active.database.pragma('user_version',{simple:true}))})
          },
          finish: async committed => {
            try {await lifecycle!.finish(committed)}
            finally {permitLive = false; image = undefined; hold()}
          }
        }
      } catch (error) {
        try {await lifecycle?.finish(false)}
        catch {return tagIntentFail('TAG_INTENT_BACKUP_SETTLEMENT_FAILED')}
        finally {permitLive = false; image = undefined; hold()}
        if (error instanceof WindowsBackupPhysicalExitUnconfirmedError) return tagIntentFail('TAG_INTENT_BACKUP_SETTLEMENT_FAILED')
        // Only the exact cancellation that settled with known physical close
        // may recover the caller's existing business refusal. Rechecking here
        // also avoids a SQLite read before the held sidecars were refused.
        if (cancellation.aborted && error === cancellation.reason) {
          checkCurrent()
          return tagIntentFail('TAG_INTENT_SESSION_EXPIRED')
        }
        if (error instanceof Error && /BACKUP_RUNTIME|BACKUP_BUNDLE|BACKUP_NATIVE|BACKUP_MEMORY_IMAGE_LIMIT/u.test(error.message)) return tagIntentFail('TAG_INTENT_BACKUP_UNSUPPORTED')
        if (error instanceof Error && /BACKUP_SOURCE_(?:CHANGED|IMAGE_CHANGED)/u.test(error.message)) return tagIntentFail('TAG_INTENT_SOURCE_CHANGED')
        throw error
      }
    }
  }
}
