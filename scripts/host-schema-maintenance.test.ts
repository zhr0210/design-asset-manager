import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { createHostSchemaMaintenance, type HostMaintenanceStorage } from '../src/main/library-lifecycle/host-schema-maintenance.internal'
import { assertLibraryDataSchema } from '../src/main/library-lifecycle/library-materialization.internal'
import { readLibraryManifestDeclaration } from '../src/main/library-lifecycle/library-manifest.tracer'
import type { ExclusiveLibraryLockLease } from '../src/main/library-lifecycle/active-library-session'
import { ActiveLibraryHostError, type ActiveLibraryHostErrorCode, type ActiveLibraryHostState } from '../src/shared/contracts/active-library.contract'
import { applyTagIntentSchema } from '../src/main/independent-tags/tag-intent.schema'
import { applyTagExecutionSchema } from '../src/main/independent-tags/tag-execution.schema'
import { applyTagDecisionSchema } from '../src/main/independent-tags/tag-decision.schema'
import { applyBackgroundAnalysisSchema } from '../src/main/background-analysis/background-analysis.schema'
import { applyBackgroundOcrSchema } from '../src/main/background-ocr/background-ocr.schema'
import { withTagIntentGrowthCap, type TagIntentTestHooks } from '../src/main/independent-tags/tag-intent-backup'
import { claimTagExecution, commitTagExecution, markTagExecutionSent, readTagExecution, type TagExecutionBinding } from '../src/main/independent-tags/tag-execution-storage'
import { readBackgroundAnalysis } from '../src/main/background-analysis/background-analysis-storage'
import { readBackgroundOcr, type BackgroundOcrAuthority } from '../src/main/background-ocr/background-ocr-storage'
import { readTagIntentContext } from '../src/main/independent-tags/tag-intent-storage'
import type { TagIntentCommit } from '../src/shared/contracts/independent-tag-intent.contract'
import type { TagBatchCommit } from '../src/shared/contracts/tag-batch.contract'

function gate() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve))
const error = (code: ActiveLibraryHostErrorCode) => new ActiveLibraryHostError(code, code)
function buildProfile(db: Database.Database, version: number) {
  db.transaction(() => {
    if (version === 9) applyTagIntentSchema(db)
    if (version >= 10) applyTagExecutionSchema(db)
    if (version >= 11) applyTagDecisionSchema(db)
    if (version >= 12) applyBackgroundAnalysisSchema(db)
    if (version >= 13) applyBackgroundOcrSchema(db)
    assertLibraryDataSchema(db)
  })()
}

/** Generated data only. A closed real Host initializes each owned Library. */
async function library() {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-maintenance-')))
  const directory = path.join(root, 'library')
  const sources = [path.join(root, 'one.png'), path.join(root, 'two.png')]
  for (const source of sources) await sharp({ create: { width: 24, height: 16, channels: 3, background: '#7799bb' } }).png().toFile(source)
  let selecting: Promise<void> | undefined
  const hooks: TagIntentTestHooks = {}
  const host = createActiveLibraryHost({
    ...createProductionActiveLibraryHostDependencies({
      selectLibraryDirectory: async () => ({ kind: 'selected', directory }),
      selectLocalFiles: async () => { await selecting; return { kind: 'selected', files: sources.map(filePath => ({ filePath })) } }
    }), tagIntentTestHooks: hooks
  })
  try {
    const create = await host.prepareCreate()
    if (create.kind !== 'planned') throw Error('synthetic create failed')
    await host.confirmCreate(create.plan.receipt)
    const add = await host.prepareAddAssets()
    if (add.kind !== 'planned') throw Error('synthetic add failed')
    await host.dispatchAddAssets(add.plan.receipt)
    const projection = host.inspect(), assets = await host.listAssets()
    const scope = { libraryIdentity: projection.identity!, generation: projection.generation! }
    await host.close()
    return {
      root, directory, host, scope, assets, hooks,
      file: path.join(directory, '.dam', 'library.sqlite'),
      set selecting(value: Promise<void> | undefined) { selecting = value },
      close: async () => {
        await host.close()
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()))
        assert.ok(path.basename(root).startsWith('dam-maintenance-'))
        await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
      }
    }
  } catch (failure) { await host.close(); throw failure }
}

