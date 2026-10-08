import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

import Database from 'better-sqlite3'

import {
  CaptureIntakeError,
  createAddAssetsWorkflow,
  createSqliteCapturePersistenceAdapter,
  type CaptureIdentityKind
} from '../src/main/capture-intake'

const testParent = path.join(process.cwd(), 'dist-temp', 'tests')
await fs.mkdir(testParent, { recursive: true })
const testRoot = await fs.mkdtemp(
  path.join(testParent, 'capture-intake-sqlite-')
)

const sourceDirectory = path.join(testRoot, 'external')
const sourcePath = path.join(sourceDirectory, 'restart-proof.png')
const libraryRoot = path.join(testRoot, 'library')
const libraryControlDirectory = path.join(libraryRoot, '.control')
const managedOriginalsDirectory = path.join(libraryRoot, 'Originals')
const intakeStagingDirectory = path.join(
  libraryControlDirectory,
  'intake-staging'
)
const requiredPreviewsDirectory = path.join(
  libraryControlDirectory,
  'required-previews'
)
const databasePath = path.join(libraryControlDirectory, 'library.sqlite')

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

interface IdentityOverrides {
  designAssetIdentity?: string
  promotionLinkIdentity?: string
}

function createIdentityAllocator(
  fixture: string,
  overrides: IdentityOverrides = {}
): (kind: CaptureIdentityKind) => string {
  const counters = new Map<CaptureIdentityKind, number>()
  return (kind) => {
    if (kind === 'design-asset' && overrides.designAssetIdentity) {
      return overrides.designAssetIdentity
    }
    if (kind === 'promotion-link' && overrides.promotionLinkIdentity) {
      return overrides.promotionLinkIdentity
    }
    const next = (counters.get(kind) ?? 0) + 1
    counters.set(kind, next)
    return `${kind}-${fixture}-${next}`
  }
}

function createFixtureWorkflow(
  database: Database.Database,
  fixture: string,
  overrides: IdentityOverrides = {}
) {
  return createAddAssetsWorkflow({
    selectLocalFiles: async () => ({
      kind: 'selected',
      files: [{ filePath: sourcePath }]
    }),
    resolveActiveLibrary: async () => ({
      identity: 'library-sqlite-fixture',
      generation: 'library-generation-1',
      libraryRootDirectory: libraryRoot,
      managedOriginalsDirectory,
      intakeStagingDirectory,
      requiredPreviewsDirectory
    }),
    persistence: createSqliteCapturePersistenceAdapter(database),
    generateSystemPreview: async ({
      candidateIdentity,
      sourceGeneration,
      managedOriginalPath,
      activeLibrary
    }) => {
      await fs.mkdir(activeLibrary.requiredPreviewsDirectory, {
        recursive: true
      })
      const gridThumbnailPath = path.join(
        activeLibrary.requiredPreviewsDirectory,
        `${candidateIdentity}.png`
      )
      await fs.copyFile(managedOriginalPath, gridThumbnailPath)
      return {
        kind: 'ready',
        previewGenerationIdentity: `preview-generation-${candidateIdentity}`,
        gridThumbnailRef: `preview:${candidateIdentity}`,
        gridThumbnailPath,
        evidence: { sourceGeneration, format: 'png' }
      }
    },
    createIdentity: createIdentityAllocator(fixture, overrides)
  })
}

async function prepareAndDispatch(
  database: Database.Database,
  fixture: string,
  overrides: IdentityOverrides = {}
) {
  const workflow = createFixtureWorkflow(database, fixture, overrides)
  const prepared = await workflow.prepare()
  assert.equal(prepared.kind, 'planned')
  if (prepared.kind !== 'planned') throw new Error('Expected a Copy Plan')

  const confirmed = await workflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: prepared.plan.receipt
  })
  return { workflow, prepared, confirmed }
}

