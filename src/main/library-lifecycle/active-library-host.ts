import {applyBackgroundOcrSchema} from '../background-ocr/background-ocr.schema'
import {readBackgroundOcr as readOcrBackground,validateBackgroundOcrPermission,writeBackgroundOcrPermission,claimBackgroundOcr as claimOcrBackground,markBackgroundOcrSent,commitBackgroundOcr as commitOcrBackground,finishBackgroundOcr as finishOcrBackground,releaseBackgroundOcrClaim,type BackgroundOcrAuthority} from '../background-ocr/background-ocr-storage'
import {applyBackgroundAnalysisSchema} from '../background-analysis/background-analysis.schema'
import {readBackgroundAnalysis as readBackground,validateBackgroundConfig,writeBackgroundConfig,changeBackgroundIntent as changeBackground} from '../background-analysis/background-analysis-storage'
import {reconcileTagExecutions,readTagRecovery as readRecovery,readTagReceipt} from '../independent-tags/tag-recovery-storage'
import {tagBatchInputs,existingTagBatch,insertTagBatch} from '../independent-tags/tag-batch-storage'
import type {TagIntentCommit} from '../../shared/contracts/independent-tag-intent.contract'
import {applyTagDecisionSchema} from '../independent-tags/tag-decision.schema'
import {readTagDecisionContext as readDecisionContext,writeTagDecision} from '../independent-tags/tag-decision-storage'
import {readBoundedPreviewBytes} from './bounded-preview-reader'
import {applyTagExecutionSchema} from '../independent-tags/tag-execution.schema'
import {readTagExecutionRequest as readTagRequest,markTagExecutionSent as markTagSent,seedTagCurrent,claimTagExecution as claimTags,commitTagExecution as commitTags,finishTagExecution as finishTags,readTagExecution as readTags,readCurrentTag,type TagExecutionBinding} from '../independent-tags/tag-execution-storage'
import {readOcr as readSavedOcr,commitOcr as commitSavedOcr,correctOcr as correctSavedOcr} from '../ocr/ocr-storage'
import { readTagIntentContext as readTagContext, readTagIntents as readSavedTagIntents, validateTagIntentCommit, existingTagIntent, insertTagIntent, tagIntentFail } from '../independent-tags/tag-intent-storage'
import { applyTagIntentSchema } from '../independent-tags/tag-intent.schema'
import { prepareTagIntentBackup, withTagIntentGrowthCap, type TagIntentTestHooks } from '../independent-tags/tag-intent-backup'
import {readWorkSets as readSavedWorkSets,writeWorkSet as writeSavedWorkSet,writeWorkLayout as writeSavedWorkLayout} from './work-sets'
import {measurePreviewColors as measureColors} from './measure-preview-colors'
import {readOrganization as readLibraryOrganization,writeOrganization as writeLibraryOrganization} from './library-organization'
import {readNotebook as readAssetNotebook,saveNotebook as saveAssetNotebook} from './asset-notebook'
import { readAssets, readAssetContext as readSelectedAssetContext } from './active-library-asset-queries'
import { listIntakeRecovery as listRecovery, prepareIntakeRecovery as prepareRecovery, runIntakeRecovery as recoverIntake, type PreparedIntake } from './intake-recovery'
import { executeDownloadJournal } from '../managed-download/download-journal'
import { recoverOwnedDownload } from './owned-download-recovery'
import { readManagedOriginal as readOwnedOriginal } from './managed-original-read'
import { createActiveLibraryTagMetadata } from './active-library-tag-metadata'
import { materializeLibrary, rollbackMaterializedLibrary, assertLibraryDataSchema, type MaterializedLibrary } from './library-materialization.internal'
import fs from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { importOwnedImage } from './owned-image-intake'
import type { ImageVariantInput } from '../../shared/contracts/image-tools.contract'
import { enableVisualAiStorage, readVisualAiEvidence, commitVisualAiEvidence, confirmVisualAiTag as confirmEvidenceTag } from '../visual-ai/visual-ai-storage'
import type { VisualAiEvidence } from '../../shared/contracts/visual-ai.contract'

import Database from 'better-sqlite3'

import {
  ActiveLibraryHostError,
  type ActiveLibraryHost,
  type ActiveLibraryHostErrorCode,
  type ActiveLibraryHostState,
  type ActiveLibraryHostProjection,
  type ActiveLibraryAssetProjection,
  type ActiveLibraryTagProjection,
  type ActiveLibraryTrashEntryProjection,
  type CreateLibraryPlanProjection,
  type CreateLibraryResult
} from '../../shared/contracts/active-library.contract'
import { createSharpSystemPreviewAdapter, safePreviewFileName } from '../capture-intake/sharp-system-preview.adapter'
import { createSqliteCapturePromotionLifecycleSink } from '../capture-intake/sqlite-asset-lifecycle.adapter'
import type {
  AddAssetsWorkflow,
  CaptureBatchSnapshot,
  CaptureIdentityKind,
  LocalFileSelectionOutcome
} from '../capture-intake/capture-intake.types'
import { CaptureIntakeError } from '../capture-intake/capture-intake.types'
import {
  createActiveLibraryCaptureWorkflow,
  createActiveLibrarySession,
  type ActiveLibrarySession,
  type ActiveLibraryStorageBinding
} from './active-library-session'
import {
  createExclusiveLibraryLockTracer,
  type AcquiredExclusiveLibraryLock
} from './exclusive-library-lock.tracer'
import {
  createLibraryCreationPlannerTracer,
  type LibraryCreationQualificationAdapter
} from './library-creation-planner.tracer'
import type { LibraryCreationReview } from './library-creation-planner'
import type { LibraryCreationTargetPlatformAdapter } from './library-creation-target-platform.internal'
import {
  createLibraryOpenInspectionTracer,
  type LibraryOpenQualificationAdapter
} from './library-open-inspection.tracer'
import {
  inspectLibraryControlStore
} from './library-open-control-store.internal'
import { readLibraryManifestDeclaration } from './library-manifest.tracer'
import { openReadonlyLibraryDatabase } from './readonly-library-database.internal'
import {
  createSqliteAssetTrashWorkflow,
  type AssetTrashRelationshipProjection
} from './sqlite-asset-trash.adapter'
import type {
  AssetTrashPlan,
  AssetTrashSnapshot,
  AssetTrashWorkflow
} from './asset-trash'
import { AssetTrashError } from './asset-trash'
import { observeLibraryFilesystemRoles } from './library-filesystem.tracer'
import { isInsideDirectory } from '../platform/path-normalizer'
import { assertExistingDirectoryInsideManagedRoot } from '../platform/filesystem-guard'
import type { LibraryManifestDeclaration } from './library-manifest.tracer'

import { LIBRARY_DATABASE_FILE, MANIFEST_FILE, CONTROL_DIRECTORY_NAME, ORIGINALS_DIRECTORY_NAME, PREVIEW_DIRECTORY_NAME, STAGING_DIRECTORY_NAME } from './library-layout.internal'
type HostIdentityKind = CaptureIdentityKind | 'tag' | 'trash-plan' | 'revision'

export interface LibraryDirectorySelectionAdapter {
  selectLibraryDirectory(): Promise<
    | { kind: 'cancelled' }
    | { kind: 'selected'; directory: string }
  >
}

export interface ActiveLibraryHostDependencies extends LibraryDirectorySelectionAdapter {
  selectLocalFiles(): Promise<LocalFileSelectionOutcome>
  targetPlatform: LibraryCreationTargetPlatformAdapter
  creationQualification: LibraryCreationQualificationAdapter
  openQualification: LibraryOpenQualificationAdapter
  /** Test-only fault boundary; Main may observe the exclusive creation claim. */
  onCreationClaimed?: (rootDirectory: string) => void | Promise<void>
  /** Test-only fault boundary immediately after bootstrap lock acquisition. */
  onBootstrapLocked?: (controlDirectory: string) => void | Promise<void>
  /** Isolated fixture fault boundaries; never provided by the production composition. */
  tagIntentTestHooks?: TagIntentTestHooks
}

interface CreationPlanRecord {
  publicPlan: CreateLibraryPlanProjection
  review: LibraryCreationReview
  targetDirectory: string
  planner: ReturnType<typeof createLibraryCreationPlannerTracer>
}

interface Binding {
  notebookSession:string
  manifestDeclaration: LibraryManifestDeclaration
  root: string
  control: string
  managed: string
  staging: string
  previews: string
  identity: string
  generation: string
  database: Database.Database
  lock: AcquiredExclusiveLibraryLock
  session: ActiveLibrarySession
  capture: AddAssetsWorkflow
  trash: AssetTrashWorkflow
}

