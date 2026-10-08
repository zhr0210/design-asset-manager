import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import Database from 'better-sqlite3'
import sharp from 'sharp'

import { createActiveLibraryHost, type ActiveLibraryHostDependencies } from '../src/main/library-lifecycle'
import { createSqliteCapturePersistenceAdapter } from '../src/main/capture-intake/sqlite-capture-persistence.adapter'
import { initializeSqliteAssetTrashSchema } from '../src/main/library-lifecycle/sqlite-asset-trash.schema'
import { initializeCaptureIntakeSchema } from '../src/main/db/schema'
import type { LibraryCreationQualificationInput } from '../src/main/library-lifecycle/library-creation-planner.tracer'
import type { LibraryOpenQualificationInput } from '../src/main/library-lifecycle/library-open-inspection.tracer'

const testRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-active-library-host-')))
const sourceDirectory = path.join(testRoot, 'sources')
const targetDirectory = path.join(testRoot, 'library')
const nonEmptyTarget = path.join(testRoot, 'non-empty-library')
await fs.mkdir(sourceDirectory)
await fs.mkdir(nonEmptyTarget)
await fs.writeFile(path.join(nonEmptyTarget, 'sentinel.txt'), 'existing user file')

const sourcePaths = [
  path.join(sourceDirectory, 'generated.png'),
  path.join(sourceDirectory, 'generated.jpg'),
  path.join(sourceDirectory, 'generated.webp')
]
const generatedImage = sharp({ create: { width: 32, height: 24, channels: 4, background: { r: 30, g: 100, b: 220, alpha: 1 } } })
await generatedImage.clone().png().toFile(sourcePaths[0])
await generatedImage.clone().jpeg().toFile(sourcePaths[1])
await generatedImage.clone().webp().toFile(sourcePaths[2])
const sourceDigestsBefore = await Promise.all(sourcePaths.map(digest))

let selectedLibrary = targetDirectory
let holdLocalSelection: Promise<void> | undefined
let releaseLocalSelection: (() => void) | undefined
let localSelectionEntered = false
let holdLibrarySelection: Promise<void> | undefined
let releaseLibrarySelection: (() => void) | undefined
let librarySelectionEntered = false
const dependencies: ActiveLibraryHostDependencies = {
  selectLibraryDirectory: async () => {
    librarySelectionEntered = true
    if (holdLibrarySelection) await holdLibrarySelection
    return { kind: 'selected', directory: selectedLibrary }
  },
  selectLocalFiles: async () => {
    localSelectionEntered = true
    if (holdLocalSelection) await holdLocalSelection
    return { kind: 'selected', files: sourcePaths.map((filePath) => ({ filePath })) }
  },
  targetPlatform: {
    platform: process.platform,
    targetNameIsSupported: (name) => name.length > 0 && !name.startsWith('.'),
    inspectAccess: async () => 'read-write'
  },
  creationQualification: {
    inspect: (input: LibraryCreationQualificationInput) => ({
      targetGeneration: input.targetGeneration,
      qualificationGeneration: 'qualification:synthetic-1',
      filesystem: {
        kind: 'qualified', scopeIdentity: input.scopeIdentity,
        maxComponentUtf8Bytes: 255, maxCompletePathUtf16Units: 4096,
        atomicReplace: 'qualified', durableCommit: 'qualified', mountBoundary: 'qualified'
      },
      access: { kind: 'read-write', scopeIdentity: input.accessScopeIdentity },
      exclusiveLock: 'qualified',
      capacity: { availableBytes: 1024 * 1024 * 1024, requiredBytes: 1, safetyReserveBytes: 1 }
    })
  },
  openQualification: {
    inspect: (input: LibraryOpenQualificationInput) => ({
      inspectionIdentity: input.inspectionIdentity,
      generation: input.generation,
      filesystem: {
        kind: 'qualified', scopeIdentity: input.scopeIdentity,
        maxComponentUtf8Bytes: 255, maxCompletePathUtf16Units: 4096,
        atomicReplace: 'qualified', durableCommit: 'qualified', mountBoundary: 'qualified'
      },
      access: 'read-write', lock: 'available'
    })
  }
}

function hostErrorCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined
}

async function digest(filePath: string): Promise<string> {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
}

async function exists(filePath: string): Promise<boolean> {
  try { await fs.access(filePath); return true } catch { return false }
}

