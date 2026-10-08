import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

import { createCaptureGateway } from './capture-gateway'
import { digestFile } from './file-evidence'
import {
  CaptureIntakeError,
  type AddAssetsWorkflow,
  type CaptureIntakeDependencies,
  type ConfirmedCopyPlan,
  type ConfirmedCopyPlanItem,
  type CopyIntoLibraryPlan,
  type CopyIntoLibraryPlanItem,
  type LocalFileSelection,
  type SupportedCaptureFormat
} from './capture-intake.types'

interface SourceEvidence {
  byteSize: number
  modifiedAtMs: number
  digest: string
  format: SupportedCaptureFormat | null
}

interface StoredCopyPlan {
  publicPlan: CopyIntoLibraryPlan
  confirmedPlan: ConfirmedCopyPlan
}

export function createAddAssetsWorkflow(
  dependencies: CaptureIntakeDependencies
): AddAssetsWorkflow {
  const plans = new Map<string, StoredCopyPlan>()
  const gateway = createCaptureGateway(dependencies)

  return {
    async prepare() {
      const selection = await dependencies.selectLocalFiles()
      if (selection.kind === 'cancelled' || selection.files.length === 0) {
        return { kind: 'cancelled' as const }
      }

      const activeLibrary = await dependencies.resolveActiveLibrary()
      const scopeLabels = createUniqueSourceScopeLabels(selection.files)
      // Keep source order without opening one descriptor/hash stream per selected file.
      // Each lane owns at most one source check; public plans still review every item.
      const plannedItems: Awaited<ReturnType<typeof planSelection>>[] = new Array(selection.files.length)
      let next = 0
      await Promise.all(Array.from({ length: Math.min(8, selection.files.length) }, async () => {
        while (next < selection.files.length) {
          const index = next++
          plannedItems[index] = await planSelection(selection.files[index], scopeLabels[index], dependencies)
        }
      }))
      const receipt = dependencies.createIdentity('copy-plan')
      const publicItems = plannedItems.map((item) => item.publicItem)
      const eligibleItems = plannedItems
        .map((item) => item.confirmedItem)
        .filter((item): item is ConfirmedCopyPlanItem => item !== null)
      const selectedBytes = publicItems.reduce(
        (total, item) => total + item.sourceBytes,
        0
      )
      const publicPlan: CopyIntoLibraryPlan = {
        receipt,
        activeLibrary: {
          identity: activeLibrary.identity,
          generation: activeLibrary.generation
        },
        summary: {
          selectedCount: publicItems.length,
          eligibleCount: eligibleItems.length,
          excludedCount: publicItems.length - eligibleItems.length,
          sourceBytes: selectedBytes,
          estimatedManagedBytes: selectedBytes
        },
        items: publicItems,
        confirmable: eligibleItems.length > 0
      }
      const confirmedPlan: ConfirmedCopyPlan = {
        receipt,
        digest: createPlanDigest(activeLibrary.identity, activeLibrary.generation, eligibleItems),
        activeLibrary,
        items: eligibleItems
      }
      plans.set(receipt, { publicPlan, confirmedPlan })
      return { kind: 'planned' as const, plan: publicPlan }
    },

    async dispatch(command) {
      const stored = plans.get(command.planReceipt)
      if (!stored) {
        throw new CaptureIntakeError(
          'plan-not-found',
          'The Copy Into Library Plan is unavailable.'
        )
      }
      if (!stored.publicPlan.confirmable) {
        throw new CaptureIntakeError(
          'plan-not-confirmable',
          'The Copy Into Library Plan has no eligible items.'
        )
      }

      const currentLibrary = await dependencies.resolveActiveLibrary()
      if (
        currentLibrary.identity !== stored.confirmedPlan.activeLibrary.identity ||
        currentLibrary.generation !== stored.confirmedPlan.activeLibrary.generation
      ) {
        throw new CaptureIntakeError(
          'plan-stale',
          'The active library changed after the Copy Into Library Plan was created.'
        )
      }
      return gateway.start(stored.confirmedPlan)
    },

    async inspect(request) {
      const snapshot = await gateway.inspect(request.batchIdentity)
      if (!snapshot) {
        throw new CaptureIntakeError(
          'capture-batch-not-found',
          'The capture batch is unavailable.'
        )
      }
      return snapshot
    }
  }
}

