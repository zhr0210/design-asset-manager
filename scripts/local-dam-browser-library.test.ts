import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createWorkspaceClient } from '../src/shared/client/workspace-client'
import { createLocalDamServer } from '../src/main/local-host/local-dam-server'
import { createFileSelection } from '../src/main/local-host/file-selection'
import { clientRequestScope, isBrowserContext } from '../src/main/local-host/client-context'
import { createCommandReceiptAuthority } from '../src/main/local-host/command-receipts'
import { registerActiveLibraryIpc } from '../src/main/ipc/active-library.ipc'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'

// Approved shared seam: two named Clients through real HTTP and production handlers.
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-browser-library-')))
const renderer = path.join(root, 'renderer')
await fs.mkdir(renderer)
await fs.writeFile(path.join(renderer, 'index.html'), '<title>shared renderer</title>')
const source = path.join(root, 'source.png')
await sharp({ create: { width: 32, height: 24, channels: 3, background: '#ac7862' } }).png().toFile(source)
const original = await fs.readFile(source)
let notified: () => void = () => {}
const generation = () => { const s = host.inspect(); return `${s.identity}:${s.generation}` }
const owner = () => { const context = clientRequestScope.getStore(); assert.ok(context && isBrowserContext(context)); return context.id }
const picker = createFileSelection({ syntheticRoot: root, generation, notify: () => notified() })
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => { const r = await picker.select(owner(), { properties: ['openDirectory'] }); return r.canceled ? { kind: 'cancelled' } : { kind: 'selected', directory: r.filePaths[0] } },
  selectLocalFiles: async () => { const r = await picker.select(owner(), { properties: ['openFile', 'multiSelections'] }); return r.canceled ? { kind: 'cancelled' } : { kind: 'selected', files: r.filePaths.map(filePath => ({ filePath })) } }
}))
const handlers = new Map<string, (...args: any[]) => any>()
registerActiveLibraryIpc({ host, isTrustedSender: context => server.isAuthenticated(context) }, (name, handler) => { handlers.set(name, handler) })
for (const [name, operation] of Object.entries({ pending: picker.pending, browse: picker.browse, createDirectory: picker.createDirectory, confirm: picker.confirm, cancel: picker.cancel })) {
  handlers.set(`files:${name}`, (_context, request) => (operation as any)(owner(), request))
}
const receipts = createCommandReceiptAuthority({ generation })
const server = await createLocalDamServer({ rendererDirectory: renderer, channels: () => [...handlers.keys()],
  invoke: (context, name, args) => receipts.execute(context.id, args, () => clientRequestScope.run(context, async () => handlers.get(name)!(context, ...args)), name),
  media: async () => { throw Error('UNUSED') }
})
async function connect() {
  const entry = server.authorizeLaunch()
  const grant = /data-dam-grant="([a-f0-9]+)"/.exec(await (await fetch(entry)).text())![1]
  const exchange = await fetch(server.origin + '/api/session', { method: 'POST', headers: { Origin: server.origin }, body: JSON.stringify({ grant }) })
  const cookie = exchange.headers.get('set-cookie')!.split(';')[0]
  const { csrf, clientId } = await (await fetch(server.origin + '/api/session-info', { headers: { Cookie: cookie } })).json() as { csrf: string; clientId: string }
  return createWorkspaceClient({
    async invoke(command, ...args) {
      while (args.length && args[args.length - 1] === undefined) args.pop()
      const r = await fetch(server.origin + '/api/command', { method: 'POST', headers: { Origin: server.origin, Cookie: cookie, 'X-DAM-CSRF': csrf, 'X-DAM-Client': clientId }, body: JSON.stringify({ command, args }) })
      if (!r.ok) throw Error('REJECTED')
      return (await r.json() as { value: any }).value
    }, on() {}, removeListener() {}
  })
}
try {
  const alice = await connect(), bob = await connect()
  let requested = new Promise<void>(resolve => { notified = resolve })
  const preparing = alice.library.createPrepare()
  await requested
  const initial = (await alice.files.pending())!
  assert.equal(await bob.files.pending(), null)
  const next = await alice.files.createDirectory({ session: initial.id, name: 'test-library' })
  const directory = next.entries.find(entry => entry.name === 'test-library')!
  await assert.rejects(bob.files.confirm({ session: initial.id, entries: [directory.id] }))
  await assert.rejects(alice.files.browse({ session: initial.id, path: os.tmpdir() }))
  await alice.files.confirm({ session: initial.id, entries: [directory.id] })
  const plan = await preparing
  await assert.rejects(bob.library.createConfirm(plan.plan.receipt))
  assert.equal((await alice.library.inspect()).state, 'unopened')
  await alice.library.createConfirm(plan.plan.receipt)
  assert.equal((await bob.library.inspect()).identity, (await alice.library.inspect()).identity)
  requested = new Promise<void>(resolve => { notified = resolve })
  const intake = alice.library.addPrepare()
  await requested
  const files = (await alice.files.pending())!
  const file = files.entries.find(entry => entry.name === 'source.png')!
  await alice.files.confirm({ session: files.id, entries: [file.id] })
  const review = await intake
  await alice.library.addDispatch(review.plan.receipt)
  assert.equal((await bob.listAssets()).length, 1)
  const assetId=(await bob.listAssets())[0].id
  assert.equal((await alice.updateAssetCaption(assetId,'first saved description','')).success,true)
  const conflict=await bob.updateAssetCaption(assetId,'second draft','')
  assert.equal(conflict.success,false)
  assert.match(conflict.error,/描述已在另一界面变化/)
  assert.equal((await bob.listAssets())[0].ai_caption,'first saved description')
  await bob.library.close(); await alice.library.reopen()
  assert.equal((await bob.listAssets()).length, 1)
  assert.deepEqual(await fs.readFile(source), original)
} finally { picker.cancelAll(); await host.close(); await server.close() }
console.log('Browser named Client: scoped picker, Copy persistence, shared state and receipt rejection passed')