async function promotionLifecycleSinkRollsBackTheWholeTransaction(): Promise<void> {
  const database = new Database(':memory:')
  try {
    initializeCaptureIntakeSchema(database)
    initializeSqliteAssetTrashSchema(database)
    const persistence = createSqliteCapturePersistenceAdapter(database, {
      promotionLifecycle: {
        registerPromotedAsset: () => { throw new Error('injected lifecycle failure') }
      }
    })
    const input = {
      batchIdentity: 'batch:rollback',
      activeLibraryIdentity: 'library:rollback',
      items: [{
        planItemIdentity: 'plan-item:rollback',
        captureRequestIdentity: 'capture-request:rollback',
        candidateIdentity: 'candidate:rollback',
        originalStorageObjectIdentity: 'original-storage-object:rollback',
        canonicalEnvelopeDigest: 'digest:rollback',
        captureMethod: 'copy-into-library' as const,
        receivedFileName: 'rollback.png',
        sourceBytes: 12,
        sourceGeneration: 'sha256:rollback',
        sourceLocatorDigest: 'locator:rollback',
        format: 'png' as const
      }]
    }
    await persistence.acceptOrReplay(input)
    await persistence.commitCandidateActivation({ captureRequestIdentity: 'capture-request:rollback', managedOriginalRef: 'managed-original:rollback' })
    await assert.rejects(
      persistence.commitReadyPromotion({
        captureRequestIdentity: 'capture-request:rollback',
        previewGenerationIdentity: 'preview-generation:rollback',
        gridThumbnailRef: 'preview:rollback',
        gridThumbnailPath: '/synthetic/preview.png',
        designAssetIdentity: 'design-asset:rollback',
        promotionLinkIdentity: 'promotion-link:rollback',
        managedOriginalPath: '/synthetic/original.png'
      }),
      (error) => error && typeof error === 'object' && 'code' in error && error.code === 'capture-persistence-unavailable'
    )
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM assets').get<{ count: number }>()?.count, 0)
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM promotion_links').get<{ count: number }>()?.count, 0)
    assert.equal(database.prepare("SELECT lifecycle_state AS state FROM asset_candidates WHERE candidate_identity = 'candidate:rollback'").get<{ state: string }>()?.state, 'active')
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM asset_lifecycle').get<{ count: number }>()?.count, 0)
  } finally {
    database.close()
  }
}

const host = createActiveLibraryHost(dependencies)
await promotionLifecycleSinkRollsBackTheWholeTransaction()
assert.deepEqual(host.inspect(), { state: 'unopened', identity: null, generation: null })

const bootstrapLossTarget = path.join(testRoot, 'bootstrap-loss')
let bootstrapLossLockPath = ''
const bootstrapLossHost = createActiveLibraryHost({
  ...dependencies,
  selectLibraryDirectory: async () => ({ kind: 'selected', directory: bootstrapLossTarget }),
  onBootstrapLocked: async (controlDirectory) => {
    bootstrapLossLockPath = path.join(controlDirectory, 'exclusive-library-lock.sqlite')
    if(process.platform==='win32'){
      // Windows denies renaming SQLite's open handle. Exercise an actual
      // physical claim change instead of mistaking EBUSY for lost authority.
      await assert.rejects(fs.rename(bootstrapLossLockPath, `${bootstrapLossLockPath}.lost`),(e)=>['EBUSY','EPERM','EACCES'].includes((e as NodeJS.ErrnoException).code??''))
      const prior=(await fs.stat(bootstrapLossLockPath)).mode
      await fs.chmod(bootstrapLossLockPath,0o444)
      assert.notEqual((await fs.stat(bootstrapLossLockPath)).mode,prior)
    }else await fs.rename(bootstrapLossLockPath, `${bootstrapLossLockPath}.lost`)
  }
})
const bootstrapLossPlan = await bootstrapLossHost.prepareCreate()
assert.equal(bootstrapLossPlan.kind, 'planned')
if (bootstrapLossPlan.kind !== 'planned') throw new Error('Expected a bootstrap-loss plan.')
await assert.rejects(bootstrapLossHost.confirmCreate(bootstrapLossPlan.plan.receipt), (error) => hostErrorCode(error) === 'library-recovery-required' || hostErrorCode(error) === 'library-lock-invalid')
const bootstrapLossDb = new Database(path.join(bootstrapLossTarget, '.dam', 'library.sqlite'))
assert.equal(bootstrapLossDb.prepare("SELECT COUNT(*) AS count FROM sqlite_schema WHERE type = 'table' AND name = 'assets'").get<{ count: number }>()?.count, 0)
bootstrapLossDb.close()
assert.equal(await exists(process.platform==='win32'?bootstrapLossLockPath:`${bootstrapLossLockPath}.lost`), true)
if(process.platform==='win32')await fs.chmod(bootstrapLossLockPath,0o666)

