import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'
import { build } from 'esbuild'
import {readFrozenLibrarySource} from './fixtures/read-frozen-library-source'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { createExclusiveLibraryLockTracer } from '../src/main/library-lifecycle/exclusive-library-lock.tracer'
import { assertLibraryDataSchema } from '../src/main/library-lifecycle/library-materialization.internal'
import { inspectLibraryControlStore } from '../src/main/library-lifecycle/library-open-control-store.internal'
import { readLibraryManifestDeclaration } from '../src/main/library-lifecycle/library-manifest.tracer'
import { openReadonlyLibraryDatabase } from '../src/main/library-lifecycle/readonly-library-database.internal'
import { enableVisualAiStorage } from '../src/main/visual-ai/visual-ai-storage'
import { createVisualAdmission } from '../src/main/visual-ai/visual-admission'
import { enableDownloadJournal } from '../src/main/managed-download/download-journal.schema'
import { enableIntakeRecoveryStorage } from '../src/main/library-lifecycle/intake-recovery.schema'
import { enableNotebookStorage } from '../src/main/library-lifecycle/asset-notebook.schema'
import { enableOrganizationStorage } from '../src/main/library-lifecycle/library-organization.schema'
import { enableWorkSetStorage } from '../src/main/library-lifecycle/work-set.schema'
import { enableOcrStorage } from '../src/main/ocr/ocr.schema'
import type { TagIntentTestHooks } from '../src/main/independent-tags/tag-intent-backup'
import type { TagIntentCommit } from '../src/shared/contracts/independent-tag-intent.contract'

// Only owned generated inputs and the production dependency factory are used.
// The existing fault hooks expose real maintenance cuts; no backup storage or
// volume/native qualification adapter is replaced by this test.
const evidenceRoot = path.resolve('.scratch/wc01-close-12-20261005/production-tests', `run-${Date.now()}-${randomUUID()}`)
await fs.mkdir(evidenceRoot, { recursive: true })
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')
const tick = () => new Promise<void>(resolve => setImmediate(resolve))
const gates = () => {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}
let sequence = 0
await fs.writeFile(path.join(evidenceRoot, 'runtime.json'), JSON.stringify({
  platform: process.platform, architecture: process.arch, versions: process.versions,
  productPath: 'createActiveLibraryHost(createProductionActiveLibraryHostDependencies(dialog))',
  storageOverride: false, uriOverride: process.env.SQLITE_USE_URI ?? null,
  computerUse: 'NOT_RUN', data: 'owned-generated-only'
}, null, 2), { flag: 'wx' })