/**
 * Main-only Active Library composition. Paths and SQLite stay in this closure;
 * the returned Interface exposes only path-free business intent and projections.
 */
export function createActiveLibraryHost(
  dependencies: ActiveLibraryHostDependencies
): ActiveLibraryHost {
  let state: ActiveLibraryHostProjection = { state: 'unopened', identity: null, generation: null }
  let binding: Binding | undefined
  let selectedDirectory: string | undefined
  let creationPlan: CreationPlanRecord | undefined
  const inFlight = new Set<Promise<unknown>>()
  let maintenanceAdmissionClosed = false
  const capturePlanGenerations = new Map<string, string>()
  let lifecycleTail: Promise<unknown> = Promise.resolve()
  const createIdentity = (kind: HostIdentityKind): string => `${kind}:${randomUUID()}`
  const preview = createSharpSystemPreviewAdapter({ createIdentity })

  const inspect = (): ActiveLibraryHostProjection => {
    if (binding && state.state === 'ready') {
      try {
        const lease = binding.lock.lease.inspect()
        if (lease.state !== 'held' || lease.libraryIdentity !== binding.identity || lease.libraryGeneration !== binding.generation) {
          state = { state: 'recovery-required', identity: binding.identity, generation: binding.generation }
        }
      } catch {
        state = { state: 'recovery-required', identity: binding.identity, generation: binding.generation }
      }
    }
    return { ...state }
  }

  const businessSuspensions=new Set<symbol>()
  const holdBusinessAdmission=()=>{const token=Symbol('library-authority-cycle');businessSuspensions.add(token);let held=true;return()=>{if(held){held=false;businessSuspensions.delete(token)}}}
  const run = <T>(operation: (active: Binding) => Promise<T> | T,allowSuspendedCoordination=false): Promise<T> => {
    if (!binding || state.state !== 'ready') return Promise.reject(stateError(state.state))
    if (maintenanceAdmissionClosed || (!allowSuspendedCoordination&&businessSuspensions.size)) return Promise.reject(hostError('library-quiescing'))
    const active = binding
    const task = (async () => {
      try {
        const result = await active.lock.lease.runWhileHeld(async () => {
          if (state.state !== 'ready' || binding !== active || (!allowSuspendedCoordination&&businessSuspensions.size)) throw hostError('library-quiescing')
          return operation(active)
        })
        if (result.kind !== 'completed') {
          state = { state: 'recovery-required', identity: active.identity, generation: active.generation }
          throw hostError('library-lock-invalid')
        }
        return result.value
      } catch (error) {
        if (error instanceof ActiveLibraryHostError && error.code === 'library-lock-invalid') {
          state = { state: 'recovery-required', identity: active.identity, generation: active.generation }
        }
        if (error instanceof ActiveLibraryHostError || error instanceof CaptureIntakeError || error instanceof AssetTrashError) throw error
        throw hostError('library-operation-failed')
      }
    })()
    inFlight.add(task)
    void task.finally(() => inFlight.delete(task)).catch(() => undefined)
    return task
  }

  const enqueueLifecycle = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = lifecycleTail.then(operation, operation)
    lifecycleTail = next.then(() => undefined, () => undefined)
    return next
  }

  const prepareCreate = () => enqueueLifecycle(async () => {
    if (binding || state.state === 'opening' || state.state === 'quiescing') throw hostError('library-opening')
    const selected = await dependencies.selectLibraryDirectory()
    if (selected.kind === 'cancelled') return { kind: 'cancelled' as const }
    const targetDirectory = selected.directory
    const planner = createLibraryCreationPlannerTracer({
      targetDirectory,
      targetPlatform: dependencies.targetPlatform,
      qualification: dependencies.creationQualification
    })
    const result = await planner.prepare({ kind: 'review-target' })
    if (result.state !== 'ready') {
      throw hostError(result.state === 'blocked' && result.reason === 'target-not-empty'
        ? 'library-target-not-empty' : 'library-target-invalid')
    }
    const receipt = createIdentity('copy-plan')
    const publicPlan: CreateLibraryPlanProjection = Object.freeze({
      receipt,
      targetState: result.review.targetState,
      identity: result.review.identities.libraryIdentity,
      generation: result.review.identities.generation,
      roles: result.review.roles,
      confirmable: true
    })
    creationPlan = { publicPlan, review: result.review, targetDirectory, planner }
    return { kind: 'planned' as const, plan: publicPlan }
  })

  const confirmCreate = (receipt: string): Promise<CreateLibraryResult> => enqueueLifecycle(async () => {
    if (!creationPlan || creationPlan.publicPlan.receipt !== receipt) throw hostError('library-plan-not-found')
    const plan = creationPlan
    const check = await plan.planner.inspect({ receipt: plan.review.receipt })
    if (check.state !== 'ready' || check.review.targetState !== plan.review.targetState ||
      check.review.identities.libraryIdentity !== plan.review.identities.libraryIdentity) {
      creationPlan = undefined
      throw hostError('library-receipt-stale')
    }
    let materialized: MaterializedLibrary | undefined
    try {
      materialized = await materializeLibrary(plan.targetDirectory, check.review, receipt, dependencies.onCreationClaimed, dependencies.onBootstrapLocked)
      selectedDirectory = materialized.root
      const result = await openDirectory(materialized.root)
      creationPlan = undefined
      return result
    } catch (error) {
      if (!binding && materialized && !await rollbackMaterializedLibrary(materialized)) {
        state = { state: 'recovery-required', identity: null, generation: null }
        throw hostError('library-recovery-required')
      }
      creationPlan = undefined
      throw error instanceof ActiveLibraryHostError ? error : hostError('library-operation-failed')
    }
  })

  const open = (): Promise<CreateLibraryResult | { kind: 'cancelled' }> => enqueueLifecycle(async () => {
    if (binding || state.state === 'opening' || state.state === 'quiescing') throw hostError('library-opening')
    const selected = await dependencies.selectLibraryDirectory()
    if (selected.kind === 'cancelled') return { kind: 'cancelled' as const }
    selectedDirectory = selected.directory
    return openDirectory(selected.directory)
  })

  const reopen = (): Promise<CreateLibraryResult> => enqueueLifecycle(async () => {
    if (!selectedDirectory) throw hostError('library-not-open')
    return openDirectory(selectedDirectory)
  })

  const close = (): Promise<void> => enqueueLifecycle(async () => {
    if (!binding) {
      state = { state: 'closed', identity: null, generation: null }
      return
    }
    const active = binding
    state = { state: 'quiescing', identity: active.identity, generation: active.generation }
    recoveryPlans.clear(); recoveryPreparation++
    await Promise.allSettled(Array.from(inFlight))
    try { await active.lock.release() } catch { state = { state: 'recovery-required', identity: active.identity, generation: active.generation }; throw hostError('library-lock-invalid') }
    try { if (active.database.open) active.database.close() } catch { state = { state: 'recovery-required', identity: active.identity, generation: active.generation }; throw hostError('library-operation-failed') }
    binding = undefined
    state = { state: 'closed', identity: null, generation: null }
  })

  let mutationTail: Promise<unknown> = Promise.resolve()
  const serialRun = <T>(operation: (active: Binding) => Promise<T> | T): Promise<T> => {
    const previous = mutationTail
    const work = run(async active => { await previous.catch(() => {});if(businessSuspensions.size)throw hostError('library-quiescing');return operation(active) })
    mutationTail = work
    return work
  }
  let recoveryPreparation = 0
  let recoveryPreparing = false
  const recoveryPlans = new Map<string, { binding: Binding; plan: PreparedIntake; expires: number }>()
  const listIntakeRecovery = () => run(active => listRecovery(active))
  const prepareIntakeRecovery: ActiveLibraryHost['prepareIntakeRecovery'] = input => run(async active => {
    if (recoveryPreparing) throw new ActiveLibraryHostError('library-operation-failed', '正在核验另一项入库，请稍候。')
    recoveryPreparing = true
    try {
    const preparation = ++recoveryPreparation
    recoveryPlans.clear()
    let selected: string | undefined
    if (input.selectSource) {
      const selection = await dependencies.selectLocalFiles()
      if (selection.kind === 'cancelled') return { kind: 'cancelled' as const }
      if (selection.files.length !== 1) throw hostError('library-target-invalid')
      selected = selection.files[0].filePath
    }
    const plan = await prepareRecovery(active, input.id, selected)
    if (preparation !== recoveryPreparation || binding !== active || state.state !== 'ready') throw hostError('library-generation-conflict')
    const receipt = randomUUID()
    recoveryPlans.set(receipt, { binding: active, plan, expires: Date.now() + 300000 })
    return { ...plan.item, receipt, libraryIdentity: active.identity, generation: active.generation }
    } finally { recoveryPreparing = false }
  })
  const runIntakeRecovery = (receipt: string) => serialRun(active => {
    const record = recoveryPlans.get(receipt)
    recoveryPlans.delete(receipt)
    if (!record || record.binding !== active || record.expires < Date.now()) throw hostError('library-receipt-stale')
    return recoverIntake(active, record.plan)
  })
  const prepareAddAssets = () => run(async (active) => {
    const result = await active.capture.prepare()
    if (result.kind === 'planned') capturePlanGenerations.set(result.plan.receipt, result.plan.activeLibrary.generation)
    return result
  })
  const dispatchAddAssets = (receipt: string) => serialRun(async (active) => {
    const expectedGeneration = capturePlanGenerations.get(receipt)
    if (expectedGeneration && expectedGeneration !== active.generation) throw hostError('library-generation-conflict')
    const snapshot = await active.capture.dispatch({ kind: 'confirm-plan', planReceipt: receipt })
    return snapshot
  })
  const inspectCapture = (batchIdentity: string) => run(async (active) => {
    const snapshot = await active.capture.inspect({ batchIdentity })
    if (snapshot.activeLibraryIdentity !== active.identity) throw hostError('library-generation-conflict')
    return snapshot
  })
  const readAssetContext = (ids: readonly string[]) => run(active => readSelectedAssetContext(active.database, ids))
  const listAssets = () => run((active) => readAssets(active.database))
  const searchAssets = (queries: readonly string[]) => run((active) => {
    const normalizedQueries = queries.map((query) => query.trim()).filter(Boolean)
    if (normalizedQueries.length === 0) return readAssets(active.database)
    return readAssets(active.database).filter((asset) => normalizedQueries.every((query) => {
      const separator = query.indexOf(':')
      if (separator > 0 && query.slice(0, separator).trim().toLowerCase() === 'tag') {
        const value = query.slice(separator + 1).trim().toLocaleLowerCase()
        return [...asset.tags, ...(asset.tagAliases ?? [])].some(tag => tag.toLocaleLowerCase() === value)
      }
      if (separator > 0 && query.slice(0, separator).trim().toLowerCase() === 'special' &&
        query.slice(separator + 1).trim().toLowerCase() === 'untagged') return asset.tags.length === 0
      const value = query.toLocaleLowerCase()
      return asset.title.toLocaleLowerCase().includes(value) || asset.fileName.toLocaleLowerCase().includes(value)
    }))
  })
  const listTags = () => run(active => createActiveLibraryTagMetadata(active.database).listTags())
  const searchTags = (query: string) => run(active => createActiveLibraryTagMetadata(active.database).searchTags(query))
  const getTag = (id: string) => run(active => createActiveLibraryTagMetadata(active.database).getTag(id))
  const listTrash = () => run((active) => readTrash(active.database))
  const readPreviewBytes = (designAssetIdentity: string,visualScope?:Parameters<ActiveLibraryHost['readVisualPreview']>[0]) => run(async (active) => {
    const checkVisual=()=>{if(!visualScope)return;const c=readTagContext(active,visualScope);if(visualScope.sessionToken!==active.notebookSession||c.asset.revision!==visualScope.assetRevision||c.asset.previewGeneration!==visualScope.previewGeneration)tagIntentFail('TAG_INTENT_SOURCE_CHANGED')}
    checkVisual()
    const row = active.database.prepare(`
      SELECT c.grid_thumbnail_ref AS thumbnailRef, r.source_format AS format
      FROM promotion_links p
      JOIN asset_candidates c ON c.candidate_identity = p.candidate_identity
      JOIN capture_requests r ON r.capture_request_identity = c.capture_request_identity
      JOIN assets a ON a.id = p.design_asset_identity
      WHERE a.id = ?
    `).get(designAssetIdentity) as { thumbnailRef: string; format: 'jpeg' | 'png' | 'webp' } | undefined
    if (!row || !/^preview:[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u.test(row.thumbnailRef)) throw hostError('library-operation-failed')
    const previewPath = path.join(active.previews, safePreviewFileName(row.thumbnailRef.slice('preview:'.length), row.format))
    if (!isInsideDirectory(active.previews, previewPath)) throw hostError('library-operation-failed')
    await assertExistingDirectoryInsideManagedRoot(active.root, active.previews)
    const parentBefore = await fs.lstat(active.previews, { bigint: true })
    const handle = await fs.open(previewPath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0))
    try {
      const stat = await handle.stat({ bigint: true })
      if (!stat.isFile() || stat.isSymbolicLink()) throw hostError('library-operation-failed')
      const bytes = visualScope ? await readBoundedPreviewBytes(handle,32*1024*1024) : new Uint8Array(await handle.readFile())
      const parentAfter = await fs.lstat(active.previews, { bigint: true })
      if (!sameDirectoryNode(parentBefore, parentAfter)) throw hostError('library-operation-failed')
      checkVisual()
      return bytes
    } finally {
      await handle.close()
    }
  })
  const readPreview=(id:string)=>readPreviewBytes(id)
  const readVisualPreview:ActiveLibraryHost['readVisualPreview']=input=>readPreviewBytes(input.assetId,input)
  const readVisualSession:ActiveLibraryHost['readVisualSession']=scope=>run(active=>{if(scope.libraryIdentity!==active.identity||scope.generation!==active.generation)tagIntentFail('TAG_INTENT_SCOPE_EXPIRED');return{sessionToken:active.notebookSession,leaseIdentity:executionBinding(active).leaseIdentity}},true)
  const readManagedOriginal = (id: string, revision: string, previewGeneration: string) => run(active => readOwnedOriginal(active, id, revision, previewGeneration))
  const createTag: ActiveLibraryHost['createTag'] = input => run(active => createActiveLibraryTagMetadata(active.database).createTag(input))
  const updateTag: ActiveLibraryHost['updateTag'] = (id, input) => run(active => createActiveLibraryTagMetadata(active.database).updateTag(id, input))
  const createTagAlias = (id: string, alias: string) => run(active => createActiveLibraryTagMetadata(active.database).createAlias(id, alias))
  const removeTagAlias = (id: string, alias: string) => run(active => createActiveLibraryTagMetadata(active.database).removeAlias(id, alias))
  const setTagParent = (id: string, parentId: string | null) => run(active => createActiveLibraryTagMetadata(active.database).setParent(id, parentId))
  const addTagToAsset = (assetId: string, tagId: string) => run((active) => {
    active.database.transaction(() => {
      const allowed = active.database.prepare(`SELECT 1 FROM asset_lifecycle WHERE design_asset_identity = ? AND lifecycle_state = 'active'`).get(assetId)
      const tagExists = active.database.prepare('SELECT 1 FROM tags WHERE id = ?').get(tagId)
      if (!allowed || !tagExists) throw hostError('library-operation-failed')
      const now = new Date().toISOString()
      active.database.prepare(`INSERT OR IGNORE INTO asset_tags (id, asset_id, tag_id, source, confidence, status, created_by, created_at, updated_at) VALUES (?, ?, ?, 'manual', 1, 'confirmed', 'user', ?, ?)`).run(`${assetId}_${tagId}_manual`, assetId, tagId, now, now)
      active.database.prepare('UPDATE assets SET last_tag_updated_at = ? WHERE id = ?').run(now, assetId)
      active.database.prepare('UPDATE tags SET usage_count = (SELECT COUNT(*) FROM asset_tags at JOIN asset_lifecycle l ON l.design_asset_identity = at.asset_id WHERE at.tag_id = ? AND at.status = \'confirmed\' AND l.lifecycle_state = \'active\'), updated_at = ? WHERE id = ?').run(tagId, now, tagId)
    })()
  })
  const removeTagFromAsset = (assetId: string, tagId: string) => run((active) => {
    active.database.transaction(() => {
      const allowed = active.database.prepare("SELECT 1 FROM asset_lifecycle WHERE design_asset_identity = ? AND lifecycle_state = 'active'").get(assetId)
      if (!allowed) throw hostError('library-operation-failed')
      const now = new Date().toISOString()
      active.database.prepare('DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ?').run(assetId, tagId)
      active.database.prepare('UPDATE assets SET last_tag_updated_at = ? WHERE id = ?').run(now, assetId)
      active.database.prepare("UPDATE tags SET usage_count = (SELECT COUNT(*) FROM asset_tags at JOIN asset_lifecycle l ON l.design_asset_identity = at.asset_id WHERE at.tag_id = ? AND at.status = 'confirmed' AND l.lifecycle_state = 'active'), updated_at = ? WHERE id = ?").run(tagId, now, tagId)
    })()
  })
  const batchAddTagsToAssets = (assetIds: readonly string[], tagIds: readonly string[]) => run((active) => {
    validateTagBatch(active.database, assetIds, tagIds)
    active.database.transaction(() => {
      for (const assetId of assetIds) for (const tagId of tagIds) {
        const now = new Date().toISOString()
        active.database.prepare(`INSERT OR IGNORE INTO asset_tags (id, asset_id, tag_id, source, confidence, status, created_by, created_at, updated_at) VALUES (?, ?, ?, 'manual', 1, 'confirmed', 'user', ?, ?)`).run(`${assetId}_${tagId}_manual`, assetId, tagId, now, now)
        active.database.prepare('UPDATE assets SET last_tag_updated_at = ? WHERE id = ?').run(now, assetId)
      }
      refreshTagUsage(active.database, tagIds)
    })()
  })
  const batchRemoveTagsFromAssets = (assetIds: readonly string[], tagIds: readonly string[]) => run((active) => {
    validateTagBatch(active.database, assetIds, tagIds)
    active.database.transaction(() => {
      for (const assetId of assetIds) for (const tagId of tagIds) {
        const now = new Date().toISOString()
        active.database.prepare('DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ? AND source = \'manual\'').run(assetId, tagId)
        active.database.prepare('UPDATE assets SET last_tag_updated_at = ? WHERE id = ?').run(now, assetId)
      }
      refreshTagUsage(active.database, tagIds)
    })()
  })
  const replaceTagForAssets = (assetIds: readonly string[], oldTagId: string, newTagId: string) => run((active) => {
    validateTagBatch(active.database, assetIds, [oldTagId, newTagId])
    if (oldTagId === newTagId) throw hostError('library-operation-failed')
    active.database.transaction(() => {
      for (const assetId of assetIds) {
        const now = new Date().toISOString()
        active.database.prepare('DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ? AND source = \'manual\'').run(assetId, oldTagId)
        active.database.prepare(`INSERT OR IGNORE INTO asset_tags (id, asset_id, tag_id, source, confidence, status, created_by, created_at, updated_at) VALUES (?, ?, ?, 'manual', 1, 'confirmed', 'user', ?, ?)`).run(`${assetId}_${newTagId}_manual`, assetId, newTagId, now, now)
        active.database.prepare('UPDATE assets SET last_tag_updated_at = ? WHERE id = ?').run(now, assetId)
      }
      refreshTagUsage(active.database, [oldTagId, newTagId])
    })()
  })
  const listAssetTags = (assetId: string) => run((active) => {
    const rows = active.database.prepare("SELECT at.id, at.asset_id AS assetId, at.tag_id AS tagId, at.source, at.confidence, at.model_name AS modelName, at.model_version AS modelVersion, at.raw_value AS rawValue, at.created_by AS createdBy, at.created_at AS createdAt, at.updated_at AS updatedAt, t.name AS tagName, t.type AS tagType, t.color AS tagColor, at.status FROM asset_tags at JOIN tags t ON t.id = at.tag_id JOIN asset_lifecycle l ON l.design_asset_identity = at.asset_id WHERE at.asset_id = ? AND l.lifecycle_state = 'active' AND at.status != 'rejected' ORDER BY t.name").all(assetId) as Array<Record<string, unknown>>
    return rows.map((row) => ({ ...row, tag_id: row.tagId, tag_name: row.tagName, tag_type: row.tagType, tag_color: row.tagColor, asset_id: row.assetId, model_name: row.modelName, model_version: row.modelVersion, raw_value: row.rawValue, created_by: row.createdBy, created_at: row.createdAt, updated_at: row.updatedAt })) as unknown as Array<{ id: string; tagId: string; tagName: string; status: string }>
  })
  const updateAssetCaption = (assetId: string, caption: string, expectedCaption?: string) => run((active) => {
    const now = new Date().toISOString()
    const result = active.database.prepare("UPDATE assets SET ai_caption = ?, ai_caption_is_user_edited = 1, ai_caption_updated_at = ?, updated_at = ? WHERE id = ? AND (? IS NULL OR COALESCE(ai_caption, '') = ?) AND EXISTS (SELECT 1 FROM asset_lifecycle WHERE design_asset_identity = assets.id AND lifecycle_state = 'active')").run(caption, now, now, assetId, expectedCaption ?? null, expectedCaption ?? null)
    if (result.changes !== 1) throw hostError('library-operation-failed')
  })
  const resetAssetCaptionEdited = (assetId: string) => run((active) => {
    const now = new Date().toISOString()
    const result = active.database.prepare("UPDATE assets SET ai_caption_is_user_edited = 0, ai_caption_updated_at = ?, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM asset_lifecycle WHERE design_asset_identity = assets.id AND lifecycle_state = 'active')").run(now, now, assetId)
    if (result.changes !== 1) throw hostError('library-operation-failed')
  })
  const prepareTrash = (input: { designAssetIdentity: string; expectedRevision: string }) => run((active) => active.trash.prepare({ kind: 'move-design-asset-to-trash', ...input }))
  const downloadJournal: ActiveLibraryHost['downloadJournal'] = command => serialRun(async active => {
      if (command.generation !== active.generation) throw hostError('library-generation-conflict')
      if (command.kind !== 'import') return executeDownloadJournal(active, command)
      const checked = await executeDownloadJournal(active, { ...command, kind: 'read' })
      const intent = checked.intent!
      if (!['downloaded', 'importing', 'recovery-required'].includes(intent.phase) || !intent.content_sha256) throw hostError('library-recovery-required')
      active.database.prepare("UPDATE managed_download_intents SET phase='importing',revision=revision+1 WHERE task_id=? AND revision=?").run(intent.task_id, intent.revision)
      const input = { requestId: intent.task_id, generation: active.generation, fileName: intent.file_name, sourceUrl: intent.request_url }
      const admitted = active.database.prepare('SELECT source_generation,source_bytes FROM capture_requests WHERE capture_request_identity=?').get(`capture-request:download:${intent.task_id}:1`) as { source_generation: string; source_bytes: number } | undefined
      if (admitted && (admitted.source_generation !== `sha256:${intent.content_sha256}` || admitted.source_bytes !== intent.committed_bytes)) throw hostError('library-recovery-required')
      if (!admitted && active.database.prepare('SELECT 1 FROM assets WHERE id=? UNION ALL SELECT 1 FROM asset_lifecycle WHERE design_asset_identity=?').get(`download-asset:${intent.task_id}`, `download-asset:${intent.task_id}`)) throw hostError('library-recovery-required')
      const result = admitted ? await recoverOwnedDownload(active, input) : await importOwnedImage(active, { requestId: intent.task_id, fileName: intent.file_name, bytes: checked.bytes!, source: { kind: 'download', url: intent.request_url } }, preview)
      active.database.prepare("UPDATE managed_download_intents SET phase='completed',asset_id=?,revision=revision+1,updated_at=? WHERE task_id=?").run(result.assetId, new Date().toISOString(), intent.task_id)
      return { version: checked.version, assetId: result.assetId, intent: { ...intent, phase: 'completed' as const, asset_id: result.assetId, revision: intent.revision + 2 } }
  })
  const tagClaims:TagExecutionBinding['claims']=new Map()
  const executionBinding=(active:Binding):TagExecutionBinding=>{
    const lease=active.lock.lease.inspect()
    if(lease.state!=='held'||lease.libraryIdentity!==active.identity||lease.libraryGeneration!==active.generation){
      state={state:'recovery-required',identity:active.identity,generation:active.generation}
      throw hostError('library-lock-invalid')
    }
    // Discard capabilities from previous open sessions; database attempts are not authority.
    for(const [token,claim] of tagClaims)if(claim.session!==active.notebookSession)tagClaims.delete(token)
    return {...active,leaseIdentity:lease.leaseIdentity,claims:tagClaims}
  }
  const enableTagExecution:ActiveLibraryHost['enableTagExecution']=(input,signal)=>enqueueLifecycle(async()=>{
    if(!binding||state.state!=='ready')throw stateError(state.state)
    const active=binding;if(businessSuspensions.size)throw hostError('library-quiescing');maintenanceAdmissionClosed=true
    try{
      await Promise.allSettled(Array.from(inFlight))
      const guarded=await active.lock.lease.runWhileHeld(async()=>{
        const check=()=>{
          executionBinding(active)
          if(binding!==active||state.state!=='ready'||signal?.aborted||businessSuspensions.size)tagIntentFail('TAG_INTENT_SCOPE_EXPIRED')
          const c=readTagContext(active,input)
          if(input.sessionToken!==active.notebookSession)tagIntentFail('TAG_INTENT_SESSION_EXPIRED')
          return c
        }
        const context=check()
        if(context.schemaVersion>=10)return
        if(context.schemaVersion!==9||input.expectedSchemaVersion!==9||!input.allowUpgrade)tagIntentFail('TAG_EXECUTION_UPGRADE_REQUIRED')
        const before=await prepareTagIntentBackup(active,()=>{check()},signal,dependencies.tagIntentTestHooks)
        withTagIntentGrowthCap(active.database,before.pageCap,()=>active.database.transaction(()=>{
          check();applyTagExecutionSchema(active.database);seedTagCurrent(executionBinding(active))
          dependencies.tagIntentTestHooks?.afterDdl?.();assertLibraryDataSchema(active.database)
          dependencies.tagIntentTestHooks?.beforeCommit?.()
        })())
        try{dependencies.tagIntentTestHooks?.afterCommit?.()}catch{tagIntentFail('TAG_INTENT_ACK_UNCERTAIN')}
      })
      if(guarded.kind!=='completed'){state={state:'recovery-required',identity:active.identity,generation:active.generation};throw hostError('library-lock-invalid')}
    }catch(error){
      if(error instanceof Error&&error.message==='TAG_INTENT_SETTINGS_RESTORE_FAILED')state={state:'recovery-required',identity:active.identity,generation:active.generation}
      if(error instanceof ActiveLibraryHostError)throw error
      tagIntentFail('TAG_EXECUTION_STORAGE_FAILED')
    }finally{maintenanceAdmissionClosed=false}
  })
  const claimTagExecution:ActiveLibraryHost['claimTagExecution']=input=>run(active=>active.database.transaction(()=>claimTags(executionBinding(active),input))())
  const markTagExecutionSent:ActiveLibraryHost['markTagExecutionSent']=input=>run(active=>markTagSent(executionBinding(active),input))
  const commitTagExecution:ActiveLibraryHost['commitTagExecution']=(input,signal)=>run(active=>{
    const result=active.database.transaction(()=>commitTags(executionBinding(active),input,signal))()
    tagClaims.delete(input.attemptToken)
    return result
  })
  const finishTagExecution:ActiveLibraryHost['finishTagExecution']=input=>run(active=>finishTags(executionBinding(active),input,businessSuspensions.size>0),true).finally(()=>{tagClaims.delete(input.attemptToken)})
  const readTagExecutionRequest:ActiveLibraryHost['readTagExecutionRequest']=(scope,id)=>run(active=>readTagRequest(executionBinding(active),scope,id))
  const readTagOutbox:ActiveLibraryHost['readTagOutbox']=scope=>run(active=>{
    if(scope.libraryIdentity!==active.identity||scope.generation!==active.generation||scope.sessionToken!==active.notebookSession)tagIntentFail('TAG_INTENT_SCOPE_EXPIRED')
    return Number(active.database.pragma('user_version',{simple:true}))>=10?active.database.prepare('SELECT event_id AS eventId,asset_id AS assetId FROM independent_tag_outbox WHERE delivered=0 ORDER BY created_at,event_id LIMIT 50').all() as Array<{eventId:string;assetId:string}>:[]
  })
  const ackTagOutbox:ActiveLibraryHost['ackTagOutbox']=(scope,id)=>run(active=>{
    if(scope.libraryIdentity!==active.identity||scope.generation!==active.generation||scope.sessionToken!==active.notebookSession)tagIntentFail('TAG_INTENT_SCOPE_EXPIRED')
    if(Number(active.database.pragma('user_version',{simple:true}))<10)tagIntentFail('TAG_EXECUTION_UPGRADE_REQUIRED')
    active.database.prepare('UPDATE independent_tag_outbox SET delivered=1 WHERE event_id=?').run(id)
  })
  const readTagRecovery:ActiveLibraryHost['readTagRecovery']=(input,related,id)=>run(active=>readRecovery(active,input,related,id))
  const readTagEffectReceipt:ActiveLibraryHost['readTagEffectReceipt']=input=>run(active=>readTagReceipt(active,input))
  const readTagExecution:ActiveLibraryHost['readTagExecution']=scope=>run(active=>readTags(executionBinding(active),scope))
  const enableVisualAi = () => run(active => enableVisualAiStorage(active.database))
  let ocrGrantEpoch=0
  const ocrAuthority:BackgroundOcrAuthority={claims:new Map()}
  const ocrBinding=(active:Binding)=>{
    executionBinding(active)
    if(ocrAuthority.grant?.session!==active.notebookSession)ocrAuthority.grant=undefined
    for(const [token,c] of ocrAuthority.claims)if(c.session!==active.notebookSession)ocrAuthority.claims.delete(token)
    return{...active,ocrAuthority}
  }
  const readBackgroundOcr:ActiveLibraryHost['readBackgroundOcr']=input=>run(active=>readOcrBackground(ocrBinding(active),input))
  const revokeBackgroundOcr=()=>{ocrGrantEpoch++;ocrAuthority.grant=undefined}
  const configureBackgroundOcr:ActiveLibraryHost['configureBackgroundOcr']=(input,signal)=>{
    // Revoke before any await, including failed persistence. Never resurrect from the audit row.
    revokeBackgroundOcr();const grantEpoch=ocrGrantEpoch
    return enqueueLifecycle(async()=>{
      if(!binding||state.state!=='ready')throw stateError(state.state)
      if(businessSuspensions.size)throw hostError('library-quiescing')
      const active=binding;maintenanceAdmissionClosed=true
      try{
        await Promise.allSettled([...inFlight])
        const guarded=await active.lock.lease.runWhileHeld(async()=>{
          const check=()=>{if(grantEpoch!==ocrGrantEpoch||binding!==active||state.state!=='ready'||businessSuspensions.size)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED');return validateBackgroundOcrPermission(ocrBinding(active),input,signal)}
          const prior=check();if(prior.schemaVersion===12&&!input.allowUpgrade)throw Error('BACKGROUND_OCR_UPGRADE_REQUIRED')
          const backup=prior.schemaVersion===12?await prepareTagIntentBackup(active,()=>{check()},signal,dependencies.tagIntentTestHooks):null
          const write=()=>active.database.transaction(()=>{check();applyBackgroundOcrSchema(active.database);dependencies.tagIntentTestHooks?.afterDdl?.();writeBackgroundOcrPermission(ocrBinding(active),input);assertLibraryDataSchema(active.database);dependencies.tagIntentTestHooks?.beforeCommit?.()})()
          if(backup)withTagIntentGrowthCap(active.database,backup.pageCap,write);else write()
          try{dependencies.tagIntentTestHooks?.afterCommit?.()}catch{throw Error('BACKGROUND_OCR_ACK_UNCERTAIN')}
          if(signal?.aborted||grantEpoch!==ocrGrantEpoch)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED')
          if(input.enabled)ocrAuthority.grant={session:active.notebookSession,revision:input.expectedRevision+1,runtime:input.runtimeFingerprint}
          return readOcrBackground(ocrBinding(active),input)
        })
        if(guarded.kind!=='completed'){state={state:'recovery-required',identity:active.identity,generation:active.generation};throw hostError('library-lock-invalid')}
        return guarded.value
      }catch(error){revokeBackgroundOcr();if(error instanceof Error&&error.message==='TAG_INTENT_SETTINGS_RESTORE_FAILED')state={state:'recovery-required',identity:active.identity,generation:active.generation};throw error}
      finally{maintenanceAdmissionClosed=false}
    })
  }
  const claimBackgroundOcr:ActiveLibraryHost['claimBackgroundOcr']=input=>run(active=>active.database.transaction(()=>claimOcrBackground(ocrBinding(active),input))())
  const markOcrSent:ActiveLibraryHost['markBackgroundOcrSent']=input=>run(active=>active.database.transaction(()=>markBackgroundOcrSent(ocrBinding(active),input))())
  const commitBackgroundOcr:ActiveLibraryHost['commitBackgroundOcr']=(input,signal)=>run(active=>{
    const a=ocrBinding(active),result=active.database.transaction(()=>commitOcrBackground(a,input,signal))();releaseBackgroundOcrClaim(a,input.claim);return result
  })
  const finishBackgroundOcr:ActiveLibraryHost['finishBackgroundOcr']=(input,status)=>enqueueLifecycle(()=>run(active=>active.database.transaction(()=>finishOcrBackground(ocrBinding(active),input,status))(),true))
  const readBackgroundAnalysis:ActiveLibraryHost['readBackgroundAnalysis']=input=>run(active=>readBackground(active,input))
  const changeBackgroundIntent:ActiveLibraryHost['changeBackgroundIntent']=(input,signal)=>run(active=>{active.database.transaction(()=>changeBackground(active,input,signal))();return readBackground(active,input)})
  const configureBackgroundAnalysis:ActiveLibraryHost['configureBackgroundAnalysis']=(input,signal)=>enqueueLifecycle(async()=>{
    if(!binding||state.state!=='ready')throw stateError(state.state)
    if(businessSuspensions.size)throw hostError('library-quiescing')
    const active=binding;maintenanceAdmissionClosed=true
    try{
      await Promise.allSettled([...inFlight])
      const result=await active.lock.lease.runWhileHeld(async()=>{
        const check=()=>{executionBinding(active);if(binding!==active||state.state!=='ready'||businessSuspensions.size)tagIntentFail('BACKGROUND_SCOPE_EXPIRED');return validateBackgroundConfig(active,input,signal)}
        const prior=check();if(prior.schemaVersion!==input.expectedSchemaVersion)tagIntentFail('BACKGROUND_CONFLICT')
        if(prior.schemaVersion<12&&!input.allowUpgrade)tagIntentFail('BACKGROUND_UPGRADE_REQUIRED')
        const backup=prior.schemaVersion<12?await prepareTagIntentBackup(active,()=>{check()},signal,dependencies.tagIntentTestHooks):null
        const commit=()=>active.database.transaction(()=>{
          check()
          if(prior.schemaVersion<10){applyTagExecutionSchema(active.database);seedTagCurrent(executionBinding(active))}
          applyTagDecisionSchema(active.database);applyBackgroundAnalysisSchema(active.database)
          dependencies.tagIntentTestHooks?.afterDdl?.();writeBackgroundConfig(active,input,signal)
          assertLibraryDataSchema(active.database);dependencies.tagIntentTestHooks?.beforeCommit?.()
        })()
        if(backup)withTagIntentGrowthCap(active.database,backup.pageCap,commit);else commit()
        try{dependencies.tagIntentTestHooks?.afterCommit?.()}catch{tagIntentFail('TAG_INTENT_ACK_UNCERTAIN')}
        return readBackground(active,input)
      })
      if(result.kind!=='completed'){state={state:'recovery-required',identity:active.identity,generation:active.generation};throw hostError('library-lock-invalid')}
      return result.value
    }catch(error){if(error instanceof Error&&error.message==='TAG_INTENT_SETTINGS_RESTORE_FAILED')state={state:'recovery-required',identity:active.identity,generation:active.generation};if(error instanceof ActiveLibraryHostError)throw error;return tagIntentFail('BACKGROUND_STORAGE_FAILED')}
    finally{maintenanceAdmissionClosed=false}
  })
  const readTagDecisionContext:ActiveLibraryHost['readTagDecisionContext']=input=>run(active=>readDecisionContext(active,input))
  const decideTag:ActiveLibraryHost['decideTag']=(input,signal)=>{
    if(input.decision!=='reject'||!input.allowUpgrade)return run(active=>{
      if(signal?.aborted)tagIntentFail('TAG_DECISION_CANCELLED')
      active.database.transaction(()=>writeTagDecision(active,input))()
      return readTags(executionBinding(active),input)
    })
    return enqueueLifecycle(async()=>{
      if(!binding||state.state!=='ready')throw stateError(state.state)
      if(businessSuspensions.size)throw hostError('library-quiescing')
      const active=binding;maintenanceAdmissionClosed=true
      try{
        await Promise.allSettled(Array.from(inFlight))
        const result=await active.lock.lease.runWhileHeld(async()=>{
          const check=()=>{executionBinding(active);if(binding!==active||state.state!=='ready'||businessSuspensions.size||signal?.aborted)tagIntentFail('TAG_DECISION_CANCELLED');const c=readDecisionContext(active,input);if(c.sessionToken!==input.sessionToken)tagIntentFail('TAG_INTENT_SESSION_EXPIRED');return c}
          const c=check(),backup=c.schemaVersion<11?await prepareTagIntentBackup(active,()=>{check()},signal,dependencies.tagIntentTestHooks):null
          const commit=()=>active.database.transaction(()=>{check();applyTagDecisionSchema(active.database);dependencies.tagIntentTestHooks?.afterDdl?.();writeTagDecision(active,input);assertLibraryDataSchema(active.database);dependencies.tagIntentTestHooks?.beforeCommit?.()})()
          if(backup)withTagIntentGrowthCap(active.database,backup.pageCap,commit);else commit()
          try{dependencies.tagIntentTestHooks?.afterCommit?.()}catch{tagIntentFail('TAG_INTENT_ACK_UNCERTAIN')}
          return readTags(executionBinding(active),input)
        })
        if(result.kind!=='completed'){state={state:'recovery-required',identity:active.identity,generation:active.generation};throw hostError('library-lock-invalid')}
        return result.value
      }catch(error){if(error instanceof Error&&error.message==='TAG_INTENT_SETTINGS_RESTORE_FAILED')state={state:'recovery-required',identity:active.identity,generation:active.generation};if(error instanceof ActiveLibraryHostError)throw error;return tagIntentFail('TAG_DECISION_STORAGE_FAILED')}
      finally{maintenanceAdmissionClosed=false}
    })
  }
  const readTagIntentContext: ActiveLibraryHost['readTagIntentContext'] = scope => run(active => readTagContext(active,scope))
  const readTagIntents: ActiveLibraryHost['readTagIntents'] = scope => run(active => readSavedTagIntents(active,scope))
  const persistTagIntents = <T>(inputs:readonly TagIntentCommit[],existing:(active:typeof binding & {})=>T|undefined,insert:(active:typeof binding & {})=>T,signal?:AbortSignal):Promise<T> => enqueueLifecycle(async () => {
    const input=inputs[0]
    if (!binding || state.state !== 'ready') throw stateError(state.state)
    const active=binding
    if(businessSuspensions.size)throw hostError('library-quiescing')
    maintenanceAdmissionClosed=true
    try {
      // Maintenance is outside inFlight, so draining cannot wait for this operation itself.
      await Promise.allSettled(Array.from(inFlight))
      const result=await active.lock.lease.runWhileHeld(async () => {
        const checkCurrent=() => {
          const lease=active.lock.lease.inspect()
          if(lease.state!=='held'||lease.libraryIdentity!==active.identity||lease.libraryGeneration!==active.generation){
            state={state:'recovery-required',identity:active.identity,generation:active.generation}
            throw hostError('library-lock-invalid')
          }
          if (binding!==active || state.state!=='ready'||businessSuspensions.size) tagIntentFail('TAG_INTENT_SCOPE_EXPIRED')
          for(const item of inputs)validateTagIntentCommit(active,item,signal)
        }
        checkCurrent()
        const prior=existing(active)
        if (prior) return prior
        const context=readTagContext(active,input)
        if (context.schemaVersion!==input.expectedSchemaVersion) return tagIntentFail('TAG_INTENT_REVIEW_STALE')
        if (context.schemaVersion<9 && !input.allowUpgrade) return tagIntentFail('TAG_INTENT_UPGRADE_REQUIRED')
        const backup=context.schemaVersion<9 ? await prepareTagIntentBackup(active,checkCurrent,signal,dependencies.tagIntentTestHooks) : null
        checkCurrent()
        const commit=() => active.database.transaction(() => {
          checkCurrent()
          applyTagIntentSchema(active.database)
          dependencies.tagIntentTestHooks?.afterDdl?.()
          const saved=insert(active)
          dependencies.tagIntentTestHooks?.beforeCommit?.()
          assertLibraryDataSchema(active.database)
          return saved
        })()
        const saved=backup ? withTagIntentGrowthCap(active.database,backup.pageCap,commit) : commit()
        try { dependencies.tagIntentTestHooks?.afterCommit?.() } catch { return tagIntentFail('TAG_INTENT_ACK_UNCERTAIN') }
        return saved
      })
      if (result.kind!=='completed') {
        state={ state:'recovery-required',identity:active.identity,generation:active.generation }
        throw hostError('library-lock-invalid')
      }
      return result.value
    } catch(error) {
      if (error instanceof Error && error.message==='TAG_INTENT_SETTINGS_RESTORE_FAILED') state={ state:'recovery-required',identity:active.identity,generation:active.generation }
      if (error instanceof ActiveLibraryHostError) throw error
      return tagIntentFail('TAG_INTENT_STORAGE_FAILED')
    } finally { maintenanceAdmissionClosed=false }
  })
  const saveTagIntent:ActiveLibraryHost['saveTagIntent']=(input,signal)=>persistTagIntents([input],a=>existingTagIntent(a,input),a=>insertTagIntent(a,input),signal)
  const saveTagBatch:ActiveLibraryHost['saveTagBatch']=(input,signal)=>persistTagIntents(tagBatchInputs(input),a=>existingTagBatch(a,input),a=>insertTagBatch(a,input),signal)
  const importDownloadedImage: ActiveLibraryHost['importDownloadedImage'] = input => serialRun(active => {
    if (input.generation !== active.generation) throw hostError('library-generation-conflict')
    return importOwnedImage(active, { ...input, source: { kind: 'download', url: input.sourceUrl } }, preview)
  })
  const recoverDownloadedImage: ActiveLibraryHost['recoverDownloadedImage'] = input => serialRun(active => {
    if (input.generation !== active.generation) throw hostError('library-generation-conflict')
    return recoverOwnedDownload(active, input)
  })
  const saveImageVariant = (input: ImageVariantInput, signal?: AbortSignal) => serialRun(async active => {
    const checkSource = () => {
      if (signal?.aborted || input.libraryIdentity !== active.identity || input.generation !== active.generation) throw hostError('library-generation-conflict')
      const source = active.database.prepare("SELECT l.revision,c.grid_thumbnail_ref AS preview FROM asset_lifecycle l JOIN promotion_links p ON p.design_asset_identity=l.design_asset_identity JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity WHERE l.design_asset_identity=? AND l.lifecycle_state='active'").get(input.assetId) as { revision: string; preview: string } | undefined
      if (!source || source.revision !== input.sourceRevision || source.preview !== input.previewGeneration) throw hostError('library-generation-conflict')
    }
    checkSource()
    if (input.options.source === 'original') {
      const original = await readOwnedOriginal(active, input.assetId, input.sourceRevision, input.previewGeneration)
      if (!input.sourceIdentity || original.identity !== input.sourceIdentity) throw hostError('library-generation-conflict')
      checkSource()
    }
    return importOwnedImage(active, { ...input, source: { kind: 'variant', metadata: { kind: input.options.source === 'original' ? 'managed-original-variant' : 'controlled-preview-variant', sourceAssetId: input.assetId, sourceRevision: input.sourceRevision, previewGeneration: input.previewGeneration, ...(input.sourceIdentity ? { sourceIdentity: input.sourceIdentity } : {}), recipe: input.options } } }, preview, checkSource)
  })
  const saveVisualAiEvidence = (evidence: VisualAiEvidence, signal?: AbortSignal) => run(active => {
    if (signal?.aborted) throw hostError('library-operation-failed')
    commitVisualAiEvidence(active.database, evidence)
  })
  const listVisualAiEvidence = (assetId: string) => run(active => readVisualAiEvidence(active.database, assetId))
  const confirmVisualAiTag = (assetId: string, evidenceId: string, tag: string) => run(active => {
    if(Number(active.database.pragma('user_version',{simple:true}))>=10)tagIntentFail('TAG_DECISION_REQUIRED')
    confirmEvidenceTag(active.database,assetId,evidenceId,tag)
  })
  const dispatchTrash = (command: Parameters<AssetTrashWorkflow['dispatch']>[0]) => run((active) => active.trash.dispatch(command))
  const inspectTrash = (assetId: string) => run((active) => active.trash.inspect({ designAssetIdentity: assetId }))

  const measurePreviewColors:ActiveLibraryHost['measurePreviewColors']=input=>run(async active=>{
    if(input.libraryIdentity!==active.identity||input.generation!==active.generation)throw hostError('library-generation-conflict')
    if(!active.database.prepare("SELECT 1 FROM asset_lifecycle WHERE design_asset_identity=? AND lifecycle_state='active'").get(input.assetId))throw hostError('library-operation-failed')
    return measureColors(await readPreview(input.assetId))
  })
  const readOcr:ActiveLibraryHost['readOcr']=scope=>run(active=>readSavedOcr(active,scope))
  const commitOcr:ActiveLibraryHost['commitOcr']=(input,signal)=>run(active=>commitSavedOcr(active,input,signal))
  const correctOcr:ActiveLibraryHost['correctOcr']=input=>run(active=>correctSavedOcr(active,input))
  const readWorkSets:ActiveLibraryHost['readWorkSets']=(scope,device)=>run(active=>readSavedWorkSets(active,scope,device))
  const writeWorkSet:ActiveLibraryHost['writeWorkSet']=(input,device,layout)=>run(active=>writeSavedWorkSet(active,input,device,layout))
  const writeWorkLayout:ActiveLibraryHost['writeWorkLayout']=(input,device)=>run(active=>writeSavedWorkLayout(active,input,device))
  const readOrganization:ActiveLibraryHost['readOrganization']=scope=>run(active=>readLibraryOrganization(active,scope))
  const writeOrganization:ActiveLibraryHost['writeOrganization']=input=>run(active=>writeLibraryOrganization(active,input))
  const readNotebook:ActiveLibraryHost['readNotebook']=scope=>run(active=>readAssetNotebook(active,scope))
  const saveNotebook:ActiveLibraryHost['saveNotebook']=input=>run(active=>saveAssetNotebook(active,input))

  return Object.freeze({
    readBackgroundOcr,configureBackgroundOcr,revokeBackgroundOcr,claimBackgroundOcr,markBackgroundOcrSent:markOcrSent,commitBackgroundOcr,finishBackgroundOcr,
    readOcr,commitOcr,correctOcr,readNotebook,saveNotebook,readOrganization,writeOrganization,measurePreviewColors,readWorkSets,writeWorkSet,writeWorkLayout,
    inspect, prepareCreate, confirmCreate, open, reopen, close,
    prepareAddAssets, dispatchAddAssets, inspectCapture,
    readAssetContext,readBackgroundAnalysis,configureBackgroundAnalysis,changeBackgroundIntent,readTagRecovery,readTagEffectReceipt, readTagDecisionContext,decideTag,holdBusinessAdmission,enableTagExecution,claimTagExecution,markTagExecutionSent,commitTagExecution,finishTagExecution,readTagExecutionRequest,readTagOutbox,ackTagOutbox,readTagExecution, readTagIntentContext, readTagIntents, saveTagIntent,saveTagBatch, listAssets, searchAssets, listTags, searchTags, getTag, listTrash, readPreview, readVisualSession,readVisualPreview, readManagedOriginal, createTag, updateTag, addTagToAsset,
    createTagAlias, removeTagAlias, setTagParent, removeTagFromAsset, batchAddTagsToAssets, batchRemoveTagsFromAssets, replaceTagForAssets, listAssetTags, updateAssetCaption, resetAssetCaptionEdited,
    listIntakeRecovery, prepareIntakeRecovery, runIntakeRecovery, downloadJournal, prepareTrash, dispatchTrash, inspectTrash, enableVisualAi, saveVisualAiEvidence, listVisualAiEvidence, confirmVisualAiTag, importDownloadedImage, recoverDownloadedImage, saveImageVariant
  })

  async function openDirectory(directory: string): Promise<CreateLibraryResult> {
    if (binding || state.state === 'opening' || state.state === 'quiescing') throw hostError('library-opening')
    state = { state: 'opening', identity: null, generation: null }
    try {
      const manifest = await readManifest(directory)
      const declaration = manifest.declaration
      const root = path.resolve(directory)
      const control = path.join(root, CONTROL_DIRECTORY_NAME)
      const managed = path.join(root, declaration.managedOriginalsRelativePath)
      const staging = path.join(control, STAGING_DIRECTORY_NAME)
      const previews = path.join(control, PREVIEW_DIRECTORY_NAME)
      await assertRoles(root, control, managed, staging, previews)
      const openTracer = createLibraryOpenInspectionTracer({
        libraryRootDirectory: root,
        libraryControlDirectory: control,
        qualification: dependencies.openQualification
      })
      const inspection = await openTracer.libraryStart.inspect({ kind: 'inspect-candidate', candidate: openTracer.candidate })
      if (inspection.state !== 'compatible') throw hostError('library-recovery-required')
      const databasePath = path.join(control, LIBRARY_DATABASE_FILE)
      const readOnly = openReadonlyLibraryDatabase(databasePath)
      let store: ReturnType<typeof inspectLibraryControlStore>
      try { store = readOnly.transaction(() => inspectLibraryControlStore(readOnly, declaration))() } finally { readOnly.close() }
      if (store.kind !== 'compatible') throw hostError('library-schema-invalid')
      const lockAuthority = createExclusiveLibraryLockTracer({ controlDirectory: control, libraryIdentity: declaration.libraryIdentity, libraryGeneration: store.generation })
      const acquired = await lockAuthority.acquire()
      if (acquired.kind !== 'acquired') throw hostError(acquired.kind === 'busy' ? 'library-opening' : 'library-lock-invalid')
      let database: Database.Database | undefined
      try {
        database = new Database(databasePath, { fileMustExist: true, timeout: 0 })
        database.pragma('foreign_keys = ON')
        assertLibraryDataSchema(database)
        const storage: ActiveLibraryStorageBinding = { libraryRootDirectory: root, libraryControlDirectory: control, managedOriginalsDirectory: managed, intakeStagingDirectory: staging, requiredPreviewsDirectory: previews }
        const promotionLifecycle = createSqliteCapturePromotionLifecycleSink(database, () => createIdentity('revision'))
        const session = createActiveLibrarySession({ identity: declaration.libraryIdentity, generation: store.generation, storage, database, lock: acquired.lock.lease, promotionLifecycle })
        const capture = await sessionCapture(session)
        const trash = createTrashWorkflow(database)
        const recovered=await acquired.lock.lease.runWhileHeld(async()=>reconcileTagExecutions(database!))
        if(recovered.kind!=='completed')throw hostError('library-lock-invalid')
        binding = { notebookSession:randomUUID(), manifestDeclaration:declaration, root, control, managed, staging, previews, identity: declaration.libraryIdentity, generation: store.generation, database, lock: acquired.lock, session, capture, trash }
        state = { state: 'ready', identity: declaration.libraryIdentity, generation: store.generation }
        return { identity: declaration.libraryIdentity, generation: store.generation }
      } catch (error) {
        try { await acquired.lock.release() } catch { /* fail closed */ }
        try { database?.close() } catch { /* fail closed */ }
        throw error
      }
    } catch (error) {
      state = { state: 'recovery-required', identity: null, generation: null }
      if (error instanceof ActiveLibraryHostError) throw error
      throw hostError('library-operation-failed')
    }
  }

  async function sessionCapture(session: ActiveLibrarySession): Promise<AddAssetsWorkflow> {
    return createActiveLibraryCaptureWorkflow({
      session,
      selectLocalFiles: dependencies.selectLocalFiles,
      generateSystemPreview: preview,
      createIdentity
    })
  }

  function createTrashWorkflow(database: Database.Database): AssetTrashWorkflow {
    const relationships: AssetTrashRelationshipProjection = { inspectInCurrentTransaction: ({ database: exactDatabase, designAssetIdentity }) => projectRelationships(exactDatabase, designAssetIdentity) }
    return createSqliteAssetTrashWorkflow({ database, relationships, createPlanReceipt: () => createIdentity('trash-plan'), createRevision: () => createIdentity('revision'), now: () => new Date().toISOString() })
  }
}