/** Real SQLite/domain writes; synthetic lease and backup qualification only. */
async function fixture(version = 1) {
  const f = await library(), db = new Database(f.file)
  db.pragma('foreign_keys = ON')
  buildProfile(db, version)
  const declaration = readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(f.directory, '.dam', 'library.manifest.json'))))
  if (declaration.kind !== 'compatible') throw Error('synthetic manifest invalid')
  let state: ActiveLibraryHostState = 'ready', holds = 0, lost = false, unavailable = false, leaseRuns = 0, leaseHeld = 0, backups = 0
  let tail: Promise<unknown> = Promise.resolve()
  const pending = new Set<Promise<unknown>>(), claims: TagExecutionBinding['claims'] = new Map()
  const authority: BackgroundOcrAuthority = { claims: new Map() }
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = tail.then(operation, operation)
    tail = next.then(() => undefined, () => undefined)
    return next
  }
  const lease: ExclusiveLibraryLockLease = {
    inspect: () => ({ state: lost ? 'lost' : 'held', libraryIdentity: f.scope.libraryIdentity, libraryGeneration: f.scope.generation, leaseIdentity: 'synthetic-lease' }),
    runWhileHeld: async operation => { leaseRuns++; if(unavailable)return {kind:'unavailable'}; leaseHeld++;try{return {kind:'completed',value:await operation()}}finally{leaseHeld--} }
  }
  const active = { identity: f.scope.libraryIdentity, generation: f.scope.generation, notebookSession: 'synthetic-session', database: db, root: f.directory, control: path.join(f.directory, '.dam'), manifestDeclaration: declaration.declaration, lock: { lease } }
  let binding: typeof active | undefined = active
  const executionBinding = (a: typeof active) => {
    if (lost) { state = 'recovery-required'; throw error('library-lock-invalid') }
    return { ...a, leaseIdentity: 'synthetic-lease', claims }
  }
  const ocrBinding = (a: typeof active) => { executionBinding(a); return { ...a, ocrAuthority: authority } }
  const storage: HostMaintenanceStorage = {
    prepareBackup: async (a, check, signal, hooks) => {
      // This adapter does not grant production APFS/native qualification.
      backups++; check()
      if (signal?.aborted) throw error('library-operation-failed')
      const file = path.join(f.root, 'synthetic-backup-' + backups + '.sqlite')
      await a.database.backup(file)
      const readonly = new Database(file, { readonly: true })
      try { assertLibraryDataSchema(readonly); assert.equal(readonly.pragma('quick_check', { simple: true }), 'ok') }
      finally { readonly.close() }
      await hooks?.afterBackup?.(); check()
      return { pageCap: Number(db.pragma('page_count', { simple: true })) + 1024 }
    }, withGrowthCap: withTagIntentGrowthCap
  }
  const module = createHostSchemaMaintenance({
    current: () => ({ binding, state, businessSuspended: holds > 0 }),
    enqueueLifecycle: enqueue, inFlight: () => pending,
    run: async operation => {
      if (state !== 'ready') throw error('library-recovery-required')
      if (module.isAdmissionClosed() || holds) throw error('library-quiescing')
      return operation(active)
    },
    quarantine: () => { state = 'recovery-required' },
    stateError: current => error(current === 'closed' ? 'library-closed' : 'library-recovery-required'),
    hostError: error, executionBinding, ocrBinding, ocrAuthority: authority, hooks: f.hooks
  }, storage)
  const assetScope = { ...f.scope, assetId: f.assets[0].id }
  const intent = (requestId = 'synthetic-request'): TagIntentCommit => {
    const c = readTagIntentContext(active, assetScope)
    return { ...assetScope, sessionToken: c.sessionToken, assetRevision: c.asset.revision, previewGeneration: c.asset.previewGeneration,
      expectedSchemaVersion: c.schemaVersion, allowUpgrade: true, requestId, backendId: 'synthetic', model: 'synthetic-model', backendBindingSha256: 'a'.repeat(64), recipeId: 'independent-tags-v1', recipeVersion: '1' }
  }
  const analysis = () => {
    const s = readBackgroundAnalysis(active, f.scope)
    return { ...f.scope, sessionToken: s.sessionToken, expectedRevision: s.policy.revision, expectedSchemaVersion: s.schemaVersion, allowUpgrade: true, enabled: true, capabilities: { tags: true, caption: true, ocr: true } }
  }
  const ocr = () => {
    const s = readBackgroundOcr(ocrBinding(active), f.scope)
    return { ...f.scope, sessionToken: s.sessionToken, expectedRevision: s.permissionRevision, expectedSchemaVersion: s.schemaVersion, allowUpgrade: true, enabled: true, runtimeFingerprint: 'synthetic-runtime' }
  }
  const publish = async () => {
    const input = intent('evidence-request')
    await module.saveTagIntent(input)
    const claim = claimTagExecution(executionBinding(active), { ...assetScope, sessionToken: active.notebookSession, requestId: input.requestId, origin: 'tags-only', inputSha256: 'b'.repeat(64) })
    const ref = { ...assetScope, sessionToken: active.notebookSession, requestId: input.requestId, attemptToken: claim.attemptToken }
    markTagExecutionSent(executionBinding(active), ref)
    db.transaction(() => commitTagExecution(executionBinding(active), { ...ref, tags: ['蓝色', '几何'] }))()
    return { ...assetScope, sessionToken: active.notebookSession, expectedSchemaVersion: Number(db.pragma('user_version', { simple: true })), allowUpgrade: true, evidenceId: readTagExecution(executionBinding(active), assetScope).current!.evidenceId, tag: '几何', decision: 'reject' as const }
  }
  return { ...f, module, db, active, assetScope, intent, analysis, ocr, publish, pending, enqueue, storage, authority,
    get state() { return state }, get backups() { return backups }, get leaseRuns() { return leaseRuns }, get leaseHeld() { return leaseHeld },
    set holds(v: number) { holds = v }, set lost(v: boolean) { lost = v }, set unavailable(v: boolean) { unavailable = v },
    expire: () => { binding = undefined },
    close: async () => { await tail; db.close(); await f.close() }
  }
}

