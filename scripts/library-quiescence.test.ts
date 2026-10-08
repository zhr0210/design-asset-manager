import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLibraryQuiescence } from '../src/main/library-quiescence'
import type { ActiveLibraryHostProjection } from '../src/shared/contracts/active-library.contract'

type Participants = ReturnType<Parameters<typeof createLibraryQuiescence>[0]['current']>

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}

const tick = () => new Promise<void>(resolve => setImmediate(resolve))

function heldAdmission() {
  const held = new Set<symbol>()
  let releaseCalls = 0
  return {
    held,
    get releaseCalls() { return releaseCalls },
    hold() {
      const token = Symbol('synthetic-hold')
      held.add(token)
      return () => { releaseCalls++; held.delete(token) }
    },
  }
}

function fixture() {
  const visual = heldAdmission(), business = heldAdmission()
  let projection: ActiveLibraryHostProjection = { state: 'ready', identity: 'synthetic-library', generation: 'synthetic-generation' }
  let shutdownIdle = true
  const state = {
    closed: 0,
    reads: 0,
    recoveryFlushes: 0,
    ownerDrains: 0,
    visualAccepting: true,
    ocrAccepting: true,
    inferenceAccepting: true,
    accountsAccepting: true,
    acceptanceAccepting: true,
    inferenceDrains: 0,
    accountDrains: 0,
    accountShutdowns: 0,
    restores: { visual: 0, tags: 0, batches: 0, ocr: 0, connections: 0, acceptance: 0 },
  }
  const participants: Participants = {
    visualAdmission: { hold: () => visual.hold() },
    activeLibraryHost: {
      inspect: () => projection,
      readVisualSession: async () => { state.reads++; return { sessionToken: 'synthetic-session', leaseIdentity: 'synthetic-lease' } },
      holdBusinessAdmission: () => business.hold(),
      close: async () => { state.closed++; projection = { state: 'closed', identity: null, generation: null } },
    },
    workWindows: { drain: async () => {} },
    managedDownloads: { drain: async () => {} },
    assetCard: { invalidate() {} },
    tagDecisions: { invalidate() {} },
    tagBatches: {
      invalidate() {},
      suspendAndDrain: async () => { state.ownerDrains++ },
      resume: () => { state.restores.batches++ },
    },
    tagRecovery: { invalidate() {}, flush: async () => { state.recoveryFlushes++ } },
    visualAi: {
      suspendAndDrain: async () => { state.ownerDrains++; state.visualAccepting = false },
      resume: () => { state.restores.visual++; state.visualAccepting = true },
    },
    tagExecution: {
      suspendAndDrain: async () => { state.ownerDrains++ },
      resume: () => { state.restores.tags++ },
    },
    tagIntents: { invalidate() {} },
    imageTools: { invalidate() {} },
    backgroundAnalysis: { invalidate() {},suspendAndDrain(){},resume(){} },
    backgroundOcr: { invalidate() {}, suspendAndDrain: async () => { state.ownerDrains++ } },
    ocr: {
      suspend: () => { state.ocrAccepting = false },
      suspendAndDrain: async () => { state.ownerDrains++; state.ocrAccepting = false },
      resume: () => { state.restores.ocr++; state.ocrAccepting = true },
    },
    aiConnections: {
      suspend: () => { state.inferenceAccepting = false },
      suspendAll: () => { state.accountShutdowns++; state.inferenceAccepting = false; state.accountsAccepting = false },
      drainInference: async () => { state.inferenceDrains++ },
      drain: async () => { state.accountDrains++; state.accountsAccepting = false },
      resume: () => { state.restores.connections++; state.inferenceAccepting = true; state.accountsAccepting = true },
    },
    aiAcceptance: {
      drain: async () => { state.acceptanceAccepting = false },
      resume: () => { state.restores.acceptance++; state.acceptanceAccepting = true },
    },
  }
  const module = createLibraryQuiescence({
    current: () => participants,
    isShutdownIdle: () => shutdownIdle,
    confirmSwitchDraftDiscard: () => {},
  })
  return {
    module, participants, state, visual, business,
    setProjection: (next: ActiveLibraryHostProjection) => { projection = next },
    setShutdownIdle: (next: boolean) => { shutdownIdle = next },
    canStartVisual: () => state.visualAccepting && visual.held.size === 0,
  }
}

