import {
  CaptureIntakeError,
  type CaptureBatchItemSnapshot,
  type CaptureBatchSnapshot,
  type CapturePersistenceAcceptance,
  type CapturePersistenceAdapter
} from './capture-intake.types'

type AcceptedCaptureItem = Parameters<
  CapturePersistenceAdapter['acceptOrReplay']
>[0]['items'][number]

type StoredCaptureItem = AcceptedCaptureItem & {
  state: 'intake' | 'active' | 'promoted'
  managedOriginalRef?: string
  previewGenerationIdentity?: string
  gridThumbnailRef?: string
  gridThumbnailPath?: string
  managedOriginalPath?: string
  designAssetIdentity?: string
  promotionLinkIdentity?: string
}

interface StoredCaptureBatch {
  batchIdentity: string
  activeLibraryIdentity: string
  state: 'running' | 'complete'
  items: StoredCaptureItem[]
}

export function createInMemoryCapturePersistenceAdapter(): CapturePersistenceAdapter {
  const batchesByIdentity = new Map<string, StoredCaptureBatch>()
  const batchIdentityByCaptureRequest = new Map<string, string>()

  return {
    async acceptOrReplay(input): Promise<CapturePersistenceAcceptance> {
      const existingBatchIdentities = new Set(
        input.items
          .map((item) => batchIdentityByCaptureRequest.get(item.captureRequestIdentity))
          .filter((identity): identity is string => Boolean(identity))
      )

      if (existingBatchIdentities.size > 0) {
        if (
          existingBatchIdentities.size !== 1 ||
          input.items.some((item) =>
            !batchIdentityByCaptureRequest.has(item.captureRequestIdentity)
          )
        ) {
          throw captureIdentityConflict()
        }

        const [existingBatchIdentity] = existingBatchIdentities
        const existing = batchesByIdentity.get(existingBatchIdentity)
        if (
          !existing ||
          existing.batchIdentity !== input.batchIdentity ||
          existing.activeLibraryIdentity !== input.activeLibraryIdentity ||
          existing.items.length !== input.items.length ||
          !sameAcceptedIdentities(existing.items, input.items)
        ) {
          throw captureIdentityConflict()
        }
        return { kind: 'replayed', snapshot: projectSnapshot(existing) }
      }

      if (batchesByIdentity.has(input.batchIdentity)) {
        throw captureIdentityConflict()
      }

      const batch: StoredCaptureBatch = {
        batchIdentity: input.batchIdentity,
        activeLibraryIdentity: input.activeLibraryIdentity,
        state: 'running',
        items: input.items.map((item) => ({
          ...item,
          state: 'intake'
        }))
      }
      batchesByIdentity.set(batch.batchIdentity, batch)
      for (const item of batch.items) {
        batchIdentityByCaptureRequest.set(
          item.captureRequestIdentity,
          batch.batchIdentity
        )
      }
      return { kind: 'accepted' }
    },

    async commitCandidateActivation(input): Promise<CaptureBatchSnapshot> {
      const { batch, item } = findItemByCaptureRequest(
        input.captureRequestIdentity,
        batchesByIdentity,
        batchIdentityByCaptureRequest
      )

      if (item.state !== 'intake') {
        if (item.managedOriginalRef !== input.managedOriginalRef) {
          throw captureTransitionConflict()
        }
        return projectSnapshot(batch)
      }

      item.state = 'active'
      item.managedOriginalRef = input.managedOriginalRef
      return projectSnapshot(batch)
    },

    async commitReadyPromotion(input): Promise<CaptureBatchSnapshot> {
      const { batch, item } = findItemByCaptureRequest(
        input.captureRequestIdentity,
        batchesByIdentity,
        batchIdentityByCaptureRequest
      )

      if (item.state === 'intake') throw captureTransitionConflict()
      if (item.state === 'promoted') {
        if (
          item.previewGenerationIdentity !== input.previewGenerationIdentity ||
          item.gridThumbnailRef !== input.gridThumbnailRef ||
          item.gridThumbnailPath !== input.gridThumbnailPath ||
          item.managedOriginalPath !== input.managedOriginalPath ||
          item.designAssetIdentity !== input.designAssetIdentity ||
          item.promotionLinkIdentity !== input.promotionLinkIdentity
        ) {
          throw captureTransitionConflict()
        }
        return projectSnapshot(batch)
      }

      item.state = 'promoted'
      item.previewGenerationIdentity = input.previewGenerationIdentity
      item.gridThumbnailRef = input.gridThumbnailRef
      item.gridThumbnailPath = input.gridThumbnailPath
      item.managedOriginalPath = input.managedOriginalPath
      item.designAssetIdentity = input.designAssetIdentity
      item.promotionLinkIdentity = input.promotionLinkIdentity
      return projectSnapshot(batch)
    },

    async completeBatch(batchIdentity): Promise<CaptureBatchSnapshot> {
      const batch = batchesByIdentity.get(batchIdentity)
      if (!batch) throw captureBatchNotFound()
      if (batch.items.some((item) => item.state !== 'promoted')) {
        throw captureTransitionConflict()
      }
      batch.state = 'complete'
      return projectSnapshot(batch)
    },

    async inspect(batchIdentity): Promise<CaptureBatchSnapshot | null> {
      const batch = batchesByIdentity.get(batchIdentity)
      return batch ? projectSnapshot(batch) : null
    }
  }
}