async function fixture(version = 1, hooks: TagIntentTestHooks = {}) {
  assert.equal(process.platform, 'win32')
  assert.equal(process.arch, 'x64')
  assert.notEqual(process.env.SQLITE_USE_URI, '1', 'Production qualification must not depend on the private URI test override')
  const temporary = await fs.realpath(os.tmpdir())
  const root = await fs.realpath(await fs.mkdtemp(path.join(temporary, 'dam-windows-production-')))
  const library = path.join(root, 'library'), source = path.join(root, 'generated.png')
  const admission = createVisualAdmission()
  let selectedFiles = [{ filePath: source }]
  await sharp({ create: { width: 48, height: 32, channels: 3, background: '#7799bb' } }).png().toFile(source)
  const sourceSha256 = digest(await fs.readFile(source))
  const host = createActiveLibraryHost({
    ...createProductionActiveLibraryHostDependencies({
      selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }),
      selectLocalFiles: async () => ({ kind: 'selected', files: selectedFiles })
    }, { admission }),
    tagIntentTestHooks: hooks
  })
  const control = path.join(library, '.dam'), file = path.join(control, 'library.sqlite')
  try {
    const create = await host.prepareCreate()
    if (create.kind !== 'planned') throw Error('Owned production library creation was not planned')
    await host.confirmCreate(create.plan.receipt)
    const add = await host.prepareAddAssets()
    if (add.kind !== 'planned') throw Error('Owned production Copy intake was not planned')
    await host.dispatchAddAssets(add.plan.receipt)
    const asset = (await host.listAssets())[0]
    assert.ok(asset)
    await host.updateAssetCaption(asset.id, 'User caption remains authoritative')
    const tag = await host.createTag({ name: 'User tag remains authoritative' })
    await host.addTagToAsset(asset.id, tag.id)
    if (version > 1) {
      await host.close()
      const database = new Database(file, { fileMustExist: true, timeout: 0 })
      try {
        const enable = [undefined, undefined, enableVisualAiStorage, enableDownloadJournal,
          enableIntakeRecoveryStorage, enableNotebookStorage, enableOrganizationStorage,
          enableWorkSetStorage, enableOcrStorage][version]
        if (!enable) throw Error('Unexpected owned historical schema setup')
        enable(database)
        assertLibraryDataSchema(database)
      } finally { database.close() }
      await host.reopen()
    }
    const projection = host.inspect()
    const libraryScope = { libraryIdentity: projection.identity!, generation: projection.generation! }
    const scope = { ...libraryScope, assetId: asset.id }
    const declaration = readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(control, 'library.manifest.json'))))
    if (declaration.kind !== 'compatible') throw Error('Owned production manifest is incompatible')
    const command = async (requestId = 'owned-windows-request'): Promise<TagIntentCommit> => {
      const current = await host.readTagIntentContext(scope)
      return { ...scope, sessionToken: current.sessionToken, expectedSchemaVersion: current.schemaVersion,
        requestId, assetRevision: asset.revision, previewGeneration: asset.thumbnailRef,
        backendId: 'synthetic-no-provider', model: 'synthetic-no-model', backendBindingSha256: 'a'.repeat(64),
        recipeId: 'independent-tags-v1', recipeVersion: '1', allowUpgrade: true }
    }
    const addGeneratedAsset = async () => {
      const generated = path.join(root, 'generated-second.png')
      await sharp({ create: { width: 49, height: 32, channels: 3, background: '#bb9977' } }).png().toFile(generated)
      selectedFiles = [{ filePath: generated }]
      const add = await host.prepareAddAssets()
      if (add.kind !== 'planned') throw Error('Additional owned Copy intake was not planned')
      await host.dispatchAddAssets(add.plan.receipt)
      return (await host.listAssets()).find(candidate => candidate.id !== asset.id)!
    }
    return { root, temporary, library, control, file, source, sourceSha256, host, hooks, asset, tag, admission,
      libraryScope, scope, declaration: declaration.declaration, command, addGeneratedAsset }
  } catch (error) {
    await host.close().catch(() => {})
    // Preserve failed setup data for an inspectable, owned recovery point.
    await fs.writeFile(path.join(evidenceRoot, `setup-${randomUUID()}.json`), JSON.stringify({ root, error: String(error) }, null, 2))
    throw error
  }
}
type Fixture = Awaited<ReturnType<typeof fixture>>