await test('maintenance drains settled and pending work before lease entry, keeps close queued and never owns business holds', { timeout: 10000 }, async () => {
  const f = await fixture(9), waiting = gate()
  try {
    f.pending.add(waiting.promise)
    const rejected = Promise.reject(Error('synthetic ordinary rejection')); rejected.catch(() => {})
    f.pending.add(rejected)
    const maintenance = f.module.saveTagIntent(f.intent())
    await tick()
    assert.equal(f.module.isAdmissionClosed(), true); assert.equal(f.leaseRuns, 0)
    await assert.rejects(f.module.decideTag({ ...f.assetScope, sessionToken: 'synthetic-session', expectedSchemaVersion: 9, allowUpgrade: false, evidenceId: 'unavailable', tag: '蓝色', decision: 'confirm' }), /library-quiescing/)
    let closed = false
    const close = f.enqueue(async () => { assert.equal(f.module.isAdmissionClosed(), false); closed = true })
    await tick(); assert.equal(closed, false)
    waiting.resolve(); await maintenance; await close
    assert.equal(f.leaseRuns, 1); assert.equal(f.module.isAdmissionClosed(), false)
    f.holds = 2; await assert.rejects(f.module.saveTagIntent(f.intent('blocked')), /library-quiescing/)
    f.holds = 1; await assert.rejects(f.module.saveTagIntent(f.intent('still-blocked')), /library-quiescing/)
    f.holds = 0; await f.module.saveTagIntent(f.intent('allowed'))
  } finally { waiting.resolve(); await f.close() }
})

await test('lease unavailable and a business hold acquired during backup block writes without releasing independent holds', { timeout: 10000 }, async () => {
  const f = await fixture()
  try {
    f.hooks.afterBackup = async () => { f.holds = 1 }
    await assert.rejects(f.module.saveTagIntent(f.intent()), /TAG_INTENT_SCOPE_EXPIRED/)
    assert.equal(f.db.pragma('user_version', { simple: true }), 1)
    assert.equal(f.module.isAdmissionClosed(), false)
    await assert.rejects(f.module.saveTagIntent(f.intent()), /library-quiescing/)
    f.holds = 0; f.hooks.afterBackup = undefined; f.unavailable = true
    await assert.rejects(f.module.saveTagIntent(f.intent()), /library-lock-invalid/)
    assert.equal(f.state, 'recovery-required'); assert.equal(f.module.isAdmissionClosed(), false)
  } finally { await f.close() }
})

