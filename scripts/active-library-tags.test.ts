import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import Database from 'better-sqlite3'

import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { registerActiveLibraryIpc } from '../src/main/ipc/active-library.ipc'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-active-tags-')))
const target = path.join(root, 'library')
const sourceOne = path.join(root, 'one.png')
const sourceTwo = path.join(root, 'two.png')
await sharp({ create: { width: 24, height: 24, channels: 4, background: '#aa44ff' } }).png().toFile(sourceOne)
await sharp({ create: { width: 30, height: 20, channels: 4, background: '#44ffaa' } }).png().toFile(sourceTwo)
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => ({ kind: 'selected' as const, directory: target }),
  selectLocalFiles: async () => ({ kind: 'selected' as const, files: [{ filePath: sourceOne }, { filePath: sourceTwo }] })
}))
const handlers = new Map<string, (event: unknown, ...args: any[]) => any>()
const registrar = (channel: string, handler: (event: unknown, ...args: any[]) => any) => handlers.set(channel, handler)
registerActiveLibraryIpc({ host, isTrustedSender: () => true }, registrar)
const event = { sender: { id: 1 }, senderFrame: { parent: null, url: 'file:///synthetic/renderer/index.html' } }
const invoke = async (channel: string, ...args: any[]) => handlers.get(channel)!(event, ...args)

const createPlan = await invoke('library:create:prepare')
assert.equal(createPlan.success, true)
assert.equal((await invoke('library:create:confirm', { receipt: createPlan.value.plan.receipt })).success, true)
const addPlan = await invoke('library:add:prepare')
assert.equal(addPlan.success, true)
assert.equal((await invoke('library:add:dispatch', { receipt: addPlan.value.plan.receipt })).success, true)
const assets = (await invoke('assets:list')).value.assets
assert.equal(assets.length, 2)

const commaTag = (await invoke('tag:create', { name: '海,蓝' })).value.tag
const duplicateCommaTag = (await invoke('tag:create', { name: '  海,蓝  ' })).value.tag
assert.equal(duplicateCommaTag.id, commaTag.id)
const secondTag = (await invoke('tag:create', { name: '中文' })).value.tag
assert.equal((await invoke('tag:update', { id: secondTag.id, input: { name: '海,蓝' } })).code, 'library-operation-failed')
const renamed = await invoke('tag:update', { id: secondTag.id, input: { name: '改名,标签' } })
assert.equal(renamed.success, true)
assert.equal(renamed.value.name, '改名,标签')

assert.equal((await invoke('asset-tag:batch-add', { assetIds: assets.map((asset: any) => asset.id), tagIds: [commaTag.id, secondTag.id], options: undefined })).success, true)
const taggedAssets = (await invoke('assets:list')).value.assets
assert.ok(taggedAssets.every((asset: any) => asset.tags.includes('海,蓝') && asset.tags.includes('改名,标签')))
assert.equal((await invoke('tag:search', '海,')).value.length, 1)
assert.equal((await invoke('tag-search:assets', ['tag:海,蓝'])).value.length, 2)
assert.equal((await invoke('tag-search:untagged')).value.length, 0)
assert.equal((await invoke('tag:list')).value.find((tag: any) => tag.id === commaTag.id).usageCount, 2)

const thirdTag = (await invoke('tag:create', { name: '待验证' })).value.tag
const beforeInvalid = (await invoke('asset-tag:list-by-asset', { assetId: assets[0].id })).value
assert.equal((await invoke('asset-tag:batch-add', { assetIds: [assets[0].id, 'asset-missing'], tagIds: [thirdTag.id] })).code, 'library-operation-failed')
assert.deepEqual((await invoke('asset-tag:list-by-asset', { assetId: assets[0].id })).value, beforeInvalid)

assert.equal((await invoke('asset-tag:replace', { assetIds: assets.map((asset: any) => asset.id), oldTagId: commaTag.id, newTagId: thirdTag.id })).success, true)
assert.ok((await invoke('asset-tag:list-by-asset', { assetId: assets[0].id })).value.every((relation: any) => relation.tagId !== commaTag.id))
assert.equal((await invoke('asset-tag:batch-remove', { assetIds: assets.map((asset: any) => asset.id), tagIds: [thirdTag.id, secondTag.id] })).success, true)
assert.equal((await invoke('tag-search:untagged')).value.length, 2)

const readd = await invoke('asset-tag:add', { assetId: assets[0].id, tagId: secondTag.id })
assert.equal(readd.success, true)
const trashInspect = await invoke('library-trash:inspect', { assetId: assets[0].id })
const trashPlan = await invoke('library-trash:prepare', { designAssetIdentity: assets[0].id, expectedRevision: trashInspect.value.revision })
assert.equal((await invoke('library-trash:dispatch', { kind: 'confirm-plan', planReceipt: trashPlan.value.plan.receipt })).success, true)
assert.equal((await invoke('tag-search:assets', ['tag:改名,标签'])).value.length, 0)
assert.equal((await invoke('tag:list')).value.find((tag: any) => tag.id === secondTag.id).usageCount, 0)
const survivingAssetRelations = (await invoke('asset-tag:list-by-asset', { assetId: assets[1].id })).value
assert.equal((await invoke('asset-tag:batch-add', { assetIds: [assets[0].id, assets[1].id], tagIds: [thirdTag.id] })).code, 'library-operation-failed')
assert.deepEqual((await invoke('asset-tag:list-by-asset', { assetId: assets[1].id })).value, survivingAssetRelations)
const trashedRelations = (await invoke('asset-tag:list-by-asset', { assetId: assets[0].id })).value
assert.deepEqual(trashedRelations, [])

