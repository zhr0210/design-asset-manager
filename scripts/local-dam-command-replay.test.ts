import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createLocalDamServer } from '../src/main/local-host/local-dam-server'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-replay-'))
await fs.writeFile(path.join(root, 'index.html'), '<title>Synthetic replay fixture</title>')
let executions = 0
const server = await createLocalDamServer({ rendererDirectory: root,
  channels: () => ['settings:save'], media: async () => { throw Error('UNUSED') },
  invoke: async (_client, _command, args) => {
    executions++
    await new Promise(resolve => setTimeout(resolve, 10))
    if (args[0] === 'fail') throw Error('SYNTHETIC_FAILURE')
    return { success: true }
  }
})
try {
  const grant = /data-dam-grant="([a-f0-9]+)"/.exec(await (await fetch(server.authorizeLaunch())).text())![1]
  const exchange = await fetch(server.origin + '/api/session', { method: 'POST',
    headers: { Origin: server.origin }, body: JSON.stringify({ grant }) })
  const cookie = exchange.headers.get('set-cookie')!.split(';')[0]
  const session = await exchange.json() as { csrf: string; clientId: string }
  const command = (id: string, args: unknown[] = [], client = session.clientId, csrf = session.csrf) => fetch(server.origin + '/api/command', {
    method: 'POST', headers: { Origin: server.origin, Cookie: cookie, 'X-DAM-CSRF': csrf,
      'X-DAM-Client': client, 'X-DAM-Invocation': id },
    body: JSON.stringify({ command: 'settings:save', args })
  })
  const pair = await Promise.all([command('1'), command('1')])
  assert.deepEqual(pair.map(reply => reply.status).sort(), [200, 409])
  assert.equal(executions, 1, 'concurrent transport retries cannot execute twice')
  const duplicate = await command('1', ['different'])
  assert.equal(duplicate.status, 409)
  assert.match((await duplicate.json() as any).error, /检查保存结果，勿重复提交/)
  assert.equal(executions, 1, 'reusing an id for a different body cannot bypass admission')
  assert.equal((await command('2', [], session.clientId, 'wrong')).status, 403)
  assert.equal((await command('2')).status, 200, 'failed authentication cannot consume an invocation')
  for (const id of ['0', '-1', '1.5', '01', '9007199254740992']) assert.equal((await command(id)).status, 400)
  assert.equal((await command('2048')).status, 200)
  assert.equal((await command('2047')).status, 200, 'network arrival order within the window is allowed')
  const beforeOld = executions
  assert.equal((await command('1')).status, 409, 'eviction must never make an old invocation executable again')
  assert.equal(executions, beforeOld)
  assert.equal((await command('2049', ['fail'])).status, 400)
  const beforeFailureRetry = executions
  assert.equal((await command('2049', ['fail'])).status, 409, 'failed effects also remain uncertain and cannot be replayed')
  assert.equal(executions, beforeFailureRetry)
  const peer = await (await fetch(server.origin + '/api/session-info', { headers: { Cookie: cookie } })).json() as { clientId: string }
  assert.equal((await command('1', [], peer.clientId)).status, 200, 'each document owns its sequence')
  await fetch(server.origin + '/api/client-close', { method: 'POST', headers: { Origin: server.origin, Cookie: cookie },
    body: JSON.stringify({ csrf: session.csrf, clientId: peer.clientId }) })
  assert.equal((await command('2', [], peer.clientId)).status, 403, 'revoked identity still wins over replay admission')
  console.log('Replay admission: concurrent duplicate, mismatched body, auth, bounded old rejection, out-of-order, failure and distinct/revoked owners passed')
} finally {
  await server.close()
  await fs.rm(root, { recursive: true, force: true })
}
