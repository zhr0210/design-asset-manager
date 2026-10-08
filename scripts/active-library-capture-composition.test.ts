import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

import Database from 'better-sqlite3'

import type { CaptureIdentityKind } from '../src/main/capture-intake'
import {
  ActiveLibrarySessionError,
  createActiveLibraryCaptureWorkflow,
  createActiveLibrarySession,
  type ExclusiveLibraryLockLease,
  type ExclusiveLibraryLockRunResult,
  type ExclusiveLibraryLockSnapshot
} from '../src/main/library-lifecycle'

const testParent = path.join(process.cwd(), 'dist-temp', 'tests')
await fs.mkdir(testParent, { recursive: true })
const testRoot = await fs.mkdtemp(
  path.join(testParent, 'active-library-capture-')
)
const sourceDirectory = path.join(testRoot, 'external')
const sourcePath = path.join(sourceDirectory, 'source.png')
const libraryRoot = path.join(testRoot, 'library')
const controlDirectory = path.join(libraryRoot, '.control')
const originalsDirectory = path.join(libraryRoot, 'Originals')
const stagingDirectory = path.join(controlDirectory, 'intake-staging')
const previewsDirectory = path.join(controlDirectory, 'required-previews')
const databasePath = path.join(controlDirectory, 'library.sqlite')

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

function createIdentityAllocator(): (kind: CaptureIdentityKind) => string {
  const counters = new Map<CaptureIdentityKind, number>()
  return (kind) => {
    const next = (counters.get(kind) ?? 0) + 1
    counters.set(kind, next)
    return `${kind}-session-${next}`
  }
}

let database: Database.Database | undefined
try {
  await Promise.all([
    fs.mkdir(sourceDirectory, { recursive: true }),
    fs.mkdir(originalsDirectory, { recursive: true }),
    fs.mkdir(stagingDirectory, { recursive: true }),
    fs.mkdir(previewsDirectory, { recursive: true })
  ])
  await fs.writeFile(sourcePath, sourceBytes)
  database = new Database(databasePath)

  const storage = {
    libraryRootDirectory: libraryRoot,
    libraryControlDirectory: controlDirectory,
    managedOriginalsDirectory: originalsDirectory,
    intakeStagingDirectory: stagingDirectory,
    requiredPreviewsDirectory: previewsDirectory
  }
  const lockSnapshot: ExclusiveLibraryLockSnapshot = {
    libraryIdentity: 'library-capture',
    libraryGeneration: 'generation-1',
    leaseIdentity: 'lease-capture-1',
    state: 'held'
  }
  let activeOperations = 0
  let releaseRequested = false
  const lock: ExclusiveLibraryLockLease = {
    inspect: () => ({ ...lockSnapshot }),
    async runWhileHeld<T>(
      operation: () => Promise<T>
    ): Promise<ExclusiveLibraryLockRunResult<T>> {
      if (lockSnapshot.state !== 'held') return { kind: 'unavailable' }
      activeOperations += 1
      try {
        return { kind: 'completed', value: await operation() }
      } finally {
        activeOperations -= 1
        if (activeOperations === 0 && releaseRequested) {
          lockSnapshot.state = 'lost'
        }
      }
    }
  }
  const requestLockRelease = (): void => {
    if (activeOperations > 0) {
      releaseRequested = true
    } else {
      lockSnapshot.state = 'lost'
    }
  }

  const session = createActiveLibrarySession({
    identity: 'library-capture',
    generation: 'generation-1',
    storage,
    database,
    lock
  })

  const captureDependencies = {
    selectLocalFiles: async () => ({
      kind: 'selected' as const,
      files: [{ filePath: sourcePath }]
    }),
    generateSystemPreview: async ({
      candidateIdentity,
      sourceGeneration,
      managedOriginalPath,
      activeLibrary
    }) => {
      const previewPath = path.join(
        activeLibrary.requiredPreviewsDirectory,
        `${candidateIdentity}.png`
      )
      await fs.copyFile(managedOriginalPath, previewPath)
      requestLockRelease()
      assert.equal(lockSnapshot.state, 'held')
      return {
        kind: 'ready' as const,
        previewGenerationIdentity: `preview-generation-${candidateIdentity}`,
        gridThumbnailRef: `preview:${candidateIdentity}`,
        gridThumbnailPath: previewPath,
        evidence: { sourceGeneration, format: 'png' }
      }
    },
    createIdentity: createIdentityAllocator()
  }
  const workflow = await createActiveLibraryCaptureWorkflow({
    session,
    ...captureDependencies
  })

  const prepared = await workflow.prepare()
  assert.equal(prepared.kind, 'planned')
  if (prepared.kind !== 'planned') throw new Error('Expected a Copy Plan')
  assert.deepEqual(prepared.plan.activeLibrary, {
    identity: 'library-capture',
    generation: 'generation-1'
  })
  assert.equal(JSON.stringify(prepared).includes(testRoot), false)

  const completed = await workflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: prepared.plan.receipt
  })
  assert.equal(completed.state, 'complete')
  assert.equal(completed.items[0]?.state, 'promoted')
  assert.equal(JSON.stringify(completed).includes(testRoot), false)
  assert.deepEqual(await fs.readFile(sourcePath), sourceBytes)
  assert.equal(lockSnapshot.state, 'lost')

  await assert.rejects(
    workflow.inspect({ batchIdentity: completed.batchIdentity }),
    (error: unknown) =>
      error instanceof ActiveLibrarySessionError &&
      error.code === 'library-lock-invalid' &&
      !error.message.includes(testRoot)
  )

  // A replacement Session may use a new lease only after the first guarded
  // operation has reached quiescence. The old workflow stays invalid.
  releaseRequested = false
  lockSnapshot.state = 'held'
  lockSnapshot.leaseIdentity = 'lease-capture-2'
  const replacementSession = createActiveLibrarySession({
    identity: 'library-capture',
    generation: 'generation-1',
    storage,
    database,
    lock
  })
  const replacementWorkflow = await createActiveLibraryCaptureWorkflow({
    session: replacementSession,
    ...captureDependencies
  })
  const inspected = await replacementWorkflow.inspect({
    batchIdentity: completed.batchIdentity
  })
  assert.deepEqual(inspected, completed)
  await assert.rejects(
    workflow.inspect({ batchIdentity: completed.batchIdentity }),
    (error: unknown) =>
      error instanceof ActiveLibrarySessionError &&
      error.code === 'library-lock-invalid'
  )

  database.close()
  database = undefined
  await assert.rejects(
    replacementWorkflow.inspect({ batchIdentity: completed.batchIdentity }),
    (error: unknown) =>
      error instanceof ActiveLibrarySessionError &&
      error.code === 'library-database-unavailable' &&
      !error.message.includes(testRoot)
  )

  console.log('active-library-capture-composition passed')
} finally {
  if (database?.open) database.close()
  await fs.rm(testRoot, { recursive: true, force: true })
}
