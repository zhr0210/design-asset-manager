import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { registerActiveLibraryIpc, type ActiveLibraryIpcRegistrar } from '../src/main/ipc/active-library.ipc'
import { isTrustedLibrarySender } from '../src/main/trusted-sender'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-active-ipc-')))
const target = path.join(root, 'library')
const source = path.join(root, 'source.png')
await sharp({ create: { width: 20, height: 20, channels: 4, background: '#44aaff' } }).png().toFile(source)
const sourceBefore = await fs.readFile(source)
const deps = createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => ({ kind: 'selected', directory: target }),
  selectLocalFiles: async () => ({ kind: 'selected', files: [{ filePath: source }] })
})
const host = createActiveLibraryHost(deps)
const trustedWindow = { isDestroyed: () => false, webContents: { id: 7, getURL: () => 'file:///renderer/index.html' } }
const event = (id = 7, parent: unknown = null, url = 'file:///renderer/index.html') => ({ sender: { id }, senderFrame: { parent, url } } as any)
const handlers = new Map<string, (event: any, ...args: any[]) => any>()
const registrar: ActiveLibraryIpcRegistrar = (channel, handler) => { handlers.set(channel, handler) }
registerActiveLibraryIpc({ host, isTrustedSender: (input) => isTrustedLibrarySender(input as any, trustedWindow as any, 'file:///renderer/index.html') }, registrar)
const invoke = async (channel: string, inputEvent: any, ...args: any[]) => handlers.get(channel)!(inputEvent, ...args)

const createPlan = await invoke('library:create:prepare', event())
assert.equal(createPlan.success, true)
const created = await invoke('library:create:confirm', event(), { receipt: createPlan.value.plan.receipt })
assert.equal(created.success, true)
const addPlan = await invoke('library:add:prepare', event())
assert.equal(addPlan.success, true)
const promoted = await invoke('library:add:dispatch', event(), { receipt: addPlan.value.plan.receipt })
assert.equal(promoted.success, true)
const listed = await invoke('assets:list', event())
assert.equal(listed.success, true)
const asset = listed.value.assets[0]
const tag = await invoke('tag:create', event(), { name: 'ipc-tag' })
assert.equal(tag.success, true)
assert.equal((await invoke('asset-tag:add', event(), { assetId: asset.id, tagId: tag.value.tag.id })).success, true)
assert.equal((await invoke('asset-tag:list-by-asset', event(), { assetId: asset.id })).value.length, 1)
assert.equal((await invoke('asset-tag:remove', event(), { assetId: asset.id, tagId: tag.value.tag.id })).success, true)
const trash = await invoke('library-trash:inspect', event(), { assetId: asset.id })
const trashPlan = await invoke('library-trash:prepare', event(), { designAssetIdentity: asset.id, expectedRevision: trash.value.revision })
assert.equal((await invoke('library-trash:dispatch', event(), { kind: 'confirm-plan', planReceipt: trashPlan.value.plan.receipt })).success, true)
assert.equal((await invoke('assets:list', event())).value.assets.length, 0)
assert.equal((await invoke('library-trash:list', event())).value.length, 1)
const restored = await invoke('library-trash:dispatch', event(), { kind: 'restore-design-asset', designAssetIdentity: asset.id, expectedRevision: (await invoke('library-trash:inspect', event(), { assetId: asset.id })).value.revision })
assert.equal(restored.success, true)
assert.equal((await fs.readFile(source)).equals(sourceBefore), true)
const authority = (await invoke('library:inspect', event())).value
const media = await invoke('library:media:read-preview', event(), { assetId: asset.id, libraryIdentity: authority.identity, generation: authority.generation })
assert.equal(media.success, true)
assert.equal((await invoke('assets:update-caption', event(), { assetId: asset.id, caption: 'new description', expectedCaption: '' })).success, true)
assert.equal((await invoke('assets:update-caption', event(), { assetId: asset.id, caption: 'stale description', expectedCaption: '' })).success, false)
assert.equal((await invoke('assets:list', event())).value.assets[0].aiCaption, 'new description')
assert.equal((await invoke('assets:update-caption', event(), { assetId: asset.id, caption: '', expectedCaption: 'new description' })).success, true)
const negativeDatabaseBefore = await fs.readFile(path.join(target, '.dam', 'library.sqlite'))
const negativeSourceBefore = await fs.readFile(source)
for (const badEvent of [event(99), event(7, {}), event(7, null, 'https://untrusted.invalid')]) assert.equal((await invoke('assets:list', badEvent)).code, 'UNTRUSTED_SENDER')
const navigatedWindow = { isDestroyed: () => false, webContents: { id: 7, getURL: () => 'https://untrusted.invalid' } }
assert.equal(isTrustedLibrarySender(event(7, null, 'https://untrusted.invalid'), navigatedWindow as any, 'file:///renderer/index.html'), false)
assert.equal((await invoke('assets:delete', event(), asset.id)).code, 'LEGACY_DELETE_DISABLED')
assert.equal((await invoke('ai-worker:run-prompt-reverse', event(), {})).code, 'LIBRARY_FEATURE_DISABLED')
assert.equal((await invoke('library:media:read-preview', event(), { assetId: asset.id, libraryIdentity: authority.identity, generation: 'generation:old' })).code, 'library-generation-conflict')
assert.equal((await invoke('library:media:read-preview', event(), { assetId: asset.id, libraryIdentity: authority.identity, generation: authority.generation, extraPath: '/private' })).code, 'library-operation-failed')
assert.equal((await invoke('library:create:confirm', event(), { receipt: createPlan.value.plan.receipt, targetPath: '/private' })).code, 'library-operation-failed')
assert.equal((await fs.readFile(path.join(target, '.dam', 'library.sqlite'))).equals(negativeDatabaseBefore), true)
assert.equal((await fs.readFile(source)).equals(negativeSourceBefore), true)
await invoke('library:close', event())
assert.equal((await invoke('library:reopen', event())).success, true)
await host.close()
console.log('Active Library IPC integration passed')