const appearsDuringConfirmTarget = path.join(testRoot, 'appears-during-confirm')
selectedLibrary = appearsDuringConfirmTarget
const appearsHost = createActiveLibraryHost(dependencies)
const appearsPlan = await appearsHost.prepareCreate()
assert.equal(appearsPlan.kind, 'planned')
await fs.mkdir(appearsDuringConfirmTarget)
await fs.writeFile(path.join(appearsDuringConfirmTarget, 'other-process.txt'), 'keep me')
if (appearsPlan.kind !== 'planned') throw new Error('Expected an appearance race plan.')
await assert.rejects(appearsHost.confirmCreate(appearsPlan.plan.receipt))
assert.equal(await fs.readFile(path.join(appearsDuringConfirmTarget, 'other-process.txt'), 'utf8'), 'keep me')

const concurrentTarget = path.join(testRoot, 'concurrent-create')
selectedLibrary = concurrentTarget
const concurrentHost = createActiveLibraryHost(dependencies)
const concurrentPlan = await concurrentHost.prepareCreate()
assert.equal(concurrentPlan.kind, 'planned')
if (concurrentPlan.kind !== 'planned') throw new Error('Expected a concurrent confirmation plan.')
const concurrentResults = await Promise.allSettled([
  concurrentHost.confirmCreate(concurrentPlan.plan.receipt),
  concurrentHost.confirmCreate(concurrentPlan.plan.receipt)
])
assert.equal(concurrentResults.filter((result) => result.status === 'fulfilled').length, 1)
assert.equal(concurrentResults.filter((result) => result.status === 'rejected').length, 1)
assert.equal(await exists(path.join(concurrentTarget, '.dam', 'library.sqlite')), true)
await concurrentHost.close()
selectedLibrary = targetDirectory

const tamperedTarget = path.join(testRoot, 'tampered-empty-target')
await fs.mkdir(tamperedTarget)
const tamperedHost = createActiveLibraryHost({
  ...dependencies,
  onCreationClaimed: async (rootDirectory) => {
    await fs.writeFile(path.join(rootDirectory, 'other-process.txt'), 'preserve this byte')
  }
})
selectedLibrary = tamperedTarget
const tamperedPlan = await tamperedHost.prepareCreate()
assert.equal(tamperedPlan.kind, 'planned')
if (tamperedPlan.kind !== 'planned') throw new Error('Expected a tampered-target plan.')
await assert.rejects(tamperedHost.confirmCreate(tamperedPlan.plan.receipt), (error) => hostErrorCode(error) === 'library-recovery-required')
assert.equal(await fs.readFile(path.join(tamperedTarget, 'other-process.txt'), 'utf8'), 'preserve this byte')
assert.equal(await exists(path.join(tamperedTarget, '.dam')), false)
selectedLibrary = targetDirectory

const parentBeforePlan = await fs.readdir(testRoot)
const planOutcome = await host.prepareCreate()
assert.equal(planOutcome.kind, 'planned')
if (planOutcome.kind !== 'planned') throw new Error('Expected a creation plan.')
assert.equal(planOutcome.plan.confirmable, true)
assert.deepEqual(await fs.readdir(testRoot), parentBeforePlan)
assert.equal(await exists(targetDirectory), false, 'Planning must not create target directories.')

const created = await host.confirmCreate(planOutcome.plan.receipt)
assert.equal(created.identity, planOutcome.plan.identity)
assert.equal(host.inspect().state, 'ready')
for (const directory of [path.join(targetDirectory, '.dam'), path.join(targetDirectory, 'Originals'), path.join(targetDirectory, '.dam', 'required-previews'), path.join(targetDirectory, '.dam', 'intake-staging')]) assert.equal(await exists(directory), true)
assert.equal((await host.listAssets()).length, 0)
assert.equal((await host.listTags()).length, 0)

