import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createExternalConnectedLibrary, ExternalConnectedLibraryError } from '../src/main/external-connected-library'
import type {
  EagleProviderConnection,
  EagleProviderItem,
  EagleProviderMutationResult,
  EagleProviderPage,
  EagleProviderPort
} from '../src/main/external-connected-library'
import type { ConnectedLibraryScope, ConnectedMetadataPatch } from '../src/shared/contracts/external-connected-library.contract'

async function run() {
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-connected-core-')))
const sourceEdit = path.join(root, 'edit.png')
await fs.writeFile(sourceEdit, Buffer.from('synthetic-edited-file'))
let currentTime = new Date('2026-09-10T00:00:00.000Z')
let selectedEdit = sourceEdit
let identitySequence = 0
const createIdentity = (kind: string) => `${kind}:${String(++identitySequence).padStart(4, '0')}`

const provider = new FakeEagleProvider([
  item('shared-id', 'Blue Poster', ['folder-a'], { tags: ['base'], content: 'blue-v1' }),
  item('item-two', 'Green Card', ['folder-a'], { content: 'green-v1' }),
  item('outside', 'Outside Scope', ['folder-b'], { content: 'outside-v1' })
])

const host = await createHost('primary')
const prepared = await host.prepareConnection({ scope: { kind: 'folders', folderIds: ['folder-a'] }, requestedGrant: 'read-write' })
assert.equal(prepared.kind, 'planned')
if (prepared.kind !== 'planned') throw new Error('Expected connection review.')
assert.equal(prepared.review.originalPolicy, 'eagle-remains-the-only-original-authority')
assert.equal(prepared.review.capabilities.fileReplace, true)
const connected = await host.confirmConnection(prepared.review.receipt)
assert.equal(connected.state, 'indexing')
assert.deepEqual(await host.confirmConnection(prepared.review.receipt), connected, 'Connection confirmation must replay.')

const pageOne = await host.indexNextPage(1)
assert.equal(pageOne.complete, false)
const pageTwo = await host.indexNextPage(100)
assert.equal(pageTwo.complete, true)
assert.equal(pageTwo.projection.counts.indexed, 3)
assert.equal(pageTwo.projection.counts.inScope, 2)
const indexed = await host.listItems()
assert.equal(indexed.find((entry) => entry.providerItemId === 'outside')?.lifecycle, 'out-of-scope')
const blue = indexed.find((entry) => entry.providerItemId === 'shared-id')!
const green = indexed.find((entry) => entry.providerItemId === 'item-two')!

const duplicateOne = await host.queueMetadata({ itemKey: blue.key, clientReceipt: 'receipt:metadata-one', patch: { name: 'Local Blue' } })
const duplicateTwo = await host.queueMetadata({ itemKey: blue.key, clientReceipt: 'receipt:metadata-one', patch: { name: 'Local Blue' } })
assert.equal(duplicateTwo.operationId, duplicateOne.operationId)
provider.mutateRemote('shared-id', { tags: ['remote-tag'] })
await host.synchronize()
assert.equal(provider.requireItem('shared-id').name, 'Local Blue')
assert.deepEqual(provider.requireItem('shared-id').tags, ['remote-tag'], 'Different-field changes must merge.')

await host.queueMetadata({ itemKey: blue.key, clientReceipt: 'receipt:field-conflict', patch: { name: 'Local Conflict' } })
await host.queueMetadata({ itemKey: green.key, clientReceipt: 'receipt:other-item', patch: { rating: 4 } })
provider.mutateRemote('shared-id', { name: 'Eagle Conflict' })
await host.synchronize()
assert.equal((await host.listConflicts()).some((entry) => entry.kind === 'field' && entry.field === 'name'), true)
assert.equal(provider.requireItem('item-two').rating, 4, 'A conflict on one item must not stop other items.')
const fieldConflict = (await host.listConflicts()).find((entry) => entry.kind === 'field')!
await host.resolveConflict({ conflictId: fieldConflict.conflictId, decision: 'use-local' })
await host.synchronize()
assert.equal(provider.requireItem('shared-id').name,'Local Conflict')

provider.nextMetadataMutation = 'apply-then-timeout'
await host.queueMetadata({ itemKey: green.key, clientReceipt: 'receipt:timeout-applied', patch: { annotation: 'Committed once' } })
await host.synchronize()
assert.equal(provider.requireItem('item-two').annotation, 'Committed once')
assert.equal(provider.metadataMutationCount.get('item-two'), 2, 'Only the prior rating and one timeout-applied edit may execute.')

provider.online = false
await host.queueMetadata({ itemKey: green.key, clientReceipt: 'receipt:offline', patch: { tags: ['queued-offline'] } })
const disconnected = await host.synchronize()
assert.equal(disconnected.state, 'disconnected')
assert.equal((await host.listItems()).find((entry) => entry.key === green.key)?.originalAvailability, 'offline')
provider.nextAddMutation='apply-then-timeout'
const offlineAdded=await host.prepareNewAsset({metadata:{name:'Offline New',folderIds:['folder-a']}})
assert.equal(offlineAdded.kind,'staged')
provider.online = true
await host.synchronize()
assert.deepEqual(provider.requireItem('item-two').tags, ['queued-offline'])
assert.equal([...provider.items.values()].some((entry)=>entry.name==='Offline New'),true)
assert.equal(provider.addMutationCount,1,'A lost add response must verify the exact custom Eagle item ID before avoiding a retry.')

selectedEdit = sourceEdit
const staged = await host.prepareFileReplacement({ itemKey: green.key })
assert.equal(staged.kind, 'staged')
provider.nextFileMutation = 'apply-then-timeout'
await host.synchronize()
assert.equal(provider.requireItem('item-two').contentFingerprint, digest(Buffer.from('synthetic-edited-file')))
assert.equal(provider.fileMutationCount, 1, 'Read-back after timeout must avoid duplicate replaceFile calls.')

const secondEdit=path.join(root,'edit-two.png');await fs.writeFile(secondEdit,Buffer.from('second-local-edit'));selectedEdit=secondEdit
const stagedConflict=await host.prepareFileReplacement({itemKey:green.key});assert.equal(stagedConflict.kind,'staged')
provider.mutateContent('item-two',Buffer.from('concurrent-eagle-edit'))
await host.synchronize()
const fileConflict=(await host.listConflicts()).find((entry)=>entry.kind==='file'&&entry.state==='unresolved')
assert.ok(fileConflict,'Concurrent local/Eagle file changes must preserve a conflict.')
provider.online=false
await assert.rejects(host.resolveConflict({conflictId:fileConflict!.conflictId,decision:'use-eagle'}))
assert.equal((await host.listConflicts()).find((entry)=>entry.conflictId===fileConflict!.conflictId)?.state,'unresolved','Disconnected conflict resolution must not change the decision state.')
assert.equal((await fs.readdir(path.join(root,'primary','edit-staging'))).length,1,'Disconnected resolution must retain staged bytes.')
await host.resolveConflict({conflictId:fileConflict!.conflictId,decision:'hold'})
assert.equal((await host.listConflicts()).find((entry)=>entry.conflictId===fileConflict!.conflictId)?.state,'held','Hold must remain available as a local-only decision while Eagle is offline.')
assert.equal((await fs.readdir(path.join(root,'primary','edit-staging'))).length,1,'Holding offline must retain staged bytes.')
provider.online=true
await host.resolveConflict({conflictId:fileConflict!.conflictId,decision:'use-eagle'})
assert.equal((await fs.readdir(path.join(root,'primary','edit-staging'))).length,0,'Choosing Eagle releases only the rejected DAM-owned staged copy.')

const trash = await host.queueLifecycle({ itemKey: green.key, clientReceipt: 'receipt:trash', action: 'trash' })
assert.equal((await host.queueLifecycle({ itemKey: green.key, clientReceipt: 'receipt:trash', action: 'trash' })).operationId, trash.operationId)
await host.synchronize()
assert.equal(provider.requireItem('item-two').isDeleted, true)
currentTime = new Date('2026-10-12T00:00:00.000Z')
const cleanup = await host.listCleanupCandidates()
assert.equal(cleanup.find((entry) => entry.itemKey === green.key)?.confirmable, true)
await host.queueLifecycle({ itemKey: green.key, clientReceipt: 'receipt:restore', action: 'restore' })
await host.synchronize()
assert.equal(provider.requireItem('item-two').isDeleted, false)

await host.queueLifecycle({ itemKey: green.key, clientReceipt: 'receipt:trash-again', action: 'trash' })
await host.synchronize()
currentTime = new Date('2026-11-15T00:00:00.000Z')
const cleanupAgain = await host.listCleanupCandidates()
assert.equal(cleanupAgain.find((entry) => entry.itemKey === green.key)?.confirmable, true)
await host.confirmPermanentCleanup({ itemKey: green.key, clientReceipt: 'receipt:permanent-cleanup' })
assert.equal(provider.getStoredItem('item-two'), null)
assert.equal((await host.listItems()).find((entry) => entry.key === green.key)?.lifecycle, 'tombstone')

provider.mutateRemote('shared-id', { folderIds: ['folder-b'] })
await host.indexNextPage(100)
assert.equal((await host.listItems()).find((entry) => entry.key === blue.key)?.lifecycle, 'out-of-scope', 'Leaving scope must not Trash the Eagle item.')
assert.equal(provider.requireItem('shared-id').isDeleted, false)

provider.replaceLibrary('eagle-library:other', 'volume:other')
await assert.rejects(host.indexNextPage(100), (error) => error instanceof ExternalConnectedLibraryError && error.code === 'connected-library-identity-changed')
assert.equal(host.inspect().state, 'conflict')
provider.replaceLibrary('eagle-library:synthetic', 'volume:synthetic')
provider.mutateRemote('shared-id', { folderIds: ['folder-a'] })
await host.indexNextPage(100)

const previewBytes = Buffer.from('synthetic-preview')
provider.previews.set('shared-id', previewBytes)
assert.deepEqual(Buffer.from(await host.readPreview(blue.key)), previewBytes)
provider.online = false
assert.deepEqual(Buffer.from(await host.readPreview(blue.key)), previewBytes, 'Cached preview must remain usable offline.')
provider.online = true

await host.close()
const reopened = await createHost('primary')
assert.equal(reopened.inspect().counts.indexed, 4)
assert.equal((await reopened.listOperations()).length > 0, true)
await reopened.close()

const quotaHost = await createExternalConnectedLibrary({
  appOwnedRoot: path.join(root, 'quota'),
  databasePath: path.join(root, 'quota', 'connected.sqlite'),
  previewCacheDirectory: path.join(root, 'quota', 'cache'),
  editStagingDirectory: path.join(root, 'quota', 'staging'),
  previewCacheQuotaBytes: 4,
  editStagingQuotaBytes: 2,
  provider,
  editSelection: { selectEditFile: async () => ({ kind: 'selected', filePath: sourceEdit }) },
  createIdentity,
  now: () => currentTime
})
const quotaReview = await quotaHost.prepareConnection({ scope: { kind: 'all' }, requestedGrant: 'read-write' })
if (quotaReview.kind !== 'planned') throw new Error('Expected quota review.')
await quotaHost.confirmConnection(quotaReview.review.receipt)
await quotaHost.indexNextPage(100)
const quotaItem = (await quotaHost.listItems())[0]
await assert.rejects(quotaHost.prepareFileReplacement({ itemKey: quotaItem.key }), (error) => error instanceof ExternalConnectedLibraryError && error.code === 'connected-library-staging-quota-exceeded')
assert.equal((await quotaHost.listOperations()).length, 0)
await quotaHost.close()

const failedStagingRoot=path.join(root,'failed-staging')
const failedStagingDirectory=path.join(failedStagingRoot,'staging')
const failedStagingHost=await createExternalConnectedLibrary({appOwnedRoot:failedStagingRoot,databasePath:path.join(failedStagingRoot,'db.sqlite'),previewCacheDirectory:path.join(failedStagingRoot,'cache'),editStagingDirectory:failedStagingDirectory,previewCacheQuotaBytes:1024,editStagingQuotaBytes:1024*1024,provider,editSelection:{selectEditFile:async()=>({kind:'selected',filePath:sourceEdit})},createIdentity})
const failedReview=await failedStagingHost.prepareConnection({scope:{kind:'all'},requestedGrant:'read-write'});if(failedReview.kind!=='planned')throw new Error();await failedStagingHost.confirmConnection(failedReview.review.receipt);await failedStagingHost.indexNextPage();const failedItem=(await failedStagingHost.listItems())[0];await fs.rm(failedStagingDirectory,{recursive:true});await fs.writeFile(failedStagingDirectory,Buffer.from('synthetic disk failure'))
await assert.rejects(failedStagingHost.prepareFileReplacement({itemKey:failedItem.key}),(error)=>error instanceof ExternalConnectedLibraryError&&error.code==='connected-library-staging-failed')
assert.equal((await failedStagingHost.listOperations()).length,0,'A staging write failure must not enqueue a file replacement.')
await failedStagingHost.close()

const readOnlyHost=await createExternalConnectedLibrary({appOwnedRoot:path.join(root,'readonly'),databasePath:path.join(root,'readonly','db.sqlite'),previewCacheDirectory:path.join(root,'readonly','cache'),editStagingDirectory:path.join(root,'readonly','staging'),previewCacheQuotaBytes:1024,editStagingQuotaBytes:1024,provider,editSelection:{selectEditFile:async()=>({kind:'cancelled'})},createIdentity})
const readOnlyReview=await readOnlyHost.prepareConnection({scope:{kind:'all'},requestedGrant:'read-only'});if(readOnlyReview.kind!=='planned')throw new Error();await readOnlyHost.confirmConnection(readOnlyReview.review.receipt);await readOnlyHost.indexNextPage();const readOnlyItem=(await readOnlyHost.listItems())[0]
await assert.rejects(readOnlyHost.queueMetadata({itemKey:readOnlyItem.key,clientReceipt:'receipt:no-grant',patch:{name:'blocked'}}),(error)=>error instanceof ExternalConnectedLibraryError&&error.code==='connected-library-read-only')
await readOnlyHost.close()

const libraryAProvider = new FakeEagleProvider([item('shared-id', 'Library A Item', [], { content: 'a' })])
const libraryA = await createExternalConnectedLibrary({
  appOwnedRoot: path.join(root, 'library-a'), databasePath: path.join(root, 'library-a', 'db.sqlite'),
  previewCacheDirectory: path.join(root, 'library-a', 'cache'), editStagingDirectory: path.join(root, 'library-a', 'staging'),
  previewCacheQuotaBytes: 1024, editStagingQuotaBytes: 1024, provider: libraryAProvider,
  editSelection: { selectEditFile: async () => ({ kind: 'cancelled' }) }, createIdentity
})
const aReview = await libraryA.prepareConnection({scope:{kind:'all'},requestedGrant:'read-only'}); if(aReview.kind!=='planned')throw new Error(); await libraryA.confirmConnection(aReview.review.receipt); await libraryA.indexNextPage()
const keyA = (await libraryA.listItems())[0].key
libraryAProvider.replaceLibrary('eagle-library:b','volume:b')
await libraryA.disconnect()
await libraryA.close()
const libraryBProvider = new FakeEagleProvider([item('shared-id', 'Library B Item', [], { content: 'b' })]); libraryBProvider.replaceLibrary('eagle-library:b','volume:b')
const libraryB = await createExternalConnectedLibrary({appOwnedRoot:path.join(root,'library-b'),databasePath:path.join(root,'library-b','db.sqlite'),previewCacheDirectory:path.join(root,'library-b','cache'),editStagingDirectory:path.join(root,'library-b','staging'),previewCacheQuotaBytes:1024,editStagingQuotaBytes:1024,provider:libraryBProvider,editSelection:{selectEditFile:async()=>({kind:'cancelled'})},createIdentity})
const bReview=await libraryB.prepareConnection({scope:{kind:'all'},requestedGrant:'read-only'});if(bReview.kind!=='planned')throw new Error();await libraryB.confirmConnection(bReview.review.receipt);await libraryB.indexNextPage();const keyB=(await libraryB.listItems())[0].key
assert.notEqual(keyA,keyB,'The same Eagle item ID in different libraries must have different keys.')
await libraryB.close()

const deletionProvider=new FakeEagleProvider([item('doomed','Doomed',[],{content:'doomed'})])
const deletionHost=await createExternalConnectedLibrary({appOwnedRoot:path.join(root,'deletion'),databasePath:path.join(root,'deletion','db.sqlite'),previewCacheDirectory:path.join(root,'deletion','cache'),editStagingDirectory:path.join(root,'deletion','staging'),previewCacheQuotaBytes:1024,editStagingQuotaBytes:1024,provider:deletionProvider,editSelection:{selectEditFile:async()=>({kind:'cancelled'})},createIdentity})
const deletionReview=await deletionHost.prepareConnection({scope:{kind:'all'},requestedGrant:'read-write'});if(deletionReview.kind!=='planned')throw new Error();await deletionHost.confirmConnection(deletionReview.review.receipt);await deletionHost.indexNextPage();const doomed=(await deletionHost.listItems())[0];await deletionHost.queueMetadata({itemKey:doomed.key,clientReceipt:'receipt:delete-versus-edit',patch:{name:'Keep local edit'}});deletionProvider.deleteExternally('doomed');await deletionHost.indexNextPage();assert.equal((await deletionHost.listItems())[0].lifecycle,'tombstone');assert.equal((await deletionHost.listConflicts()).some((entry)=>entry.kind==='delete-versus-edit'),true)
await deletionHost.close()

const multiProvider = new FakeEagleProvider([
  item('multi', 'Base Name', [], { tags: ['base-tag'], content: 'multi-v1' })
])
const multiHost = await createIsolatedHost('multi-field', multiProvider)
await connectAndIndex(multiHost)
const multiItem = (await multiHost.listItems())[0]
await multiHost.queueMetadata({
  itemKey: multiItem.key,
  clientReceipt: 'receipt:multi-field',
  patch: { name: 'Local Name', annotation: 'Local Note', rating: 5 }
})
multiProvider.mutateRemote('multi', {
  name: 'Eagle Name',
  annotation: 'Eagle Note',
  tags: ['remote-unrelated']
})
await multiHost.synchronize()
assert.equal(multiProvider.requireItem('multi').rating, 5, 'A non-conflicting field must apply immediately.')
assert.deepEqual(multiProvider.requireItem('multi').tags, ['remote-unrelated'])
let multiConflicts = (await multiHost.listConflicts()).filter((entry) => entry.kind === 'field')
assert.deepEqual(multiConflicts.map((entry) => entry.field).sort(), ['annotation', 'name'])
await multiHost.resolveConflict({
  conflictId: multiConflicts.find((entry) => entry.field === 'name')!.conflictId,
  decision: 'use-eagle'
})
multiConflicts = (await multiHost.listConflicts()).filter((entry) => entry.kind === 'field')
assert.equal(multiConflicts.find((entry) => entry.field === 'annotation')?.state, 'unresolved')
assert.equal((await multiHost.listOperations()).find((entry) => entry.clientReceipt === 'receipt:multi-field')?.state, 'conflict')
await multiHost.resolveConflict({
  conflictId: multiConflicts.find((entry) => entry.field === 'annotation')!.conflictId,
  decision: 'use-local'
})
await multiHost.synchronize()
assert.equal(multiProvider.requireItem('multi').name, 'Eagle Name')
assert.equal(multiProvider.requireItem('multi').annotation, 'Local Note')
assert.equal(multiProvider.requireItem('multi').rating, 5)
assert.deepEqual(multiProvider.requireItem('multi').tags, ['remote-unrelated'])
await multiHost.close()

const unavailableProvider = new FakeEagleProvider([
  item('stable', 'Stable', [], { content: 'stable-v1' })
])
const unavailableHost = await createIsolatedHost('unavailable-lookup', unavailableProvider)
await connectAndIndex(unavailableHost)
const stableItem = (await unavailableHost.listItems())[0]
await unavailableHost.queueMetadata({
  itemKey: stableItem.key,
  clientReceipt: 'receipt:unavailable',
  patch: { name: 'Must Stay Queued' }
})
unavailableProvider.lookupUnavailable = true
await unavailableHost.synchronize()
assert.equal((await unavailableHost.listItems())[0].lifecycle, 'active')
assert.equal((await unavailableHost.listOperations())[0].state, 'pending')
assert.equal(unavailableProvider.metadataMutationCount.get('stable') ?? 0, 0)
unavailableProvider.lookupUnavailable = false
await unavailableHost.synchronize()
assert.equal(unavailableProvider.requireItem('stable').name, 'Must Stay Queued')
await unavailableHost.close()

const uncertainAddProvider = new FakeEagleProvider([])
const uncertainAddHost = await createIsolatedHost('uncertain-add', uncertainAddProvider)
await connectAndIndex(uncertainAddHost)
uncertainAddProvider.online = false
const uncertainAdd = await uncertainAddHost.prepareNewAsset({ metadata: { name: 'Uncertain Add' } })
assert.equal(uncertainAdd.kind, 'staged')
uncertainAddProvider.online = true
uncertainAddProvider.nextAddMutation = 'apply-then-timeout'
uncertainAddProvider.lookupUnavailableAfterAdd = true
await uncertainAddHost.synchronize()
assert.equal(uncertainAddProvider.addMutationCount, 1)
await uncertainAddHost.synchronize()
assert.equal(uncertainAddProvider.addMutationCount, 1, 'An add with a lost response and unavailable verification must not be resent.')
assert.equal((await uncertainAddHost.listOperations())[0].state, 'conflict')
assert.equal((await fs.readdir(path.join(root, 'uncertain-add', 'edit-staging'))).length, 1, 'Uncertain add staging must be retained.')
await uncertainAddHost.close()

const fileRaceProvider = new FakeEagleProvider([
  item('file-race', 'File Race', [], { content: 'file-race-v1' })
])
const fileRaceHost = await createIsolatedHost('file-race', fileRaceProvider)
await connectAndIndex(fileRaceHost)
const fileRaceItem = (await fileRaceHost.listItems())[0]
selectedEdit = sourceEdit
await fileRaceHost.prepareFileReplacement({ itemKey: fileRaceItem.key })
fileRaceProvider.mutateImmediatelyBeforeReplace = true
await fileRaceHost.synchronize()
assert.equal(fileRaceProvider.fileMutationCount, 0, 'A provider change after the core check must block replacement.')
assert.equal(fileRaceProvider.requireItem('file-race').contentFingerprint, digest(Buffer.from('provider-race-change')))
assert.equal((await fileRaceHost.listConflicts()).some((entry) => entry.kind === 'file'), true)
assert.equal((await fs.readdir(path.join(root, 'file-race', 'edit-staging'))).length, 1)
await fileRaceHost.close()

const cleanupUnavailableProvider = new FakeEagleProvider([
  item('cleanup-uncertain', 'Cleanup Uncertain', [], { content: 'cleanup-v1' })
])
const cleanupUnavailableHost = await createIsolatedHost('cleanup-unavailable', cleanupUnavailableProvider)
await connectAndIndex(cleanupUnavailableHost)
const cleanupUnavailableItem = (await cleanupUnavailableHost.listItems())[0]
await cleanupUnavailableHost.queueLifecycle({
  itemKey: cleanupUnavailableItem.key,
  clientReceipt: 'receipt:cleanup-trash',
  action: 'trash'
})
await cleanupUnavailableHost.synchronize()
currentTime = new Date('2027-01-15T00:00:00.000Z')
cleanupUnavailableProvider.lookupUnavailableAfterPermanent = true
await cleanupUnavailableHost.confirmPermanentCleanup({
  itemKey: cleanupUnavailableItem.key,
  clientReceipt: 'receipt:cleanup-uncertain'
})
assert.equal((await cleanupUnavailableHost.listItems())[0].lifecycle, 'trash', 'Unavailable cleanup verification must not create a tombstone.')
assert.equal((await cleanupUnavailableHost.listOperations()).at(-1)?.state, 'conflict')
await cleanupUnavailableHost.close()

const serialProvider = new FakeEagleProvider([
  item('serial', 'Serial', [], { content: 'serial-v1' })
])
const serialHost = await createIsolatedHost('serialized-sync', serialProvider)
await connectAndIndex(serialHost)
const serialItem = (await serialHost.listItems())[0]
await serialHost.queueMetadata({
  itemKey: serialItem.key,
  clientReceipt: 'receipt:serialized',
  patch: { annotation: 'one external write' }
})
const mutationGate = deferred<void>()
serialProvider.beforeMetadataMutation = mutationGate.promise
const firstSync = serialHost.synchronize()
await serialProvider.metadataMutationStarted.promise
const secondSync = serialHost.synchronize()
mutationGate.resolve()
await Promise.all([firstSync, secondSync])
assert.equal(serialProvider.metadataMutationCount.get('serial'), 1, 'Concurrent sync callers must share one serialized outbox execution.')
await serialHost.close()

const closeProvider = new FakeEagleProvider([
  item('closing', 'Closing', [], { content: 'closing-v1' })
])
const closeHost = await createIsolatedHost('close-drain', closeProvider)
await connectAndIndex(closeHost)
const closeItem = (await closeHost.listItems())[0]
await closeHost.queueMetadata({ itemKey: closeItem.key, clientReceipt: 'receipt:close', patch: { rating: 3 } })
const closeGate = deferred<void>()
closeProvider.beforeMetadataMutation = closeGate.promise
const inFlightSync = closeHost.synchronize()
await closeProvider.metadataMutationStarted.promise
let closeFinished = false
const closing = closeHost.close().then(() => { closeFinished = true })
await Promise.resolve()
assert.equal(closeFinished, false, 'Close must wait for the in-flight serialized request.')
closeGate.resolve()
await Promise.all([inFlightSync, closing])
assert.equal(closeProvider.disconnectCount, 1)
await assert.rejects(closeHost.listItems(), (error) =>
  error instanceof ExternalConnectedLibraryError && error.code === 'connected-library-not-ready')

const switchingProvider = new FakeEagleProvider([
  item('before-switch', 'Before Switch', [], { content: 'switch-v1' })
])
const switchingHost = await createIsolatedHost('index-switch', switchingProvider)
const switchingReview = await switchingHost.prepareConnection({ scope: { kind: 'all' }, requestedGrant: 'read-write' })
if (switchingReview.kind !== 'planned') throw new Error('Expected switching review.')
await switchingHost.confirmConnection(switchingReview.review.receipt)
switchingProvider.afterNextList = () => switchingProvider.replaceLibrary('eagle-library:switched', 'volume:switched')
await assert.rejects(switchingHost.indexNextPage(), (error) =>
  error instanceof ExternalConnectedLibraryError && error.code === 'connected-library-identity-changed')
assert.equal(switchingHost.inspect().counts.indexed, 0, 'A page from a replaced library must not enter the index.')
await switchingHost.close()

console.log('External Connected Library core integration passed')

async function createHost(name: string) {
  return createExternalConnectedLibrary({
    appOwnedRoot: path.join(root, name),
    databasePath: path.join(root, name, 'connected.sqlite'),
    previewCacheDirectory: path.join(root, name, 'preview-cache'),
    editStagingDirectory: path.join(root, name, 'edit-staging'),
    previewCacheQuotaBytes: 1024 * 1024,
    editStagingQuotaBytes: 1024 * 1024,
    provider,
    editSelection: { selectEditFile: async () => ({ kind: 'selected', filePath: selectedEdit }) },
    createIdentity,
    now: () => currentTime
  })
}

async function createIsolatedHost(name: string, isolatedProvider: FakeEagleProvider) {
  return createExternalConnectedLibrary({
    appOwnedRoot: path.join(root, name),
    databasePath: path.join(root, name, 'connected.sqlite'),
    previewCacheDirectory: path.join(root, name, 'preview-cache'),
    editStagingDirectory: path.join(root, name, 'edit-staging'),
    previewCacheQuotaBytes: 1024 * 1024,
    editStagingQuotaBytes: 1024 * 1024,
    provider: isolatedProvider,
    editSelection: { selectEditFile: async () => ({ kind: 'selected', filePath: selectedEdit }) },
    createIdentity,
    now: () => currentTime
  })
}

async function connectAndIndex(hostToConnect: Awaited<ReturnType<typeof createExternalConnectedLibrary>>) {
  const plannedConnection = await hostToConnect.prepareConnection({
    scope: { kind: 'all' }, requestedGrant: 'read-write'
  })
  if (plannedConnection.kind !== 'planned') throw new Error('Expected connection review.')
  await hostToConnect.confirmConnection(plannedConnection.review.receipt)
  await hostToConnect.indexNextPage(100)
}
}

