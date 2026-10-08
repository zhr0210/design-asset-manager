import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspaceDrafts } from '../src/main/local-host/workspace-drafts'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-drafts-'))
try {
  let generation = 'generation:1'
  const configuration = { directory: root, current: () => ({ identity: 'library:test', generation }) }
  let drafts = createWorkspaceDrafts(configuration)
  const scope = { libraryIdentity: 'library:test', generation, kind: 'description' as const, entityId: 'asset:one' }
  const order = (writerId: string, sequence: number) => ({ writerId, sequence })
  drafts.beginWriter('browser:one', 'writer:one')
  drafts.beginWriter('browser:two', 'writer:two')
  const draft = await drafts.put('browser:one', 'browser', { ...scope, ...order('writer:one', 1), value: '我的描述草稿', base: '' })
  assert.equal((await drafts.list('browser:two'))[0].owned, false)
  await assert.rejects(drafts.recover('browser:two', { id: draft.id, ...order('writer:two', 1) }), /DRAFT_OWNER_ACTIVE/)
  drafts.release('browser:one')
  drafts = createWorkspaceDrafts(configuration)
  generation = 'generation:2'
  drafts.beginWriter('browser:one', 'writer:one-restarted')
  drafts.beginWriter('browser:two', 'writer:two-restarted')
  drafts.beginWriter('browser:three', 'writer:three')
  const recovered = await drafts.recover('browser:two', { id: draft.id, ...order('writer:two-restarted', 1) })
  assert.equal(recovered.value, '我的描述草稿')
  assert.equal(recovered.generation, generation, 'restored draft uses current generation, never the expired session')
  await assert.rejects(drafts.discard('browser:three', { id: draft.id, revision: recovered.revision, ...order('writer:three', 1) }), /DRAFT_OWNER_ACTIVE/)
  await assert.rejects(drafts.put('browser:one', 'browser', { ...scope, ...order('writer:one-restarted', 1), value: '迟到输入', base: '' }), /DRAFT_SCOPE_EXPIRED/)
  await drafts.remove('browser:two', { ...scope, generation, ...order('writer:two-restarted', 2) })
  assert.equal((await drafts.list('browser:two')).length, 0)
  drafts.beginWriter('browser:old', 'writer:old')
  drafts.beginWriter('browser:new', 'writer:new')
  const older = await drafts.put('browser:old', 'browser', { ...scope, generation, ...order('writer:old', 1), value: '旧会话草稿', base: '' })
  drafts.release('browser:old')
  await drafts.put('browser:new', 'browser', { ...scope, generation, ...order('writer:new', 1), value: '当前新输入', base: '' })
  await assert.rejects(drafts.recover('browser:new', { id: older.id, ...order('writer:new', 2) }), /DRAFT_LOCAL_CONFLICT/)
  assert.equal((await drafts.list('browser:new')).find(record => record.owned)?.value, '当前新输入')

  const orderedScope = { ...scope, generation, entityId: 'asset:ordered' }
  const newerInput = { ...orderedScope, ...order('writer:new', 4), value: '较新的草稿', base: '' }
  const newer = await drafts.put('browser:new', 'browser', newerInput)
  await assert.rejects(drafts.put('browser:new', 'browser', { ...newerInput, sequence: 3, value: '迟到旧草稿' }), /DRAFT_STALE_UPDATE/)
  const repeated = await drafts.put('browser:new', 'browser', newerInput)
  assert.equal(repeated.revision, newer.revision, 'Identical sequence replay does not commit twice')
  await assert.rejects(drafts.put('browser:new', 'browser', { ...newerInput, value: '同序号不同内容' }), /DRAFT_SEQUENCE_CONFLICT/)
  assert.equal((await drafts.list('browser:new')).find(record => record.id === newer.id)?.value, '较新的草稿')

  const removed = { ...orderedScope, ...order('writer:new', 6) }
  await drafts.remove('browser:new', removed)
  await drafts.remove('browser:new', removed)
  await assert.rejects(drafts.put('browser:new', 'browser', { ...newerInput, sequence: 5 }), /DRAFT_STALE_UPDATE/)
  assert.ok(!(await drafts.list('browser:new')).some(record => record.id === newer.id), 'Delete tombstone prevents late put revival')
  const savedAgain = await drafts.put('browser:new', 'browser', { ...newerInput, sequence: 7 })
  await assert.rejects(drafts.remove('browser:new', { ...removed, sequence: 5 }), /DRAFT_STALE_UPDATE/)
  assert.ok((await drafts.list('browser:new')).some(record => record.id === savedAgain.id), 'Late remove preserves new draft')

  drafts.beginWriter('browser:new', 'writer:new-reloaded')
  drafts.beginWriter('browser:new', 'writer:new-reloaded')
  assert.throws(() => drafts.beginWriter('browser:new', 'writer:new'), /DRAFT_WRITER_EXPIRED/)
  await assert.rejects(drafts.put('browser:new', 'browser', { ...newerInput, sequence: 100 }), /DRAFT_WRITER_EXPIRED/)
  const reloaded = await drafts.put('browser:new', 'browser', { ...newerInput, ...order('writer:new-reloaded', 1), value: '重载后序号重新开始' })
  assert.equal(reloaded.value, '重载后序号重新开始')
  const queuedOldEpoch = drafts.put('browser:new', 'browser', { ...newerInput, ...order('writer:new-reloaded', 2) })
  drafts.beginWriter('browser:new', 'writer:new-final')
  await assert.rejects(queuedOldEpoch, /DRAFT_WRITER_EXPIRED/, 'Epoch is checked at serial execution, not only admission')

  const ownRecovered = await drafts.recover('browser:new', { id: reloaded.id, ...order('writer:new-final', 3) })
  await assert.rejects(drafts.put('browser:new', 'browser', { ...newerInput, ...order('writer:new-final', 2) }), /DRAFT_STALE_UPDATE/)
  const discarded = { id: ownRecovered.id, revision: ownRecovered.revision, ...order('writer:new-final', 5) }
  await drafts.discard('browser:new', discarded)
  await drafts.discard('browser:new', discarded)
  await assert.rejects(drafts.put('browser:new', 'browser', { ...newerInput, ...order('writer:new-final', 4) }), /DRAFT_STALE_UPDATE/)
  assert.ok(!(await drafts.list('browser:new')).some(record => record.id === ownRecovered.id), 'Discard rejects a queued earlier put')

  const transferredScope = { ...orderedScope, entityId: 'asset:transfer' }
  const transfer = await drafts.put('browser:old', 'browser', { ...transferredScope, ...order('writer:old', 2), value: '待转移草稿', base: '' })
  drafts.release('browser:old')
  const adopted = await drafts.recover('browser:new', { id: transfer.id, ...order('writer:new-final', 6) })
  await assert.rejects(drafts.put('browser:old', 'browser', { ...transferredScope, ...order('writer:old', 100), value: '已转移旧owner的晚写', base: '' }), /DRAFT_STALE_UPDATE/)
  assert.equal((await drafts.list('browser:new')).find(record => record.id === adopted.id)?.owned, true)

  const foreignDiscardScope = { ...orderedScope, entityId: 'asset:foreign-discard' }
  const foreignDiscard = await drafts.put('browser:old', 'browser', { ...foreignDiscardScope, ...order('writer:old', 3), value: '另一owner可放弃的草稿', base: '' })
  drafts.release('browser:old')
  await drafts.discard('browser:new', { id: foreignDiscard.id, revision: foreignDiscard.revision, ...order('writer:new-final', 7) })
  await assert.rejects(drafts.put('browser:old', 'browser', { ...foreignDiscardScope, ...order('writer:old', 200), value: '放弃后旧owner的晚写', base: '' }), /DRAFT_STALE_UPDATE/)

  const failedScope = { ...orderedScope, entityId: 'asset:failed-persist' }
  const retryable = { ...failedScope, ...order('writer:new-final', 8), value: '持久化失败后可重试', base: '' }
  const rename = fsSync.renameSync
  try {
    fsSync.renameSync = () => { throw Error('SYNTHETIC_PERSIST_FAILURE') }
    await assert.rejects(drafts.put('browser:new', 'browser', retryable), /SYNTHETIC_PERSIST_FAILURE/)
  } finally { fsSync.renameSync = rename }
  assert.ok(!(await drafts.list('browser:new')).some(record => record.entityId === failedScope.entityId))
  const retried = await drafts.put('browser:new', 'browser', retryable)
  assert.equal(retried.value, retryable.value, 'Failed persistence does not advance high-water or claim reception')

  const oldFile = JSON.parse(await fs.readFile(path.join(root, 'workspace-drafts.v1.json'), 'utf8'))
  for (const record of oldFile.records) { delete record.writerId; delete record.sequence }
  await fs.writeFile(path.join(root, 'workspace-drafts.v1.json'), JSON.stringify(oldFile))
  drafts = createWorkspaceDrafts(configuration)
  drafts.beginWriter('browser:compat', 'writer:compat')
  const compatible = await drafts.recover('browser:compat', { id: adopted.id, ...order('writer:compat', 1) })
  assert.equal(compatible.value, '待转移草稿', 'Existing v1 records without sequence remain recoverable')
  await assert.rejects(drafts.put('browser:compat', 'browser', { ...transferredScope, ...order('writer:compat', 0), value: '', base: '' }), /INVALID_DRAFT_ORDER/)
  const acrossGenerationScope = { ...transferredScope, entityId: 'asset:across-generation' }
  drafts.beginWriter('browser:previous', 'writer:previous')
  const previousGeneration = await drafts.put('browser:previous', 'browser', { ...acrossGenerationScope, ...order('writer:previous', 1), value: '上一代际的草稿', base: '' })
  drafts.release('browser:previous')
  generation = 'generation:3'
  await drafts.recover('browser:compat', { id: previousGeneration.id, ...order('writer:compat', 2) })
  await assert.rejects(drafts.put('browser:previous', 'browser', { ...acrossGenerationScope, generation, ...order('writer:previous', 100), value: '旧owner已排队的新代际草稿', base: '' }), /DRAFT_STALE_UPDATE/)
  console.log('PASS local drafts: persistence/restart/v1 compatibility, writer epochs, late sequences, idempotency, remove/discard tombstones, transfer fences and failed-write retry')
} finally { await fs.rm(root, { recursive: true, force: true }) }