let database: Database.Database | undefined
try {
  await fs.mkdir(sourceDirectory, { recursive: true })
  // Library Open owns this directory and its database connection in the
  // target composition. The Capture Intake Adapter receives that connection.
  await fs.mkdir(libraryControlDirectory, { recursive: true })
  await fs.writeFile(sourcePath, sourceBytes)

  database = new Database(databasePath)
  const workflow = createFixtureWorkflow(database, 'restart', {
    designAssetIdentity: 'design-asset-restart-proof',
    promotionLinkIdentity: 'promotion-link-shared'
  })

  // Schema installation happens at Adapter composition time. Planning itself
  // creates no observable durable Capture state or managed directories.
  const prepared = await workflow.prepare()
  assert.equal(prepared.kind, 'planned')
  if (prepared.kind !== 'planned') throw new Error('Expected a Copy Plan')
  await assert.rejects(
    workflow.inspect({ batchIdentity: 'capture-batch-restart-1' }),
    (error: unknown) =>
      error instanceof CaptureIntakeError &&
      error.code === 'capture-batch-not-found'
  )
  await assert.rejects(fs.access(managedOriginalsDirectory))
  await assert.rejects(fs.access(intakeStagingDirectory))
  await assert.rejects(fs.access(requiredPreviewsDirectory))

  const confirmed = await workflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: prepared.plan.receipt
  })
  assert.equal(confirmed.state, 'complete')
  assert.equal(confirmed.items[0]?.state, 'promoted')
  if (confirmed.items[0]?.state !== 'promoted') {
    throw new Error('Expected a promoted item')
  }
  assert.equal(confirmed.items[0].candidate.state, 'promoted')
  assert.equal(
    confirmed.items[0].promotion.designAssetIdentity,
    'design-asset-restart-proof'
  )
  assert.equal(
    confirmed.items[0].promotion.promotionLinkIdentity,
    'promotion-link-shared'
  )
  assert.equal(JSON.stringify(confirmed).includes(testRoot), false)
  assert.deepEqual(await fs.readFile(sourcePath), sourceBytes)
  assert.equal((await fs.readdir(requiredPreviewsDirectory)).length, 1)

  const replayed = await workflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: prepared.plan.receipt
  })
  assert.deepEqual(replayed, confirmed)
  assert.equal(
    (await fs.readdir(path.join(managedOriginalsDirectory, 'bucket-0001'))).length,
    1
  )

  database.close()
  database = undefined
  database = new Database(databasePath)
  const reopenedWorkflow = createFixtureWorkflow(database, 'reopened')
  const reopenedSnapshot = await reopenedWorkflow.inspect({
    batchIdentity: confirmed.batchIdentity
  })
  assert.deepEqual(reopenedSnapshot, confirmed)

  // Force the final Promotion Link identity to collide. The attempted Asset,
  // preview-ready state, and Promotion Link must roll back together, while the
  // already committed Candidate Artifact remains an Active Candidate.
  const rollbackAssetIdentity = 'design-asset-rollback-probe'
  const failingWorkflow = createFixtureWorkflow(database, 'collision', {
    designAssetIdentity: rollbackAssetIdentity,
    promotionLinkIdentity: 'promotion-link-shared'
  })
  const failingPlan = await failingWorkflow.prepare()
  assert.equal(failingPlan.kind, 'planned')
  if (failingPlan.kind !== 'planned') throw new Error('Expected collision plan')
  await assert.rejects(
    failingWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: failingPlan.plan.receipt
    }),
    (error: unknown) =>
      error instanceof CaptureIntakeError &&
      error.code === 'capture-transition-conflict' &&
      error.message ===
        'The requested Candidate lifecycle transition is not valid.'
  )
  const afterCollision = await failingWorkflow.inspect({
    batchIdentity: 'capture-batch-collision-1'
  })
  assert.equal(afterCollision.state, 'running')
  assert.equal(afterCollision.items[0]?.state, 'active')
  if (afterCollision.items[0]?.state !== 'active') {
    throw new Error('Expected Promotion rollback to retain an Active Candidate')
  }
  assert.equal(afterCollision.items[0].preview.state, 'pending')

  // Reusing the rolled-back Design Asset identity with a fresh Promotion Link
  // succeeds, proving no partial Asset row survived the failed transaction.
  const recovered = await prepareAndDispatch(database, 'after-rollback', {
    designAssetIdentity: rollbackAssetIdentity,
    promotionLinkIdentity: 'promotion-link-after-rollback'
  })
  assert.equal(recovered.confirmed.state, 'complete')
  assert.equal(recovered.confirmed.items[0]?.state, 'promoted')
  assert.deepEqual(await fs.readFile(sourcePath), sourceBytes)

  const unavailableWorkflow = createFixtureWorkflow(database, 'unavailable')
  database.close()
  database = undefined
  await assert.rejects(
    unavailableWorkflow.inspect({ batchIdentity: confirmed.batchIdentity }),
    (error: unknown) =>
      error instanceof CaptureIntakeError &&
      error.code === 'capture-persistence-unavailable' &&
      error.message === 'Capture state is temporarily unavailable.' &&
      !error.message.includes(testRoot)
  )

  console.log('capture-intake-sqlite-persistence passed')
} finally {
  database?.close()
  await fs.rm(testRoot, { recursive: true, force: true })
}