function sameDirectoryNode(
  left: { dev: bigint; ino: bigint; mode: bigint; birthtimeNs: bigint },
  right: { dev: bigint; ino: bigint; mode: bigint; birthtimeNs: bigint }
): boolean {
  return left.dev === right.dev && left.ino === right.ino &&
    left.mode === right.mode && left.birthtimeNs === right.birthtimeNs
}

async function readManifest(root: string): Promise<{ declaration: LibraryManifestDeclaration }> {
  const bytes = await fs.readFile(path.join(path.resolve(root), CONTROL_DIRECTORY_NAME, MANIFEST_FILE))
  const parsed = readLibraryManifestDeclaration(new Uint8Array(bytes))
  if (parsed.kind !== 'compatible') throw hostError('library-recovery-required')
  return { declaration: parsed.declaration }
}

async function assertRoles(root: string, control: string, managed: string, staging: string, previews: string): Promise<void> {
  const observed = await observeLibraryFilesystemRoles({ libraryRootDirectory: root, libraryControlDirectory: control, managedOriginalsDirectory: managed })
  for (const directory of [staging, previews]) {
    const stat = await fs.lstat(directory)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('LIBRARY_ROLE_INVALID')
  }
  if ([control, managed, staging, previews].some((directory, index, all) => all.some((other, otherIndex) => index !== otherIndex && path.resolve(directory) === path.resolve(other)))) throw new Error('LIBRARY_ROLE_INVALID')
  void observed
}