await test('library work checkpoints settle before business admission is held or model owners drain', async () => {
  const f = fixture(), work = deferred(), download = deferred()
  let downloadStarted = false
  f.participants.workWindows = { drain: () => work.promise }
  const pending = f.module.onAuthorityWillChange()
  await tick()
  assert.equal(f.canStartVisual(), false)
  assert.equal(f.state.inferenceAccepting, false)
  assert.equal(f.business.held.size, 0)
  assert.equal(f.state.ownerDrains, 0)

  // A participant made available while the first checkpoint runs must be read at its own stage.
  f.participants.managedDownloads = { drain: () => { downloadStarted = true; return download.promise } }
  work.resolve()
  await tick()
  assert.equal(downloadStarted, true)
  assert.equal(f.business.held.size, 0)
  assert.equal(f.state.ownerDrains, 0)
  download.resolve()
  await pending
  assert.equal(f.business.held.size, 1)
  assert.ok(f.state.ownerDrains > 0)
  assert.equal(f.state.closed, 0)
  await f.module.onAuthorityDidChange()
  assert.equal(f.canStartVisual(), true)
})

await test('an owner rejection remains fail-fast and completion releases its authority cycle', async () => {
  const f = fixture(), slowOwner = deferred(), rejected = new Error('synthetic owner rejection')
  f.participants.tagBatches!.suspendAndDrain = () => Promise.reject(rejected)
  f.participants.visualAi!.suspendAndDrain = () => { f.state.visualAccepting = false; return slowOwner.promise }
  let outcome: unknown
  const pending = f.module.onAuthorityWillChange().then(() => { outcome = 'completed' }, error => { outcome = error })
  await tick()
  assert.equal(outcome, rejected, 'a still-pending peer must not turn Promise.all into an all-settled drain')
  assert.equal(f.state.closed, 0)
  assert.equal(f.visual.held.size, 1)
  assert.equal(f.business.held.size, 1)
  await f.module.onAuthorityDidChange()
  assert.equal(f.visual.held.size, 0)
  assert.equal(f.business.held.size, 0)
  assert.equal(f.state.ocrAccepting, true)
  assert.equal(f.state.inferenceAccepting, true)
  slowOwner.resolve()
  await pending
})

await test('failed shutdown drain never closes the Host and retains shutdown admission holds', async () => {
  const f = fixture(), slowOwner = deferred(), rejected = new Error('synthetic exit drain failure')
  f.participants.tagExecution!.suspendAndDrain = () => Promise.reject(rejected)
  f.participants.backgroundOcr!.suspendAndDrain = () => slowOwner.promise
  let outcome: unknown
  const pending = f.module.drainForShutdown().then(() => { outcome = 'completed' }, error => { outcome = error })
  await tick()
  assert.equal(outcome, rejected)
  assert.equal(f.state.closed, 0)
  assert.equal(f.canStartVisual(), false)
  assert.equal(f.visual.held.size, 1)
  assert.equal(f.business.held.size, 1)
  assert.equal(f.state.accountsAccepting, false)
  slowOwner.resolve()
  await pending
})

await test('authority completion cannot release the independent exit hold or restore OCR and accounts while quitting', async () => {
  const f = fixture()
  await f.module.onAuthorityWillChange()
  const exitCheckpoint = deferred()
  f.participants.workWindows = { drain: () => exitCheckpoint.promise }
  f.setShutdownIdle(false)
  const exit = f.module.drainForShutdown()
  await tick()
  assert.equal(f.visual.held.size, 2)
  await f.module.onAuthorityDidChange()
  assert.equal(f.visual.held.size, 1)
  assert.equal(f.business.held.size, 0)
  assert.equal(f.canStartVisual(), false)
  assert.equal(f.state.ocrAccepting, false)
  assert.equal(f.state.accountsAccepting, false)
  // The established ready branch still restores these owners, even during shutdown.
  assert.equal(f.state.restores.visual, 1)
  assert.equal(f.state.restores.tags, 1)
  assert.equal(f.state.restores.batches, 1)
  assert.equal(f.state.restores.connections, 0)
  assert.equal(f.state.restores.acceptance, 0)
  exitCheckpoint.resolve()
  await exit
  assert.equal(f.state.closed, 1)
  assert.equal(f.visual.held.size, 1)
  assert.equal(f.business.held.size, 1)
})

await test('a non-ready Host restores app-scoped OCR configuration, connections and acceptance only when shutdown is idle', async () => {
  for (const idle of [true, false]) {
    const f = fixture()
    await f.module.onAuthorityWillChange()
    f.setProjection({ state: 'recovery-required', identity: null, generation: null })
    f.setShutdownIdle(idle)
    await f.module.onAuthorityDidChange()
    assert.equal(f.visual.held.size, 0)
    assert.equal(f.business.held.size, 0)
    assert.equal(f.state.reads, 0)
    assert.equal(f.state.restores.visual, 0)
    assert.equal(f.state.restores.ocr, idle ? 1 : 0)
    assert.equal(f.state.ocrAccepting, idle)
    assert.equal(f.state.restores.connections, idle ? 1 : 0)
    assert.equal(f.state.restores.acceptance, idle ? 1 : 0)
    assert.equal(f.state.inferenceAccepting, idle)
    assert.equal(f.state.acceptanceAccepting, idle)
  }
})