type Family = 'intent' | 'execution' | 'analysis' | 'decision' | 'ocr'
async function action(f: Awaited<ReturnType<typeof fixture>>, family: Family) {
  if (family === 'intent') { const input = f.intent(); return () => f.module.saveTagIntent(input) }
  if (family === 'execution') { const input = { ...f.assetScope, sessionToken: f.active.notebookSession, expectedSchemaVersion: 9, allowUpgrade: true }; return () => f.module.enableTagExecution(input) }
  if (family === 'analysis') { const input = f.analysis(); return () => f.module.configureBackgroundAnalysis(input) }
  if (family === 'ocr') { const input = f.ocr(); return () => f.module.configureBackgroundOcr(input) }
  const input = await f.publish(); return () => f.module.decideTag(input)
}
const versions: Record<Family, number> = { intent: 1, execution: 9, analysis: 1, decision: 10, ocr: 12 }
const upgraded: Record<Family, number> = { intent: 9, execution: 10, analysis: 12, decision: 11, ocr: 13 }

for(const family of [...Object.keys(versions),'batch'] as (Family|'batch')[]) await test(family+' finish keeps lease/admission/queued close until actual release',async()=>{
  const f=await fixture(family==='batch'?1:versions[family]),entered=gate(),closed=gate()
  try{
    const invoke=family==='batch'?()=>f.module.saveTagBatch({...f.intent('finish-batch'),forceRerun:false,items:f.assets.map(a=>({assetId:a.id,assetRevision:a.revision,previewGeneration:a.thumbnailRef}))}):await action(f,family)
    const prepare=f.storage.prepareBackup
    f.storage.prepareBackup=async(...args)=>({...await prepare(...args),finish:async committed=>{
      assert.equal(committed,true);assert.equal(f.leaseHeld,1);assert.equal(f.module.isAdmissionClosed(),true);assert.equal(f.db.inTransaction,false);entered.resolve();await closed.promise
    }})
    const operation=invoke();await entered.promise
    let closeRan=false;const queuedClose=f.enqueue(async()=>{assert.equal(f.leaseHeld,0);closeRan=true})
    await tick();assert.equal(closeRan,false);assert.equal(f.module.isAdmissionClosed(),true)
    closed.resolve();await operation;await queuedClose;assert.equal(closeRan,true);assert.equal(f.module.isAdmissionClosed(),false)
  }finally{closed.resolve();await f.close()}
})

await test('finish rejection quarantines committed storage and revokes OCR authority',async()=>{
  const f=await fixture(12)
  try{
    const prepare=f.storage.prepareBackup
    f.storage.prepareBackup=async(...args)=>({...await prepare(...args),finish:async committed=>{assert.equal(committed,true);throw Error('actual target receipt failure')}})
    await assert.rejects(f.module.configureBackgroundOcr(f.ocr()),/TAG_INTENT_BACKUP_SETTLEMENT_FAILED/)
    assert.equal(f.db.pragma('user_version',{simple:true}),13);assert.equal(f.state,'recovery-required');assert.equal(f.authority.grant,undefined)
  }finally{await f.close()}
})