async function backupFiles(f: Fixture) {
  const parent = path.join(f.control, 'schema-backups')
  try {
    return (await fs.readdir(parent)).sort().map(name => path.join(parent, name, 'library.sqlite'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}
async function validateBackup(f: Fixture, file: string, expectedVersion: number) {
  const stat = await fs.lstat(file)
  assert.ok(stat.isFile() && !stat.isSymbolicLink())
  assert.equal(stat.nlink, 1)
  const bytes = await fs.readFile(file), database = new Database(file, { readonly: true, fileMustExist: true, timeout: 0 })
  try {
    database.pragma('foreign_keys = ON')
    database.pragma('query_only = ON')
    database.exec('BEGIN')
    assert.deepEqual(inspectLibraryControlStore(database, f.declaration), { kind: 'compatible', generation: f.scope.generation })
    assertLibraryDataSchema(database)
    assert.equal(database.pragma('user_version', { simple: true }), expectedVersion)
    assert.equal(database.pragma('quick_check(1)', { simple: true }), 'ok')
    assert.deepEqual(database.pragma('foreign_key_check'), [])
    assert.equal(database.prepare('SELECT ai_caption FROM assets WHERE id=?').pluck().get(f.asset.id), 'User caption remains authoritative')
    assert.equal(database.prepare('SELECT COUNT(*) FROM asset_tags WHERE asset_id=? AND tag_id=? AND status=\'confirmed\'').pluck().get(f.asset.id, f.tag.id), 1)
    return { bytes: bytes.length, sha256: digest(bytes), sourceSchemaVersion: expectedVersion }
  } finally { database.close() }
}
async function verifyCurrentUserState(f: Fixture) {
  assert.equal((await f.host.listAssets())[0].aiCaption, 'User caption remains authoritative')
  assert.ok((await f.host.listAssetTags(f.asset.id)).some(tag => tag.tagId === f.tag.id))
  assert.equal(digest(await fs.readFile(f.source)), f.sourceSha256, 'Copy never modifies the external generated Original')
}
async function runCase(name: string, version: number, operation: (f: Fixture) => Promise<void>, hooks: TagIntentTestHooks = {}) {
  const number = ++sequence
  await test(name, { timeout: 45000 }, async () => {
    const f = await fixture(version, hooks)
    let failure: unknown
    try { await operation(f) } catch (error) { failure = error }
    try { await f.host.close() } catch (error) { failure ??= error }
    try {
      assert.equal(f.admission.inspect().materialBytes, 0, 'Known helper physical close must return its exact shared-ledger reservation')
      assert.equal(f.admission.inspect().requests, 0)
    } catch (error) { failure ??= error }
    const evidence: Record<string, unknown> = { name, version, productFactory: true, storageOverride: false,
      outcome: failure ? 'FAIL' : 'PASS', error: failure ? String(failure) : null, root: f.root, backups: [], admission: f.admission.inspect() }
    try {
      const backupEvidence = []
      for (const file of await backupFiles(f)) {
        const bytes = await fs.readFile(file)
        const readonly = new Database(file, { readonly: true, fileMustExist: true, timeout: 0 })
        try { backupEvidence.push({ file, sha256: digest(bytes), bytes: bytes.length, version: readonly.pragma('user_version', { simple: true }) }) }
        finally { readonly.close() }
      }
      evidence.backups = backupEvidence
      evidence.sourceSha256 = digest(await fs.readFile(f.file))
    } catch (error) { evidence.inspectionError = String(error); failure ??= error; evidence.outcome = 'FAIL' }
    if (!failure) {
      assert.equal(path.dirname(await fs.realpath(f.root)), f.temporary)
      assert.ok(path.basename(f.root).startsWith('dam-windows-production-'))
      try { await fs.rm(f.root, { recursive: true, force: false }); evidence.cleanup = 'owned-root-removed' }
      catch (error) { evidence.cleanup = 'retained-close-or-owner-unknown'; failure = error; evidence.error = String(error); evidence.outcome = 'FAIL' }
    } else evidence.cleanup = 'failed-owned-root-retained'
    await fs.writeFile(path.join(evidenceRoot, `${String(number).padStart(2, '0')}.json`), JSON.stringify(evidence, null, 2), { flag: 'wx' })
    if (failure) throw failure
  })
}

for (let version = 1; version <= 8; version++) await runCase(`production Windows v${version}→9 creates a complete old-generation backup and survives reopen`, version, async f => {
  const command = await f.command()
  await assert.rejects(f.host.saveTagIntent({ ...command, allowUpgrade: false }), /TAG_INTENT_UPGRADE_REQUIRED/)
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, version)
  assert.equal((await f.host.saveTagIntent(command)).requestGeneration, 1)
  const backups = await backupFiles(f)
  assert.equal(backups.length, 1)
  await validateBackup(f, backups[0], version)
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, 9)
  await verifyCurrentUserState(f)
  await f.host.close(); await f.host.reopen()
  await verifyCurrentUserState(f)
  assert.equal((await f.host.readTagIntents(f.scope)).requests.length, 1)
  await assert.rejects(f.host.saveTagIntent(command), /TAG_INTENT_SESSION_EXPIRED/)
})

await runCase('production Windows execution, rejection, background plan and OCR permission each use the same verified backup boundary', 1, async f => {
  const intent = await f.command()
  await f.host.saveTagIntent(intent)
  let context = await f.host.readTagIntentContext(f.scope)
  await f.host.enableTagExecution({ ...f.scope, sessionToken: context.sessionToken, expectedSchemaVersion: 9, allowUpgrade: true })
  const claim = await f.host.claimTagExecution({ ...f.scope, sessionToken: context.sessionToken, requestId: intent.requestId, inputSha256: 'b'.repeat(64), origin: 'tags-only' })
  const ref = { ...f.scope, sessionToken: context.sessionToken, requestId: intent.requestId, attemptToken: claim.attemptToken }
  await f.host.markTagExecutionSent(ref)
  const receipt = await f.host.commitTagExecution({ ...ref, tags: ['Synthetic suggestion'] })
  assert.equal(receipt.historicalOnly, false)
  const current = await f.host.readTagExecution(f.scope)
  assert.ok(current.current)
  await f.host.decideTag({ ...f.scope, sessionToken: context.sessionToken, expectedSchemaVersion: 10,
    allowUpgrade: true, evidenceId: current.current.evidenceId, tag: 'Synthetic suggestion', decision: 'reject' })
  const background = await f.host.readBackgroundAnalysis(f.libraryScope)
  await f.host.configureBackgroundAnalysis({ ...f.libraryScope, sessionToken: background.sessionToken,
    expectedRevision: background.policy.revision, expectedSchemaVersion: 11, allowUpgrade: true,
    enabled: false, capabilities: { tags: true, caption: true, ocr: true } })
  const ocr = await f.host.readBackgroundOcr(f.libraryScope)
  await f.host.configureBackgroundOcr({ ...f.libraryScope, sessionToken: ocr.sessionToken,
    expectedRevision: ocr.permissionRevision, expectedSchemaVersion: 12, allowUpgrade: true,
    enabled: false, runtimeFingerprint: 'synthetic-unqualified-runtime' })
  const backups = await backupFiles(f)
  assert.equal(backups.length, 5)
  const versions = []
  for (const file of backups) {
    const db = new Database(file, { readonly: true, fileMustExist: true })
    let version: number
    try { version = Number(db.pragma('user_version', { simple: true })) } finally { db.close() }
    await validateBackup(f, file, version)
    versions.push(version)
  }
  assert.deepEqual(versions.sort((a, b) => a - b), [1, 9, 10, 11, 12])
  assert.equal((await f.host.readBackgroundOcr(f.libraryScope)).authorized, false)
  context = await f.host.readTagIntentContext(f.scope)
  assert.equal(context.schemaVersion, 13)
  await verifyCurrentUserState(f)
  await f.host.close(); await f.host.reopen()
  assert.equal((await f.host.readBackgroundOcr(f.libraryScope)).authorized, false)
  assert.deepEqual((await f.host.readTagExecution(f.scope)).current!.tags, [])
  await verifyCurrentUserState(f)
})

await runCase('production Windows batch intent upgrades once and atomically preserves both selected assets', 1, async f => {
  const second = await f.addGeneratedAsset(), command = await f.command('owned-windows-batch')
  assert.ok(second)
  const batch = { ...command, forceRerun: false, items: [f.asset, second].map(asset => ({
    assetId: asset.id, assetRevision: asset.revision, previewGeneration: asset.thumbnailRef
  })) }
  const saved = await f.host.saveTagBatch(batch)
  assert.equal(saved.items.length, 2)
  assert.equal((await f.host.saveTagBatch(batch)).requestId, saved.requestId)
  const backups = await backupFiles(f)
  assert.equal(backups.length, 1)
  await validateBackup(f, backups[0], 1)
  const readonly = new Database(backups[0], { readonly: true, fileMustExist: true })
  try { assert.equal(readonly.prepare('SELECT COUNT(*) FROM assets').pluck().get(), 2) }
  finally { readonly.close() }
  await f.host.close(); await f.host.reopen()
  for (const asset of [f.asset, second]) assert.equal((await f.host.readTagIntents({ ...f.libraryScope, assetId: asset.id })).requests.length, 1)
})

for (const cut of ['space-before-backup', 'space-before-ddl', 'after-ddl', 'before-commit', 'growth-cap'] as const) {
  let measurements = 0, reachedCut = 0
  const hooks: TagIntentTestHooks = cut === 'space-before-backup' ? { availableBytes: async () => { measurements++; return 0n } }
    : cut === 'space-before-ddl' ? { availableBytes: async () => ++measurements === 1 ? 2n ** 60n : 0n }
      : cut === 'after-ddl' ? { afterDdl: () => { reachedCut++; throw Error('Owned DDL fault') } }
        : cut === 'before-commit' ? { beforeCommit: () => { reachedCut++; throw Error('Owned COMMIT fault') } }
          : { growthLimitBytes: 0, afterBackup: async () => { reachedCut++ } }
  await runCase(`production Windows ${cut} cannot partially upgrade or persist an intent`, 1, async f => {
    await assert.rejects(f.host.saveTagIntent(await f.command()))
    if (cut === 'space-before-backup') assert.equal(measurements, 1, 'The real measured capacity gate must be reached')
    else if (cut === 'space-before-ddl') assert.equal(measurements, 2, 'Both capacity cuts must be reached')
    else assert.equal(reachedCut, 1, 'An earlier platform refusal is not evidence for this fault cut')
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, 1)
    assert.equal((await f.host.readTagIntents(f.scope)).requests.length, 0)
    if (cut === 'space-before-backup') assert.equal((await backupFiles(f)).length, 0)
    else {
      const files = await backupFiles(f)
      assert.equal(files.length, 1, 'The verified backup must exist before this later cut')
      for (const file of files) await validateBackup(f, file, 1)
    }
    await verifyCurrentUserState(f)
    await f.host.close(); await f.host.reopen()
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, 1)
    await verifyCurrentUserState(f)
  }, hooks)
}