const restored = await invoke('library-trash:dispatch', {
  kind: 'restore-design-asset', designAssetIdentity: assets[0].id,
  expectedRevision: (await invoke('library-trash:inspect', { assetId: assets[0].id })).value.revision
})
assert.equal(restored.success, true)
assert.equal((await invoke('asset-tag:list-by-asset', { assetId: assets[0].id })).value.some((relation: any) => relation.tagName === '改名,标签'), true)
assert.equal((await invoke('library:close')).success, true)
assert.equal((await invoke('library:reopen')).success, true)
assert.equal((await invoke('asset-tag:list-by-asset', { assetId: assets[0].id })).value.some((relation: any) => relation.tagName === '改名,标签'), true)

// Restored alias and hierarchy operations use the held Active Library.
const notifications: string[] = []
const scopedHandlers = new Map<string, (event: any, ...args: any[]) => any>()
registerActiveLibraryIpc({ host, isTrustedSender: e => e.sender.id === 1, onAssetsChanged: () => { notifications.push('changed') } }, (channel, handler) => scopedHandlers.set(channel, handler))
const call = (channel: string, input: unknown, senderId = 1) => scopedHandlers.get(channel)!({ sender: { id: senderId } }, input)
assert.equal((await call('tag:create-alias', { tagId: secondTag.id, alias: '  Blue Sea  ' })).success, true)
assert.equal((await call('tag:create-alias', { tagId: secondTag.id, alias: 'blue sea' })).success, true)
assert.deepEqual((await host.getTag(secondTag.id))!.aliases, ['Blue Sea'])
assert.equal((await host.searchTags('SEA'))[0].id, secondTag.id)
assert.equal((await host.searchAssets(['tag:blue sea'])).length, 1)
assert.deepEqual((await host.listAssets()).find(a => a.id === assets[0].id)!.tagAliases, ['Blue Sea'])
assert.equal((await call('tag:create-alias', { tagId: 'tag:missing', alias: 'unknown' })).success, false)
assert.equal((await call('tag:create-alias', { tagId: secondTag.id, alias: '' })).success, false)
assert.equal((await call('tag:create-alias', { tagId: secondTag.id, alias: 'x', extraPath: '/outside' })).success, false)
// A failure after alias insertion must roll back both normalized rows and JSON projection.
const faultDb = new Database(path.join(target, '.dam', 'library.sqlite'))
try {
  faultDb.exec("CREATE TRIGGER reject_alias_snapshot BEFORE UPDATE OF aliases ON tags BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END")
  assert.equal((await call('tag:create-alias', { tagId: secondTag.id, alias: 'rollback-me' })).success, false)
  assert.equal(faultDb.prepare("SELECT COUNT(*) AS n FROM tag_aliases WHERE alias='rollback-me'").get().n, 0)
  assert.deepEqual((await host.getTag(secondTag.id))!.aliases, ['Blue Sea'])
} finally { faultDb.exec('DROP TRIGGER reject_alias_snapshot'); faultDb.close() }
const parent = await host.createTag({ name: '父标签' })
const grandparent = await host.createTag({ name: '顶层' })
assert.equal((await call('tag:set-parent', { tagId: secondTag.id, parentId: parent.id })).success, true)
assert.equal((await call('tag:set-parent', { tagId: parent.id, parentId: grandparent.id })).success, true)
assert.equal((await call('tag:set-parent', { tagId: grandparent.id, parentId: secondTag.id })).success, false)
assert.equal((await call('tag:set-parent', { tagId: secondTag.id, parentId: secondTag.id })).success, false)
assert.equal((await call('tag:set-parent', { tagId: secondTag.id, parentId: 'tag:missing' })).success, false)
assert.equal((await host.getTag(secondTag.id))!.parentId, parent.id)
assert.equal((await call('tag:set-parent', { tagId: secondTag.id, parentId: null }, 99)).code, 'UNTRUSTED_SENDER')
assert.ok(notifications.length >= 4)
await host.close(); await host.reopen()
assert.deepEqual((await host.getTag(secondTag.id))!.aliases, ['Blue Sea'])
assert.equal((await host.getTag(secondTag.id))!.parentId, parent.id)
assert.equal((await call('tag:remove-alias', { tagId: secondTag.id, alias: 'BLUE SEA' })).success, true)
assert.deepEqual((await host.getTag(secondTag.id))!.aliases, [])
assert.equal((await host.searchAssets(['tag:blue sea'])).length, 0)
assert.equal((await call('tag:set-parent', { tagId: secondTag.id, parentId: null })).success, true)
assert.equal((await host.getTag(secondTag.id))!.parentId, null)
await host.close()
console.log('Active Library tag/search integration passed')
