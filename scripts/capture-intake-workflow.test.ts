import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  CaptureIntakeError,
  createAddAssetsWorkflow,
  createInMemoryCapturePersistenceAdapter,
  type CaptureIntakeDependencies,
  type CaptureIdentityKind
} from '../src/main/capture-intake'

const testParent = path.join(process.cwd(), 'dist-temp', 'tests')
await fs.mkdir(testParent, { recursive: true })
const testRoot = await fs.mkdtemp(path.join(testParent, 'capture-intake-'))

const sourceDirectory = path.join(testRoot, 'external')
const sourcePath = path.join(sourceDirectory, 'reference.png')
const libraryRoot = path.join(testRoot, 'library')
const managedOriginalsDirectory = path.join(libraryRoot, 'Originals')
const intakeStagingDirectory = path.join(libraryRoot, '.control', 'intake-staging')
const requiredPreviewsDirectory = path.join(
  libraryRoot,
  '.control',
  'required-previews'
)

// Generated 1×1 PNG fixture. It contains no user data.
const sourceBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0xf0, 0x1f,
  0x00, 0x05, 0x00, 0x01, 0xff, 0x89, 0x99, 0x3d, 0x1d,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82
])

const identityCounters = new Map<CaptureIdentityKind, number>()
function createIdentity(kind: CaptureIdentityKind): string {
  const next = (identityCounters.get(kind) ?? 0) + 1
  identityCounters.set(kind, next)
  return `${kind}-fixture-${next}`
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function listFiles(root: string): Promise<string[]> {
  if (!await pathExists(root)) return []

  const files: string[] = []
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath))
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }
  return files.sort()
}

function createFixtureWorkflow(input: {
  libraryRootDirectory: string
  managedOriginalsDirectory: string
  intakeStagingDirectory: string
  requiredPreviewsDirectory?: string
  sourcePaths?: readonly string[]
  generateSystemPreview?: CaptureIntakeDependencies['generateSystemPreview']
}) {
  const {
    sourcePaths = [sourcePath],
    generateSystemPreview,
    requiredPreviewsDirectory = path.join(
      input.libraryRootDirectory,
      '.control',
      'required-previews'
    ),
    ...activeLibrary
  } = input
  return createAddAssetsWorkflow({
    selectLocalFiles: async () => ({
      kind: 'selected',
      files: sourcePaths.map((filePath) => ({ filePath }))
    }),
    resolveActiveLibrary: async () => ({
      identity: 'library-fixture',
      generation: 'library-generation-1',
      requiredPreviewsDirectory,
      ...activeLibrary
    }),
    persistence: createInMemoryCapturePersistenceAdapter(),
    generateSystemPreview: generateSystemPreview ??
      (async ({
        candidateIdentity,
        sourceGeneration,
        managedOriginalPath,
        activeLibrary: library
      }) => {
        const gridThumbnailPath = await writePreviewFixture(
          candidateIdentity,
          managedOriginalPath,
          library.requiredPreviewsDirectory
        )
        return {
          kind: 'ready',
          previewGenerationIdentity: `preview-${candidateIdentity}`,
          gridThumbnailRef: `preview:${candidateIdentity}`,
          gridThumbnailPath,
          evidence: {
            sourceGeneration,
            format: 'png'
          }
        }
      }),
    createIdentity
  })
}

async function writePreviewFixture(
  candidateIdentity: string,
  managedOriginalPath: string,
  requiredPreviewsDirectory: string
): Promise<string> {
  await fs.mkdir(requiredPreviewsDirectory, { recursive: true })
  const previewPath = path.join(
    requiredPreviewsDirectory,
    `${candidateIdentity}.png`
  )
  await fs.copyFile(managedOriginalPath, previewPath)
  return previewPath
}

