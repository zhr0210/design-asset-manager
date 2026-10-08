import {applyWorkMediaSchema} from '../work-mode/work-media.schema'
import {validateWorkScope,workId} from '../../shared/contracts/work-set.contract'
import { ActiveLibraryHostError, type ActiveLibraryHost, type ActiveLibraryHostErrorCode, type ActiveLibraryHostState } from '../../shared/contracts/active-library.contract'
import type { TagIntentCommit } from '../../shared/contracts/independent-tag-intent.contract'
import { applyTagIntentSchema } from '../independent-tags/tag-intent.schema'
import { existingTagIntent, insertTagIntent, readTagIntentContext, tagIntentFail, validateTagIntentCommit, type TagIntentBinding } from '../independent-tags/tag-intent-storage'
import { existingTagBatch, insertTagBatch, tagBatchInputs } from '../independent-tags/tag-batch-storage'
import { prepareTagIntentBackup, withTagIntentGrowthCap, type TagIntentTestHooks } from '../independent-tags/tag-intent-backup'
import { applyTagExecutionSchema } from '../independent-tags/tag-execution.schema'
import { readTagExecution, seedTagCurrent, type TagExecutionBinding } from '../independent-tags/tag-execution-storage'
import { applyTagDecisionSchema } from '../independent-tags/tag-decision.schema'
import { readTagDecisionContext, writeTagDecision } from '../independent-tags/tag-decision-storage'
import { applyBackgroundAnalysisSchema } from '../background-analysis/background-analysis.schema'
import { readBackgroundAnalysis, validateBackgroundConfig, writeBackgroundConfig } from '../background-analysis/background-analysis-storage'
import { applyBackgroundOcrSchema } from '../background-ocr/background-ocr.schema'
import {applyBasicAnalysisSchema} from '../background-analysis/basic-analysis.schema'
import {validateExecutionConfiguration,writeExecutionConfiguration,readExecution} from '../background-analysis/background-execution-storage'
import { readBackgroundOcr, validateBackgroundOcrPermission, writeBackgroundOcrPermission, type BackgroundOcrAuthority } from '../background-ocr/background-ocr-storage'
import { assertLibraryDataSchema } from './library-materialization.internal'
import type { LibraryManifestDeclaration } from './library-manifest.tracer'
import type { ExclusiveLibraryLockLease } from './active-library-session'

interface MaintenanceBinding extends TagIntentBinding {
  root: string
  control: string
  manifestDeclaration: LibraryManifestDeclaration
  lock: { lease: ExclusiveLibraryLockLease }
}

/** Private infrastructure seam supplied by the trusted platform composition. */
export interface PreparedHostBackup {
  pageCap: number
  /** Platform journal handoff, inside the authority transaction before DDL. */
  beginTransaction?(): void
  /** Private qualification marker, executed inside the same DDL transaction. */
  recordCommit?(): void
  /** Resolves only after physical target/process release; committed is a DB fact. */
  finish?(committed: boolean): Promise<void>
}

export interface HostMaintenanceStorage {
  prepareBackup: (...args: Parameters<typeof prepareTagIntentBackup>) => Promise<PreparedHostBackup>
  withGrowthCap: typeof withTagIntentGrowthCap
}

interface HostMaintenanceAccess<B extends MaintenanceBinding> {
  current(): { binding?: B; state: ActiveLibraryHostState; businessSuspended: boolean }
  enqueueLifecycle<T>(operation: () => Promise<T>): Promise<T>
  inFlight(): Iterable<Promise<unknown>>
  prepareConnection?(active: B): () => void
  run<T>(operation: (active: B) => Promise<T> | T): Promise<T>
  quarantine(active: B): void
  stateError(state: ActiveLibraryHostState): ActiveLibraryHostError
  hostError(code: ActiveLibraryHostErrorCode): ActiveLibraryHostError
  executionBinding(active: B): TagExecutionBinding
  ocrBinding(active: B): B & { ocrAuthority: BackgroundOcrAuthority }
  ocrAuthority: BackgroundOcrAuthority
  hooks?: TagIntentTestHooks
}

