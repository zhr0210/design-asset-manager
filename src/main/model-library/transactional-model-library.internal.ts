import { createHash, randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import type {
  ModelArtifactByteSource,
  ModelArtifactSourceEntry,
  OpenTransactionalModelLibraryTracerInput
} from './transactional-model-library.tracer'
import {
  readAdmittedModelCatalog,
  type AdmittedModelCatalogArtifactRecord,
  type AdmittedModelCatalogFileRecord
} from './model-catalog-admission.internal'
import { validateModelArtifactPackage } from './model-artifact-format-validation.internal'
import type {
  InstallReviewedModelArtifactReceipt,
  InstallReviewedModelArtifactRequest,
  ModelArtifactAcknowledgement,
  ModelArtifactInstallConsequences,
  ModelArtifactPublicSummary,
  ModelArtifactRevisionRef,
  ModelArtifactStorageImpact,
  ModelLibrary,
  ModelLibraryActivitySummary,
  ModelLibraryErrorCode,
  ModelLibraryResult,
  ModelLibrarySummary,
  ModelLibrarySummaryRequest
} from './model-library'

interface StoredArtifact {
  readonly admissionBinding: string
  readonly ref: ModelArtifactRevisionRef
  readonly familyId: string
  readonly checkpointId: string
  readonly variantId: string
  readonly displayName: string
  readonly immutableRevision: string
  readonly files: readonly AdmittedModelCatalogFileRecord[]
  readonly requiredAcknowledgements: readonly ModelArtifactAcknowledgement[]
  verifiedStored?: {
    readonly storageRecordId: string
    readonly activeCapabilityAssignments: readonly string[]
  }
}

interface DurableCommitRecord {
  readonly schemaVersion: 1
  readonly transactionId: string
  readonly artifact: ModelArtifactRevisionRef
  readonly admissionBinding: string
  readonly reviewFingerprint: string
  readonly acceptedAcknowledgements: readonly string[]
  readonly activity: ModelLibraryActivitySummary
  readonly files: readonly {
    readonly sha256: string
    readonly sizeBytes: number
  }[]
}

interface CompletedReviewInstall {
  readonly artifact: ModelArtifactRevisionRef
  readonly acceptedAcknowledgements: readonly string[]
  readonly activity: ModelLibraryActivitySummary
}

interface ManagedStore {
  readonly root: string
  readonly blobs: string
  readonly commits: string
  readonly staging: string
  readonly transactions: string
}

interface OwnedStoreDirectory {
  readonly directory: string
  readonly device: bigint
  readonly inode: bigint
}

export interface InitializedTransactionalModelLibraryStore {
  rollbackOwned(): Promise<void>
  seal(): void
}

interface StagedFile {
  readonly declaration: AdmittedModelCatalogFileRecord
  readonly stagedFile: string
}

interface ValidatedDurableState {
  readonly commits: readonly DurableCommitRecord[]
  readonly verifiedBlobDigests: Set<string>
}

interface InternalOpenTransactionalModelLibraryInput
  extends OpenTransactionalModelLibraryTracerInput {
  readonly writeAuthorityStillHeld: () => Promise<boolean>
}

const STORE_SCHEMA_VERSION = 1
const JOURNAL_SCHEMA_VERSION = 1
const INSTALL_REVIEW_POLICY_VERSION = 'model-library-review-v2-verified-storage'
const TRANSACTION_NAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const SAFE_PUBLIC_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:@+-]{0,127}$/
const MAX_SOURCE_CHUNKS_PER_FILE = 1_000_000
const rootOperationTails = new Map<string, Promise<void>>()

const NO_INSTALL_CONSEQUENCES: ModelArtifactInstallConsequences = Object.freeze({
  activatesModel: false,
  startsRuntime: false,
  startsInference: false,
  reanalysesAssets: false,
  changesEmbeddingSpace: false,
  authorizesExternalUpload: false
})

class InstallOperationFailure extends Error {
  constructor(readonly code: 'ARTIFACT_BYTES_REJECTED' | 'INSTALL_STORAGE_FAILED') {
    super(code)
  }
}

class SimulatedProcessInterruption extends Error {
  constructor() {
    super('SIMULATED_PROCESS_INTERRUPTION')
  }
}

class StorageAuthorityLostDuringInstall extends Error {
  constructor() {
    super('STORAGE_AUTHORITY_LOST_DURING_INSTALL')
  }
}

export async function openTransactionalModelLibraryTracer(
  input: OpenTransactionalModelLibraryTracerInput
): Promise<ModelLibrary> {
  return openTransactionalModelLibrary({
    ...input,
    writeAuthorityStillHeld: async () => true
  }, 'initialize')
}

/** @internal Existing-store entry used only by the sibling storage authority. */
export async function openExistingTransactionalModelLibraryTracer(
  input: OpenTransactionalModelLibraryTracerInput,
  writeAuthorityStillHeld: () => Promise<boolean>
): Promise<ModelLibrary> {
  return openTransactionalModelLibrary({
    ...input,
    writeAuthorityStillHeld
  }, 'existing')
}

/** @internal Provisioning step owned by the sibling storage authority. */
export async function initializeTransactionalModelLibraryStore(
  controlDirectory: string
): Promise<InitializedTransactionalModelLibraryStore> {
  const rootStat = await fs.lstat(controlDirectory, { bigint: true })
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error('MODEL_LIBRARY_CONTROL_DIRECTORY_INVALID')
  }
  if ((await fs.readdir(controlDirectory)).length !== 0) {
    throw new Error('MODEL_LIBRARY_CONTROL_DIRECTORY_NOT_EMPTY')
  }
  const directories = ['blobs', 'commits', 'staging', 'transactions']
    .map((entry) => path.join(controlDirectory, entry))
  const owned: OwnedStoreDirectory[] = []
  let sealed = false
  const rollbackOwned = async (): Promise<void> => {
    if (sealed) return
    for (const node of [...owned].reverse()) {
      try {
        const current = await fs.lstat(node.directory, { bigint: true })
        if (
          current.isDirectory() &&
          !current.isSymbolicLink() &&
          current.dev === node.device &&
          current.ino === node.inode
        ) await fs.rmdir(node.directory)
      } catch {
        // Unknown, replaced, or non-empty nodes are never removed by rollback.
      }
    }
  }
  try {
    for (const directory of directories) {
      await fs.mkdir(directory, { mode: 0o700 })
      const stat = await fs.lstat(directory, { bigint: true })
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error('MODEL_LIBRARY_STORE_LAYOUT_INVALID')
      }
      owned.push({ directory, device: stat.dev, inode: stat.ino })
    }
    if (!sameTextSet(
      await fs.readdir(controlDirectory),
      ['blobs', 'commits', 'staging', 'transactions']
    )) throw new Error('MODEL_LIBRARY_STORE_LAYOUT_INVALID')
    return Object.freeze({
      rollbackOwned,
      seal(): void {
        sealed = true
      }
    })
  } catch (error) {
    await rollbackOwned()
    throw error
  }
}

