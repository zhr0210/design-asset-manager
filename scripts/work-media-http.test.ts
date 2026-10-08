import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createLocalDamServer} from '../src/main/local-host/local-dam-server'
import {workMediaResponse} from '../src/main/work-mode/media-response'

// Synthetic transport authorization belongs to this test server only. It does
// not inspect a user's browser session or authorize an ordinary Host.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-media-http-'))
await fs.writeFile(path.join(root, 'index.html'), '<title>transport fixture</title>')
const bytes = Uint8Array.from({length: 100}, (_, i) => i)
let reads = 0, allowed = true
const server = await createLocalDamServer({rendererDirectory: root, channels: () => [], invoke: async () => {throw Error('NO_COMMANDS')},
  media: async (client, reference) => {reads++; assert.equal(server.isAuthenticated(client), true); if (!allowed || reference !== 'work/fixture') throw Error('MEDIA_DENIED'); return {bytes, type: 'video/mp4'}}})
try {
  assert.equal((await fetch(server.origin + '/media/work/fixture', {headers: {Range: 'bytes=5-9'}})).status, 403)
  assert.equal(reads, 0)
  server.authorizeLaunch()
  const launch = await (await fetch(server.origin + '/launch')).text()
  const grant = /data-dam-grant="([a-f0-9]+)"/.exec(launch)![1]
  const exchange = await fetch(server.origin + '/api/session', {method: 'POST', headers: {Origin: server.origin, 'Content-Type': 'application/json'}, body: JSON.stringify({grant})})
  assert.equal(exchange.status, 200)
  const fixtureCookie = exchange.headers.get('set-cookie')!.split(';')[0]
  const get = (range?: string, method = 'GET') => fetch(server.origin + '/media/work/fixture', {method, headers: {Cookie: fixtureCookie, ...(range ? {Range: range} : {})}})
  const full = await get()
  assert.equal(full.status, 200); assert.equal(full.headers.get('accept-ranges'), 'bytes'); assert.equal(full.headers.get('content-length'), '100')
  assert.deepEqual(new Uint8Array(await full.arrayBuffer()), bytes)
  for (const [range, start, end] of [['bytes=5-9', 5, 9], ['bytes=80-', 80, 99], ['bytes=-10', 90, 99], ['bytes=95-200', 95, 99]] as const) {
    const partial = await get(range)
    assert.equal(partial.status, 206); assert.equal(partial.headers.get('content-range'), `bytes ${start}-${end}/100`)
    assert.deepEqual(new Uint8Array(await partial.arrayBuffer()), bytes.subarray(start, end + 1))
  }
  for (const range of ['bytes=100-', 'bytes=9-5', 'bytes=-0', 'bytes=-', 'bytes=1-3,5-8', 'bytes=9999999999999999-', 'invalid']) {
    const refused = await get(range)
    assert.equal(refused.status, 416); assert.equal(refused.headers.get('content-range'), 'bytes */100'); assert.equal((await refused.arrayBuffer()).byteLength, 0)
  }
  const head = await get('bytes=5-9', 'HEAD')
  assert.equal(head.status, 206); assert.equal(head.headers.get('content-length'), '5'); assert.equal((await head.arrayBuffer()).byteLength, 0)
  const before = reads
  assert.equal((await fetch(server.origin + '/media/work/fixture', {headers: {Cookie: fixtureCookie, Range: 'bytes=5-9', Origin: 'https://outside.invalid'}})).status, 403)
  assert.equal(reads, before)
  allowed = false
  assert.equal((await get('bytes=5-9')).status, 400, 'range does not bypass revoked media membership')
  assert.equal(workMediaResponse({bytes: new Uint8Array(), type: 'video/mp4'}, 'bytes=0-').status, 416)
  process.stdout.write('WORK_MEDIA_HTTP_RANGE_AUTHORITY_PASS\n')
} finally {
  await server.close()
  assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('dam-media-http-'))
  await fs.rm(root, {recursive: true})
}
