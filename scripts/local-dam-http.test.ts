import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createLocalDamServer } from '../src/main/local-host/local-dam-server'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-local-http-'))
await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><title>DAM shared renderer</title>')
const server = await createLocalDamServer({ rendererDirectory: root,
  health: () => ({ buildId:'dam-controlled-http',platform:process.platform,arch:process.arch,version:'1.0.0' }),
  invoke: async (client, command) => ({ owner: client.id, command }),
  channels: () => ['library:inspect'],
  media: async () => { throw Error('NOT_GRANTED') }
})
try {
  const health = await fetch(server.origin + '/api/health')
  assert.deepEqual(await health.json(), { schema:1,state:'ready',buildId:'dam-controlled-http',
    platform:process.platform,arch:process.arch,version:'1.0.0' })
  assert.equal((await fetch(server.origin + '/api/health', { headers:{ Origin:'https://attacker.invalid' } })).status,403)
  assert.equal((await fetch(server.origin + '/api/health?path=private')).status,403)
  assert.equal((await fetch(server.origin + '/api/command', { method: 'POST', body: '{}' })).status, 403)
  server.authorizeLaunch()
  const page = await fetch(server.origin + '/launch')
  const body = await page.text()
  const grant = /data-dam-grant="([a-f0-9]+)"/.exec(body)![1]
  const exchange = await fetch(server.origin + '/api/session', {
    method: 'POST', headers: { Origin: server.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ grant })
  })
  assert.equal(exchange.status, 200)
  const cookie = exchange.headers.get('set-cookie')!.split(';')[0]
  const session = await exchange.json() as { csrf: string; clientId: string }
  assert.equal((await fetch(server.origin + '/api/session', {
    method: 'POST', headers: { Origin: server.origin }, body: JSON.stringify({ grant })
  })).status, 403)
  const command = (name: string, origin = server.origin, csrf = session.csrf) => fetch(server.origin + '/api/command', {
    method: 'POST', headers: { Origin: origin, Cookie: cookie, 'X-DAM-CSRF': csrf, 'X-DAM-Client': session.clientId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: name, args: [] })
  })
  assert.equal((await command('library:inspect')).status, 200)
  assert.equal((await command('library:inspect', 'https://attacker.invalid')).status, 403)
  assert.equal((await command('library:inspect', server.origin, 'wrong')).status, 403)
  assert.equal((await command('process:execute')).status, 404)
  server.authorizeLaunch()
  const repeatedPage = await (await fetch(server.origin + '/launch')).text()
  const repeatedGrant = /data-dam-grant="([a-f0-9]+)"/.exec(repeatedPage)![1]
  const repeated = await fetch(server.origin + '/api/session', { method: 'POST', headers: { Origin: server.origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ grant: repeatedGrant }) })
  assert.equal(repeated.status, 200)
  assert.equal(repeated.headers.get('set-cookie'), null, 'same Host launch preserves other authenticated documents')
  assert.deepEqual(await repeated.json(), session)
  assert.equal((await command('library:inspect')).status, 200)
  assert.equal((await fetch(server.origin + '/api/session-info', { headers: { Cookie: cookie } })).status, 200)
  assert.equal((await fetch(server.origin + '/package.json', { headers: { Cookie: cookie } })).status, 404)
  const other = await createLocalDamServer({ rendererDirectory: root, channels: () => [], invoke: async () => { throw Error('NO_COMMANDS') }, media: async () => { throw Error('NOT_GRANTED') } })
  try {
    other.authorizeLaunch()
    const otherPage = await (await fetch(other.origin + '/launch')).text()
    const otherGrant = /data-dam-grant="([a-f0-9]+)"/.exec(otherPage)![1]
    const otherExchange = await fetch(other.origin + '/api/session', { method: 'POST', headers: { Origin: other.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ grant: otherGrant }) })
    assert.equal(otherExchange.status, 200)
    const otherCookie = otherExchange.headers.get('set-cookie')!.split(';')[0]
    assert.notEqual(cookie.split('=')[0], otherCookie.split('=')[0], 'different loopback Hosts must not overwrite the same browser cookie')
    const bothCookies = cookie + '; ' + otherCookie
    assert.equal((await fetch(server.origin + '/api/session-info', { headers: { Cookie: bothCookies } })).status, 200)
    assert.equal((await fetch(other.origin + '/api/session-info', { headers: { Cookie: bothCookies } })).status, 200)
    assert.equal((await fetch(server.origin + '/api/session-info', { headers: { Cookie: otherCookie } })).status, 403)
    assert.equal((await fetch(other.origin + '/api/session-info', { headers: { Cookie: cookie } })).status, 403)
  } finally { await other.close() }
  const documentSession = async () => (await fetch(server.origin + '/api/session-info', { headers: { Cookie: cookie } })).json() as Promise<{clientId: string}>
  const a = await documentSession(), b = await documentSession()
  assert.notEqual(a.clientId, b.clientId, 'tabs sharing a cookie have distinct command authority')
  const perDocument = (clientId: string) => fetch(server.origin + '/api/command', { method: 'POST',
    headers: { Origin: server.origin, Cookie: cookie, 'X-DAM-CSRF': session.csrf, 'X-DAM-Client': clientId },
    body: JSON.stringify({ command: 'library:inspect', args: [] }) })
  assert.equal((await (await perDocument(a.clientId)).json() as any).value.owner, a.clientId)
  assert.equal((await perDocument('unregistered-client')).status, 403)
  const closeDocument = await fetch(server.origin + '/api/client-close', { method: 'POST',
    headers: { Origin: server.origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf: session.csrf, clientId: a.clientId }) })
  assert.equal(closeDocument.status, 200)
  assert.equal((await perDocument(a.clientId)).status, 403, 'closed document authority cannot be reused')
  assert.equal((await perDocument(b.clientId)).status, 200)
} finally { await server.close() }
console.log('Local Browser session: one-use launch, same-origin/CSRF and command allowlist passed')