for (const family of Object.keys(versions) as Family[]) for (const point of ['afterDdl', 'beforeCommit', 'afterCommit'] as const) {
  await test(family + ' ' + point + ' preserves rollback versus committed-but-unacknowledged effects', { timeout: 10000 }, async () => {
    const f = await fixture(versions[family])
    try {
      const invoke = await action(f, family), backupCount = f.backups
      const prepare = f.storage.prepareBackup, outcomes: boolean[] = []
      f.storage.prepareBackup = async (...args) => ({...await prepare(...args), finish:async committed=>{assert.equal(f.leaseHeld,1);assert.equal(f.module.isAdmissionClosed(),true);outcomes.push(committed)}})
      f.hooks[point] = () => { throw Error('synthetic fault') }
      await assert.rejects(invoke(), point === 'afterCommit' ? (family === 'ocr' ? /BACKGROUND_OCR_ACK_UNCERTAIN/ : /TAG_INTENT_ACK_UNCERTAIN/) : /STORAGE_FAILED|synthetic fault/)
      assert.equal(f.backups, backupCount + 1)
      assert.deepEqual(outcomes,[point==='afterCommit'])
      assert.equal(f.db.pragma('user_version', { simple: true }), point === 'afterCommit' ? upgraded[family] : versions[family])
      assert.equal(f.module.isAdmissionClosed(), false); assert.equal(f.state, 'ready')
      assertLibraryDataSchema(f.db)
      if (family === 'ocr') assert.equal(f.authority.grant, undefined)
      delete f.hooks[point]
      if (point !== 'afterCommit' || family === 'intent' || family === 'execution' || family === 'decision') await invoke()
      else if (family === 'ocr') await f.module.configureBackgroundOcr(f.ocr())
      else await f.module.configureBackgroundAnalysis(f.analysis())
      assert.equal(f.db.pragma('user_version', { simple: true }), upgraded[family])
      if (family === 'intent') assert.equal(f.db.prepare('SELECT COUNT(*) FROM independent_tag_requests').pluck().get(), 1)
      if (family === 'analysis') assert.equal(f.db.prepare('SELECT COUNT(*) FROM background_analysis_intents').pluck().get(), 0)
    } finally { await f.close() }
  })
}

await test('batch rollback is whole-scope, retry deduplication precedes stale-schema checking and force replay is idempotent', { timeout: 10000 }, async () => {
  const f = await fixture()
  try {
    const i = f.intent()
    const input: TagBatchCommit = { ...i, forceRerun: false, items: f.assets.map(a => ({ assetId: a.id, assetRevision: a.revision, previewGeneration: a.thumbnailRef })) }
    f.hooks.beforeCommit = () => { throw Error('synthetic batch rollback') }
    await assert.rejects(f.module.saveTagBatch(input), /TAG_INTENT_STORAGE_FAILED/)
    assert.equal(f.db.pragma('user_version', { simple: true }), 1)
    delete f.hooks.beforeCommit
    const saved = await f.module.saveTagBatch(input)
    assert.deepEqual(await f.module.saveTagBatch(input), saved)
    assert.deepEqual(await f.module.saveTagBatch({ ...input, requestId: 'another-ui' }), saved)
    await assert.rejects(f.module.saveTagBatch({ ...input, items: [input.items[0], { ...input.items[1], assetRevision: 'stale' }] }), /TAG_INTENT_SOURCE_CHANGED/)
    const force = { ...input, expectedSchemaVersion: 9, forceRerun: true, requestId: 'force' }
    const forced = await f.module.saveTagBatch(force)
    assert.deepEqual(await f.module.saveTagBatch(force), forced)
    assert.ok(forced.items.every(item => item.requestGeneration === 2))
    assert.equal(f.db.prepare('SELECT COUNT(*) FROM independent_tag_requests').pluck().get(), 2)
  } finally { await f.close() }
})

await test('OCR revokes synchronously before queued validation and an epoch change during backup can never regrant', { timeout: 10000 }, async () => {
  const f = await fixture(13), waiting = gate()
  try {
    await f.module.configureBackgroundOcr(f.ocr()); assert.ok(f.authority.grant)
    const queue = f.enqueue(() => waiting.promise)
    const failed = f.module.configureBackgroundOcr({ ...f.ocr(), expectedRevision: 0 })
    assert.equal(f.authority.grant, undefined, 'revocation must happen before queue entry')
    const failure = assert.rejects(failed, /BACKGROUND_OCR_REVIEW_EXPIRED/)
    waiting.resolve(); await queue; await failure
    assert.equal(f.authority.grant, undefined)
  } finally { waiting.resolve(); await f.close() }
  const during = await fixture(12), entered = gate(), release = gate()
  try {
    during.hooks.afterBackup = async () => { entered.resolve(); await release.promise }
    const pending = during.module.configureBackgroundOcr(during.ocr())
    const failure = assert.rejects(pending, /BACKGROUND_OCR_SCOPE_EXPIRED/)
    await entered.promise; during.module.revokeBackgroundOcr(); release.resolve(); await failure
    assert.equal(during.authority.grant, undefined); assert.equal(during.db.pragma('user_version', { simple: true }), 12)
  } finally { release.resolve(); await during.close() }
})

