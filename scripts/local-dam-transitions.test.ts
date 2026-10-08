import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createWorkspaceTransitions } from '../src/main/local-host/workspace-transitions'

let revision = 1, writes = 0
const transitions = createWorkspaceTransitions({
  snapshot: async () => ({ fingerprint: String(revision), drafts: 1, nativeDrafts: 0, accounts: 0 }),
  flush: async () => {}, notify: () => {}
})
const operation = transitions.request('browser:one', 'switch-library', async () => { writes++; return 'switched' })
assert.equal(transitions.busy(), true, 'preparing review excludes another global freeze owner')
await new Promise(resolve => setTimeout(resolve, 0))
const first = transitions.pending('browser:one')!
assert.equal(first.drafts, 1)
assert.equal(transitions.busy(), true, 'pending review excludes native close even before applying')
assert.equal(transitions.pending('browser:two'), null)
await assert.rejects(transitions.confirm('browser:two', first.id), /UNTRUSTED_TRANSITION/)
revision++
assert.equal((await transitions.confirm('browser:one', first.id)).changed, true, 'late edits force review again')
assert.equal(writes, 0)
transitions.cancel('browser:one', first.id)
assert.deepEqual(await operation, { success: false, code: 'TRANSITION_CANCELLED', error: '已取消，所有界面的输入继续保留。' })
assert.equal(writes, 0)
assert.equal(transitions.busy(), false, 'cancelling releases the global coordination guard')
const second = transitions.request('browser:one', 'quit', async () => { writes++; return 'quit' })
await new Promise(resolve => setTimeout(resolve, 0))
await transitions.confirm('browser:one', transitions.pending('browser:one')!.id)
assert.equal(await second, 'quit')
assert.equal(writes, 1)
assert.equal(transitions.busy(), true, 'successful quit never admits a new native close')
await assert.rejects(transitions.request('browser:one', 'switch-library', async () => { writes++ }), /请先完成/)
console.log('PASS transition checks all drafts, rejects another owner, reviews late edits again, and preserves cancellation')

const expiryMs = 5 * 60_000
const settle = () => new Promise<void>(resolve => setImmediate(resolve))
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

await test('review expiry cannot cancel or unfreeze a confirming flush or operation', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const flush = deferred<void>(), commit = deferred<string>()
  const notifications: { owner: string | null; frozen?: boolean }[] = []
  let flushes = 0, operations = 0, result: unknown = 'pending'
  const host = createWorkspaceTransitions({
    snapshot: async () => ({ fingerprint: 'same', drafts: 1, nativeDrafts: 0, accounts: 0 }),
    flush: async () => { if (++flushes === 2) await flush.promise },
    notify: (owner, frozen) => { notifications.push({ owner, frozen }) }
  })
  const request = host.request('browser:one', 'switch-library', async () => { operations++; return commit.promise })
  void request.then(value => { result = value })
  await settle()
  const id = host.pending('browser:one')!.id
  context.mock.timers.tick(expiryMs - 1)
  const confirmation = host.confirm('browser:one', id)
  await settle()
  const notificationCount = notifications.length

  context.mock.timers.tick(expiryMs * 2)
  await settle()
  assert.equal(result, 'pending', 'the original command must not report cancellation during its flush')
  assert.equal(host.pending('browser:one')!.id, id)
  assert.equal(host.busy(), true)
  assert.equal(operations, 0)
  assert.equal(notifications.length, notificationCount, 'expiry must not send a thaw while confirmation awaits flush')

  flush.resolve()
  await settle()
  assert.equal(host.applying(), true)
  assert.equal(operations, 1)
  context.mock.timers.tick(expiryMs * 2)
  await settle()
  assert.equal(result, 'pending', 'the command must stay pending until the operation returns its outcome')
  assert.equal(host.applying(), true)
  assert.equal(notifications.length, notificationCount, 'expiry must not thaw an in-flight operation')

  commit.resolve('switched')
  assert.deepEqual(await confirmation, { changed: false })
  assert.equal(await request, 'switched')
  assert.equal(host.busy(), false)
  assert.equal(host.applying(), false)
})

await test('changed review receives a fresh expiry after confirmation', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let version = 1, operations = 0
  const host = createWorkspaceTransitions({
    snapshot: async () => ({ fingerprint: String(version), drafts: 1, nativeDrafts: 0, accounts: 0 }),
    flush: async () => {}, notify: () => {}
  })
  const request = host.request('browser:one', 'switch-library', async () => { operations++ })
  await settle()
  const id = host.pending('browser:one')!.id
  context.mock.timers.tick(expiryMs - 1)
  version++
  assert.deepEqual(await host.confirm('browser:one', id), { changed: true })
  assert.equal(host.pending('browser:one')!.changed, true)
  context.mock.timers.tick(expiryMs - 1)
  assert.equal(host.pending('browser:one')!.id, id, 'the old expiry must not cancel the revised review')
  context.mock.timers.tick(1)
  assert.equal((await request as { code: string }).code, 'TRANSITION_CANCELLED')
  assert.equal(operations, 0)
  assert.equal(host.busy(), false)
})

await test('failed confirmation flush receives a fresh expiry without committing', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let flushes = 0, operations = 0
  const host = createWorkspaceTransitions({
    snapshot: async () => ({ fingerprint: 'same', drafts: 1, nativeDrafts: 0, accounts: 0 }),
    flush: async () => { if (++flushes === 2) throw Error('synthetic flush failure') },
    notify: () => {}
  })
  const request = host.request('browser:one', 'switch-library', async () => { operations++ })
  await settle()
  const id = host.pending('browser:one')!.id
  context.mock.timers.tick(expiryMs - 1)
  await assert.rejects(host.confirm('browser:one', id), /synthetic flush failure/)
  context.mock.timers.tick(expiryMs - 1)
  assert.equal(host.pending('browser:one')!.id, id, 'a failed flush leaves time to retry or cancel explicitly')
  context.mock.timers.tick(1)
  assert.equal((await request as { code: string }).code, 'TRANSITION_CANCELLED')
  assert.equal(operations, 0)
  assert.equal(host.busy(), false)
})

await test('idle review still expires without executing its operation', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let operations = 0
  const host = createWorkspaceTransitions({
    snapshot: async () => ({ fingerprint: 'same', drafts: 1, nativeDrafts: 0, accounts: 0 }),
    flush: async () => {}, notify: () => {}
  })
  const request = host.request('browser:one', 'switch-library', async () => { operations++ })
  await settle()
  context.mock.timers.tick(expiryMs - 1)
  assert.ok(host.pending('browser:one'))
  context.mock.timers.tick(1)
  assert.equal((await request as { code: string }).code, 'TRANSITION_CANCELLED')
  assert.equal(operations, 0)
  assert.equal(host.busy(), false)
})