async function planSelection(
  selection: LocalFileSelection,
  sourceScopeLabel: string,
  dependencies: CaptureIntakeDependencies
): Promise<{
  publicItem: CopyIntoLibraryPlanItem
  confirmedItem: ConfirmedCopyPlanItem | null
}> {
  const receivedFileName = path.basename(selection.filePath)
  const planItemIdentity = dependencies.createIdentity('plan-item')

  try {
    const stat = await fs.stat(selection.filePath)
    if (!stat.isFile()) {
      return excludedPlanItem(
        planItemIdentity,
        receivedFileName,
        sourceScopeLabel,
        0,
        'not-a-regular-file',
        'The selected entry is not a regular file.'
      )
    }

    const evidence = await inspectSource(selection.filePath, stat.size, stat.mtimeMs)
    if (!evidence.format || evidence.format==='mp4'&&evidence.byteSize>96*1024*1024) {
      return excludedPlanItem(
        planItemIdentity,
        receivedFileName,
        sourceScopeLabel,
        evidence.byteSize,
        'unsupported-format',
        'The selected file is not a currently supported image format.'
      )
    }

    if(evidence.format==='mp4'&&(!dependencies.inspectVideo||!await dependencies.inspectVideo(selection.filePath)))return excludedPlanItem(planItemIdentity,receivedFileName,sourceScopeLabel,evidence.byteSize,'unsupported-format','此 MP4 视频无法由当前本机解码器处理。')

    return {
      publicItem: {
        planItemIdentity,
        receivedFileName,
        sourceScopeLabel,
        sourceBytes: evidence.byteSize,
        detectedFormat: evidence.format,
        eligibility: { kind: 'eligible' }
      },
      confirmedItem: {
        planItemIdentity,
        sourcePath: selection.filePath,
        receivedFileName,
        sourceBytes: evidence.byteSize,
        sourceDigest: evidence.digest,
        sourceLocatorDigest: createSourceLocatorDigest(selection.filePath),
        sourceModifiedAtMs: evidence.modifiedAtMs,
        sourceGeneration: `sha256:${evidence.digest}`,
        format: evidence.format
      }
    }
  } catch {
    return excludedPlanItem(
      planItemIdentity,
      receivedFileName,
      sourceScopeLabel,
      0,
      'source-unreadable',
      'The selected file could not be read.'
    )
  }
}

function excludedPlanItem(
  planItemIdentity: string,
  receivedFileName: string,
  sourceScopeLabel: string,
  sourceBytes: number,
  code: 'not-a-regular-file' | 'source-unreadable' | 'unsupported-format',
  message: string
): { publicItem: CopyIntoLibraryPlanItem; confirmedItem: null } {
  return {
    publicItem: {
      planItemIdentity,
      receivedFileName,
      sourceScopeLabel,
      sourceBytes,
      detectedFormat: null,
      eligibility: { kind: 'excluded', code, message }
    },
    confirmedItem: null
  }
}

async function inspectSource(
  filePath: string,
  byteSize: number,
  modifiedAtMs: number
): Promise<SourceEvidence> {
  const file = await fs.open(filePath, 'r')
  const header = Buffer.alloc(16)
  try {
    await file.read(header, 0, header.length, 0)
  } finally {
    await file.close()
  }

  return {
    byteSize,
    modifiedAtMs,
    digest: await digestFile(filePath),
    format: detectFormat(header)
  }
}

function detectFormat(header: Buffer): SupportedCaptureFormat | null {
  if(header.subarray(4,8).toString('ascii')==='ftyp'&&['isom','iso2','mp41','mp42','avc1','M4V '].includes(header.subarray(8,12).toString('ascii')))return 'mp4'
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) return 'png'

  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return 'jpeg'
  }

  if (
    header.subarray(0, 4).toString('ascii') === 'RIFF' &&
    header.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'webp'

  return null
}

function createPlanDigest(
  libraryIdentity: string,
  libraryGeneration: string,
  items: readonly ConfirmedCopyPlanItem[]
): string {
  const canonical = JSON.stringify({
    libraryIdentity,
    libraryGeneration,
    items: items.map((item) => ({
      planItemIdentity: item.planItemIdentity,
      receivedFileName: item.receivedFileName,
      sourceBytes: item.sourceBytes,
      sourceDigest: item.sourceDigest,
      sourceLocatorDigest: item.sourceLocatorDigest,
      sourceModifiedAtMs: item.sourceModifiedAtMs,
      sourceGeneration: item.sourceGeneration,
      format: item.format
    }))
  })
  return createHash('sha256').update(canonical).digest('hex')
}

function createUniqueSourceScopeLabels(
  selections: readonly LocalFileSelection[]
): string[] {
  const baseLabels = selections.map(({ filePath }) => {
    const parentName = path.basename(path.dirname(filePath)) || 'Selected location'
    return `${parentName} / ${path.basename(filePath)}`
  })
  const baseCounts = countValues(baseLabels)
  const occurrences = new Map<string, number>()

  return selections.map((_, index) => {
    const baseLabel = baseLabels[index]
    const count = baseCounts.get(baseLabel) ?? 0
    if (count === 1) return baseLabel
    const occurrence = (occurrences.get(baseLabel) ?? 0) + 1
    occurrences.set(baseLabel, occurrence)
    return `${baseLabel} · ${occurrence}/${count}`
  })
}

function countValues(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

function createSourceLocatorDigest(filePath: string): string {
  return createHash('sha256')
    .update(path.resolve(filePath))
    .digest('hex')
}
