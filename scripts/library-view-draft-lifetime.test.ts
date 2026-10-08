import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AssetCardDraftRequest, AssetCardResult } from '../src/shared/contracts/asset-card.contract'

const requests: AssetCardDraftRequest[] = []
let update: (request: AssetCardDraftRequest) => Promise<AssetCardResult> = async () => ({ ok: true, state: null })
;(globalThis as any).window = { damClient: { assetCard: { updateDraft: (request: AssetCardDraftRequest) => { requests.push(request); return update(request) } } } }
const { useLibraryViewStore: view, flushLibraryDrafts } = await import('../src/renderer/stores/library-view.store')
const tick = () => new Promise<void>(resolve => setImmediate(resolve))
const scope = JSON.stringify(['synthetic-library', 'same-generation'])
function deferred() { let resolve!: (v: AssetCardResult) => void; const promise = new Promise<AssetCardResult>(yes => { resolve = yes }); return { promise, resolve } }
const success: AssetCardResult = { ok: true, state: null }, failure: AssetCardResult = { ok: false, code: 'STALE_CARD' }
const reset = () => { view.getState().setScope(null); view.getState().setScope(scope); requests.length = 0 }

for (const result of [success, failure]) await test(`same-scope reopen ignores in-flight old ${result.ok ? 'success' : 'failure'}`, async () => {
  reset(); const old = deferred(); update = () => old.promise
  view.getState().setPrompt('asset', 'old'); await tick(); assert.equal(requests.length, 1)
  view.getState().setScope(null); view.getState().setScope(scope); view.getState().acceptDrafts('asset', { promptDraft: 'new' })
  old.resolve(result); await tick()
  assert.equal(view.getState().draftSyncFailed, false); assert.equal(view.getState().prompts.asset, 'new')
  await flushLibraryDrafts(); assert.equal(requests.length, 1)
})
await test('queued old work is skipped even when Host scope returns to A', async () => {
  reset(); const first = deferred(); update = () => first.promise
  view.getState().setPrompt('asset', 'in-flight'); await tick()
  view.getState().setPrompt('asset', 'queued-old')
  view.getState().setScope(null); view.getState().setScope(scope)
  first.resolve(success); await flushLibraryDrafts()
  assert.equal(requests.length, 1); assert.equal(view.getState().draftSyncFailed, false)
})
await test('old completion cannot clear a current failure; retry uses newest text', async () => {
  reset(); const old = deferred(); let count = 0; update = () => ++count === 1 ? old.promise : Promise.resolve(failure)
  view.getState().setPrompt('asset', 'old'); await tick()
  view.getState().setScope(null); view.getState().setScope(scope); view.getState().setPrompt('asset', 'new')
  old.resolve(success); await tick(); assert.equal(view.getState().draftSyncFailed, true)
  view.getState().acceptDrafts('asset', { promptDraft: 'newer' }); update = async () => success
  await flushLibraryDrafts()
  assert.equal(requests.at(-1)?.promptDraft, 'newer'); assert.equal(view.getState().draftSyncFailed, false)
})
await test('same-scope refresh keeps live queued work and desktop-owned failure is not retried', async () => {
  reset(); const old = deferred(); update = () => old.promise
  view.getState().setDescription('asset', { value: 'draft', baseCaption: 'original' }); await tick()
  view.getState().setScope(scope); old.resolve(failure); await tick()
  assert.equal(view.getState().draftSyncFailed, true)
  view.getState().setDesktopAsset('asset'); await assert.rejects(flushLibraryDrafts(), /DRAFT_SYNC_FAILED/); assert.equal(requests.length, 1)
  view.getState().setDesktopAsset(null); update = async () => success; await flushLibraryDrafts()
  assert.deepEqual(requests.at(-1)?.descriptionDraft, { value: 'draft', baseCaption: 'original' })
  view.getState().setScope(null)
})
delete (globalThis as any).window