await test('OCR pretry hold refusal does not revoke a later queued valid configuration', { timeout: 10000 }, async () => {
  const f = await fixture(13), waiting = gate()
  try {
    const input = f.ocr()
    f.holds = 1
    const blockedQueue = f.enqueue(() => waiting.promise)
    const refused = assert.rejects(f.module.configureBackgroundOcr(input), /library-quiescing/)
    const releaseHold = f.enqueue(async () => { f.holds = 0 })
    const valid = f.module.configureBackgroundOcr(input)
    waiting.resolve(); await blockedQueue; await refused; await releaseHold
    assert.equal((await valid).authorized, true)
    assert.ok(f.authority.grant)
    assert.equal(f.db.prepare('SELECT revision FROM background_ocr_permission').pluck().get(), 1)
  } finally { waiting.resolve(); await f.close() }
})

for (const change of ['lease-lost', 'binding-expired', 'cancelled'] as const) await test('backup await ' + change + ' refuses writes and preserves original schema', { timeout: 10000 }, async () => {
  const f = await fixture(), entered = gate(), release = gate(), controller = new AbortController()
  try {
    f.hooks.afterBackup = async () => { entered.resolve(); await release.promise }
    const pending = f.module.saveTagIntent(f.intent(), controller.signal)
    const failure = assert.rejects(pending, change === 'lease-lost' ? /library-lock-invalid/ : change === 'binding-expired' ? /TAG_INTENT_SCOPE_EXPIRED/ : /TAG_INTENT_SESSION_EXPIRED/)
    await entered.promise
    if (change === 'lease-lost') f.lost = true
    else if (change === 'binding-expired') f.expire()
    else controller.abort()
    release.resolve(); await failure
    assert.equal(f.db.pragma('user_version', { simple: true }), 1)
    assert.equal(f.db.prepare("SELECT COUNT(*) FROM sqlite_schema WHERE name='independent_tag_requests'").pluck().get(), 0)
    assert.equal(f.state, change === 'lease-lost' ? 'recovery-required' : 'ready')
    assert.equal(f.module.isAdmissionClosed(), false)
    assertLibraryDataSchema(f.db)
  } finally { release.resolve(); await f.close() }
})

for (const family of Object.keys(versions) as Family[]) await test(family + ' pragma restoration failure seals authority even when the transaction committed', { timeout: 10000 }, async () => {
  const f = await fixture(versions[family])
  try {
    const invoke = await action(f, family), original = f.db.pragma.bind(f.db)
    const prepare=f.storage.prepareBackup,outcomes:boolean[]=[]
    f.storage.prepareBackup=async(...args)=>({...await prepare(...args),finish:async committed=>{outcomes.push(committed)}})
    let bothAttempted = false, restoreFault = false
    f.db.pragma = function (sql: string, options?: any): any {
      if (sql.startsWith('cache_spill = ') && !sql.endsWith('OFF') && !restoreFault) { restoreFault = true; throw Error('synthetic native restoration fault') }
      if (restoreFault && sql.startsWith('max_page_count = ')) bothAttempted = true
      return original(sql, options)
    }
    await assert.rejects(invoke(), /TAG_INTENT_SETTINGS_RESTORE_FAILED/)
    assert.equal(bothAttempted, true); assert.equal(f.state, 'recovery-required')
    assert.deepEqual(outcomes,[true],'settings restoration failure cannot erase commit fact')
    assert.equal(f.db.pragma('user_version', { simple: true }), upgraded[family])
    assert.equal(f.module.isAdmissionClosed(), false); assert.equal(f.authority.grant, undefined)
    await assert.rejects(f.module.saveTagIntent(f.intent('blocked')), /library-recovery-required/)
    f.db.pragma = original
  } finally { await f.close() }
})