function validateTagBatch(database: Database.Database, assetIds: readonly string[], tagIds: readonly string[]): void {
  if (assetIds.length === 0 || tagIds.length === 0 || new Set(assetIds).size !== assetIds.length || new Set(tagIds).size !== tagIds.length) throw hostError('library-operation-failed')
  const activeAssetCount = database.prepare("SELECT COUNT(*) AS count FROM asset_lifecycle WHERE lifecycle_state = 'active' AND design_asset_identity IN (" + assetIds.map(() => '?').join(',') + ")").get(...assetIds) as { count: number }
  const tagCount = database.prepare(`SELECT COUNT(*) AS count FROM tags WHERE id IN (${tagIds.map(() => '?').join(',')})`).get(...tagIds) as { count: number }
  if (activeAssetCount.count !== assetIds.length || tagCount.count !== tagIds.length) throw hostError('library-operation-failed')
}

function refreshTagUsage(database: Database.Database, tagIds: readonly string[]): void {
  const now = new Date().toISOString()
  for (const tagId of tagIds) database.prepare("UPDATE tags SET usage_count = (SELECT COUNT(*) FROM asset_tags at JOIN asset_lifecycle l ON l.design_asset_identity = at.asset_id WHERE at.tag_id = ? AND at.status = 'confirmed' AND l.lifecycle_state = 'active'), updated_at = ? WHERE id = ?").run(tagId, now, tagId)
}