function item(id: string, name: string, folderIds: string[], options: { tags?: string[]; content: string }): EagleProviderItem & { content: Buffer } {
  const content = Buffer.from(options.content)
  return {
    id, name, extension: 'png', tags: options.tags ?? [], rating: 0, annotation: '', folderIds,
    size: content.byteLength, width: 32, height: 24, modifiedAt: 1,
    version: `eagle-version:${digest(content).slice(0, 24)}`, contentFingerprint: digest(content), isDeleted: false, content
  }
}

function digest(bytes: Uint8Array) { return createHash('sha256').update(bytes).digest('hex') }

class FakeEagleProvider implements EagleProviderPort {
  online = true
  libraryIdentity = 'eagle-library:synthetic'
  volumeIdentity = 'volume:synthetic'
  items = new Map<string, EagleProviderItem & { content: Buffer }>()
  previews = new Map<string, Uint8Array>()
  metadataMutationCount = new Map<string, number>()
  fileMutationCount = 0
  addMutationCount=0
  nextMetadataMutation: 'normal' | 'apply-then-timeout' = 'normal'
  nextFileMutation: 'normal' | 'apply-then-timeout' = 'normal'
  nextAddMutation:'normal'|'apply-then-timeout'='normal'
  lookupUnavailable = false
  lookupUnavailableAfterAdd = false
  lookupUnavailableAfterPermanent = false
  mutateImmediatelyBeforeReplace = false
  beforeMetadataMutation: Promise<void> | null = null
  metadataMutationStarted = deferred<void>()
  afterNextList: (() => void) | null = null
  disconnectCount = 0
  constructor(items: Array<EagleProviderItem & { content: Buffer }>) { for (const entry of items) this.items.set(entry.id, clone(entry)) }
  async negotiate(): Promise<EagleProviderConnection | null> {
    if (!this.online) return null
    return { providerIdentity:'eagle-provider:local',libraryIdentity:this.libraryIdentity,volumeIdentity:this.volumeIdentity,displayName:'Synthetic Eagle',observedGeneration:`generation:${this.libraryIdentity}`,applicationVersion:'4.0.0',buildVersion:21,evidenceLevel:'synthetic-protocol',capabilities:{webApiV2:true,progressiveIndex:true,metadataRead:true,metadataWrite:true,trash:true,restore:true,fileReplace:true,permanentDelete:true} }
  }
  async listPage({cursor,limit,scope}: {cursor:string|null;limit:number;scope:ConnectedLibraryScope}):Promise<EagleProviderPage>{
    if(!this.online)throw new Error('offline'); const entries=[...this.items.values()].sort((a,b)=>a.id.localeCompare(b.id));const offset=cursor?Number(cursor):0;const page=entries.slice(offset,offset+limit);const next=offset+page.length;void scope;const result={items:page.map(clone),nextCursor:next<entries.length?String(next):null,complete:next>=entries.length};const after=this.afterNextList;this.afterNextList=null;after?.();return result
  }
  async getItem(id:string){
    if(!this.online||this.lookupUnavailable)return{kind:'unavailable' as const,reason:'transport' as const}
    const found=this.items.get(id)
    return found?{kind:'found' as const,item:clone(found)}:{kind:'missing' as const}
  }
  async readPreview(id:string){if(!this.online)return null;return this.previews.get(id)??Buffer.from(`preview:${id}`)}
  async updateMetadata(id:string,patch:ConnectedMetadataPatch):Promise<EagleProviderMutationResult>{
    if(!this.online)return{kind:'unavailable'};const current=this.items.get(id);if(!current)return{kind:'rejected'};this.metadataMutationStarted.resolve();if(this.beforeMetadataMutation)await this.beforeMetadataMutation;this.metadataMutationCount.set(id,(this.metadataMutationCount.get(id)??0)+1);Object.assign(current,patch);this.advance(current);const result={kind:'applied' as const,item:clone(current)};if(this.nextMetadataMutation==='apply-then-timeout'){this.nextMetadataMutation='normal';return{kind:'timeout'}}return result
  }
  async addFile(id:string,filePath:string,metadata:ConnectedMetadataPatch):Promise<EagleProviderMutationResult>{if(!this.online)return{kind:'unavailable'};if(this.items.has(id))return{kind:'rejected'};const bytes=await fs.readFile(filePath);const created=item(id,String(metadata.name??id),[...(metadata.folderIds??[])],{tags:[...(metadata.tags??[])],content:bytes.toString('binary')});created.content=bytes;created.size=bytes.length;created.contentFingerprint=digest(bytes);created.annotation=String(metadata.annotation??'');created.rating=Number(metadata.rating??0);this.items.set(id,created);this.addMutationCount+=1;if(this.nextAddMutation==='apply-then-timeout'){this.nextAddMutation='normal';if(this.lookupUnavailableAfterAdd)this.lookupUnavailable=true;return{kind:'timeout'}}return{kind:'applied',item:clone(created)}}
  async replaceFile(id:string,filePath:string,expectedFingerprint:string,desiredFingerprint:string):Promise<EagleProviderMutationResult>{if(!this.online)return{kind:'unavailable'};const current=this.items.get(id);if(!current)return{kind:'rejected'};if(this.mutateImmediatelyBeforeReplace){this.mutateImmediatelyBeforeReplace=false;this.mutateContent(id,Buffer.from('provider-race-change'))}if(current.contentFingerprint!==expectedFingerprint)return{kind:'conflict',item:clone(current)};const bytes=await fs.readFile(filePath);if(digest(bytes)!==desiredFingerprint)return{kind:'rejected'};this.fileMutationCount+=1;current.content=bytes;current.size=bytes.length;current.contentFingerprint=digest(bytes);this.advance(current);if(this.nextFileMutation==='apply-then-timeout'){this.nextFileMutation='normal';return{kind:'timeout'}}return{kind:'applied',item:clone(current)}}
  async setDeleted(id:string,deleted:boolean):Promise<EagleProviderMutationResult>{if(!this.online)return{kind:'unavailable'};const current=this.items.get(id);if(!current)return{kind:'rejected'};current.isDeleted=deleted;this.advance(current);return{kind:'applied',item:clone(current)}}
  async permanentlyDelete(id:string):Promise<EagleProviderMutationResult>{if(!this.online)return{kind:'unavailable'};this.items.delete(id);if(this.lookupUnavailableAfterPermanent)this.lookupUnavailable=true;return{kind:'timeout'}}
  async disconnect(){this.disconnectCount+=1}
  mutateRemote(id:string,patch:Partial<EagleProviderItem>){const current=this.requireItem(id);Object.assign(current,patch);this.advance(current)}
  mutateContent(id:string,bytes:Buffer){const current=this.requireItem(id);current.content=bytes;current.size=bytes.length;current.contentFingerprint=digest(bytes);this.advance(current)}
  deleteExternally(id:string){this.items.delete(id)}
  replaceLibrary(library:string,volume:string){this.libraryIdentity=library;this.volumeIdentity=volume}
  getStoredItem(id:string){return this.items.get(id)??null}
  requireItem(id:string){const found=this.items.get(id);if(!found)throw new Error(`missing ${id}`);return found}
  private advance(item:EagleProviderItem){item.modifiedAt+=1;item.version=`eagle-version:${String(item.modifiedAt).padStart(8,'0')}`}
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function clone<T>(value:T):T { return structuredClone(value) }

await run()
