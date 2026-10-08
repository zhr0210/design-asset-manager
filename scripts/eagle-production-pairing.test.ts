import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createEaglePairing } from '../src/main/external-connected-library/eagle-pairing'

const require = createRequire(import.meta.url)
const core = require(path.resolve('eagle-companion/js/plugin.cjs'))
const { createPairingGateway, startServer } = require(path.resolve('eagle-companion/js/pairing.cjs'))
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-eagle-pairing-'))
const libraryPath = path.join(root, 'public.library')
const otherPath = path.join(root, 'other.library')
const stagingRoot = path.join(root, 'staging')
await Promise.all([libraryPath, otherPath, stagingRoot].map(file => fs.mkdir(file)))
const eagle = { library: { path: libraryPath, name: 'Public test library' }, item: { getById: async () => null } }
let providerCalls = 0
let projected: any
const gateway = createPairingGateway({ eagle, core, providerIdentity: 'eagle-companion:test-install',
  changed: (value: any) => { projected = value },
  fetch: async (url: string, init: RequestInit) => {
    providerCalls++
    const endpoint = new URL(url).pathname
    const data = endpoint === '/api/v2/app/info' ? { version: '4.0.0', buildVersion: 'build21' } :
      endpoint === '/api/v2/library/info' ? { name: eagle.library.name, path: eagle.library.path } :
      endpoint === '/api/v2/item/get' ? { data: [], total: 0 } : null
    assert.ok(init.method === 'GET' || init.method === 'POST')
    return new Response(JSON.stringify({ status: 'success', data }))
  }
})
let hostRequests = 0
const fetchGateway: typeof fetch = async (url, init) => {
  hostRequests++
  try { return new Response(JSON.stringify(await gateway.dispatch(new URL(String(url)).pathname, JSON.parse(String(init?.body))))) }
  catch { return new Response('{"ok":false}', { status: 503 }) }
}
const protection = { available: () => true, encrypt: (value: string) => Buffer.from('test-sealed:' + value),
  decrypt: (value: Buffer) => value.toString().replace(/^test-sealed:/, '') }
const file = path.join(root, 'host', 'pairing.encrypted')
const pairing = createEaglePairing({ file, stagingRoot, protection, fetch: fetchGateway })
try {
  assert.equal((await pairing.inspect()).state, 'unpaired')
  assert.equal(await pairing.provider.negotiate(), null)
  assert.equal(hostRequests, 0, 'unpaired startup must not probe Eagle')
  assert.equal((await pairing.begin('read-only')).state, 'awaiting-eagle')
  assert.equal(projected.requestedGrant, 'read-only')
  assert.equal(await pairing.provider.negotiate(), null, 'pending consent never grants capability')
  assert.equal(providerCalls, 0)
  assert.equal(await gateway.approve(), true)
  assert.equal((await pairing.inspect()).state, 'paired')
  const connection = await pairing.provider.negotiate()
  assert.ok(connection)
  assert.equal(connection.evidenceLevel, 'provider-protocol')
  assert.equal(connection.capabilities.metadataWrite, false)
  assert.equal(connection.capabilities.previewRead, true)
  assert.equal(connection.capabilities.fileReplace, false)
  assert.deepEqual(await pairing.provider.listPage({ cursor: null, limit: 100, scope: { kind: 'all' } }),
    { items: [], nextCursor: null, complete: true })
  const callsBeforeWrite = providerCalls
  assert.equal((await pairing.provider.updateMetadata('one', { name: 'denied' })).kind, 'unsupported')
  assert.equal(providerCalls, callsBeforeWrite)
  const restarted = createEaglePairing({ file, stagingRoot, protection, fetch: fetchGateway })
  assert.equal((await restarted.inspect()).state, 'paired', 'same active plugin is reconnectable after Host restart')
  assert.equal((await restarted.provider.negotiate())?.libraryIdentity, connection.libraryIdentity)
  assert.equal(JSON.stringify(await restarted.inspect()).includes('test-sealed'), false)
  eagle.library.path = otherPath
  assert.equal(await restarted.provider.negotiate(), null, 'switching library invalidates trusted identity')
  assert.equal(projected.state, 'unpaired')
  assert.equal((await restarted.revoke()).state, 'unpaired')
  assert.equal(await fs.stat(file).then(() => true, () => false), false)
  assert.equal((await restarted.begin('read-write')).state, 'awaiting-eagle')
  assert.equal(await gateway.approve(), true)
  const writable = await restarted.provider.negotiate()
  assert.equal(writable?.capabilities.metadataWrite, true)
  assert.equal(writable?.capabilities.permanentDelete, false)
  await restarted.revoke()
  const beforeNoGrant = providerCalls
  assert.equal(await restarted.provider.negotiate(), null)
  assert.equal(providerCalls, beforeNoGrant)

  const unavailable = createEaglePairing({ file, stagingRoot,
    protection: { ...protection, available: () => false }, fetch: fetchGateway })
  assert.equal((await unavailable.begin('read-write')).state, 'storage-unavailable')

  const server = await startServer(gateway, 0)
  try {
    const forbidden = await fetch(`http://127.0.0.1:${server.port}/v1/dam-eagle-pairing`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.invalid' }, body: '{}'
    })
    assert.equal(forbidden.status, 403, 'browser origin cannot submit pairing or privileged commands')
  } finally { await server.close() }
  console.log('Eagle production composition pairing tests passed (controlled gateway; real Eagle NOT tested)')
} finally { gateway.revoke(); await fs.rm(root, { recursive: true, force: true }) }