selectedLibrary = nonEmptyTarget
const nonEmptyHost = createActiveLibraryHost(dependencies)
await assert.rejects(nonEmptyHost.prepareCreate(), (error) => hostErrorCode(error) === 'library-target-not-empty')
assert.equal(await fs.readFile(path.join(nonEmptyTarget, 'sentinel.txt'), 'utf8'), 'existing user file')
selectedLibrary = targetDirectory

const capturePlan = await host.prepareAddAssets()
assert.equal(capturePlan.kind, 'planned')
if (capturePlan.kind !== 'planned') throw new Error('Expected a Copy Plan.')
const promoted = await host.dispatchAddAssets(capturePlan.plan.receipt)
assert.equal(promoted.state, 'complete')
assert.equal(promoted.items.length, 3)
assert.ok(promoted.items.every((item) => item.state === 'promoted'))
assert.deepEqual(await Promise.all(sourcePaths.map(digest)), sourceDigestsBefore, 'Copy must preserve source bytes.')
const managedFiles = await fs.readdir(path.join(targetDirectory, 'Originals', 'bucket-0001'))
const previewFiles = await fs.readdir(path.join(targetDirectory, '.dam', 'required-previews'))
assert.equal(managedFiles.length, 3)
assert.equal(previewFiles.length, 3)
assert.ok(managedFiles.every((fileName) => !previewFiles.includes(fileName)))
assert.ok(previewFiles.every((fileName) => !fileName.includes(':')), 'Preview filesystem names must be OS-safe.')
const previewFormats = await Promise.all(previewFiles.map(async (fileName) =>
  (await sharp(path.join(targetDirectory, '.dam', 'required-previews', fileName)).metadata()).format
))
assert.deepEqual(new Set(previewFormats), new Set(['png', 'jpeg', 'webp']))
assert.equal((await host.listAssets()).length, 3)
const asset = (await host.listAssets())[0]
assert.match(asset.thumbnailRef, /^preview:/u)

const tag = await host.createTag({ name: 'blue', type: 'color' })
await host.addTagToAsset(asset.id, tag.id)
assert.deepEqual((await host.listAssets())[0].tags, ['blue'])
assert.equal((await host.listTags())[0].usageCount, 1)
const activeTrash = await host.inspectTrash(asset.id)
assert.equal((await host.listTrash()).length, 0)
const previewBytes = await host.readPreview(asset.id)
assert.ok(previewBytes.byteLength > 0)
const previewDirectory = path.join(targetDirectory, '.dam', 'required-previews')
const previewDirectoryBackup = path.join(targetDirectory, '.dam', 'required-previews-backup')
const previewOutside = path.join(testRoot, 'preview-outside')
await fs.mkdir(previewOutside)
await fs.rename(previewDirectory, previewDirectoryBackup)
await fs.symlink(previewOutside, previewDirectory)
await assert.rejects(host.readPreview(asset.id))
await fs.unlink(previewDirectory)
await fs.rename(previewDirectoryBackup, previewDirectory)
assert.ok((await host.readPreview(asset.id)).byteLength > 0)
const trashPlan = await host.prepareTrash({ designAssetIdentity: asset.id, expectedRevision: activeTrash.revision })
const trashed = await host.dispatchTrash({ kind: 'confirm-plan', planReceipt: trashPlan.plan.receipt })
assert.equal(trashed.state, 'trash')
assert.equal((await host.listAssets()).length, 2)
assert.equal((await host.listTrash()).length, 1)
assert.equal((await host.listTags())[0].usageCount, 0)
const restored = await host.dispatchTrash({ kind: 'restore-design-asset', designAssetIdentity: asset.id, expectedRevision: trashed.revision })
assert.equal(restored.state, 'active')
assert.equal((await host.listTrash()).length, 0)
assert.equal((await host.listTags())[0].usageCount, 1)
assert.deepEqual((await host.listAssets()).find((item) => item.id === asset.id)?.tags, ['blue'], 'Restore must retain Tag relationships.')
assert.deepEqual(await host.dispatchAddAssets(capturePlan.plan.receipt), promoted, 'Duplicate confirmation must replay without a second Asset.')
assert.equal((await host.listAssets()).length, 3)