function sameAcceptedIdentities(
  storedItems: readonly StoredCaptureItem[],
  acceptedItems: readonly AcceptedCaptureItem[]
): boolean {
  return storedItems.every((stored, index) => {
    const accepted = acceptedItems[index]
    return accepted !== undefined &&
      stored.planItemIdentity === accepted.planItemIdentity &&
      stored.captureRequestIdentity === accepted.captureRequestIdentity &&
      stored.candidateIdentity === accepted.candidateIdentity &&
      stored.originalStorageObjectIdentity === accepted.originalStorageObjectIdentity &&
      stored.canonicalEnvelopeDigest === accepted.canonicalEnvelopeDigest &&
      stored.captureMethod === accepted.captureMethod &&
      stored.receivedFileName === accepted.receivedFileName &&
      stored.sourceBytes === accepted.sourceBytes &&
      stored.sourceGeneration === accepted.sourceGeneration &&
      stored.sourceLocatorDigest === accepted.sourceLocatorDigest &&
      stored.format === accepted.format
  })
}

function findItemByCaptureRequest(
  captureRequestIdentity: string,
  batchesByIdentity: ReadonlyMap<string, StoredCaptureBatch>,
  batchIdentityByCaptureRequest: ReadonlyMap<string, string>
): { batch: StoredCaptureBatch; item: StoredCaptureItem } {
  const batchIdentity = batchIdentityByCaptureRequest.get(captureRequestIdentity)
  const batch = batchIdentity
    ? batchesByIdentity.get(batchIdentity)
    : undefined
  const item = batch?.items.find(
    (candidate) => candidate.captureRequestIdentity === captureRequestIdentity
  )
  if (!batch || !item) throw captureBatchNotFound()
  return { batch, item }
}

function projectSnapshot(batch: StoredCaptureBatch): CaptureBatchSnapshot {
  return {
    batchIdentity: batch.batchIdentity,
    activeLibraryIdentity: batch.activeLibraryIdentity,
    state: batch.state,
    items: batch.items.map(projectItemSnapshot)
  }
}

function projectItemSnapshot(item: StoredCaptureItem): CaptureBatchItemSnapshot {
  const identities = {
    planItemIdentity: item.planItemIdentity,
    captureRequestIdentity: item.captureRequestIdentity,
    candidateIdentity: item.candidateIdentity,
    originalStorageObjectIdentity: item.originalStorageObjectIdentity
  }
  if (item.state === 'intake') {
    return {
      ...identities,
      state: 'intake',
      candidate: { state: 'intake' },
      preview: { state: 'pending' }
    }
  }

  if (!item.managedOriginalRef) throw captureTransitionConflict()
  const candidate = {
    managedOriginalRef: item.managedOriginalRef,
    copyVerification: 'verified' as const,
    sourcePreservation: 'verified' as const
  }
  if (item.state === 'active') {
    return {
      ...identities,
      state: 'active',
      candidate: { ...candidate, state: 'active' },
      preview: { state: 'pending' }
    }
  }

  if (
    !item.previewGenerationIdentity ||
    !item.gridThumbnailRef ||
    !item.designAssetIdentity ||
    !item.promotionLinkIdentity
  ) throw captureTransitionConflict()

  return {
    ...identities,
    state: 'promoted',
    candidate: { ...candidate, state: 'promoted' },
    preview: {
      state: 'ready',
      generationIdentity: item.previewGenerationIdentity,
      gridThumbnailRef: item.gridThumbnailRef
    },
    promotion: {
      state: 'promoted',
      designAssetIdentity: item.designAssetIdentity,
      promotionLinkIdentity: item.promotionLinkIdentity
    }
  }
}

function captureIdentityConflict(): CaptureIntakeError {
  return new CaptureIntakeError(
    'capture-identity-conflict',
    'The Capture Request Identity conflicts with an accepted capture envelope.'
  )
}

function captureTransitionConflict(): CaptureIntakeError {
  return new CaptureIntakeError(
    'capture-transition-conflict',
    'The requested Candidate lifecycle transition is not valid.'
  )
}

function captureBatchNotFound(): CaptureIntakeError {
  return new CaptureIntakeError(
    'capture-batch-not-found',
    'The capture batch is unavailable.'
  )
}