/** Fixed domain intents behind the Host's existing public Interface. */
export function createHostSchemaMaintenance<B extends MaintenanceBinding>(
  access: HostMaintenanceAccess<B>,
  storage: HostMaintenanceStorage = { prepareBackup: prepareTagIntentBackup, withGrowthCap: withTagIntentGrowthCap }
) {
  let admissionClosed = false
  let ocrGrantEpoch = 0
  const revokeBackgroundOcr = () => { ocrGrantEpoch++; access.ocrAuthority.grant = undefined }
  const isCurrent = (active: B) => {
    const current = access.current()
    return current.binding === active && current.state === 'ready' && !current.businessSuspended
  }

  const maintain = <T>(storageFailure: string | null, operation: (active: B, prepareBackup: (recheck: () => void, signal?: AbortSignal) => Promise<PreparedHostBackup>) => Promise<T>, onError?: () => void): Promise<T> => access.enqueueLifecycle(async () => {
    const current = access.current()
    if (!current.binding || current.state !== 'ready') throw access.stateError(current.state)
    if (current.businessSuspended) throw access.hostError('library-quiescing')
    const active = current.binding
    let resumeBackupConnection: (() => void) | undefined
    const prepareBackup = (recheck: () => void, signal?: AbortSignal) => {
      resumeBackupConnection ??= access.prepareConnection?.(active)
      return storage.prepareBackup(active, recheck, signal, access.hooks)
    }
    admissionClosed = true
    try {
      // Maintenance is outside inFlight, so it never drains its own task.
      await Promise.allSettled(Array.from(access.inFlight()))
      const result = await active.lock.lease.runWhileHeld(() => operation(active, prepareBackup))
      if (result.kind !== 'completed') {
        access.quarantine(active)
        throw access.hostError('library-lock-invalid')
      }
      return result.value
    } catch (error) {
      onError?.()
      if (error instanceof Error && ['TAG_INTENT_SETTINGS_RESTORE_FAILED', 'TAG_INTENT_BACKUP_SETTLEMENT_FAILED'].includes(error.message)) access.quarantine(active)
      if (storageFailure === null || error instanceof ActiveLibraryHostError) throw error
      return tagIntentFail(storageFailure)
    } finally { resumeBackupConnection?.(); admissionClosed = false }
  })

  const commit = async <T>(active: B, backup: PreparedHostBackup | null, write: () => T, ocr = false): Promise<T> => {
    let committed = false
    try {
      const transaction = () => {
        const value = active.database.transaction(() => {
          backup?.beginTransaction?.()
          const result = write()
          backup?.recordCommit?.()
          return result
        })()
        committed = true // Before settings restoration or acknowledgement can fail.
        return value
      }
      const value = backup ? storage.withGrowthCap(active.database, backup.pageCap, transaction) : transaction()
      try { access.hooks?.afterCommit?.() }
      catch {
        if (ocr) throw Error('BACKGROUND_OCR_ACK_UNCERTAIN')
        return tagIntentFail('TAG_INTENT_ACK_UNCERTAIN')
      }
      return value
    } finally {
      try { await backup?.finish?.(committed) }
      catch { throw Error('TAG_INTENT_BACKUP_SETTLEMENT_FAILED') }
    }
  }

  const enableTagExecution: ActiveLibraryHost['enableTagExecution'] = (input, signal) => maintain('TAG_EXECUTION_STORAGE_FAILED', async (active, prepareBackup) => {
    const check = () => {
      access.executionBinding(active)
      if (!isCurrent(active) || signal?.aborted) tagIntentFail('TAG_INTENT_SCOPE_EXPIRED')
      const context = readTagIntentContext(active, input)
      if (input.sessionToken !== active.notebookSession) tagIntentFail('TAG_INTENT_SESSION_EXPIRED')
      return context
    }
    const context = check()
    if (context.schemaVersion >= 10) return
    if (context.schemaVersion !== 9 || input.expectedSchemaVersion !== 9 || !input.allowUpgrade) tagIntentFail('TAG_EXECUTION_UPGRADE_REQUIRED')
    const backup = await prepareBackup(() => { check() }, signal)
    await commit(active, backup, () => {
      check(); applyTagExecutionSchema(active.database); seedTagCurrent(access.executionBinding(active))
      access.hooks?.afterDdl?.(); assertLibraryDataSchema(active.database)
      access.hooks?.beforeCommit?.()
    })
  })

  const configureBackgroundOcr: ActiveLibraryHost['configureBackgroundOcr'] = (input, signal) => {
    // Revoke synchronously, before even lifecycle enqueue; audit rows are not grants.
    revokeBackgroundOcr()
    const grantEpoch = ocrGrantEpoch
    return maintain(null, async (active, prepareBackup) => {
      const check = () => {
        if (grantEpoch !== ocrGrantEpoch || !isCurrent(active)) throw Error('BACKGROUND_OCR_SCOPE_EXPIRED')
        return validateBackgroundOcrPermission(access.ocrBinding(active), input, signal)
      }
      const prior = check()
      if (prior.schemaVersion === 12 && !input.allowUpgrade) throw Error('BACKGROUND_OCR_UPGRADE_REQUIRED')
      const backup = prior.schemaVersion === 12 ? await prepareBackup(() => { check() }, signal) : null
      await commit(active, backup, () => {
        check(); applyBackgroundOcrSchema(active.database); access.hooks?.afterDdl?.()
        writeBackgroundOcrPermission(access.ocrBinding(active), input)
        assertLibraryDataSchema(active.database); access.hooks?.beforeCommit?.()
      }, true)
      if (signal?.aborted || grantEpoch !== ocrGrantEpoch) throw Error('BACKGROUND_OCR_SCOPE_EXPIRED')
      if (input.enabled) access.ocrAuthority.grant = { session: active.notebookSession, revision: input.expectedRevision + 1, runtime: input.runtimeFingerprint }
      return readBackgroundOcr(access.ocrBinding(active), input)
    }, revokeBackgroundOcr)
  }

  const configureBackgroundAnalysis: ActiveLibraryHost['configureBackgroundAnalysis'] = (input, signal) => maintain('BACKGROUND_STORAGE_FAILED', async (active, prepareBackup) => {
    const check = () => {
      access.executionBinding(active)
      if (!isCurrent(active)) tagIntentFail('BACKGROUND_SCOPE_EXPIRED')
      return validateBackgroundConfig(active, input, signal)
    }
    const prior = check()
    if (prior.schemaVersion !== input.expectedSchemaVersion) tagIntentFail('BACKGROUND_CONFLICT')
    if (prior.schemaVersion < 12 && !input.allowUpgrade) tagIntentFail('BACKGROUND_UPGRADE_REQUIRED')
    const backup = prior.schemaVersion < 12 ? await prepareBackup(() => { check() }, signal) : null
    await commit(active, backup, () => {
      check()
      if (prior.schemaVersion < 10) { applyTagExecutionSchema(active.database); seedTagCurrent(access.executionBinding(active)) }
      applyTagDecisionSchema(active.database); applyBackgroundAnalysisSchema(active.database)
      access.hooks?.afterDdl?.(); writeBackgroundConfig(active, input, signal)
      assertLibraryDataSchema(active.database); access.hooks?.beforeCommit?.()
    })
    return readBackgroundAnalysis(active, input)
  })

  const enableWorkMedia:ActiveLibraryHost['enableWorkMedia']=input=>maintain(null,async(active,prepareBackup)=>{
    const scope=validateWorkScope({libraryIdentity:input.libraryIdentity,generation:input.generation})
    const check=()=>{if(!isCurrent(active)||active.identity!==scope.libraryIdentity||active.generation!==scope.generation||active.notebookSession!==workId(input.sessionToken))throw access.hostError('library-generation-conflict')}
    check();const version=Number(active.database.pragma('user_version',{simple:true}));if(version===15)return
    if(input.allowUpgrade!==true||input.expectedSchemaVersion!==version)throw new ActiveLibraryHostError('work-set-upgrade-required','请核对并确认视频参考存储升级至 v15；旧版应用将无法打开此库。')
    const backup=await prepareBackup(check)
    await commit(active,backup,()=>{check();applyWorkMediaSchema(active.database);if(version<10)seedTagCurrent(access.executionBinding(active));access.hooks?.afterDdl?.();assertLibraryDataSchema(active.database);access.hooks?.beforeCommit?.()})
  })
  const enableBasicAnalysis:ActiveLibraryHost['enableBasicAnalysis']=(input,signal)=>maintain(null,async (active,prepareBackup)=>{
    const check=()=>{access.executionBinding(active);if(!isCurrent(active)||signal?.aborted||input.sessionToken!==active.notebookSession)tagIntentFail('BACKGROUND_SCOPE_EXPIRED');return readBackgroundAnalysis(active,input)}
    const prior=check();if(prior.schemaVersion>=14)return
    if(!input.allowUpgrade||prior.schemaVersion!==input.expectedSchemaVersion)tagIntentFail('BASIC_UPGRADE_REQUIRED')
    const backup=await prepareBackup(()=>{check()},signal)
    await commit(active,backup,()=>{check();applyBasicAnalysisSchema(active.database);if(prior.schemaVersion<10)seedTagCurrent(access.executionBinding(active));access.hooks?.afterDdl?.();assertLibraryDataSchema(active.database);access.hooks?.beforeCommit?.()})
  })
  const configureBackgroundExecution:ActiveLibraryHost['configureBackgroundExecution']=(input,signal)=>maintain(null,async (active,prepareBackup)=>{
    const check=()=>{access.executionBinding(active);if(!isCurrent(active)||signal?.aborted)tagIntentFail('BACKGROUND_SCOPE_EXPIRED');return validateExecutionConfiguration(active,input)}
    const prior=check();if(prior.schemaVersion<14&&!input.allowUpgrade)tagIntentFail('BASIC_UPGRADE_REQUIRED')
    const backup=prior.schemaVersion<14?await prepareBackup(()=>{check()},signal):null
    await commit(active,backup,()=>{check();applyBasicAnalysisSchema(active.database);if(prior.schemaVersion<10)seedTagCurrent(access.executionBinding(active));writeExecutionConfiguration(active,input);access.hooks?.afterDdl?.();assertLibraryDataSchema(active.database);access.hooks?.beforeCommit?.()})
    return readExecution(active,input)
  })

  const decideTag: ActiveLibraryHost['decideTag'] = (input, signal) => {
    if (input.decision !== 'reject' || !input.allowUpgrade) return access.run(active => {
      if (signal?.aborted) tagIntentFail('TAG_DECISION_CANCELLED')
      active.database.transaction(() => writeTagDecision(active, input))()
      return readTagExecution(access.executionBinding(active), input)
    })
    return maintain('TAG_DECISION_STORAGE_FAILED', async (active, prepareBackup) => {
      const check = () => {
        access.executionBinding(active)
        if (!isCurrent(active) || signal?.aborted) tagIntentFail('TAG_DECISION_CANCELLED')
        const context = readTagDecisionContext(active, input)
        if (context.sessionToken !== input.sessionToken) tagIntentFail('TAG_INTENT_SESSION_EXPIRED')
        return context
      }
      const context = check()
      const backup = context.schemaVersion < 11 ? await prepareBackup(() => { check() }, signal) : null
      await commit(active, backup, () => {
        check(); applyTagDecisionSchema(active.database); access.hooks?.afterDdl?.()
        writeTagDecision(active, input); assertLibraryDataSchema(active.database); access.hooks?.beforeCommit?.()
      })
      return readTagExecution(access.executionBinding(active), input)
    })
  }

  const persistTagIntents = <T>(inputs: readonly TagIntentCommit[], existing: (active: B) => T | undefined, insert: (active: B) => T, signal?: AbortSignal): Promise<T> => maintain('TAG_INTENT_STORAGE_FAILED', async (active, prepareBackup) => {
    const input = inputs[0]
    const check = () => {
      const lease = active.lock.lease.inspect()
      if (lease.state !== 'held' || lease.libraryIdentity !== active.identity || lease.libraryGeneration !== active.generation) {
        access.quarantine(active)
        throw access.hostError('library-lock-invalid')
      }
      if (!isCurrent(active)) tagIntentFail('TAG_INTENT_SCOPE_EXPIRED')
      for (const item of inputs) validateTagIntentCommit(active, item, signal)
    }
    check()
    const prior = existing(active)
    if (prior) return prior
    const context = readTagIntentContext(active, input)
    if (context.schemaVersion !== input.expectedSchemaVersion) return tagIntentFail('TAG_INTENT_REVIEW_STALE')
    if (context.schemaVersion < 9 && !input.allowUpgrade) return tagIntentFail('TAG_INTENT_UPGRADE_REQUIRED')
    const backup = context.schemaVersion < 9 ? await prepareBackup(check, signal) : null
    return commit(active, backup, () => {
      check(); applyTagIntentSchema(active.database); access.hooks?.afterDdl?.()
      const saved = insert(active)
      // Intent's historical hook order differs from the other domains.
      access.hooks?.beforeCommit?.(); assertLibraryDataSchema(active.database)
      return saved
    })
  })

  const saveTagIntent: ActiveLibraryHost['saveTagIntent'] = (input, signal) => persistTagIntents([input], active => existingTagIntent(active, input), active => insertTagIntent(active, input), signal)
  const saveTagBatch: ActiveLibraryHost['saveTagBatch'] = (input, signal) => persistTagIntents(tagBatchInputs(input), active => existingTagBatch(active, input), active => insertTagBatch(active, input), signal)

  return { enableWorkMedia,enableTagExecution, enableBasicAnalysis, configureBackgroundExecution, configureBackgroundAnalysis, configureBackgroundOcr, decideTag, saveTagIntent, saveTagBatch, revokeBackgroundOcr, isAdmissionClosed: () => admissionClosed }
}