/** @internal Strict layout check used before and after writer acquisition. */
export async function validateExistingTransactionalModelLibraryStore(
  controlDirectory: string
): Promise<{ readonly writable: boolean }> {
  const store = await openManagedStore(controlDirectory, 'existing')
  const writable = await allManagedDirectoriesAreWritable([
    store.root,
    store.blobs,
    store.commits,
    store.staging,
    store.transactions
  ])
  return { writable }
}

async function openTransactionalModelLibrary(
  input: InternalOpenTransactionalModelLibraryInput,
  storeMode: 'initialize' | 'existing'
): Promise<ModelLibrary> {
  const admittedCatalog = readAdmittedModelCatalog(input.catalog)
  try {
    return await withRootOperationLock(input.controlDirectory, async () => {
      const store = await openManagedStore(input.controlDirectory, storeMode)
      await reconcileInterruptedTransactions(store)
      const durableState = await loadValidatedDurableState(
        store,
        admittedCatalog?.artifacts ?? []
      )
      return createTransactionalLibrary({
        input,
        store,
        artifacts: admittedCatalog?.artifacts ?? [],
        durableCommits: durableState.commits,
        verifiedBlobDigests: durableState.verifiedBlobDigests
      })
    })
  } catch {
    return recoveryBlockedLibrary()
  }
}

function createTransactionalLibrary(context: {
  readonly input: InternalOpenTransactionalModelLibraryInput
  readonly store: ManagedStore
  readonly artifacts: readonly AdmittedModelCatalogArtifactRecord[]
  readonly durableCommits: readonly DurableCommitRecord[]
  readonly verifiedBlobDigests: Set<string>
}): ModelLibrary {
  const artifacts = context.artifacts.map(createStoredArtifact)
  const activities: ModelLibraryActivitySummary[] = []
  const completedByReview = new Map<string, CompletedReviewInstall>()
  applyDurableCommits({
    commits: context.durableCommits,
    artifacts,
    activities,
    completedByReview
  })
  let revision = 1 + activities.length
  let operationTail: Promise<void> = Promise.resolve()

  const library: ModelLibrary = {
    async summarize(
      request: ModelLibrarySummaryRequest
    ): Promise<ModelLibraryResult<ModelLibrarySummary>> {
      await operationTail
      const selected = request.kind === 'library'
        ? artifacts
        : artifacts.filter((artifact) => sameRef(artifact.ref, request.artifact))
      if (request.kind === 'artifact' && selected.length === 0) {
        return failure('ARTIFACT_NOT_FOUND', 'not-retryable')
      }
      return {
        ok: true,
        value: {
          revision,
          artifacts: selected.map((artifact) =>
            projectArtifact(artifact, revision, context.verifiedBlobDigests)
          ),
          activities: activities
            .filter((activity) =>
              request.kind === 'library' || sameRef(activity.artifact, request.artifact)
            )
            .map(copyActivity)
        }
      }
    },

    install(
      request: InstallReviewedModelArtifactRequest
    ): Promise<ModelLibraryResult<InstallReviewedModelArtifactReceipt>> {
      const operation = operationTail.then(() => withRootOperationLock(
        context.store.root,
        () => installReviewedArtifact({
          request,
          context,
          artifacts,
          activities,
          completedByReview,
          getRevision: () => revision,
          setRevision: (nextRevision) => {
            revision = nextRevision
          },
          advanceRevision: () => {
            revision += 1
          }
        })
      ))
      operationTail = operation.then(() => undefined, () => undefined)
      return operation
    }
  }
  return Object.freeze(library)
}