function readTrash(database: Database.Database): readonly ActiveLibraryTrashEntryProjection[] {
  return database.prepare(`
    SELECT l.design_asset_identity AS id, l.revision, l.lifecycle_state AS state,
      l.ownership, l.trashed_at AS trashedAt, c.grid_thumbnail_ref AS thumbnailRef
    FROM asset_lifecycle l
    LEFT JOIN promotion_links p ON p.design_asset_identity = l.design_asset_identity
    LEFT JOIN asset_candidates c ON c.candidate_identity = p.candidate_identity
    WHERE l.lifecycle_state = 'trash'
    ORDER BY l.trashed_at DESC
  `).all() as ActiveLibraryTrashEntryProjection[]
}

function projectRelationships(database: Database.Database, designAssetIdentity: string) {
  const asset = database.prepare('SELECT id, source_site_id AS sourceSiteId FROM assets WHERE id = ?').get(designAssetIdentity) as { id: string; sourceSiteId: string } | undefined
  if (!asset) return null
  const promotion = database.prepare(`SELECT p.candidate_identity AS candidateIdentity, p.promotion_link_identity AS promotionLinkIdentity, c.original_storage_object_identity AS originalStorageObjectIdentity FROM promotion_links p JOIN asset_candidates c ON c.candidate_identity = p.candidate_identity WHERE p.design_asset_identity = ?`).get(designAssetIdentity) as { candidateIdentity: string; promotionLinkIdentity: string; originalStorageObjectIdentity: string } | undefined
  if (!promotion) return null
  const tags = database.prepare("SELECT tag_id AS tagId FROM asset_tags WHERE asset_id = ? AND status = 'confirmed' ORDER BY tag_id").all(designAssetIdentity) as Array<{ tagId: string }>
  return {
    originalRelationship: { kind: 'managed' as const, managedOriginalIdentity: promotion.originalStorageObjectIdentity, originalStorageObjectIdentity: promotion.originalStorageObjectIdentity },
    assetSourceIdentity: asset.sourceSiteId,
    tagIdentities: tags.map((tag) => tag.tagId), collectionMembershipIdentities: [],
    promotion: { candidateIdentity: promotion.candidateIdentity, promotionLinkIdentity: promotion.promotionLinkIdentity }
  }
}

