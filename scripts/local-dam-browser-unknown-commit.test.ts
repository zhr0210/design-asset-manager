import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createBrowserTransport } from '../src/renderer/browser-transport'
import { createWorkspaceClient } from '../src/shared/client/workspace-client'
import { WorkspaceConnectionError } from '../src/shared/client/workspace-connection-error'
import { createLocalDamServer } from '../src/main/local-host/local-dam-server'
import { registerSettingsIpc } from '../src/main/ipc/settings.ipc'
import type { AppSettings } from '../src/shared/types/settings.types'

// Actual Browser transport -> loopback HTTP -> production Settings IPC -> synthetic disk.
// Fault injection hides a response only after that real request has committed.
// The event signal controls connection readiness; it is not a formal SSE/CU acceptance.
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dam-unknown-commit-')))
assert.equal(path.dirname(root).toLowerCase(), fs.realpathSync(os.tmpdir()).toLowerCase())
const settingsFile = path.join(root, 'synthetic-settings.json')
fs.writeFileSync(path.join(root, 'index.html'), '<title>Synthetic transport fixture</title>')
fs.writeFileSync(settingsFile, JSON.stringify({ concurrency: 3, aiBackends: [] }))
const read = (): AppSettings => JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
const handlers = new Map<string, (...args: any[]) => any>()
let writes = 0
registerSettingsIpc({ getSettings: read, saveSettings: patch => {
  writes++
  const saved = { ...read(), ...patch }
  fs.writeFileSync(settingsFile, JSON.stringify(saved))
  return saved
} }, async () => ({ canceled: true, path: '' }), (channel, handler) => handlers.set(channel, handler), context => server.isAuthenticated(context))
const snapshots = ['library:inspect', 'download:list', 'download:jobs', 'connected-library:inspect', 'legacy-readonly:inspect', 'ai-connection:active-logins']
for (const command of snapshots) handlers.set(command, async () => ({ success: true }))
const server = await createLocalDamServer({ rendererDirectory: root, channels: () => [...handlers.keys()],
  invoke: (context, command, args) => handlers.get(command)!(context, ...args), media: async () => { throw Error('UNUSED_MEDIA') }
})
const realFetch = globalThis.fetch, oldWindow = (globalThis as any).window, oldEvents = (globalThis as any).EventSource
let stream: Events
class Events {
  handlers = new Map<string, () => void>()
  onerror?: () => void
  constructor() { stream = this }
  addEventListener(name: string, callback: () => void) { this.handlers.set(name, callback) }
  close() {}
}
try {
  const grant = /data-dam-grant="([a-f0-9]+)"/.exec(await (await realFetch(server.authorizeLaunch())).text())![1]
  const exchange = await realFetch(server.origin + '/api/session', { method: 'POST', headers: { Origin: server.origin }, body: JSON.stringify({ grant }) })
  const cookie = exchange.headers.get('set-cookie')!.split(';')[0]
  let fault: 'none' | 'lost-response' | 'truncated-body' | 'pre-header-retry' = 'none'
  ;(globalThis as any).window = { addEventListener() {} }
  ;(globalThis as any).EventSource = Events
  globalThis.fetch = async (input: any, options: any = {}) => {
    const headers = new Headers(options.headers)
    headers.set('Cookie', cookie)
    if (options.method === 'POST') headers.set('Origin', server.origin)
    const response = await realFetch(new URL(String(input), server.origin), { ...options, headers })
    if (String(input) === '/api/command' && JSON.parse(options.body).command === 'settings:save' && response.ok && fault !== 'none') {
      const failure = fault; fault = 'none'
      // Consume the real successful reply before withholding it from Browser transport.
      await response.arrayBuffer()
      if (failure === 'pre-header-retry') return realFetch(new URL(String(input), server.origin), { ...options, headers })
      if (failure === 'lost-response') throw Error('SYNTHETIC_RESPONSE_LOST_AFTER_COMMIT')
      return new Response('{"value":', { status: 200 })
    }
    return response
  }
  const transport = await createBrowserTransport(), client = createWorkspaceClient(transport)
  let readiness: Promise<void> | undefined
  let calibrationEntered = () => {}
  transport.onReconcile!(() => { calibrationEntered(); return readiness ?? Promise.resolve() })
  const reconnect = async () => {
    stream.handlers.get('connected')!()
    for (let attempts = 0; attempts < 100 && !transport.connectionState!().connected; attempts++) await new Promise(resolve => setTimeout(resolve, 5))
    assert.equal(transport.connectionState!().connected, true)
  }
  await reconnect()
  for (const failure of ['lost-response', 'truncated-body', 'pre-header-retry'] as const) await test('a real committed settings write with ' + failure + ' is unknown and reread confirms one persistent effect', async () => {
    const previous = await client.settingsLoad(), next = previous.concurrency + 1, before = writes
    fault = failure
    await assert.rejects(client.settingsSave({ concurrency: next }, { concurrency: previous.concurrency }), error => {
      assert.ok(error instanceof WorkspaceConnectionError)
      assert.match(error.message, /检查保存结果，勿重复提交/)
      return true
    })
    assert.equal(read().concurrency, next, 'the synthetic on-disk result committed before response loss')
    assert.equal(writes, before + 1)
    assert.equal((await client.settingsLoad()).concurrency, next, 'ordinary authoritative read confirms the result')
    stream.onerror!(); await reconnect()
    assert.equal(writes, before + 1, 'neither reread nor reconnect may replay the uncertain write')
  })
  await test('disconnected and calibrating writes never reach the persistent service; failed calibration remains closed', async () => {
    const before = writes
    stream.onerror!()
    await assert.rejects(client.settingsSave({ concurrency: 8 }, { concurrency: read().concurrency }), /尚未校准/)
    let rejectCalibration!: (error: Error) => void
    readiness = new Promise<void>((_resolve, reject) => { rejectCalibration = reject })
    const entered = new Promise<void>(resolve => { calibrationEntered = resolve })
    stream.handlers.get('connected')!()
    await assert.rejects(client.settingsSave({ concurrency: 8 }, { concurrency: read().concurrency }), /尚未校准/)
    await entered
    rejectCalibration(Error('SYNTHETIC_REQUIRED_READ_FAILED'))
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(transport.connectionState!().connected, false)
    assert.equal(writes, before)
    readiness = undefined; await reconnect()
    assert.equal(writes, before)
  })
} finally {
  globalThis.fetch = realFetch
  ;(globalThis as any).window = oldWindow
  ;(globalThis as any).EventSource = oldEvents
  await server.close()
  fs.rmSync(root, { recursive: true, force: true })
}