await test('real Host existing profiles exercise all six fixed intents and preserve OCR errors, manual choices and receipt replay', { timeout: 15000 }, async () => {
  const f = await library()
  try {
    const db = new Database(f.file)
    try { db.pragma('foreign_keys = ON'); buildProfile(db, 13) } finally { db.close() }
    await f.host.reopen()
    const scope = { ...f.scope, assetId: f.assets[0].id }, context = await f.host.readTagIntentContext(scope)
    const input: TagIntentCommit = { ...scope, sessionToken: context.sessionToken, expectedSchemaVersion: 13, allowUpgrade: false, requestId: 'real-host', assetRevision: context.asset.revision, previewGeneration: context.asset.previewGeneration,
      backendId: 'synthetic', model: 'synthetic', backendBindingSha256: 'a'.repeat(64), recipeId: 'independent-tags-v1', recipeVersion: '1' }
    const saved = await f.host.saveTagIntent(input)
    assert.deepEqual(await f.host.saveTagIntent({ ...input, expectedSchemaVersion: 1 }), saved)
    await f.host.enableTagExecution({ ...scope, sessionToken: context.sessionToken, expectedSchemaVersion: 1, allowUpgrade: false })
    const batch: TagBatchCommit = { ...input, requestId: 'real-batch', forceRerun: false, items: f.assets.map(a => ({ assetId: a.id, assetRevision: a.revision, previewGeneration: a.thumbnailRef })) }
    await f.host.saveTagBatch(batch)
    const claim = await f.host.claimTagExecution({ ...scope, sessionToken: context.sessionToken, requestId: batch.requestId, inputSha256: 'b'.repeat(64), origin: 'tags-only' })
    const ref = { ...scope, sessionToken: context.sessionToken, requestId: batch.requestId, attemptToken: claim.attemptToken }
    await f.host.markTagExecutionSent(ref); await f.host.commitTagExecution({ ...ref, tags: ['蓝色', '几何'] })
    const current = (await f.host.readTagExecution(scope)).current!
    const decision = { ...scope, sessionToken: context.sessionToken, expectedSchemaVersion: 13, allowUpgrade: false, evidenceId: current.evidenceId, tag: '蓝色', decision: 'confirm' as const }
    await f.host.decideTag(decision)
    await f.host.decideTag({ ...decision, tag: '几何', decision: 'reject', allowUpgrade: true })
    assert.deepEqual((await f.host.listAssets())[0].tags, ['蓝色'])
    const policy = await f.host.readBackgroundAnalysis(f.scope)
    await f.host.configureBackgroundAnalysis({ ...f.scope, sessionToken: policy.sessionToken, expectedSchemaVersion: 13, expectedRevision: policy.policy.revision, enabled: true, allowUpgrade: false, capabilities: { tags: true, caption: true, ocr: true } })
    const permission = await f.host.readBackgroundOcr(f.scope)
    const grant = { ...f.scope, sessionToken: permission.sessionToken, expectedSchemaVersion: 13, expectedRevision: permission.permissionRevision, enabled: true, allowUpgrade: false, runtimeFingerprint: 'synthetic-runtime' }
    assert.equal((await f.host.configureBackgroundOcr(grant)).authorized, true)
    await assert.rejects(f.host.configureBackgroundOcr(grant), /BACKGROUND_OCR_REVIEW_EXPIRED/)
    assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized, false)
    await assert.rejects(fs.access(path.join(f.directory, '.dam', 'schema-backups')))
  } finally { await f.close() }
})

await test('real Host drain refuses both normal and coordination work while maintenance waits, and close waits behind it', { timeout: 10000 }, async () => {
  const f = await library(), waiting = gate()
  try {
    const db = new Database(f.file)
    try { buildProfile(db, 12) } finally { db.close() }
    await f.host.reopen(); f.selecting = waiting.promise
    const selecting = f.host.prepareAddAssets(), policy = await f.host.readBackgroundAnalysis(f.scope)
    const configured = f.host.configureBackgroundAnalysis({ ...f.scope, sessionToken: policy.sessionToken, expectedSchemaVersion: 12, expectedRevision: 0, enabled: true, allowUpgrade: false, capabilities: { tags: true, caption: true, ocr: true } })
    await tick()
    await assert.rejects(f.host.listAssets(), /closing/)
    await assert.rejects(f.host.readVisualSession(f.scope), /closing/)
    let closed = false
    const close = f.host.close().then(() => { closed = true })
    await tick(); assert.equal(closed, false)
    waiting.resolve(); await selecting; await configured; await close
    assert.equal(f.host.inspect().state, 'closed')
    await f.host.reopen(); assert.equal((await f.host.readBackgroundAnalysis(f.scope)).policy.enabled, true)
  } finally { waiting.resolve(); await f.close() }
})
