import { createManagedOriginalName, createBase32Disambiguator, MANAGED_ORIGINAL_BUCKET } from './capture-storage-names'
import { readVerifiedOwnedFile } from '../platform/verified-owned-file'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

import {
  assertInsideManagedRoot,
  ensureDirectoryInsideExistingManagedRoot,
  safeRemoveInsideRoot
} from '../platform/filesystem-guard'
import { isInsideDirectory } from '../platform/path-normalizer'
import { digestFile } from './file-evidence'
import {
  CaptureIntakeError,
  type CaptureBatchSnapshot,
  type CaptureGateway,
  type CaptureIdentityKind,
  type CapturePersistenceAdapter,
  type ConfirmedCopyPlan,
  type GenerateSystemPreviewInput,
  type SystemPreviewOutcome
} from './capture-intake.types'

interface CaptureGatewayDependencies {
  persistence: CapturePersistenceAdapter
  generateSystemPreview(input: GenerateSystemPreviewInput): Promise<SystemPreviewOutcome>
  createIdentity(kind: CaptureIdentityKind): string
  resumeAccepted?: boolean
}

interface ItemIdentities {
  captureRequestIdentity: string
  candidateIdentity: string
  originalStorageObjectIdentity: string
}

interface BatchIdentities {
  batchIdentity: string
  items: readonly ItemIdentities[]
}

export function createCaptureGateway(
  dependencies: CaptureGatewayDependencies
): CaptureGateway {
  // A reviewed in-memory Copy Plan is dispatchable only for this workflow
  // lifetime. Re-dispatch reuses its Capture Request identities; restart
  // reconciliation starts from durable requests rather than restoring a plan.
  const identitiesByPlanReceipt = new Map<string, BatchIdentities>()

  return {
    async start(plan): Promise<CaptureBatchSnapshot> {
      const identities = identitiesByPlanReceipt.get(plan.receipt)
        ?? createBatchIdentities(plan, dependencies)
      identitiesByPlanReceipt.set(plan.receipt, identities)

      const acceptance = await dependencies.persistence.acceptOrReplay({
        batchIdentity: identities.batchIdentity,
        activeLibraryIdentity: plan.activeLibrary.identity,
        items: plan.items.map((item, index) => ({
          planItemIdentity: item.planItemIdentity,
          captureRequestIdentity: identities.items[index].captureRequestIdentity,
          candidateIdentity: identities.items[index].candidateIdentity,
          originalStorageObjectIdentity:
            identities.items[index].originalStorageObjectIdentity,
          canonicalEnvelopeDigest: createCanonicalCaptureEnvelopeDigest(item),
          captureMethod: 'copy-into-library',
          receivedFileName: item.receivedFileName,
          sourceBytes: item.sourceBytes,
          sourceGeneration: item.sourceGeneration,
          sourceLocatorDigest: item.sourceLocatorDigest,
          format: item.format
        }))
      })
      if (acceptance.kind === 'replayed' && (!dependencies.resumeAccepted || acceptance.snapshot.state === 'complete')) return acceptance.snapshot

      for (const [index, item] of plan.items.entries()) {
        const previous = acceptance.kind === 'replayed' ? acceptance.snapshot.items[index] : undefined
        if (previous?.state === 'promoted') continue
        await captureAndPromoteItem(
          plan,
          item,
          identities.items[index],
          dependencies,
          previous?.state
        )
      }

      return dependencies.persistence.completeBatch(identities.batchIdentity)
    },

    inspect(batchIdentity): Promise<CaptureBatchSnapshot | null> {
      return dependencies.persistence.inspect(batchIdentity)
    }
  }
}

function createBatchIdentities(
  plan: ConfirmedCopyPlan,
  dependencies: CaptureGatewayDependencies
): BatchIdentities {
  return {
    batchIdentity: dependencies.createIdentity('capture-batch'),
    items: plan.items.map(() => ({
      captureRequestIdentity: dependencies.createIdentity('capture-request'),
      candidateIdentity: dependencies.createIdentity('candidate'),
      originalStorageObjectIdentity:
        dependencies.createIdentity('original-storage-object')
    }))
  }
}