await runCase('production Windows cancellation after verified backup leaves source v1 and a complete backup', 1, async f => {
  const abort = new AbortController()
  f.hooks.afterBackup = async () => { abort.abort() }
  await assert.rejects(f.host.saveTagIntent(await f.command(), abort.signal), /TAG_INTENT_SESSION_EXPIRED|TAG_INTENT_SCOPE_EXPIRED/)
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, 1)
  const backups = await backupFiles(f)
  assert.equal(backups.length, 1)
  await validateBackup(f, backups[0], 1)
})

await runCase('production Windows lost postcommit ACK resolves the exact request without a second effect or backup', 1, async f => {
  let once = true
  f.hooks.afterCommit = () => { if (once) { once = false; throw Error('Owned lost ACK') } }
  const command = await f.command()
  await assert.rejects(f.host.saveTagIntent(command), /TAG_INTENT_ACK_UNCERTAIN/)
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, 9)
  assert.equal((await f.host.saveTagIntent(command)).requestGeneration, 1)
  await assert.rejects(f.host.saveTagIntent({ ...command, model: 'changed-payload' }), /TAG_INTENT_REQUEST_CONFLICT/)
  assert.equal((await f.host.readTagIntents(f.scope)).requests.length, 1)
  const backups = await backupFiles(f)
  assert.equal(backups.length, 1)
  await validateBackup(f, backups[0], 1)
  await f.host.close(); await f.host.reopen()
  assert.equal((await f.host.readTagIntents(f.scope)).requests.length, 1)
})