try {
  await fs.mkdir(sourceDirectory, { recursive: true })
  await fs.mkdir(libraryRoot, { recursive: true })
  await fs.writeFile(sourcePath, sourceBytes)

  const alternateSourceDirectory = path.join(
    testRoot,
    'alternate-location',
    'external'
  )
  const alternateSourcePath = path.join(alternateSourceDirectory, 'reference.png')
  await fs.mkdir(alternateSourceDirectory, { recursive: true })
  await fs.writeFile(alternateSourcePath, sourceBytes)

  const duplicateNamePlanWorkflow = createFixtureWorkflow({
    libraryRootDirectory: libraryRoot,
    managedOriginalsDirectory,
    intakeStagingDirectory,
    sourcePaths: [sourcePath, alternateSourcePath]
  })
  const duplicateNamePlan = await duplicateNamePlanWorkflow.prepare()
  assert.equal(duplicateNamePlan.kind, 'planned')
  if (duplicateNamePlan.kind !== 'planned') {
    throw new Error('Expected a duplicate-name Copy Plan')
  }
  assert.equal(duplicateNamePlan.plan.summary.selectedCount, 2)
  const scopeLabels = duplicateNamePlan.plan.items.map(
    (item) => item.sourceScopeLabel
  )
  assert.deepEqual(scopeLabels, [
    'external / reference.png · 1/2',
    'external / reference.png · 2/2'
  ])
  assert.equal(JSON.stringify(duplicateNamePlan).includes(sourcePath), false)
  assert.equal(
    JSON.stringify(duplicateNamePlan).includes(alternateSourcePath),
    false
  )
  identityCounters.clear()

  const workflow = createFixtureWorkflow({
    libraryRootDirectory: libraryRoot,
    managedOriginalsDirectory,
    intakeStagingDirectory
  })

  const prepared = await workflow.prepare()
  assert.equal(prepared.kind, 'planned')
  if (prepared.kind !== 'planned') throw new Error('Expected a Copy Into Library Plan')

  assert.equal(prepared.plan.summary.selectedCount, 1)
  assert.equal(prepared.plan.summary.eligibleCount, 1)
  assert.equal(prepared.plan.summary.excludedCount, 0)
  assert.equal(prepared.plan.items[0]?.receivedFileName, 'reference.png')
  assert.equal(
    prepared.plan.items[0]?.sourceScopeLabel,
    'external / reference.png'
  )
  assert.deepEqual(prepared.plan.items[0]?.eligibility, { kind: 'eligible' })
  assert.equal(JSON.stringify(prepared).includes(sourcePath), false)
  assert.equal(await pathExists(managedOriginalsDirectory), false)
  assert.equal(await pathExists(intakeStagingDirectory), false)
  assert.equal(await pathExists(requiredPreviewsDirectory), false)
  assert.deepEqual(await fs.readFile(sourcePath), sourceBytes)

  const confirmed = await workflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: prepared.plan.receipt
  })

  assert.equal(confirmed.state, 'complete')
  assert.equal(confirmed.items.length, 1)
  assert.equal(confirmed.items[0]?.state, 'promoted')
  const promotedItem = confirmed.items[0]
  if (!promotedItem || promotedItem.state !== 'promoted') {
    throw new Error('Expected one promoted Capture item')
  }
  assert.equal(promotedItem.candidate.state, 'promoted')
  assert.equal(promotedItem.candidate.copyVerification, 'verified')
  assert.equal(promotedItem.candidate.sourcePreservation, 'verified')
  assert.equal(promotedItem.preview.state, 'ready')
  assert.equal(promotedItem.promotion.state, 'promoted')
  assert.ok(promotedItem.captureRequestIdentity)
  assert.ok(promotedItem.candidateIdentity)
  assert.ok(promotedItem.originalStorageObjectIdentity)
  assert.ok(promotedItem.promotion.designAssetIdentity)
  assert.ok(promotedItem.promotion.promotionLinkIdentity)
  assert.equal(JSON.stringify(confirmed).includes(sourcePath), false)

  const inspected = await workflow.inspect({
    batchIdentity: confirmed.batchIdentity
  })
  assert.deepEqual(inspected, confirmed)

  const managedFilesAfterConfirm = await listFiles(managedOriginalsDirectory)
  assert.equal(managedFilesAfterConfirm.length, 1)
  assert.deepEqual(await fs.readFile(managedFilesAfterConfirm[0]), sourceBytes)
  assert.deepEqual(await fs.readFile(sourcePath), sourceBytes)
  assert.equal((await listFiles(intakeStagingDirectory)).length, 0)
  const previewFilesAfterConfirm = await listFiles(requiredPreviewsDirectory)
  assert.equal(previewFilesAfterConfirm.length, 1)
  assert.notEqual(previewFilesAfterConfirm[0], managedFilesAfterConfirm[0])

  const replayed = await workflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: prepared.plan.receipt
  })

  assert.deepEqual(replayed, confirmed)
  assert.equal((await listFiles(managedOriginalsDirectory)).length, 1)
  assert.equal((await listFiles(requiredPreviewsDirectory)).length, 1)
  assert.deepEqual(await fs.readFile(sourcePath), sourceBytes)

  // A distinct accepted request whose storage identity collides must fail
  // closed without replacing the already committed original.
  identityCounters.clear()
  const collidingWorkflow = createFixtureWorkflow({
    libraryRootDirectory: libraryRoot,
    managedOriginalsDirectory,
    intakeStagingDirectory
  })
  const collidingPlan = await collidingWorkflow.prepare()
  assert.equal(collidingPlan.kind, 'planned')
  if (collidingPlan.kind !== 'planned') throw new Error('Expected collision plan')
  await assert.rejects(
    collidingWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: collidingPlan.plan.receipt
    }),
    (error: unknown) =>
      error instanceof CaptureIntakeError &&
      error.code === 'managed-storage-failed'
  )
  assert.equal((await listFiles(managedOriginalsDirectory)).length, 1)
  assert.deepEqual(await fs.readFile(managedFilesAfterConfirm[0]), sourceBytes)

  // A managed-directory symlink cannot redirect intake outside the bound
  // Active Library Context.
  const linkedLibraryRoot = path.join(testRoot, 'linked-library')
  const linkedOutsideRoot = path.join(testRoot, 'linked-outside')
  const linkedOriginalsDirectory = path.join(linkedLibraryRoot, 'Originals')
  await fs.mkdir(linkedLibraryRoot, { recursive: true })
  await fs.mkdir(linkedOutsideRoot, { recursive: true })
  await fs.symlink(
    linkedOutsideRoot,
    linkedOriginalsDirectory,
    process.platform === 'win32' ? 'junction' : 'dir'
  )
  identityCounters.clear()
  const linkedWorkflow = createFixtureWorkflow({
    libraryRootDirectory: linkedLibraryRoot,
    managedOriginalsDirectory: linkedOriginalsDirectory,
    intakeStagingDirectory: path.join(
      linkedLibraryRoot,
      '.control',
      'intake-staging'
    )
  })
  const linkedPlan = await linkedWorkflow.prepare()
  assert.equal(linkedPlan.kind, 'planned')
  if (linkedPlan.kind !== 'planned') throw new Error('Expected linked plan')
  await assert.rejects(
    linkedWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: linkedPlan.plan.receipt
    }),
    (error: unknown) =>
      error instanceof CaptureIntakeError &&
      error.code === 'managed-storage-failed'
  )
  assert.equal((await listFiles(linkedOutsideRoot)).length, 0)
  assert.deepEqual(await fs.readFile(sourcePath), sourceBytes)

  const throwingPreviewRoot = path.join(testRoot, 'throwing-preview-library')
  await fs.mkdir(throwingPreviewRoot)
  identityCounters.clear()
  const throwingPreviewWorkflow = createFixtureWorkflow({
    libraryRootDirectory: throwingPreviewRoot,
    managedOriginalsDirectory: path.join(throwingPreviewRoot, 'Originals'),
    intakeStagingDirectory: path.join(
      throwingPreviewRoot,
      '.control',
      'intake-staging'
    ),
    generateSystemPreview: async () => {
      throw new Error(`Private adapter detail: ${sourcePath}`)
    }
  })
  const throwingPreviewPlan = await throwingPreviewWorkflow.prepare()
  assert.equal(throwingPreviewPlan.kind, 'planned')
  if (throwingPreviewPlan.kind !== 'planned') {
    throw new Error('Expected throwing-preview plan')
  }
  await assert.rejects(
    throwingPreviewWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: throwingPreviewPlan.plan.receipt
    }),
    (error: unknown) =>
      error instanceof CaptureIntakeError &&
      error.code === 'preview-generation-failed' &&
      !error.message.includes(sourcePath)
  )

  const pathRefPreviewRoot = path.join(testRoot, 'path-ref-preview-library')
  await fs.mkdir(pathRefPreviewRoot)
  identityCounters.clear()
  const pathRefPreviewWorkflow = createFixtureWorkflow({
    libraryRootDirectory: pathRefPreviewRoot,
    managedOriginalsDirectory: path.join(pathRefPreviewRoot, 'Originals'),
    intakeStagingDirectory: path.join(
      pathRefPreviewRoot,
      '.control',
      'intake-staging'
    ),
    generateSystemPreview: async ({
      candidateIdentity,
      sourceGeneration,
      managedOriginalPath,
      activeLibrary
    }) => ({
      kind: 'ready',
      previewGenerationIdentity: 'preview-generation-fixture',
      gridThumbnailRef: sourcePath,
      gridThumbnailPath: await writePreviewFixture(
        candidateIdentity,
        managedOriginalPath,
        activeLibrary.requiredPreviewsDirectory
      ),
      evidence: { sourceGeneration, format: 'png' }
    })
  })
  const pathRefPreviewPlan = await pathRefPreviewWorkflow.prepare()
  assert.equal(pathRefPreviewPlan.kind, 'planned')
  if (pathRefPreviewPlan.kind !== 'planned') {
    throw new Error('Expected path-ref preview plan')
  }
  await assert.rejects(
    pathRefPreviewWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: pathRefPreviewPlan.plan.receipt
    }),
    (error: unknown) =>
      error instanceof CaptureIntakeError &&
      error.code === 'preview-generation-failed' &&
      !error.message.includes(sourcePath)
  )

  const originalPreviewRoot = path.join(testRoot, 'original-preview-library')
  await fs.mkdir(originalPreviewRoot)
  identityCounters.clear()
  const originalPreviewWorkflow = createFixtureWorkflow({
    libraryRootDirectory: originalPreviewRoot,
    managedOriginalsDirectory: path.join(originalPreviewRoot, 'Originals'),
    intakeStagingDirectory: path.join(
      originalPreviewRoot,
      '.control',
      'intake-staging'
    ),
    generateSystemPreview: async ({
      candidateIdentity,
      sourceGeneration,
      managedOriginalPath
    }) => ({
      kind: 'ready',
      previewGenerationIdentity: `preview-${candidateIdentity}`,
      gridThumbnailRef: `preview:${candidateIdentity}`,
      gridThumbnailPath: managedOriginalPath,
      evidence: { sourceGeneration, format: 'png' }
    })
  })
  const originalPreviewPlan = await originalPreviewWorkflow.prepare()
  assert.equal(originalPreviewPlan.kind, 'planned')
  if (originalPreviewPlan.kind !== 'planned') {
    throw new Error('Expected original-as-preview plan')
  }
  await assert.rejects(
    originalPreviewWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: originalPreviewPlan.plan.receipt
    }),
    (error: unknown) =>
      error instanceof CaptureIntakeError &&
      error.code === 'preview-generation-failed' &&
      !error.message.includes(sourcePath)
  )

  console.log('capture-intake-workflow passed')
} finally {
  await fs.rm(testRoot, { recursive: true, force: true })
}
