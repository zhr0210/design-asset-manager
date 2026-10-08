import assert from 'node:assert/strict'
import { createAssetCardController } from '../src/main/asset-card/asset-card-controller'
import { registerAssetCardIpc } from '../src/main/ipc/asset-card.ipc'
import type { ActiveLibraryAssetProjection, ActiveLibraryHostProjection } from '../src/shared/contracts/active-library.contract'
import type { AssetCardSnapshot } from '../src/shared/contracts/asset-card.contract'

let authority: ActiveLibraryHostProjection = { state: 'ready', identity: 'library:one', generation: 'generation:one' }
const assets: ActiveLibraryAssetProjection[] = ['one', 'two'].map(id => ({ id: `asset:${id}`, revision: 'revision:one', title: id, fileName: `${id}.png`, sourceSiteId: '', sourceSiteName: '', width: 10, height: 10, fileSize: 50, fileType: 'png', thumbnailRef: `preview:${id}`, tags: [], createdAt: '', aiCaption: 'original description', aiCaptionIsUserEdited: false }))
let shown: AssetCardSnapshot | null = null
let windows = 0
let closed = 0
let writes = 0
let gate: Promise<void> | null = null
let returnDraft = ''
const changes: any[] = []
const card = createAssetCardController({
  host: {
    inspect: () => authority,
    readAssetContext: async ids => { await gate; return { schemaVersion: 4, assets: structuredClone(assets.filter(asset => ids.includes(asset.id))) } },
    updateAssetCaption: async (id, value, expected) => {
      const asset = assets.find(item => item.id === id)
      if (!asset || asset.aiCaption !== expected || authority.state !== 'ready') throw new Error('conflict')
      asset.aiCaption = value; writes++
    }
  },
  createWindow: () => { windows++; return { publish: state => { shown = state }, show: () => {}, setPinned: () => {}, close: () => { closed++ }, isTrusted: event => (event as { role?: string }).role === 'card' } },
  returnToWorkspace: (_context, _configure, draft) => { returnDraft = draft },
  onChanged: event => { changes.push(event) }
})
const handlers = new Map<string, Function>()
registerAssetCardIpc({ card, isMainSender: event => (event as any).role === 'main', handle: (channel, handler) => { handlers.set(channel, handler) } })
const invoke = (channel: string, role: string, body?: unknown) => Promise.resolve(handlers.get(channel)!({ role }, body))
const open = { libraryIdentity: 'library:one', generation: 'generation:one', assetId: 'asset:one', assetIds: ['asset:one', 'asset:two'] }
assert.equal((await invoke('asset-card:open', 'external', open)).code, 'UNTRUSTED_SENDER')
assert.equal((await invoke('asset-card:open', 'main', { ...open, filePath: '/not-allowed' })).code, 'INVALID_REQUEST')
assert.equal((await invoke('asset-card:open', 'main', { ...open, generation: 'generation:old' })).code, 'ASSET_UNAVAILABLE')
assert.equal(windows, 0)
await invoke('asset-card:draft', 'main', { libraryIdentity: open.libraryIdentity, generation: open.generation, assetId: 'asset:one', promptDraft: 'main draft' })
await invoke('asset-card:draft', 'main', { libraryIdentity: open.libraryIdentity, generation: open.generation, assetId: 'asset:two', promptDraft: 'second inline draft', descriptionDraft: { value: 'second inline description', baseCaption: 'original description' } })
const first = await invoke('asset-card:open', 'main', open)
assert.equal(first.ok, true)
assert.equal(first.state.asset.title, 'one')
assert.equal(first.state.promptDraft, 'main draft')
assert.equal(first.state.previewUrl, 'dam-preview://preview/library%3Aone/generation%3Aone/asset%3Aone')
assert.equal((await invoke('asset-card:inspect', 'main')).code, 'UNTRUSTED_SENDER')
assert.equal((await invoke('asset-card:action', 'main', { token: first.state.token, kind: 'pin', pinned: false })).code, 'UNTRUSTED_SENDER')
const action = (body: object) => invoke('asset-card:action', 'card', { token: card.inspect()!.token, ...body })
assert.equal((await action({ kind: 'prompt-draft', value: 'edited draft' })).ok, true)
await action({ kind: 'description-draft', value: 'unsaved description', baseCaption: 'original description' })
const repeated = await invoke('asset-card:open', 'main', open)
assert.equal(repeated.state.token, first.state.token)
assert.equal(repeated.state.promptDraft, 'edited draft')
assert.equal(repeated.state.descriptionDraft.value, 'unsaved description')
assert.equal(changes.some(event => event.assetId === 'asset:one' && event.promptDraft === 'edited draft'), true)
await action({ kind: 'pin', pinned: false })
assert.equal(card.inspect()!.pinned, false)
await action({ kind: 'next' })
assert.equal(card.inspect()!.asset.id, 'asset:two')
assert.equal(card.inspect()!.promptDraft, 'second inline draft')
assert.equal(card.inspect()!.descriptionDraft.value, 'second inline description')
assert.equal((await invoke('asset-card:action', 'card', { token: first.state.token, kind: 'save-description', value: 'wrong target', expectedCaption: 'original description' })).code, 'STALE_CARD')
assert.equal(writes, 0)
await action({ kind: 'previous' })
assert.equal(card.inspect()!.promptDraft, 'edited draft')
assert.equal(card.inspect()!.descriptionDraft.value, 'unsaved description')
assets[0].tags = ['changed-tag']
await card.refresh()
assert.deepEqual(card.inspect()!.asset.tags, ['changed-tag'])
assert.equal(card.inspect()!.descriptionDraft.value, 'unsaved description')
assets[0].aiCaption = 'changed elsewhere'
assert.equal((await action({ kind: 'save-description', value: 'stale edit', expectedCaption: 'original description' })).code, 'DESCRIPTION_CONFLICT')
assert.equal(card.inspect()!.asset.aiCaption, 'changed elsewhere')
assert.equal(writes, 0)
await action({ kind: 'save-description', value: '', expectedCaption: 'changed elsewhere' })
assert.equal(assets[0].aiCaption, '')
assert.equal(writes, 1)
await action({ kind: 'return' })
assert.equal(returnDraft, 'edited draft')
assert.equal(closed, 1)
await invoke('asset-card:open', 'main', open)
assert.equal(card.inspect()!.promptDraft, 'edited draft')
card.invalidate()
assert.equal(card.inspect(), null)
assert.equal(shown, null)

// A delayed read cannot create a window after its Library has been revoked.
let release!: () => void
gate = new Promise<void>(resolve => { release = resolve })
const pending = invoke('asset-card:open', 'main', open)
await Promise.resolve(); await Promise.resolve()
const beforeWindows = windows
authority = { state: 'closed', identity: null, generation: null }
card.invalidate(); release()
assert.equal((await pending).code, 'STALE_CARD')
assert.equal(windows, beforeWindows)
assert.equal(card.inspect(), null)
console.log('Asset card IPC: scope, stale results, navigation, drafts and description conflicts passed')