await runCase('production Windows HELD retains the actual lease, denies interleaved writes and drains before queued close', 1, async f => {
  const held = gates(), release = gates()
  f.hooks.afterBackup = async () => { held.resolve(); await release.promise }
  const saving = f.host.saveTagIntent(await f.command())
  void saving.catch(() => {})
  try {
    await Promise.race([held.promise, saving.then(() => { throw Error('Maintenance finished before the HELD cut') })])
    const competing = createExclusiveLibraryLockTracer({ controlDirectory: f.control,
      libraryIdentity: f.scope.libraryIdentity, libraryGeneration: f.scope.generation })
    assert.equal((await competing.acquire()).kind, 'busy')
    await assert.rejects(f.host.updateAssetCaption(f.asset.id, 'Must not interleave'), { code: 'library-quiescing' })
    const parent = path.join(f.control, 'schema-backups')
    await assert.rejects(fs.rename(parent, `${parent}-moved`), { code: 'EBUSY' })
    let closed = false
    const closing = f.host.close().then(() => { closed = true })
    await tick()
    assert.equal(closed, false)
    release.resolve()
    await saving; await closing
    await f.host.reopen()
    assert.equal((await f.host.readTagIntents(f.scope)).requests.length, 1)
    await verifyCurrentUserState(f)
  } finally { release.resolve(); await saving.catch(() => {}) }
})

