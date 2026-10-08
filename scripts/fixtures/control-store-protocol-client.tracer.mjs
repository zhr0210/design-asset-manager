import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {randomUUID} from 'node:crypto'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {PROFILE, encodeFrame, createFrameDecoder} from './control-store-protocol-wire.tracer.mjs'

// Test-only H. No product module imports or raw database writer in this process.
const require = createRequire(import.meta.url)
const deadlineMs = 10_000
const sameObject = (a, b) => a.dev === b.dev && a.ino === b.ino && a.birthtimeMs === b.birthtimeMs
const failure = code => Object.assign(new Error(code), {code})
const requireOk = reply => {
  if (!reply.ok) throw failure(reply.code ?? 'PROTOCOL_REFUSED')
  return reply
}

export async function createProtocolFixture() {
  const temporary = await fs.realpath(os.tmpdir())
  const root = await fs.realpath(await fs.mkdtemp(path.join(temporary, 'dam-control-protocol-')))
  const identity = await fs.lstat(root)
  const nonce = randomUUID()
  await fs.writeFile(path.join(root, 'owner.json'), JSON.stringify({format: 1, nonce}), {flag: 'wx'})
  const children = new Set()
  const observations = []
  let readers = 0
  let uncertain = false

  function readAfterExit(operationId) {
    if ([...children].some(child => !child.hasExited())) throw failure('FIXTURE_CHILD_STILL_RUNNING')
    if (uncertain) throw failure('FIXTURE_EXIT_UNKNOWN')
    const Database = require('better-sqlite3')
    const db = new Database(path.join(root, 'control.sqlite'), {readonly: true, fileMustExist: true, timeout: 0})
    readers++
    try {
      db.pragma('query_only=ON')
      return db.transaction(() => ({
        note: db.prepare('SELECT revision,text,effects FROM fixture_note WHERE id=1').get(),
        receipt: operationId ? db.prepare('SELECT operation_id AS operationId,payload_digest AS payloadDigest,revision,text,effects FROM fixture_receipts WHERE operation_id=?').get(operationId) ?? null : null,
        receipts: db.prepare('SELECT count(*) AS count FROM fixture_receipts').get().count,
        integrity: db.pragma('integrity_check', {simple: true})
      }))()
    } finally {
      // If close throws, retaining readers > 0 prevents cleanup.
      db.close()
      readers--
    }
  }

  async function start(cut) {
    if ([...children].some(child => !child.hasExited())) throw failure('FIXTURE_SECOND_AUTHORITY_REFUSED')
    if (uncertain) throw failure('FIXTURE_EXIT_UNKNOWN')
    if (!process.versions.electron || process.env.ELECTRON_RUN_AS_NODE !== '1') throw failure('ELECTRON_NODE_REQUIRED')
    if (cut && !['before-commit', 'after-commit', 'after-revoke'].includes(cut)) throw failure('INVALID_PRIVATE_CUT')
    const entry = path.resolve('scripts/fixtures/control-store-protocol.tracer.mjs')
    const env = {ELECTRON_RUN_AS_NODE: '1', DAM_PROTOCOL_BOOTSTRAP: nonce}
    for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'PATH', 'TEMP', 'TMP']) {
      if (process.env[key]) env[key] = process.env[key]
    }
    if (cut) env.DAM_PROTOCOL_CUT = cut
    const child = spawn(process.execPath, ['--max-old-space-size=64', entry, '--root', root], {
      env, cwd: process.cwd(), shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })
    let exited = false
    let exitResult
    let gate = 'open'
    let revocation = 'not-requested'
    let instance
    let session
    let permissionEpoch
    let sequence = 0
    let stderrBytes = 0
    let protocolFailed = false
    let cutEvent
    const pending = new Map()
    const cutWaiters = new Set()
    let resolveExit
    const exitPromise = new Promise(resolve => { resolveExit = resolve })
    const closeGate = () => {
      if (gate !== 'revoked') gate = 'closed-unknown'
      if (revocation === 'pending') revocation = 'unknown'
    }
    const failPending = code => {
      closeGate()
      for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(failure(code)) }
      pending.clear()
    }
    const decoder = createFrameDecoder(reply => {
      if (!reply || typeof reply.id !== 'string' || typeof reply.ok !== 'boolean' || !pending.has(reply.id)) {
        protocolFailed = true
        failPending('INVALID_OR_UNMATCHED_RESPONSE')
        child.kill()
        return
      }
      const waiter = pending.get(reply.id)
      pending.delete(reply.id)
      clearTimeout(waiter.timer)
      waiter.resolve(reply)
    }, () => {
      protocolFailed = true
      failPending('INVALID_RESPONSE_FRAME')
      child.kill()
    })
    child.stdout.on('data', chunk => decoder.push(chunk))
    child.stdout.on('end', () => decoder.end())
    child.stderr.on('data', chunk => {
      // Count but never log raw child stderr, tokens, input or fixture paths.
      stderrBytes += chunk.length
      if (stderrBytes > PROFILE.frameBytes) {
        protocolFailed = true
        failPending('STDERR_LIMIT')
        child.kill()
      }
    })
    child.stdin.on('error', () => failPending('CHANNEL_WRITE_FAILED'))
    child.on('error', () => failPending('AUTHORITY_SPAWN_FAILED'))
    child.on('message', message => {
      if (message?.kind !== 'cut' || message.point !== cut || cutEvent) {
        protocolFailed = true
        failPending('INVALID_PRIVATE_CUT')
        child.kill()
        return
      }
      cutEvent = {point: message.point, operationId: message.operationId ?? null}
      for (const waiter of cutWaiters) { clearTimeout(waiter.timer); waiter.resolve(cutEvent) }
      cutWaiters.clear()
    })
    child.on('close', (code, signal) => {
      exited = true
      exitResult = {code, signal, stderrBytes, protocolFailed}
      failPending('AUTHORITY_EXITED_ACK_UNKNOWN')
      for (const waiter of cutWaiters) { clearTimeout(waiter.timer); waiter.reject(failure('AUTHORITY_EXITED_BEFORE_CUT')) }
      cutWaiters.clear()
      resolveExit(exitResult)
    })

    function request(action, fields = {}) {
      if (exited || protocolFailed) return Promise.reject(failure('CHANNEL_CLOSED'))
      if (pending.size >= PROFILE.pendingFrames) return Promise.reject(failure('PENDING_LIMIT'))
      sequence++
      const id = 'r' + sequence
      let bytes
      try { bytes = encodeFrame({v: 1, id, sequence, action, ...fields}) }
      catch { return Promise.reject(failure('REQUEST_FRAME_LIMIT')) }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          failPending('ACK_TIMEOUT_UNKNOWN')
          child.kill()
        }, deadlineMs)
        pending.set(id, {resolve, reject, timer})
        child.stdin.write(bytes, error => { if (error) failPending('CHANNEL_WRITE_FAILED') })
      })
    }
    const scope = () => ({instance, session, permissionEpoch})
    const client = {
      hasExited: () => exited,
      exitObservation: () => exited ? {...exitResult} : {status: 'NOT_EXITED'},
      localState: () => ({gate, revocation, pending: pending.size}),
      operationId: suffix => instance + ':' + suffix,
      // Explicit private bypass lets tests prove A enforces permissions itself.
      raw: (action, fields = {}) => request(action, {...(action === 'hello' ? {} : action === 'attach' ? {instance} : scope()), ...fields}),
      rawBytes: bytes => child.stdin.write(bytes),
      commitNote: async (operationId, payload) => {
        if (gate !== 'open') throw failure('LOCAL_SEND_GATE_CLOSED')
        return requireOk(await request('commitNote', {...scope(), operationId, payload}))
      },
      inspectOperation: async operationId => requireOk(await request('inspectOperation', {...scope(), operationId})),
      readNote: async () => requireOk(await request('readNote', scope())),
      revoke: async () => {
        if (gate !== 'open') throw failure('LOCAL_SEND_GATE_CLOSED')
        gate = 'closed-unknown'
        revocation = 'pending'
        try {
          const reply = requireOk(await request('revoke', scope()))
          if (reply.applied !== true || !Number.isSafeInteger(reply.fence) || reply.permissionEpoch !== permissionEpoch + 1) throw failure('INVALID_REVOKE_ACK')
          permissionEpoch = reply.permissionEpoch
          gate = 'revoked'
          revocation = 'acknowledged'
          return reply
        } catch (error) { closeGate(); throw error }
      },
      waitForCut: () => {
        if (cutEvent) return Promise.resolve(cutEvent)
        if (exited) return Promise.reject(failure('AUTHORITY_EXITED_BEFORE_CUT'))
        return new Promise((resolve, reject) => {
          const waiter = {resolve, reject}
          waiter.timer = setTimeout(() => { cutWaiters.delete(waiter); closeGate(); child.kill(); reject(failure('CUT_TIMEOUT')) }, deadlineMs)
          cutWaiters.add(waiter)
        })
      },
      waitForExit: async () => {
        if (exited) return exitResult
        let timer
        try {
          return await Promise.race([exitPromise, new Promise((_, reject) => {
            timer = setTimeout(() => { uncertain = true; closeGate(); child.kill(); reject(failure('EXIT_TIMEOUT_UNKNOWN')) }, deadlineMs)
          })])
        } finally { clearTimeout(timer) }
      },
      stopAtCut: async () => {
        if (!cutEvent) throw failure('CUT_NOT_OBSERVED')
        closeGate()
        child.kill()
        return client.waitForExit()
      },
      close: async () => {
        if (exited) return exitResult
        const reply = requireOk(await request('close', scope()))
        if (reply.database !== 'closed') throw failure('CLOSE_NOT_ACKNOWLEDGED')
        gate = 'closed'
        return client.waitForExit()
      },
      dispose: async () => {
        if (!exited) { closeGate(); child.kill() }
        return client.waitForExit()
      }
    }
    children.add(client)
    try {
      const hello = requireOk(await request('hello', {major: 1, features: ['atomic-receipt', 'revoke-fence']}))
      instance = hello.instance
      if (typeof instance !== 'string' || !hello.runtime || hello.major !== 1) throw failure('INVALID_HELLO')
      const attached = requireOk(await request('attach', {instance, selection: 'owned-fixture'}))
      session = attached.session
      permissionEpoch = attached.permissionEpoch
      if (typeof session !== 'string' || permissionEpoch !== 1) throw failure('INVALID_ATTACH')
      // Runtime facts exclude instance/session/nonce/fixture path.
      observations.push(hello.runtime)
      return client
    } catch (error) {
      await client.dispose()
      throw error
    }
  }

  async function dispose({preserve = false} = {}) {
    for (const child of children) {
      if (!child.hasExited()) { try { await child.dispose() } catch { uncertain = true } }
    }
    const allExited = [...children].every(child => child.hasExited())
    const base = {fixtureName: path.basename(root), authorities: children.size, allExited, readers, uncertain, observations,
      exits: [...children].map(child => child.exitObservation())}
    if (preserve || !allExited || readers || uncertain) return {...base, cleanup: 'RETAINED'}
    const now = await fs.lstat(root)
    if (now.isSymbolicLink() || !sameObject(identity, now) || await fs.realpath(root) !== root) return {...base, cleanup: 'RETAINED_OBJECT_CHANGED'}
    const marker = JSON.parse(await fs.readFile(path.join(root, 'owner.json'), 'utf8'))
    if (marker.format !== 1 || marker.nonce !== nonce) return {...base, cleanup: 'RETAINED_OWNER_CHANGED'}
    const names = await fs.readdir(root)
    const allowed = new Set(['owner.json', 'control.sqlite', 'control.sqlite-journal'])
    const files = []
    for (const name of names) {
      const file = path.join(root, name)
      const stat = await fs.lstat(file)
      if (!allowed.has(name) || !stat.isFile() || stat.isSymbolicLink()) return {...base, cleanup: 'RETAINED_UNKNOWN_OBJECT'}
      files.push({file, stat})
    }
    // Recheck exact known objects after inspection; never recursively delete.
    for (const entry of files) if (!sameObject(entry.stat, await fs.lstat(entry.file))) return {...base, cleanup: 'RETAINED_OBJECT_CHANGED'}
    for (const entry of files) await fs.unlink(entry.file)
    await fs.rmdir(root)
    return {...base, cleanup: 'REMOVED_OWNED_FIXTURE'}
  }
  return {start, readAfterExit, dispose}
}
