import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createWorkspaceClient } from '../src/shared/client/workspace-client'
import { registerActiveLibraryIpc } from '../src/main/ipc/active-library.ipc'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'

// Approved seam: named Client -> production IPC adapter -> one Active Library Host.
// The transport boundary replaces Electron delivery only; SQLite/files are real fixtures.
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-shared-client-')))
const source = path.join(root, 'source.png')
await sharp({ create: { width: 24, height: 16, channels: 4, background: '#48aabb' } }).png().toFile(source)
const original = await fs.readFile(source)
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => ({ kind: 'selected', directory: path.join(root, 'library') }),
  selectLocalFiles: async () => ({ kind: 'selected', files: [{ filePath: source }] })
}))
const handlers = new Map<string, (...args: any[]) => any>()
const trusted = Object.freeze({ sender: { id: 7 } })
registerActiveLibraryIpc({ host, isTrustedSender: event => event === trusted },
  (channel, handler) => { handlers.set(channel, handler) })
const transport = {
  invoke: async (channel: string, ...args: unknown[]) => handlers.get(channel)!(trusted, ...args),
  on: () => {}, removeListener: () => {}
}
const desktop = createWorkspaceClient(transport)
try {
  assert.equal((await desktop.library.inspect()).state, 'unopened')
  const plan = await desktop.library.createPrepare()
  await desktop.library.createConfirm(plan.plan.receipt)
  assert.equal((await desktop.library.inspect()).state, 'ready')
  const intake = await desktop.library.addPrepare()
  await desktop.library.addDispatch(intake.plan.receipt)
  const beforeClose = await desktop.listAssets()
  assert.equal(beforeClose.length, 1)
  const preview = await desktop.library.readPreview(beforeClose[0].id)
  const dimensions = await sharp(Buffer.from(preview, 'base64')).metadata()
  assert.equal(dimensions.width, 24)
  assert.equal(dimensions.height, 16)
  assert.equal(beforeClose[0].file_path, '')
  assert.match(beforeClose[0].thumbnail_path, /^dam-preview:\/\/preview\//)
  const tag = (await desktop.tagCreate({ name: '初始标签', type: 'custom', color: 'blue' })).tag
  const expected = { name: tag.name, type: tag.type, color: tag.color }
  assert.equal((await desktop.tagUpdate(tag.id, { name: '第一端保存', type: 'custom', color: 'blue' }, expected)).success, true)
  const stale = await desktop.tagUpdate(tag.id, { name: '第二端草稿', type: 'custom', color: 'blue' }, expected)
  assert.equal(stale.success, false)
  assert.match(stale.error, /另一界面/)
  assert.equal((await desktop.tagGet(tag.id)).tag.name, '第一端保存')
  await desktop.library.close()
  assert.equal((await desktop.library.inspect()).state, 'closed')
  await desktop.library.reopen()
  assert.equal((await desktop.library.inspect()).state, 'ready')
  assert.equal((await desktop.listAssets())[0].id, beforeClose[0].id)
  assert.deepEqual(await fs.readFile(source), original)
  const denied = createWorkspaceClient({ ...transport,
    invoke: async (channel: string, ...args: unknown[]) => handlers.get(channel)!({}, ...args)
  })
  assert.equal((await denied.library.close()).code, 'UNTRUSTED_SENDER')
  assert.equal((await desktop.library.inspect()).state, 'ready')
} finally { await host.close() }
console.log('Shared Desktop Client: create, Copy intake, close, reopen and rejection passed')