function stateError(current: ActiveLibraryHostState): ActiveLibraryHostError {
  if (current === 'opening') return hostError('library-opening')
  if (current === 'quiescing') return hostError('library-quiescing')
  if (current === 'closed') return hostError('library-closed')
  if (current === 'recovery-required') return hostError('library-recovery-required')
  return hostError('library-not-open')
}

function hostError(code: ActiveLibraryHostErrorCode): ActiveLibraryHostError {
  const messages: Record<string, string> = {
    'library-not-open': 'The Active Library is not open.', 'library-opening': 'The Active Library is opening or changing.',
    'library-quiescing': 'The Active Library is closing.', 'library-closed': 'The Active Library is closed.',
    'library-recovery-required': 'The Active Library requires recovery.', 'library-lock-invalid': 'The Active Library write authority is unavailable.',
    'library-generation-conflict': 'The Active Library generation changed.', 'library-identity-conflict': 'The Active Library identity conflicts.',
    'library-schema-invalid': 'The Active Library schema is unavailable.', 'library-target-invalid': 'The selected Library target is unavailable.',
    'library-target-not-empty': 'The selected Library target is not empty.', 'library-plan-not-found': 'The Library creation plan is unavailable.',
    'library-receipt-stale': 'The Library receipt is stale.', 'library-operation-failed': 'The Active Library operation failed.'
  }
  return new ActiveLibraryHostError(code, messages[code] ?? 'The Active Library operation failed.')
}