await test('without a visual release, completion only releases the business hold and returns', async () => {
  const f = fixture()
  f.participants.visualAdmission = undefined
  await f.module.onAuthorityWillChange()
  assert.equal(f.business.held.size, 1)
  await f.module.onAuthorityDidChange()
  assert.equal(f.business.held.size, 0)
  assert.equal(f.business.releaseCalls, 1)
  assert.equal(f.state.reads, 0)
  assert.equal(f.state.restores.ocr, 0)
  assert.equal(f.state.restores.connections, 0)
  assert.equal(f.state.recoveryFlushes, 0)
  await f.module.onAuthorityDidChange()
  assert.equal(f.business.releaseCalls, 1)
})

await test('a failed ready-session check propagates after cleanup and preserves the existing restore conditions', async () => {
  const f = fixture(), failed = new Error('synthetic session revoked')
  await f.module.onAuthorityWillChange()
  f.participants.activeLibraryHost!.readVisualSession = async () => { throw failed }
  await assert.rejects(f.module.onAuthorityDidChange(), error => error === failed)
  assert.equal(f.visual.held.size, 0)
  assert.equal(f.business.held.size, 0)
  assert.equal(f.state.restores.visual, 0)
  assert.equal(f.state.restores.ocr, 0)
  assert.equal(f.state.restores.connections, 1)
  assert.equal(f.state.restores.acceptance, 1)
  assert.equal(f.state.recoveryFlushes, 0)
  await f.module.onAuthorityDidChange()
  assert.equal(f.visual.releaseCalls, 1)
  assert.equal(f.business.releaseCalls, 1)
})

await test('library changes drain inference while shutdown also stops account work', async () => {
  const f = fixture()
  await f.module.onAuthorityWillChange()
  assert.equal(f.state.inferenceDrains, 1)
  assert.equal(f.state.accountDrains, 0)
  assert.equal(f.state.accountShutdowns, 0)
  assert.equal(f.state.accountsAccepting, true, 'library changes must leave app-scoped OAuth admitted')
  await f.module.onAuthorityDidChange()
  assert.equal(f.state.restores.connections, 2, 'ready/idle restoration and final app admission restoration remain separate')
  assert.equal(f.state.restores.acceptance, 2)
  f.setShutdownIdle(false)
  await f.module.drainForShutdown()
  assert.equal(f.state.inferenceDrains, 1)
  assert.equal(f.state.accountDrains, 1)
  assert.equal(f.state.accountShutdowns, 1)
  assert.equal(f.state.accountsAccepting, false)
  assert.equal(f.state.closed, 1)
})

await test('partial initialization can shut down and repeated completion never duplicates releases or recovery delivery', async () => {
  const partial = createLibraryQuiescence({ current: () => ({}), isShutdownIdle: () => false, confirmSwitchDraftDiscard: () => {} })
  await partial.drainForShutdown()
  await partial.onAuthorityDidChange()
  const f = fixture()
  await f.module.onAuthorityWillChange()
  await f.module.onAuthorityDidChange()
  const restores = { ...f.state.restores }
  await f.module.onAuthorityDidChange()
  assert.equal(f.visual.releaseCalls, 1)
  assert.equal(f.business.releaseCalls, 1)
  assert.equal(f.state.recoveryFlushes, 1)
  assert.deepEqual(f.state.restores, restores)
})

await test('a rejected draft-discard confirmation does not acquire holds or stop account admission', async () => {
  const f = fixture(), cancelled = new Error('WORK_DRAFT_RETAINED')
  const module = createLibraryQuiescence({ current: () => f.participants, isShutdownIdle: () => true, confirmSwitchDraftDiscard: () => { throw cancelled } })
  await assert.rejects(module.onAuthorityWillChange(), error => error === cancelled)
  await module.onAuthorityDidChange()
  assert.equal(f.visual.held.size, 0)
  assert.equal(f.business.held.size, 0)
  assert.equal(f.state.ownerDrains, 0)
  assert.equal(f.state.inferenceAccepting, true)
  assert.equal(f.state.accountsAccepting, true)
})

await test('a release failure propagates and does not silently continue the existing finally sequence', async () => {
  const f = fixture(), failed = new Error('synthetic business release failure')
  f.participants.activeLibraryHost!.holdBusinessAdmission = () => {
    const release = f.business.hold()
    return () => { release(); throw failed }
  }
  await f.module.onAuthorityWillChange()
  f.setProjection({ state: 'closed', identity: null, generation: null })
  await assert.rejects(f.module.onAuthorityDidChange(), error => error === failed)
  assert.equal(f.business.held.size, 0)
  assert.equal(f.visual.held.size, 1)
  assert.equal(f.state.restores.connections, 0)
  assert.equal(f.state.restores.acceptance, 0)
  await f.module.onAuthorityDidChange()
  assert.equal(f.business.releaseCalls, 1)
})