async function installReviewedArtifact(input: {
  readonly request: InstallReviewedModelArtifactRequest
  readonly context: {
    readonly input: InternalOpenTransactionalModelLibraryInput
    readonly store: ManagedStore
    readonly artifacts: readonly AdmittedModelCatalogArtifactRecord[]
    readonly verifiedBlobDigests: Set<string>
  }
  readonly artifacts: StoredArtifact[]
  readonly activities: ModelLibraryActivitySummary[]
  readonly completedByReview: Map<string, CompletedReviewInstall>
  readonly getRevision: () => number
  readonly setRevision: (revision: number) => void
  readonly advanceRevision: () => void
}): Promise<ModelLibraryResult<InstallReviewedModelArtifactReceipt>> {
  const request = input.request
  if (request.decision !== 'install-exact-reviewed-artifact') {
    return failure('CONFIRMATION_REQUIRED', 'review-again')
  }
  if (!Array.isArray(request.acceptedAcknowledgements)) {
    return failure('ACKNOWLEDGEMENT_REQUIRED', 'after-user-action')
  }
  const artifact = input.artifacts.find((candidate) => sameRef(candidate.ref, request.artifact))
  if (!artifact) return failure('ARTIFACT_NOT_FOUND', 'not-retryable')

  try {
    await refreshDurableState(input)
    await requireWriteAuthority(input.context.input)
  } catch (error) {
    if (error instanceof StorageAuthorityLostDuringInstall) {
      return failure('STORAGE_AUTHORITY_LOST', 'after-user-action')
    }
    return failure('RECOVERY_BLOCKED', 'after-user-action')
  }

  const completed = input.completedByReview.get(request.reviewFingerprint)
  if (completed) {
    if (
      !sameRef(completed.artifact, request.artifact) ||
      !sameAcknowledgements(completed.acceptedAcknowledgements, request.acceptedAcknowledgements)
    ) return failure('IDEMPOTENCY_CONFLICT', 'not-retryable')
    return {
      ok: true,
      value: {
        disposition: 'idempotent-replay',
        activity: copyActivity(completed.activity)
      }
    }
  }

  const projected = projectArtifact(
    artifact,
    input.getRevision(),
    input.context.verifiedBlobDigests
  )
  if (projected.review.state === 'blocked') {
    return failure('INSTALL_BLOCKED', 'after-user-action')
  }
  if (projected.review.state !== 'confirmable') {
    return failure('REVIEW_REQUIRED', 'review-again')
  }
  if (request.reviewFingerprint !== projected.review.fingerprint) {
    return failure('REVIEW_STALE', 'review-again')
  }
  if (!sameAcknowledgements(
    request.acceptedAcknowledgements,
    projected.review.requiredAcknowledgements.map((item) => item.id)
  )) return failure('ACKNOWLEDGEMENT_REQUIRED', 'after-user-action')

  const transactionId = randomUUID()
  const stagingDirectory = path.join(input.context.store.staging, transactionId)
  const journalFile = path.join(input.context.store.transactions, `${transactionId}.json`)
  let logicalCommitPublished = false
  let publishedCommit: DurableCommitRecord | undefined
  let publishedActivity: ModelLibraryActivitySummary | undefined
  let commitApplied = false
  try {
    await requireWriteAuthority(input.context.input)
    const activityId = input.context.input.createActivityId()
    const storageRecordId = input.context.input.createStorageRecordId()
    if (!isSafePublicId(activityId) || !isSafePublicId(storageRecordId)) {
      throw new InstallOperationFailure('INSTALL_STORAGE_FAILED')
    }
    await requireWriteAuthority(input.context.input)
    await fs.mkdir(stagingDirectory, { mode: 0o700 })
    await requireWriteAuthority(input.context.input)
    await writeAtomicJson(journalFile, {
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      transactionId,
      artifact: artifact.ref,
      admissionBinding: artifact.admissionBinding,
      reviewFingerprint: request.reviewFingerprint
    })

    const requiredFiles = uniquePhysicalFiles(artifact.files)
      .filter((file) => !input.context.verifiedBlobDigests.has(file.sha256))
    const stagedFiles = await stageAndVerifyRequiredFiles({
      artifact,
      requiredFiles,
      byteSource: input.context.input.byteSource,
      stagingDirectory,
      requireWriteAuthority: () => requireWriteAuthority(input.context.input)
    })
    await requireWriteAuthority(input.context.input)
    if (!await validateArtifactPackage(
      input.context.store,
      artifact.files,
      stagedFiles
    )) throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
    await requireWriteAuthority(input.context.input)
    for (const staged of stagedFiles) {
      await requireWriteAuthority(input.context.input)
      await promoteVerifiedBlob(
        input.context.store,
        staged,
        input.context.verifiedBlobDigests
      )
    }
    await verifyArtifactBlobs(
      input.context.store,
      artifact.files,
      input.context.verifiedBlobDigests
    )
    await requireWriteAuthority(input.context.input)

    const activity: ModelLibraryActivitySummary = {
      activityId,
      artifact: { ...artifact.ref },
      state: 'verified-stored',
      storageRecordId,
      activationChanged: false
    }
    const commit: DurableCommitRecord = {
      schemaVersion: STORE_SCHEMA_VERSION,
      transactionId,
      artifact: { ...artifact.ref },
      admissionBinding: artifact.admissionBinding,
      reviewFingerprint: request.reviewFingerprint,
      acceptedAcknowledgements: [...request.acceptedAcknowledgements].sort(),
      activity,
      files: uniquePhysicalFiles(artifact.files).map((file) => ({
        sha256: file.sha256,
        sizeBytes: file.sizeBytes
      }))
    }
    publishedCommit = commit
    publishedActivity = activity
    if (input.context.input.simulateInterruption === 'before-commit') {
      throw new SimulatedProcessInterruption()
    }
    await requireWriteAuthority(input.context.input)
    const stagedCommit = path.join(stagingDirectory, 'commit.pending')
    await writeDurableFile(stagedCommit, JSON.stringify(commit))
    await requireWriteAuthority(input.context.input)
    await fs.rename(
      stagedCommit,
      path.join(input.context.store.commits, `${transactionId}.json`)
    )
    logicalCommitPublished = true
    try {
      await syncDirectory(input.context.store.commits)
    } catch {
      // Rename is the tracer's logical commit point. This slice does not claim
      // production power-loss durability; reopen revalidates the commit bytes.
    }

    if (input.context.input.simulateInterruption === 'after-commit') {
      throw new SimulatedProcessInterruption()
    }

    applyDurableCommits({
      commits: [commit],
      artifacts: input.artifacts,
      activities: input.activities,
      completedByReview: input.completedByReview
    })
    commitApplied = true
    input.advanceRevision()
    let cleanupStillAuthorized = false
    try {
      cleanupStillAuthorized = await input.context.input.writeAuthorityStillHeld()
    } catch {
      // A committed success is never rewritten after the logical commit point.
    }
    if (cleanupStillAuthorized) {
      try {
        await cleanupTransaction(stagingDirectory, journalFile)
      } catch {
        // The durable commit is already authoritative. Reopen performs cleanup.
      }
    }
    return {
      ok: true,
      value: {
        disposition: 'new-install',
        activity: copyActivity(activity)
      }
    }
  } catch (error) {
    if (error instanceof SimulatedProcessInterruption) throw error
    if (error instanceof StorageAuthorityLostDuringInstall) {
      return failure('STORAGE_AUTHORITY_LOST', 'after-user-action')
    }
    if (logicalCommitPublished && publishedCommit && publishedActivity) {
      if (!commitApplied) {
        applyDurableCommits({
          commits: [publishedCommit],
          artifacts: input.artifacts,
          activities: input.activities,
          completedByReview: input.completedByReview
        })
        input.advanceRevision()
      }
      return {
        ok: true,
        value: {
          disposition: 'new-install',
          activity: copyActivity(publishedActivity)
        }
      }
    }
    let cleanupStillAuthorized = false
    try {
      cleanupStillAuthorized = await input.context.input.writeAuthorityStillHeld()
    } catch {
      // Loss and probe failures collapse to one stable authority result.
    }
    if (!cleanupStillAuthorized) {
      return failure('STORAGE_AUTHORITY_LOST', 'after-user-action')
    }
    try {
      await cleanupTransaction(stagingDirectory, journalFile)
    } catch {
      return failure('INSTALL_STORAGE_FAILED', 'after-user-action')
    }
    if (error instanceof InstallOperationFailure) {
      return failure(error.code, 'after-user-action')
    }
    return failure('INSTALL_STORAGE_FAILED', 'after-user-action')
  }
}

