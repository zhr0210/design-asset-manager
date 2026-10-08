import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAssetWorkspaceSession } from '../src/renderer/asset-workspace-session.internal'
import type { ActiveLibraryHostProjection } from '../src/shared/contracts/active-library.contract'
import type { AssetCardReturnEvent } from '../src/shared/contracts/asset-card.contract'
import type { Asset } from '../src/renderer/stores/asset.store'

const ready: ActiveLibraryHostProjection = { state: 'ready', identity: 'synthetic-library', generation: 'same-generation' }
const closed: ActiveLibraryHostProjection = { state: 'closed', identity: null, generation: null }
const scope = { libraryIdentity: ready.identity!, generation: ready.generation! }
const key = JSON.stringify([scope.libraryIdentity, scope.generation])
const context: AssetCardReturnEvent = { ...scope, assetId: 'synthetic-asset', configureAi: false, promptDraft: 'synthetic', descriptionDraft: { value: 'draft', baseCaption: '' } }
function deferred<T>() { let resolve!: (v: T) => void, reject!: (e: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const tick = () => new Promise<void>(resolve => setImmediate(resolve))
function fixture() {
  const calls: string[] = []
  let viewScope: string | null = key, selected = 'synthetic-asset', notes = false, ocr = false, confirm = true
  let inspect: () => Promise<ActiveLibraryHostProjection> = async () => ready
  const module = createAssetWorkspaceSession({
    inspect: () => { calls.push('inspect'); return inspect() },
    view: {
      getScope: () => viewScope,
      setScope: next => { calls.push('scope:' + next); viewScope = next },
      acceptDrafts: id => { calls.push('drafts:' + id) },
      setDesktopAsset: id => { calls.push('desktop:' + id) }, setMode: mode => { calls.push('mode:' + mode) }
    },
    assets: {
      reset: () => { calls.push('reset') }, loadAssets: async () => { calls.push('assets') }, loadTags: async () => { calls.push('tags') },
      loadAssetTags: async id => { calls.push('relations:' + id) }, selectedId: () => selected,
      find: id => id === 'synthetic-asset' ? { id } as Asset : undefined,
      select: asset => { calls.push('select:' + asset.id) }
    },
    drafts: {
      hasUnsavedNotes: () => notes, hasUnsavedOcr: () => ocr,
      confirmDiscard: () => { calls.push('confirm'); return confirm },
      clearNotes: () => { calls.push('clear-notes'); notes = false }, clearOcr: () => { calls.push('clear-ocr'); ocr = false }
    },
    navigate: destination => { calls.push('navigate:' + destination) }
  })
  return { module, calls, set inspect(value: typeof inspect) { inspect = value }, get scope() { return viewScope },
    set selected(value: string) { selected = value }, set notes(value: boolean) { notes = value }, get notes() { return notes },
    set ocr(value: boolean) { ocr = value }, get ocr() { return ocr }, set confirm(value: boolean) { confirm = value } }
}

await test('latest inspection alone adopts; old ready never starts follow-up lists', async () => {
  const f = fixture(), old = deferred<ActiveLibraryHostProjection>()
  f.inspect = () => old.promise
  const pending = f.module.refresh('ready-assets')
  f.inspect = async () => closed
  await f.module.refresh('inspect')
  old.resolve(ready); await pending
  assert.equal(f.module.getSnapshot().projection, closed); assert.equal(f.scope, null)
  assert.ok(!f.calls.includes('assets') && !f.calls.includes('tags'))
})
for (const failure of [false, true]) await test(`revoke then same-scope reopen discards old inspection ${failure ? 'failure' : 'ready'}`, async () => {
  const f = fixture(), old = deferred<ActiveLibraryHostProjection>()
  f.inspect = () => old.promise
  const pending = f.module.refresh('ready-assets')
  f.module.revoke(); f.inspect = async () => ready; await f.module.refresh('inspect')
  if (failure) old.reject(Error('synthetic')); else old.resolve(ready)
  await pending
  assert.equal(f.module.getSnapshot().projection, ready); assert.equal(f.module.getSnapshot().error, '')
  assert.ok(!f.calls.includes('assets'))
})
await test('authority change keeps two inspections and only loads after adopted ready', async () => {
  const f = fixture(); await f.module.refresh('authority-change')
  assert.deepEqual(f.calls, ['inspect', 'scope:' + key, 'inspect', 'scope:' + key, 'assets', 'tags'])
})
await test('revoke during second authority inspection prevents loading', async () => {
  const f = fixture(), second = deferred<ActiveLibraryHostProjection>()
  let count = 0; f.inspect = () => ++count === 1 ? Promise.resolve(ready) : second.promise
  const pending = f.module.refresh('authority-change'); await tick(); assert.equal(count, 2)
  f.module.revoke(); second.resolve(ready); await pending
  assert.equal(f.module.getSnapshot().projection.state, 'quiescing'); assert.ok(!f.calls.includes('assets'))
})
await test('revoke at the first adoption checkpoint also prevents the second inspection', async () => {
  const f = fixture(); let done = false
  const stop = f.module.subscribe(() => { if (!done && f.module.getSnapshot().projection.state === 'ready') { done = true; f.module.revoke() } })
  await f.module.refresh('authority-change'); stop()
  assert.equal(f.calls.filter(c => c === 'inspect').length, 1); assert.ok(!f.calls.includes('assets'))
})
for (const mode of ['reject', 'sync-throw', 'invalid', 'missing-ready-identity'] as const) await test(`current inspection ${mode} clears display but retains notebook/OCR owners`, async () => {
  const f = fixture(); f.notes = true; f.ocr = true
  f.inspect = mode === 'sync-throw' ? () => { throw Error('synthetic') } : mode === 'reject' ? () => Promise.reject(Error('synthetic'))
    : async () => (mode === 'invalid' ? { state: 'bad' } : { ...ready, identity: null }) as ActiveLibraryHostProjection
  await f.module.refresh('ready-assets')
  assert.equal(f.module.getSnapshot().projection.state, 'recovery-required'); assert.match(f.module.getSnapshot().error, /无法确认/)
  assert.equal(f.module.getSnapshot().reset?.kind, 'inspection-failed'); assert.equal(f.scope, null)
  assert.ok(f.calls.includes('reset')); assert.equal(f.notes, true); assert.equal(f.ocr, true)
  assert.ok(!f.calls.includes('clear-notes') && !f.calls.includes('clear-ocr'))
})
await test('valid non-ready clears only view scope; same-ready refresh does not reset stores', async () => {
  const f = fixture(); await f.module.refresh('ready-assets')
  assert.ok(!f.calls.includes('reset') && !f.calls.includes('clear-notes'))
  f.inspect = async () => closed; await f.module.refresh('inspect')
  assert.equal(f.scope, null); assert.ok(!f.calls.includes('reset'))
})
await test('unsaved confirmation cancellation retains state and does not invalidate outstanding reads', async () => {
  const f = fixture(), read = deferred<ActiveLibraryHostProjection>(); f.notes = true; f.ocr = true; f.confirm = false
  f.inspect = () => read.promise; const pending = f.module.refresh('ready-assets')
  assert.throws(() => f.module.revoke(), /已取消切换/)
  assert.equal(f.scope, key); assert.equal(f.notes, true); assert.equal(f.ocr, true)
  read.resolve(ready); await pending; assert.ok(f.calls.includes('assets')); assert.ok(!f.calls.includes('reset'))
})
await test('confirmed revoke synchronously clears owners, scope and display before asset reset', () => {
  const f = fixture(); f.ocr = true
  f.module.subscribe(() => f.calls.push('projection:' + f.module.getSnapshot().projection.state))
  f.module.revoke()
  assert.deepEqual(f.calls, ['confirm', 'clear-notes', 'clear-ocr', 'scope:null', 'projection:quiescing', 'reset'])
})
await test('cancelled-open recovery is inspect-only and never refreshes lists', async () => {
  const f = fixture(); f.module.revoke(); await f.module.refresh('inspect')
  assert.equal(f.scope, key); assert.ok(!f.calls.includes('assets') && !f.calls.includes('tags'))
})
await test('route detach rejects its late read without revoking drafts; a fresh mount can refresh', async () => {
  const f = fixture(), read = deferred<ActiveLibraryHostProjection>(); f.notes = true; f.ocr = true
  const stop = f.module.subscribe(() => {}); f.inspect = () => read.promise
  const pending = f.module.refresh('ready-assets'); stop(); read.resolve(ready); await pending
  assert.ok(!f.calls.includes('assets')); assert.equal(f.notes, true); assert.equal(f.ocr, true); assert.equal(f.scope, key)
  const stopNext = f.module.subscribe(() => {}); f.inspect = async () => ready; await f.module.refresh('ready-assets'); stopNext()
  assert.ok(f.calls.includes('assets'))
})
for (const cut of ['revoke', 'failure', 'disconnect'] as const) await test(`pending native return cannot restore after ${cut} and same-scope read`, async () => {
  const f = fixture(), read = deferred<ActiveLibraryHostProjection>(); f.inspect = () => read.promise
  const pending = f.module.receive({ kind: 'card-return', context })
  if (cut === 'revoke') f.module.revoke()
  if (cut === 'disconnect') f.module.disconnect()
  if (cut === 'failure') { f.inspect = () => Promise.reject(Error('synthetic')); await f.module.refresh('inspect') }
  f.inspect = async () => ready; await f.module.refresh('inspect')
  read.resolve(ready); await pending
  assert.ok(!f.calls.some(c => /^(drafts|mode|select|navigate|desktop):/.test(c)))
})
await test('ordinary route detach leaves the Shell native-return lifecycle active', async () => {
  const f = fixture(), read = deferred<ActiveLibraryHostProjection>()
  const stop = f.module.subscribe(() => {}); f.inspect = () => read.promise
  const pending = f.module.receive({ kind: 'card-return', context })
  stop(); read.resolve(ready); await pending
  assert.ok(f.calls.includes('drafts:synthetic-asset') && f.calls.includes('navigate:library'))
  assert.ok(!f.calls.includes('reset') && !f.calls.includes('clear-notes'))
})
for (const configureAi of [false, true]) await test(`valid native return applies drafts/selection before ${configureAi ? 'AI' : 'library'} navigation`, async () => {
  const f = fixture(); await f.module.receive({ kind: 'card-return', context: { ...context, configureAi } })
  assert.deepEqual(f.calls, ['inspect', 'scope:' + key, 'drafts:synthetic-asset', 'desktop:null', 'mode:focus', 'select:synthetic-asset', 'navigate:' + (configureAi ? 'ai-console' : 'library')])
})
await test('native return mismatch, failure and missing asset do not introduce reads or unsafe adoption', async () => {
  const f = fixture(); await f.module.receive({ kind: 'card-return', context: { ...context, generation: 'other' } })
  assert.deepEqual(f.calls, ['inspect'])
  f.inspect = () => Promise.reject(Error('synthetic')); await f.module.receive({ kind: 'card-return', context }); assert.equal(f.module.getSnapshot().error, '')
  f.inspect = async () => ready; await f.module.receive({ kind: 'card-return', context: { ...context, assetId: 'missing' } })
  assert.ok(f.calls.includes('navigate:library')); assert.ok(!f.calls.includes('assets') && !f.calls.some(c => c.startsWith('select:')))
})
await test('events preserve refresh sets and ignore other scopes and revoked display', async () => {
  const f = fixture()
  for (const kind of ['download-imported', 'tool-saved', 'ocr-changed'] as const) await f.module.receive({ kind, scope })
  await f.module.receive({ kind: 'visual-ai-changed', scope: { ...scope, assetId: 'synthetic-asset' } })
  f.selected = 'other'; await f.module.receive({ kind: 'visual-ai-changed', scope: { ...scope, assetId: 'synthetic-asset' } })
  await f.module.receive({ kind: 'card-drafts', context: { ...context, windowSelectionChanged: true } })
  await f.module.receive({ kind: 'card-metadata', context: { ...context, metadataChanged: true } })
  await f.module.receive({ kind: 'card-metadata', context })
  assert.deepEqual(f.calls, ['assets', 'tags', 'assets', 'tags', 'assets', 'assets', 'tags', 'relations:synthetic-asset', 'assets', 'tags', 'drafts:synthetic-asset', 'desktop:synthetic-asset', 'assets'])
  const before = f.calls.length
  await f.module.receive({ kind: 'ocr-changed', scope: { ...scope, generation: 'other' } }); assert.equal(f.calls.length, before)
  f.module.revoke(); const after = f.calls.length; await f.module.receive({ kind: 'card-drafts', context }); await f.module.receive({ kind: 'download-imported', scope }); assert.equal(f.calls.length, after)
})