async function captureAndPromoteItem(
  plan: ConfirmedCopyPlan,
  item: ConfirmedCopyPlan['items'][number],
  identities: ItemIdentities,
  dependencies: CaptureGatewayDependencies,
  previousState?: 'intake' | 'active'
): Promise<void> {
  let verifiedRecoveryBytes: Uint8Array | undefined
  if (previousState) {
    verifiedRecoveryBytes = (await readVerifiedOwnedFile({
      root: plan.activeLibrary.libraryRootDirectory, role: plan.activeLibrary.intakeStagingDirectory,
      relative: path.relative(plan.activeLibrary.intakeStagingDirectory, item.sourcePath).split(path.sep).join('/'),
      expectedSize: item.sourceBytes, expectedDigest: item.sourceDigest, maximumBytes: 32 * 1024 * 1024
    })).bytes
  } else {
    const currentSource = await readSourceEvidence(item.sourcePath)
    if (currentSource.digest !== item.sourceDigest || currentSource.byteSize !== item.sourceBytes || currentSource.modifiedAtMs !== item.sourceModifiedAtMs) {
      throw new CaptureIntakeError('source-changed', 'The selected source changed after the Copy Into Library Plan was created.')
    }
  }

  const managedBucket = path.join(
    plan.activeLibrary.managedOriginalsDirectory,
    MANAGED_ORIGINAL_BUCKET
  )
  const managedFileName = createManagedOriginalName(
    item.receivedFileName,
    item.format,
    identities.originalStorageObjectIdentity
  )
  const finalPath = path.join(managedBucket, managedFileName)
  const attemptIdentity = dependencies.createIdentity('capture-attempt')
  const stagingPath = path.join(
    plan.activeLibrary.intakeStagingDirectory,
    `${createBase32Disambiguator(identities.candidateIdentity)}-${createBase32Disambiguator(attemptIdentity)}.part`
  )

  assertManagedIntakePaths(plan, finalPath, stagingPath)
  let originalExists = false
  if (previousState) {
    try { await fs.lstat(finalPath); originalExists = true }
    catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error }
    if (previousState === 'active' && !originalExists) throw new CaptureIntakeError('managed-storage-failed', 'The activated Original is unavailable.')
    if (originalExists) await readVerifiedOwnedFile({
      root: plan.activeLibrary.libraryRootDirectory, role: plan.activeLibrary.managedOriginalsDirectory,
      relative: path.relative(plan.activeLibrary.managedOriginalsDirectory, finalPath).split(path.sep).join('/'),
      expectedSize: item.sourceBytes, expectedDigest: item.sourceDigest, maximumBytes: 32 * 1024 * 1024
    })
  }
  if (!originalExists) await commitVerifiedManagedOriginal(plan, item, managedBucket, finalPath, stagingPath, verifiedRecoveryBytes)

  const managedRelativePath = path.relative(
    plan.activeLibrary.managedOriginalsDirectory,
    finalPath
  ).split(path.sep).join('/')
  const managedOriginalRef = `managed-original:${managedRelativePath}`

  // This is the durable Candidate Activation boundary. Preview generation and
  // Promotion happen only after authoritative storage can already reconcile
  // the committed original.
  await dependencies.persistence.commitCandidateActivation({
    captureRequestIdentity: identities.captureRequestIdentity,
    managedOriginalRef
  })

  let preview: SystemPreviewOutcome
  try {
    preview = await dependencies.generateSystemPreview({
      candidateIdentity: identities.candidateIdentity,
      sourceGeneration: item.sourceGeneration,
      managedOriginalRef,
      managedOriginalPath: finalPath,
      activeLibrary: plan.activeLibrary
    })
  } catch {
    throw new CaptureIntakeError(
      'preview-generation-failed',
      'A required System Preview could not be generated and verified.'
    )
  }
  if (
    preview.kind !== 'ready' ||
    preview.evidence.sourceGeneration !== item.sourceGeneration ||
    preview.evidence.format !== item.format ||
    !isOpaqueIdentity(preview.previewGenerationIdentity) ||
    !isOpaquePreviewRef(preview.gridThumbnailRef) ||
    !await isValidSystemPreviewPath(
      plan.activeLibrary.libraryRootDirectory,
      plan.activeLibrary.requiredPreviewsDirectory,
      finalPath,
      preview.gridThumbnailPath
    )
  ) {
    throw new CaptureIntakeError(
      'preview-generation-failed',
      'A required System Preview could not be generated and verified.'
    )
  }

  if (previousState) await readVerifiedOwnedFile({
    root: plan.activeLibrary.libraryRootDirectory, role: plan.activeLibrary.managedOriginalsDirectory,
    relative: managedRelativePath, expectedSize: item.sourceBytes, expectedDigest: item.sourceDigest, maximumBytes: 32 * 1024 * 1024
  })

  // Copy Plan confirmation is the reviewed action authorizing Quick Promote
  // once the activated Candidate reaches System Preview Ready.
  await dependencies.persistence.commitReadyPromotion({
    captureRequestIdentity: identities.captureRequestIdentity,
    previewGenerationIdentity: preview.previewGenerationIdentity,
    gridThumbnailRef: preview.gridThumbnailRef,
    gridThumbnailPath: preview.gridThumbnailPath,
    designAssetIdentity: dependencies.createIdentity('design-asset'),
    promotionLinkIdentity: dependencies.createIdentity('promotion-link'),
    managedOriginalPath: finalPath
  })
}