async function requireWriteAuthority(
  input: InternalOpenTransactionalModelLibraryInput
): Promise<void> {
  try {
    if (await input.writeAuthorityStillHeld()) return
  } catch {
    // Authority probes are deliberately reduced to one stable failure.
  }
  throw new StorageAuthorityLostDuringInstall()
}

async function refreshDurableState(input: {
  readonly context: {
    readonly store: ManagedStore
    readonly artifacts: readonly AdmittedModelCatalogArtifactRecord[]
    readonly verifiedBlobDigests: Set<string>
  }
  readonly artifacts: StoredArtifact[]
  readonly activities: ModelLibraryActivitySummary[]
  readonly completedByReview: Map<string, CompletedReviewInstall>
  readonly setRevision: (revision: number) => void
}): Promise<void> {
  const durableState = await loadValidatedDurableState(
    input.context.store,
    input.context.artifacts
  )
  input.context.verifiedBlobDigests.clear()
  for (const digest of durableState.verifiedBlobDigests) {
    input.context.verifiedBlobDigests.add(digest)
  }
  applyDurableCommits({
    commits: durableState.commits,
    artifacts: input.artifacts,
    activities: input.activities,
    completedByReview: input.completedByReview
  })
  input.setRevision(1 + input.completedByReview.size)
}

async function loadValidatedDurableState(
  store: ManagedStore,
  artifacts: readonly AdmittedModelCatalogArtifactRecord[]
): Promise<ValidatedDurableState> {
  const commits = await readDurableCommits(store)
  validateCommitsAgainstAdmission(artifacts, commits)
  const verifiedBlobDigests = await verifyKnownBlobs(store, artifacts, commits)
  await verifyCommittedArtifactStructures(store, artifacts, commits)
  return { commits, verifiedBlobDigests }
}

function applyDurableCommits(input: {
  readonly commits: readonly DurableCommitRecord[]
  readonly artifacts: StoredArtifact[]
  readonly activities: ModelLibraryActivitySummary[]
  readonly completedByReview: Map<string, CompletedReviewInstall>
}): void {
  for (const commit of input.commits) {
    if (input.completedByReview.has(commit.reviewFingerprint)) continue
    const artifact = input.artifacts.find((candidate) =>
      sameRef(candidate.ref, commit.artifact) &&
      candidate.admissionBinding === commit.admissionBinding
    )
    if (!artifact) throw new Error('MODEL_LIBRARY_COMMIT_BINDING_INVALID')
    artifact.verifiedStored = {
      storageRecordId: commit.activity.storageRecordId,
      activeCapabilityAssignments: []
    }
    const activity = copyActivity(commit.activity)
    input.activities.push(activity)
    input.completedByReview.set(commit.reviewFingerprint, {
      artifact: { ...commit.artifact },
      acceptedAcknowledgements: [...commit.acceptedAcknowledgements],
      activity
    })
  }
  input.activities.sort((left, right) => compareText(left.activityId, right.activityId))
}

async function stageAndVerifyRequiredFiles(input: {
  readonly artifact: StoredArtifact
  readonly requiredFiles: readonly AdmittedModelCatalogFileRecord[]
  readonly byteSource: ModelArtifactByteSource
  readonly stagingDirectory: string
  readonly requireWriteAuthority: () => Promise<void>
}): Promise<StagedFile[]> {
  if (input.requiredFiles.length === 0) return []
  const requiredByPath = new Map(input.requiredFiles.map((file) => [file.relativePath, file]))
  const seenPaths = new Set<string>()
  const stagedFiles: StagedFile[] = []
  let index = 0
  let entries: AsyncIterable<ModelArtifactSourceEntry>
  try {
    entries = input.byteSource.entries({
      artifact: { ...input.artifact.ref },
      requiredRelativePaths: input.requiredFiles.map((file) => file.relativePath)
    })
    await input.requireWriteAuthority()
  } catch (error) {
    if (error instanceof StorageAuthorityLostDuringInstall) throw error
    throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
  }
  try {
    for await (const entryValue of entries) {
      await input.requireWriteAuthority()
      const relativePath = entryValue?.relativePath
      const bytes = entryValue?.bytes
      if (
        typeof relativePath !== 'string' ||
        !bytes ||
        typeof bytes[Symbol.asyncIterator] !== 'function'
      ) throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
      const declaration = requiredByPath.get(relativePath)
      const normalizedPath = relativePath.toLowerCase()
      if (!declaration || seenPaths.has(normalizedPath)) {
        throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
      }
      seenPaths.add(normalizedPath)
      const stagedFile = path.join(input.stagingDirectory, `${index}.partial`)
      await writeAndVerifySourceFile(bytes, declaration, stagedFile)
      stagedFiles.push({ declaration, stagedFile })
      index += 1
    }
  } catch (error) {
    if (
      error instanceof InstallOperationFailure ||
      error instanceof StorageAuthorityLostDuringInstall
    ) throw error
    throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
  }
  if (seenPaths.size !== input.requiredFiles.length) {
    throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
  }
  return stagedFiles
}