await runCase('production Windows source drift at the verified cut refuses DDL instead of accepting a stale snapshot', 1, async f => {
  f.hooks.afterBackup = async () => {
    const external = new Database(f.file, { fileMustExist: true, timeout: 0 })
    try { external.prepare('UPDATE assets SET ai_caption=? WHERE id=?').run('Owned source drift', f.asset.id) }
    finally { external.close() }
  }
  await assert.rejects(f.host.saveTagIntent(await f.command()), /TAG_INTENT_SOURCE_CHANGED|BACKUP_SOURCE_CHANGED/)
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, 1)
  assert.equal((await f.host.readTagIntents(f.scope)).requests.length, 0)
  assert.equal((await f.host.listAssets())[0].aiCaption, 'Owned source drift')
  const backups = await backupFiles(f)
  assert.equal(backups.length, 1)
  await validateBackup(f, backups[0], 1)
})

await runCase('production Windows borrows the sole existing controller hold without reopening its resource admission', 1, async f => {
  const controllerHold = f.admission.hold()
  try {
    assert.equal(f.admission.inspect().accepting, false)
    await f.host.saveTagIntent(await f.command())
    assert.equal(f.admission.inspect().materialBytes, 0)
    assert.equal(f.admission.inspect().accepting, false, 'The backup borrower cannot release the owning controller hold')
    await assert.rejects(f.admission.reserveOcr(1024, new AbortController().signal), /VISUAL_ADMISSION_SUSPENDED/)
  } finally { controllerHold() }
  assert.equal(f.admission.inspect().accepting, true)
})

await runCase('production Windows two independent holds refuse backup before writes and keep both barriers effective', 1, async f => {
  const first = f.admission.hold(), second = f.admission.hold()
  try {
    await assert.rejects(f.host.saveTagIntent(await f.command()))
    assert.equal((await backupFiles(f)).length, 0)
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, 1)
    assert.equal(f.admission.inspect().materialBytes, 0)
    first()
    assert.equal(f.admission.inspect().accepting, false)
  } finally { first(); second() }
  assert.equal(f.admission.inspect().accepting, true)
  await f.host.saveTagIntent(await f.command())
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, 9)
})

await runCase('production Windows cancellation cannot clear another outstanding reservation to admit backup', 1, async f => {
  const ownedRequest = new AbortController()
  const existing = await f.admission.reserveOcr(4096, ownedRequest.signal)
  ownedRequest.abort()
  try {
    assert.equal(f.admission.inspect().materialBytes, 4096, 'Cancellation does not prove physical release')
    await assert.rejects(f.host.saveTagIntent(await f.command()))
    assert.equal((await backupFiles(f)).length, 0)
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, 1)
    assert.equal(f.admission.inspect().materialBytes, 4096)
    assert.equal(f.admission.inspect().requests, 1)
  } finally { existing.release() }
  assert.equal(f.admission.inspect().materialBytes, 0)
  await f.host.saveTagIntent(await f.command())
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, 9)
})