// A close drains an in-flight Main operation before releasing the real lock.
let releaseCloseObserved = false
localSelectionEntered = false
holdLocalSelection = new Promise<void>((resolve) => { releaseLocalSelection = resolve })
const pendingPrepare = host.prepareAddAssets()
for (let attempt = 0; !localSelectionEntered && attempt < 100; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5))
assert.equal(localSelectionEntered, true)
const closePromise = host.close().then(() => { releaseCloseObserved = true })
await new Promise((resolve) => setTimeout(resolve, 20))
assert.equal(releaseCloseObserved, false)
releaseLocalSelection!()
await pendingPrepare
await closePromise
holdLocalSelection = undefined
assert.equal(host.inspect().state, 'closed')

// Lifecycle operations are serialized: close waits for an opening selection,
// and a reentrant open is rejected after the first open owns the lease.
const openingHost = createActiveLibraryHost(dependencies)
librarySelectionEntered = false
holdLibrarySelection = new Promise<void>((resolve) => { releaseLibrarySelection = resolve })
const opening = openingHost.open()
for (let attempt = 0; !librarySelectionEntered && attempt < 100; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5))
assert.equal(librarySelectionEntered, true)
const reentrantOpen = openingHost.open()
let openingCloseObserved = false
const openingClose = openingHost.close().then(() => { openingCloseObserved = true })
await new Promise((resolve) => setTimeout(resolve, 20))
assert.equal(openingCloseObserved, false)
releaseLibrarySelection!()
await opening
await assert.rejects(reentrantOpen)
await openingClose
holdLibrarySelection = undefined
assert.equal(openingHost.inspect().state, 'closed')

// Reopen the same library and reject a receipt created under a new generation.
const controlDbPath = path.join(targetDirectory, '.dam', 'library.sqlite')
const lockDbPath = path.join(targetDirectory, '.dam', 'exclusive-library-lock.sqlite')
const controlDb = new Database(controlDbPath)
controlDb.prepare("UPDATE library_control_identity SET library_generation = 'generation:reopened'").run()
controlDb.close()
const lockDb = new Database(lockDbPath)
lockDb.prepare("UPDATE library_lock_identity SET library_generation = 'generation:reopened'").run()
lockDb.close()
await host.reopen()
assert.equal(host.inspect().generation, 'generation:reopened')
await assert.rejects(host.dispatchAddAssets(capturePlan.plan.receipt), (error) => hostErrorCode(error) === 'library-generation-conflict')

await host.close()
await host.reopen()
const triggerDb = new Database(controlDbPath)
triggerDb.exec("CREATE TRIGGER unexpected_asset_trigger AFTER INSERT ON assets BEGIN SELECT 1; END")
triggerDb.close()
await host.close()
await assert.rejects(host.reopen(), (error) => hostErrorCode(error) === 'library-recovery-required' || hostErrorCode(error) === 'library-schema-invalid')
const triggerCleanupDb = new Database(controlDbPath)
triggerCleanupDb.exec('DROP TRIGGER unexpected_asset_trigger')
triggerCleanupDb.close()
await host.reopen()
assert.equal(host.inspect().state, 'ready')

if(process.platform==='win32')await fs.chmod(lockDbPath,0o444)
else await fs.rename(lockDbPath, `${lockDbPath}.lost`)
await assert.rejects(host.listAssets(), (error) => hostErrorCode(error) === 'library-lock-invalid')
assert.equal(host.inspect().state, 'recovery-required')
await assert.rejects(host.listAssets(), (error) => hostErrorCode(error) === 'library-recovery-required')
await host.close()
if(process.platform==='win32')await fs.chmod(lockDbPath,0o666)
else await fs.rename(`${lockDbPath}.lost`, lockDbPath)

const manifestPath = path.join(targetDirectory, '.dam', 'library.manifest.json')
const manifestBefore = await fs.readFile(manifestPath)
await fs.writeFile(manifestPath, '{"broken":true}')
await assert.rejects(host.reopen(), (error) => hostErrorCode(error) === 'library-recovery-required')
await fs.writeFile(manifestPath, manifestBefore)
const schemaDb = new Database(controlDbPath)
schemaDb.exec('DROP TABLE tags; CREATE TABLE tags (id TEXT PRIMARY KEY)')
schemaDb.close()
await assert.rejects(host.reopen(), (error) => hostErrorCode(error) === 'library-recovery-required' || hostErrorCode(error) === 'library-schema-invalid')

// Real lock loss is fail-closed; this test only mutates the generated fixture.
console.log(`Active Library Host checks passed in ${testRoot}`)