async function writeAndVerifySourceFile(
  bytes: AsyncIterable<Uint8Array>,
  declaration: AdmittedModelCatalogFileRecord,
  stagedFile: string
): Promise<void> {
  const handle = await fs.open(stagedFile, 'wx', 0o600)
  const digest = createHash('sha256')
  let sizeBytes = 0
  let chunkCount = 0
  try {
    for await (const chunk of bytes) {
      chunkCount += 1
      if (
        !(chunk instanceof Uint8Array) ||
        chunk.byteLength === 0 ||
        chunkCount > MAX_SOURCE_CHUNKS_PER_FILE
      ) {
        throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
      }
      sizeBytes += chunk.byteLength
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes > declaration.sizeBytes) {
        throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
      }
      digest.update(chunk)
      let offset = 0
      while (offset < chunk.byteLength) {
        const { bytesWritten } = await handle.write(
          chunk,
          offset,
          chunk.byteLength - offset,
          null
        )
        if (bytesWritten <= 0) throw new Error('STAGED_WRITE_INCOMPLETE')
        offset += bytesWritten
      }
    }
    await handle.sync()
  } finally {
    await handle.close()
  }
  if (
    sizeBytes !== declaration.sizeBytes ||
    digest.digest('hex') !== declaration.sha256
  ) throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
}

async function promoteVerifiedBlob(
  store: ManagedStore,
  staged: StagedFile,
  verifiedBlobDigests: Set<string>
): Promise<void> {
  const blobFile = path.join(store.blobs, staged.declaration.sha256)
  if (await pathExists(blobFile)) {
    if (!await verifyBlobFile(blobFile, staged.declaration)) {
      throw new InstallOperationFailure('INSTALL_STORAGE_FAILED')
    }
    await fs.unlink(staged.stagedFile)
  } else {
    await fs.rename(staged.stagedFile, blobFile)
    await syncDirectory(store.blobs)
    if (!await verifyBlobFile(blobFile, staged.declaration)) {
      throw new InstallOperationFailure('INSTALL_STORAGE_FAILED')
    }
  }
  verifiedBlobDigests.add(staged.declaration.sha256)
}

async function verifyArtifactBlobs(
  store: ManagedStore,
  files: readonly AdmittedModelCatalogFileRecord[],
  verifiedBlobDigests: Set<string>
): Promise<void> {
  for (const file of files) {
    if (!await verifyBlobFile(path.join(store.blobs, file.sha256), file)) {
      throw new InstallOperationFailure('INSTALL_STORAGE_FAILED')
    }
    verifiedBlobDigests.add(file.sha256)
  }
  if (!await validateArtifactPackage(store, files, [])) {
    throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
  }
}

async function validateArtifactPackage(
  store: ManagedStore,
  files: readonly AdmittedModelCatalogFileRecord[],
  stagedFiles: readonly StagedFile[]
): Promise<boolean> {
  const stagedByDigest = new Map(
    stagedFiles.map((staged) => [staged.declaration.sha256, staged.stagedFile])
  )
  return validateModelArtifactPackage({
    files: files.map((file) => ({
      relativePath: file.relativePath,
      role: file.role,
      format: file.format,
      sizeBytes: file.sizeBytes,
      readableFile: stagedByDigest.get(file.sha256) ?? path.join(store.blobs, file.sha256)
    }))
  })
}

async function openManagedStore(
  controlDirectory: string,
  mode: 'initialize' | 'existing'
): Promise<ManagedStore> {
  if (
    typeof controlDirectory !== 'string' ||
    !path.isAbsolute(controlDirectory) ||
    path.resolve(controlDirectory) !== controlDirectory
  ) throw new Error('MODEL_LIBRARY_CONTROL_DIRECTORY_INVALID')
  const rootStat = await fs.lstat(controlDirectory)
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error('MODEL_LIBRARY_CONTROL_DIRECTORY_INVALID')
  }
  const store: ManagedStore = {
    root: controlDirectory,
    blobs: path.join(controlDirectory, 'blobs'),
    commits: path.join(controlDirectory, 'commits'),
    staging: path.join(controlDirectory, 'staging'),
    transactions: path.join(controlDirectory, 'transactions')
  }
  for (const directory of [store.blobs, store.commits, store.staging, store.transactions]) {
    if (mode === 'initialize') await ensureManagedDirectory(directory)
    else await validateManagedDirectory(directory)
  }
  if (mode === 'existing') {
    const entries = (await fs.readdir(controlDirectory)).sort(compareText)
    if (!sameTextSet(entries, ['blobs', 'commits', 'staging', 'transactions'])) {
      throw new Error('MODEL_LIBRARY_STORE_LAYOUT_INVALID')
    }
  }
  return store
}

async function ensureManagedDirectory(directory: string): Promise<void> {
  try {
    await fs.mkdir(directory, { mode: 0o700 })
  } catch (error) {
    if (!hasErrorCode(error, 'EEXIST')) throw error
  }
  await validateManagedDirectory(directory)
}

async function validateManagedDirectory(directory: string): Promise<void> {
  const stat = await fs.lstat(directory)
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('MODEL_LIBRARY_STORE_LAYOUT_INVALID')
  }
}

async function allManagedDirectoriesAreWritable(
  directories: readonly string[]
): Promise<boolean> {
  for (const directory of directories) {
    const stat = await fs.lstat(directory)
    if ((stat.mode & 0o300) !== 0o300) return false
    try {
      await fs.access(
        directory,
        fsConstants.W_OK | fsConstants.X_OK
      )
    } catch (error) {
      if (
        hasErrorCode(error, 'EACCES') ||
        hasErrorCode(error, 'EPERM') ||
        hasErrorCode(error, 'EROFS')
      ) return false
      throw error
    }
  }
  return true
}