async function frozenReader(version: 8 | 12) {
  const folder = path.resolve('scripts/fixtures', version === 8 ? 'independent-tags-v8' : 'background-ocr-v12')
  const name = 'library-open-control-store.internal.ts'
  const manifest = JSON.parse(await fs.readFile(path.join(folder, 'manifest.json'), 'utf8'))
  const frozen=await readFrozenLibrarySource(folder,manifest)
  const source=frozen[name]
  assert.equal(digest(source), version === 8 ? manifest[name].sha256 : manifest[name])
  const output = path.join(evidenceRoot, `frozen-reader-v${version}.mjs`)
  const plugins: import('esbuild').Plugin[] = []
  if (version === 12) {
    const versionSource = frozen['library-schema-version.ts']
    assert.equal(digest(versionSource), manifest['library-schema-version.ts'])
    plugins.push({ name: 'exact-frozen-version', setup(builder: import('esbuild').PluginBuild) {
      builder.onResolve({ filter: /library-schema-version$/ }, () => ({ path: 'frozen-v12', namespace: 'frozen' }))
      builder.onLoad({ filter: /.*/, namespace: 'frozen' }, () => ({ contents: versionSource, loader: 'ts' }))
    } })
  }
  await build({ stdin: { contents: source, loader: 'ts', resolveDir: path.resolve('src/main/library-lifecycle') },
    outfile: output, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent', plugins })
  return import(pathToFileURL(output).href)
}
for (const version of [8, 12] as const) await runCase(`production Windows frozen v${version} reader rejects the committed upgrade without changing bytes`, 1, async f => {
  if (version === 8) await f.host.saveTagIntent(await f.command())
  else {
    const analysis = await f.host.readBackgroundAnalysis(f.libraryScope)
    await f.host.configureBackgroundAnalysis({ ...f.libraryScope, sessionToken: analysis.sessionToken,
      expectedRevision: analysis.policy.revision, expectedSchemaVersion: 1, allowUpgrade: true,
      enabled: false, capabilities: { tags: true, caption: true, ocr: true } })
    const ocr = await f.host.readBackgroundOcr(f.libraryScope)
    await f.host.configureBackgroundOcr({ ...f.libraryScope, sessionToken: ocr.sessionToken,
      expectedRevision: ocr.permissionRevision, expectedSchemaVersion: 12, allowUpgrade: true,
      enabled: false, runtimeFingerprint: 'synthetic-unqualified-runtime' })
  }
  await f.host.close()
  const previous = await frozenReader(version), before = await fs.readFile(f.file)
  const readonly = openReadonlyLibraryDatabase(f.file)
  try { assert.equal(previous.inspectLibraryControlStore(readonly, f.declaration).kind, 'unsupported') }
  finally { readonly.close() }
  assert.deepEqual(await fs.readFile(f.file), before)
  await f.host.reopen()
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion, version + 1)
  await verifyCurrentUserState(f)
})

for (const sidecar of ['journal','wal','shm']) await runCase(`production Windows refuses a preexisting ${sidecar} hardlink at the HELD cut without outside writes`,1,async f=>{
  const outside=path.join(f.root,`outside-${sidecar}.dat`),link=path.join(path.dirname(f.file),`library.sqlite-${sidecar}`)
  const sentinel=Buffer.alloc(8192,0x59)
  await fs.writeFile(outside,sentinel)
  f.hooks.afterBackup=async()=>{await fs.link(outside,link)}
  let failure:unknown
  try {await f.host.saveTagIntent(await f.command())}catch(error){failure=error}
  const after=await fs.readFile(outside)
  assert.equal(digest(after),digest(sentinel),`Default SQLite journal open must not overwrite an outside ${sidecar} object`)
  assert.ok(failure,'A preexisting sidecar cannot receive schema maintenance authority')
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
  assert.equal((await f.host.readTagIntents(f.scope)).requests.length,0)
  const backups=await backupFiles(f);assert.equal(backups.length,1);await validateBackup(f,backups[0],1)
  // A subsequent read on the retained SQLite connection may clean a refused
  // invalid WAL/SHM name; the outside object must still be unchanged.
  if(await fs.lstat(link).catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return null;throw error}))await fs.unlink(link)
  assert.equal((await fs.stat(outside)).nlink,1)
  f.hooks.afterBackup=undefined
  await f.host.saveTagIntent(await f.command())
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,9,'Removing the controlled collision must allow the qualified path')
  await f.host.close();await f.host.reopen();await verifyCurrentUserState(f)
})

process.stdout.write(`PRODUCTION_BACKUP_EVIDENCE ${evidenceRoot}\n`)