function assertManagedIntakePaths(
  plan: ConfirmedCopyPlan,
  finalPath: string,
  stagingPath: string
): void {
  try {
    const root = plan.activeLibrary.libraryRootDirectory
    const originals = plan.activeLibrary.managedOriginalsDirectory
    const staging = plan.activeLibrary.intakeStagingDirectory
    const previews = plan.activeLibrary.requiredPreviewsDirectory
    assertInsideManagedRoot(root, originals)
    assertInsideManagedRoot(root, staging)
    assertInsideManagedRoot(root, previews)
    if (
      directoriesOverlap(originals, staging) ||
      directoriesOverlap(originals, previews) ||
      directoriesOverlap(staging, previews)
    ) {
      throw new Error('Managed storage roles must be disjoint.')
    }
    assertInsideManagedRoot(root, finalPath)
    assertInsideManagedRoot(root, stagingPath)
  } catch {
    throw new CaptureIntakeError(
      'managed-storage-failed',
      'The active library storage binding is unsafe.'
    )
  }
}

function directoriesOverlap(left: string, right: string): boolean {
  return isInsideDirectory(left, right) || isInsideDirectory(right, left)
}

async function commitVerifiedManagedOriginal(
  plan: ConfirmedCopyPlan,
  item: ConfirmedCopyPlan['items'][number],
  managedBucket: string,
  finalPath: string,
  stagingPath: string,
  verifiedSourceBytes?: Uint8Array
): Promise<void> {
  let committed = false
  let stagingCreated = false
  let copyAttempted = false
  try {
    await ensureDirectoryInsideExistingManagedRoot(
      plan.activeLibrary.libraryRootDirectory,
      managedBucket
    )
    await ensureDirectoryInsideExistingManagedRoot(
      plan.activeLibrary.libraryRootDirectory,
      plan.activeLibrary.intakeStagingDirectory
    )
    copyAttempted = true
    if (verifiedSourceBytes) await fs.writeFile(stagingPath, verifiedSourceBytes, { flag: 'wx' })
    else await fs.copyFile(item.sourcePath, stagingPath, fs.constants.COPYFILE_EXCL)
    stagingCreated = true

    const stagedDigest = await digestFile(stagingPath)
    if (stagedDigest !== item.sourceDigest) {
      throw new CaptureIntakeError(
        'copy-verification-failed',
        'The managed copy could not be verified.'
      )
    }

    const sourceDigestAfterCopy = verifiedSourceBytes ? createHash('sha256').update(verifiedSourceBytes).digest('hex') : await digestFile(item.sourcePath)
    if (sourceDigestAfterCopy !== item.sourceDigest) {
      throw new CaptureIntakeError(
        'source-changed',
        'The selected source changed while it was being copied.'
      )
    }

    // Staging and Originals live under one Active Library Context. Publishing
    // with link is atomic and fails if the target exists, unlike rename's
    // overwrite behavior on common filesystems.
    await fs.link(stagingPath, finalPath)
    committed = true
    await safeRemoveInsideRoot(
      plan.activeLibrary.intakeStagingDirectory,
      stagingPath
    ).catch(() => undefined)
  } catch (error) {
    if (
      !committed &&
      (stagingCreated || (copyAttempted && !isAlreadyExistsError(error)))
    ) {
      await safeRemoveInsideRoot(
        plan.activeLibrary.intakeStagingDirectory,
        stagingPath
      ).catch(() => undefined)
    }
    if (error instanceof CaptureIntakeError) throw error
    throw new CaptureIntakeError(
      'managed-storage-failed',
      'The original could not be committed to managed storage.'
    )
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST'
}

function isOpaqueIdentity(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u.test(value)
}

function isOpaquePreviewRef(value: string): boolean {
  return /^preview:[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u.test(value)
}

async function isValidSystemPreviewPath(
  libraryRootDirectory: string,
  requiredPreviewsDirectory: string,
  managedOriginalPath: string,
  gridThumbnailPath: string
): Promise<boolean> {
  try {
    if (!path.isAbsolute(gridThumbnailPath)) return false
    const resolvedRoot = path.resolve(libraryRootDirectory)
    const resolvedPreviewRoot = path.resolve(requiredPreviewsDirectory)
    const resolvedOriginal = path.resolve(managedOriginalPath)
    const resolvedPreview = path.resolve(gridThumbnailPath)
    if (resolvedPreview === resolvedOriginal) return false
    assertInsideManagedRoot(resolvedRoot, resolvedPreviewRoot)
    assertInsideManagedRoot(resolvedPreviewRoot, resolvedPreview)
    const [realRoot, realPreviewRoot, realPreview, previewStat] = await Promise.all([
      fs.realpath(resolvedRoot),
      fs.realpath(resolvedPreviewRoot),
      fs.realpath(resolvedPreview),
      fs.stat(resolvedPreview)
    ])
    assertInsideManagedRoot(realRoot, realPreviewRoot)
    assertInsideManagedRoot(realPreviewRoot, realPreview)
    return previewStat.isFile()
  } catch {
    return false
  }
}

async function readSourceEvidence(filePath: string): Promise<{
  byteSize: number
  modifiedAtMs: number
  digest: string
}> {
  try {
    const stat = await fs.stat(filePath)
    return {
      byteSize: stat.size,
      modifiedAtMs: stat.mtimeMs,
      digest: await digestFile(filePath)
    }
  } catch {
    throw new CaptureIntakeError(
      'source-changed',
      'The selected source is no longer readable.'
    )
  }
}

function createCanonicalCaptureEnvelopeDigest(
  item: ConfirmedCopyPlan['items'][number]
): string {
  const canonicalEnvelope = JSON.stringify({
    source: {
      kind: 'local-file',
      locatorDigest: item.sourceLocatorDigest,
      generation: item.sourceGeneration,
      byteSize: item.sourceBytes,
      format: item.format
    },
    captureMethod: 'copy-into-library',
    metadataIntent: {
      receivedFileName: item.receivedFileName,
      title: 'derive-from-received-file-name',
      promotion: 'quick-promote-after-system-preview'
    }
  })
  return createHash('sha256').update(canonicalEnvelope).digest('hex')
}