async function reconcileInterruptedTransactions(store: ManagedStore): Promise<void> {
  for (const entry of await fs.readdir(store.transactions, { withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !new RegExp(`^${TRANSACTION_NAME_PATTERN.source.slice(1, -1)}\\.json(?:\\.pending)?$`)
        .test(entry.name)
    ) throw new Error('MODEL_LIBRARY_JOURNAL_INVALID')
    await fs.unlink(path.join(store.transactions, entry.name))
  }
  for (const entry of await fs.readdir(store.staging, { withFileTypes: true })) {
    if (!entry.isDirectory() || !TRANSACTION_NAME_PATTERN.test(entry.name)) {
      throw new Error('MODEL_LIBRARY_STAGING_INVALID')
    }
    const stagedDirectory = path.join(store.staging, entry.name)
    const stat = await fs.lstat(stagedDirectory)
    if (stat.isSymbolicLink()) throw new Error('MODEL_LIBRARY_STAGING_INVALID')
    await fs.rm(stagedDirectory, { recursive: true, force: false })
  }
  await syncDirectory(store.transactions)
  await syncDirectory(store.staging)
}

async function readDurableCommits(store: ManagedStore): Promise<DurableCommitRecord[]> {
  const commits: DurableCommitRecord[] = []
  for (const entry of await fs.readdir(store.commits, { withFileTypes: true })) {
    const match = /^([0-9a-f-]{36})\.json$/.exec(entry.name)
    if (!entry.isFile() || !match || !TRANSACTION_NAME_PATTERN.test(match[1])) {
      throw new Error('MODEL_LIBRARY_COMMIT_INVALID')
    }
    const commitFile = path.join(store.commits, entry.name)
    const parsed = JSON.parse(await readRegularFileNoFollow(commitFile, 1024 * 1024, 'utf8')) as unknown
    const commit = normalizeDurableCommit(parsed)
    if (!commit || commit.transactionId !== match[1]) {
      throw new Error('MODEL_LIBRARY_COMMIT_INVALID')
    }
    commits.push(commit)
  }
  commits.sort((left, right) => compareText(left.transactionId, right.transactionId))
  return commits
}

function normalizeDurableCommit(value: unknown): DurableCommitRecord | undefined {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    'acceptedAcknowledgements',
    'activity',
    'admissionBinding',
    'artifact',
    'files',
    'reviewFingerprint',
    'schemaVersion',
    'transactionId'
  ])) return undefined
  if (
    value.schemaVersion !== STORE_SCHEMA_VERSION ||
    typeof value.transactionId !== 'string' ||
    !TRANSACTION_NAME_PATTERN.test(value.transactionId) ||
    typeof value.admissionBinding !== 'string' ||
    !/^artifact-admission:[a-f0-9]{64}$/.test(value.admissionBinding) ||
    typeof value.reviewFingerprint !== 'string' ||
    !/^review:[a-f0-9]{64}$/.test(value.reviewFingerprint) ||
    !isPlainRecord(value.artifact) ||
    !hasExactKeys(value.artifact, ['catalogId', 'manifestId']) ||
    !isSafePublicId(value.artifact.catalogId) ||
    !isSafePublicId(value.artifact.manifestId) ||
    !Array.isArray(value.acceptedAcknowledgements) ||
    value.acceptedAcknowledgements.some((item) => !isSafePublicId(item)) ||
    !Array.isArray(value.files) ||
    value.files.length === 0 ||
    !isPlainRecord(value.activity)
  ) return undefined
  const activity = value.activity
  if (
    !hasExactKeys(activity, [
      'activationChanged',
      'activityId',
      'artifact',
      'state',
      'storageRecordId'
    ]) ||
    activity.activationChanged !== false ||
    activity.state !== 'verified-stored' ||
    !isSafePublicId(activity.activityId) ||
    !isSafePublicId(activity.storageRecordId) ||
    !isPlainRecord(activity.artifact) ||
    activity.artifact.catalogId !== value.artifact.catalogId ||
    activity.artifact.manifestId !== value.artifact.manifestId
  ) return undefined
  const files: Array<{ sha256: string; sizeBytes: number }> = []
  const digests = new Set<string>()
  for (const item of value.files) {
    if (
      !isPlainRecord(item) ||
      !hasExactKeys(item, ['sha256', 'sizeBytes']) ||
      typeof item.sha256 !== 'string' ||
      !SHA256_PATTERN.test(item.sha256) ||
      !Number.isSafeInteger(item.sizeBytes) ||
      (item.sizeBytes as number) <= 0 ||
      digests.has(item.sha256)
    ) return undefined
    digests.add(item.sha256)
    files.push({ sha256: item.sha256, sizeBytes: item.sizeBytes as number })
  }
  return {
    schemaVersion: 1,
    transactionId: value.transactionId,
    artifact: {
      catalogId: value.artifact.catalogId as string,
      manifestId: value.artifact.manifestId as string
    },
    admissionBinding: value.admissionBinding,
    reviewFingerprint: value.reviewFingerprint,
    acceptedAcknowledgements: [...value.acceptedAcknowledgements] as string[],
    activity: {
      activityId: activity.activityId as string,
      artifact: {
        catalogId: value.artifact.catalogId as string,
        manifestId: value.artifact.manifestId as string
      },
      state: 'verified-stored',
      storageRecordId: activity.storageRecordId as string,
      activationChanged: false
    },
    files
  }
}

function validateCommitsAgainstAdmission(
  artifacts: readonly AdmittedModelCatalogArtifactRecord[],
  commits: readonly DurableCommitRecord[]
): void {
  const seenArtifacts = new Set<string>()
  const seenReviews = new Set<string>()
  const seenActivities = new Set<string>()
  const seenStorageRecords = new Set<string>()
  for (const commit of commits) {
    const artifact = artifacts.find((candidate) =>
      sameRef(candidate.identity.ref, commit.artifact) &&
      candidate.admissionBinding === commit.admissionBinding
    )
    const artifactKey = `${commit.artifact.catalogId}\u0000${commit.artifact.manifestId}`
    if (
      !artifact ||
      seenArtifacts.has(artifactKey) ||
      seenReviews.has(commit.reviewFingerprint) ||
      seenActivities.has(commit.activity.activityId) ||
      seenStorageRecords.has(commit.activity.storageRecordId) ||
      !sameAcknowledgements(
        commit.acceptedAcknowledgements,
        artifact.requiredAcknowledgements.map((item) => item.id)
      ) ||
      !samePhysicalFileSet(commit.files, artifact.files)
    ) throw new Error('MODEL_LIBRARY_COMMIT_BINDING_INVALID')
    seenArtifacts.add(artifactKey)
    seenReviews.add(commit.reviewFingerprint)
    seenActivities.add(commit.activity.activityId)
    seenStorageRecords.add(commit.activity.storageRecordId)
  }
}

function samePhysicalFileSet(
  left: readonly { readonly sha256: string; readonly sizeBytes: number }[],
  right: readonly AdmittedModelCatalogFileRecord[]
): boolean {
  const normalizedLeft = left
    .map((file) => `${file.sha256}:${file.sizeBytes}`)
    .sort(compareText)
  const normalizedRight = uniquePhysicalFiles(right)
    .map((file) => `${file.sha256}:${file.sizeBytes}`)
    .sort(compareText)
  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
}

async function verifyKnownBlobs(
  store: ManagedStore,
  artifacts: readonly AdmittedModelCatalogArtifactRecord[],
  commits: readonly DurableCommitRecord[]
): Promise<Set<string>> {
  const declarations = new Map<string, { sha256: string; sizeBytes: number }>()
  for (const artifact of artifacts) {
    for (const file of artifact.files) {
      const existing = declarations.get(file.sha256)
      if (existing && existing.sizeBytes !== file.sizeBytes) continue
      declarations.set(file.sha256, { sha256: file.sha256, sizeBytes: file.sizeBytes })
    }
  }
  for (const commit of commits) {
    for (const file of commit.files) {
      const existing = declarations.get(file.sha256)
      if (existing && existing.sizeBytes !== file.sizeBytes) {
        throw new Error('MODEL_LIBRARY_BLOB_DECLARATION_CONFLICT')
      }
      declarations.set(file.sha256, file)
    }
  }

  const verified = new Set<string>()
  for (const declaration of declarations.values()) {
    const blobFile = path.join(store.blobs, declaration.sha256)
    if (!await pathExists(blobFile)) continue
    if (!await verifyBlobFile(blobFile, declaration)) {
      throw new Error('MODEL_LIBRARY_BLOB_INVALID')
    }
    verified.add(declaration.sha256)
  }
  for (const commit of commits) {
    if (commit.files.some((file) => !verified.has(file.sha256))) {
      throw new Error('MODEL_LIBRARY_COMMIT_BLOB_MISSING')
    }
  }
  return verified
}

async function verifyCommittedArtifactStructures(
  store: ManagedStore,
  artifacts: readonly AdmittedModelCatalogArtifactRecord[],
  commits: readonly DurableCommitRecord[]
): Promise<void> {
  for (const commit of commits) {
    const artifact = artifacts.find((candidate) =>
      sameRef(candidate.identity.ref, commit.artifact) &&
      candidate.admissionBinding === commit.admissionBinding
    )
    if (!artifact) throw new Error('MODEL_LIBRARY_COMMIT_BINDING_INVALID')
    if (!await validateArtifactPackage(store, artifact.files, [])) {
      throw new Error('MODEL_LIBRARY_COMMITTED_STRUCTURE_INVALID')
    }
  }
}

async function verifyBlobFile(
  blobFile: string,
  declaration: { readonly sha256: string; readonly sizeBytes: number }
): Promise<boolean> {
  let handle: fs.FileHandle | undefined
  try {
    handle = await fs.open(blobFile, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW)
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size !== declaration.sizeBytes) {
      return false
    }
    const digest = createHash('sha256')
    const buffer = Buffer.alloc(64 * 1024)
    let position = 0
    while (position < stat.size) {
      const { bytesRead } = await handle.read(
        buffer,
        0,
        Math.min(buffer.length, stat.size - position),
        position
      )
      if (bytesRead <= 0) return false
      digest.update(buffer.subarray(0, bytesRead))
      position += bytesRead
    }
    return digest.digest('hex') === declaration.sha256
  } catch {
    return false
  } finally {
    await handle?.close()
  }
}

async function readRegularFileNoFollow(
  file: string,
  maximumBytes: number,
  encoding: BufferEncoding
): Promise<string> {
  const handle = await fs.open(file, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW)
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size <= 0 || stat.size > maximumBytes) {
      throw new Error('MODEL_LIBRARY_FILE_INVALID')
    }
    const buffer = Buffer.alloc(stat.size)
    let position = 0
    while (position < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        position,
        buffer.length - position,
        position
      )
      if (bytesRead <= 0) throw new Error('MODEL_LIBRARY_FILE_TRUNCATED')
      position += bytesRead
    }
    return buffer.toString(encoding)
  } finally {
    await handle.close()
  }
}

function createStoredArtifact(artifact: AdmittedModelCatalogArtifactRecord): StoredArtifact {
  return {
    admissionBinding: artifact.admissionBinding,
    ref: { ...artifact.identity.ref },
    familyId: artifact.identity.familyId,
    checkpointId: artifact.identity.checkpointId,
    variantId: artifact.identity.variantId,
    displayName: artifact.identity.displayName,
    immutableRevision: artifact.identity.immutableRevision,
    files: artifact.files.map((file) => ({ ...file })),
    requiredAcknowledgements: artifact.requiredAcknowledgements.map((item) => ({ ...item }))
  }
}

function projectArtifact(
  artifact: StoredArtifact,
  revision: number,
  verifiedBlobDigests: ReadonlySet<string>
): ModelArtifactPublicSummary {
  const identity = {
    ref: { ...artifact.ref },
    familyId: artifact.familyId,
    checkpointId: artifact.checkpointId,
    variantId: artifact.variantId,
    displayName: artifact.displayName,
    immutableRevision: artifact.immutableRevision
  }
  if (artifact.verifiedStored) {
    return {
      identity,
      lifecycle: {
        kind: 'verified-stored',
        storageRecordId: artifact.verifiedStored.storageRecordId,
        activeCapabilityAssignments: []
      },
      review: { state: 'not-required', reasons: ['ALREADY_VERIFIED_STORED'] }
    }
  }
  return {
    identity,
    lifecycle: { kind: 'catalog-only' },
    review: {
      state: 'confirmable',
      fingerprint: createReviewFingerprint(artifact, revision, verifiedBlobDigests),
      requiredAcknowledgements: artifact.requiredAcknowledgements
        .map((item) => ({ ...item }))
        .sort((left, right) => compareText(left.id, right.id)),
      storageImpact: projectStorageImpact(artifact.files, verifiedBlobDigests),
      consequences: NO_INSTALL_CONSEQUENCES
    }
  }
}

function createReviewFingerprint(
  artifact: StoredArtifact,
  revision: number,
  verifiedBlobDigests: ReadonlySet<string>
): string {
  const storage = projectStorageImpact(artifact.files, verifiedBlobDigests)
  const canonicalReview = JSON.stringify([
    INSTALL_REVIEW_POLICY_VERSION,
    artifact.admissionBinding,
    artifact.ref.catalogId,
    artifact.ref.manifestId,
    artifact.familyId,
    artifact.checkpointId,
    artifact.variantId,
    artifact.displayName,
    artifact.immutableRevision,
    storage.logicalBytes,
    storage.alreadyPresentSharedBytes,
    storage.transferRequiredBytes,
    storage.additionalPhysicalBytes,
    artifact.files.map((file) => [
      file.relativePath,
      file.role,
      file.format,
      file.sizeBytes,
      file.sha256
    ]).sort((left, right) => compareText(String(left[0]), String(right[0]))),
    artifact.requiredAcknowledgements.map((item) => [item.id, item.kind, item.label])
      .sort((left, right) => compareText(JSON.stringify(left), JSON.stringify(right))),
    NO_INSTALL_CONSEQUENCES,
    revision
  ])
  return `review:${createHash('sha256').update(canonicalReview).digest('hex')}`
}

function projectStorageImpact(
  files: readonly AdmittedModelCatalogFileRecord[],
  verifiedBlobDigests: ReadonlySet<string>
): ModelArtifactStorageImpact {
  const logicalBytes = files.reduce((total, file) => total + file.sizeBytes, 0)
  const physicalFiles = uniquePhysicalFiles(files)
  const alreadyPresentSharedBytes = physicalFiles
    .filter((file) => verifiedBlobDigests.has(file.sha256))
    .reduce((total, file) => total + file.sizeBytes, 0)
  const transferRequiredBytes = physicalFiles
    .filter((file) => !verifiedBlobDigests.has(file.sha256))
    .reduce((total, file) => total + file.sizeBytes, 0)
  return {
    logicalBytes,
    alreadyPresentSharedBytes,
    transferRequiredBytes,
    additionalPhysicalBytes: transferRequiredBytes
  }
}

function uniquePhysicalFiles(
  files: readonly AdmittedModelCatalogFileRecord[]
): AdmittedModelCatalogFileRecord[] {
  const unique = new Map<string, AdmittedModelCatalogFileRecord>()
  for (const file of files) {
    const existing = unique.get(file.sha256)
    if (existing && existing.sizeBytes !== file.sizeBytes) {
      throw new InstallOperationFailure('ARTIFACT_BYTES_REJECTED')
    }
    if (!existing) unique.set(file.sha256, file)
  }
  return [...unique.values()].sort((left, right) => compareText(left.sha256, right.sha256))
}

async function writeAtomicJson(finalFile: string, value: unknown): Promise<void> {
  const pendingFile = `${finalFile}.pending`
  await writeDurableFile(pendingFile, JSON.stringify(value))
  await fs.rename(pendingFile, finalFile)
  await syncDirectory(path.dirname(finalFile))
}

async function writeDurableFile(file: string, value: string): Promise<void> {
  const handle = await fs.open(file, 'wx', 0o600)
  try {
    await handle.writeFile(value, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function cleanupTransaction(
  stagingDirectory: string,
  journalFile: string
): Promise<void> {
  await fs.rm(stagingDirectory, { recursive: true, force: true })
  await fs.rm(journalFile, { force: true })
  await fs.rm(`${journalFile}.pending`, { force: true })
}

async function syncDirectory(directory: string): Promise<void> {
  const handle = await fs.open(directory, 'r')
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await fs.lstat(candidate)
    return true
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) return false
    throw error
  }
}

async function withRootOperationLock<T>(
  controlDirectory: string,
  operation: () => Promise<T>
): Promise<T> {
  const key = path.resolve(controlDirectory)
  const previous = rootOperationTails.get(key) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  const tail = previous.then(() => current)
  rootOperationTails.set(key, tail)
  await previous
  try {
    return await operation()
  } finally {
    release()
    if (rootOperationTails.get(key) === tail) rootOperationTails.delete(key)
  }
}

function recoveryBlockedLibrary(): ModelLibrary {
  return Object.freeze({
    async summarize() {
      return failure('RECOVERY_BLOCKED', 'after-user-action')
    },
    async install() {
      return failure('RECOVERY_BLOCKED', 'after-user-action')
    }
  })
}

function failure(
  code: ModelLibraryErrorCode,
  retry: 'review-again' | 'after-user-action' | 'not-retryable'
): ModelLibraryResult<never> {
  return { ok: false, error: { code, retry } }
}

function copyActivity(activity: ModelLibraryActivitySummary): ModelLibraryActivitySummary {
  return { ...activity, artifact: { ...activity.artifact } }
}

function sameAcknowledgements(
  accepted: readonly string[],
  required: readonly string[]
): boolean {
  if (accepted.length !== required.length) return false
  const normalizedAccepted = [...accepted].sort()
  const normalizedRequired = [...required].sort()
  return normalizedAccepted.every((value, index) => value === normalizedRequired[index])
}

function sameRef(left: ModelArtifactRevisionRef, right: ModelArtifactRevisionRef): boolean {
  return left.catalogId === right.catalogId && left.manifestId === right.manifestId
}

function isSafePublicId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_PUBLIC_ID_PATTERN.test(value)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[]
): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...expectedKeys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

function hasErrorCode(value: unknown, code: string): boolean {
  return value !== null &&
    typeof value === 'object' &&
    'code' in value &&
    (value as { readonly code?: unknown }).code === code
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sameTextSet(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = [...left].sort(compareText)
  const normalizedRight = [...right].sort(compareText)
  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
}
