/**
 * A: sole SQLite writer in the owned two-process synthetic tracer.
 * Same-user bootstrap proves cooperating fixture ownership, not an OS isolation boundary.
 * This module is never composed into the product Host.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { PROFILE, encodeFrame, createFrameDecoder } from './control-store-protocol-wire.tracer.mjs'

const SUPPORTED_FEATURES = Object.freeze(['atomic-receipt', 'revoke-fence'])
const BASE_FIELDS = ['v', 'id', 'sequence', 'action']
const CAP_FIELDS = [...BASE_FIELDS, 'instance', 'session', 'permissionEpoch']
const ACTION_FIELDS = Object.freeze({
  hello: [...BASE_FIELDS, 'major', 'features'],
  attach: [...BASE_FIELDS, 'instance', 'selection'],
  commitNote: [...CAP_FIELDS, 'operationId', 'payload'],
  inspectOperation: [...CAP_FIELDS, 'operationId'],
  readNote: CAP_FIELDS,
  revoke: CAP_FIELDS,
  close: CAP_FIELDS,
})

const instance = randomUUID()
let session = null
let permissionEpoch = 1
let revoked = false
let revokeFence = null
let negotiated = false
let lastSequence = 0
let database = null
let statements = null
let closing = false
let paused = false
let processing = false
const queue = []
const cutPoint = process.env.DAM_PROTOCOL_CUT ?? ''

function diagnostic(code) {
  // Fixed codes only: no pathname, bootstrap, capability, SQL or payload in diagnostics.
  process.stderr.write(`control-protocol:${code}\n`)
}

function closeDatabase() {
  if (!database) return
  if (database.inTransaction) database.exec('ROLLBACK')
  database.close()
  database = null
  statements = null
}

function failClosed(code) {
  if (closing) return
  closing = true
  paused = true
  queue.length = 0
  diagnostic(code)
  try { closeDatabase() } catch { diagnostic('CLOSE_FAILURE') }
  process.stdin.destroy()
  process.stdout.end(() => {
    if (process.connected) process.disconnect()
    process.exitCode = 2
  })
}

function send(response) {
  if (closing) return
  // Bound outbound queued bytes as well as inbound work. Parent failures never admit another write.
  const bytes = encodeFrame(response)
  if (process.stdout.writableLength + bytes.length > PROFILE.frameBytes * PROFILE.pendingFrames) {
    failClosed('OUTPUT_CAPACITY')
    return
  }
  process.stdout.write(bytes)
}

function refuse(frame, code, extra = {}) {
  // A rejected message alone makes no claim about an older operation sharing its ID.
  send({ id: frame.id, ok: false, code, ...extra })
}

function hasExactFields(value, fields) {
  const keys = Object.keys(value)
  return keys.length === fields.length && keys.every((key) => fields.includes(key))
}

function validIdentifier(value, maximum = 128) {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum &&
    /^[A-Za-z0-9._:-]+$/.test(value)
}

function validOperationId(value) {
  return validIdentifier(value, 200) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:[A-Za-z0-9._:-]+$/.test(value)
}

function validateEnvelope(frame) {
  if (!validIdentifier(frame.id) || !Number.isSafeInteger(frame.sequence) || frame.sequence < 1 ||
      typeof frame.action !== 'string') {
    failClosed('INVALID_FRAME')
    return false
  }
  if (frame.v !== 1) { refuse(frame, 'PROTOCOL_MISMATCH'); return false }
  if (frame.sequence <= lastSequence) { refuse(frame, 'SEQUENCE_MISMATCH'); return false }
  lastSequence = frame.sequence
  const fields = Object.hasOwn(ACTION_FIELDS, frame.action) ? ACTION_FIELDS[frame.action] : null
  if (!fields) { refuse(frame, 'UNKNOWN_ACTION'); return false }
  if (!hasExactFields(frame, fields)) { refuse(frame, 'UNKNOWN_FIELD'); return false }
  return true
}

function validateCapability(frame) {
  if (!negotiated) { refuse(frame, 'NOT_NEGOTIATED'); return false }
  if (frame.instance !== instance) { refuse(frame, 'STALE_INSTANCE'); return false }
  if (!session || frame.session !== session) { refuse(frame, 'INVALID_SESSION'); return false }
  if (frame.permissionEpoch !== permissionEpoch) { refuse(frame, 'STALE_PERMISSION_EPOCH'); return false }
  return true
}

function inspectNote() {
  const note = statements.note.get()
  if (!note || !Number.isSafeInteger(note.revision) || !Number.isSafeInteger(note.effects) ||
      note.revision < 0 || note.effects < 0 || typeof note.text !== 'string') {
    throw new Error('INVALID_STORE')
  }
  return note
}

function inspectReceipt(operationId) {
  // LIMIT 2 detects impossible multiplicity without an unbounded materialization.
  const rows = statements.receipt.all(operationId)
  if (rows.length > 1) throw new Error('INVALID_STORE')
  return rows[0] ?? null
}

function notifyCut(point, operationId) {
  paused = true
  if (!process.connected || typeof process.send !== 'function') {
    failClosed('CUT_CHANNEL_MISSING')
    return
  }
  process.send({ kind: 'cut', point, operationId }, (error) => {
    if (error) failClosed('CUT_CHANNEL_FAILURE')
  })
  // Remain at the selected cut with no business ACK. Only the owned parent stops this child.
}

function commitNote(frame) {
  if (revoked) { refuse(frame, 'REVOKED'); return }
  if (!validOperationId(frame.operationId)) { refuse(frame, 'INVALID_OPERATION'); return }
  if (!frame.operationId.startsWith(`${instance}:`)) { refuse(frame, 'STALE_OPERATION'); return }
  const payload = frame.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      !hasExactFields(payload, ['expectedRevision', 'text']) ||
      !Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision < 0 ||
      typeof payload.text !== 'string' || Buffer.byteLength(payload.text, 'utf8') > PROFILE.textBytes ||
      Buffer.from(payload.text, 'utf8').toString('utf8') !== payload.text) {
    refuse(frame, 'INVALID_PAYLOAD')
    return
  }
  const payloadDigest = createHash('sha256')
    .update(JSON.stringify({ expectedRevision: payload.expectedRevision, text: payload.text }), 'utf8')
    .digest('hex')
  database.exec('BEGIN IMMEDIATE')
  let receipt
  try {
    receipt = inspectReceipt(frame.operationId)
    if (receipt) {
      database.exec('ROLLBACK')
      if (receipt.payloadDigest !== payloadDigest) refuse(frame, 'PAYLOAD_MISMATCH')
      else send({ id: frame.id, ok: true, dbOutcome: 'committed', receipt, replayed: true })
      return
    }
    const count = statements.receiptCount.get().count
    if (count >= PROFILE.receipts) {
      database.exec('ROLLBACK')
      refuse(frame, 'RECEIPT_CAPACITY', { dbOutcome: 'verified-no-effect' })
      return
    }
    const note = inspectNote()
    if (note.revision !== payload.expectedRevision || note.revision >= Number.MAX_SAFE_INTEGER ||
        note.effects >= Number.MAX_SAFE_INTEGER) {
      database.exec('ROLLBACK')
      refuse(frame, 'REVISION_CONFLICT', { dbOutcome: 'verified-no-effect', actualRevision: note.revision })
      return
    }
    const changed = statements.updateNote.run(payload.text, payload.expectedRevision)
    if (changed.changes !== 1) throw new Error('INVALID_STORE')
    const updated = inspectNote()
    receipt = { operationId: frame.operationId, payloadDigest, ...updated }
    statements.insertReceipt.run(receipt.operationId, receipt.payloadDigest, receipt.revision,
      receipt.text, receipt.effects)
    if (cutPoint === 'before-commit') {
      notifyCut('before-commit', frame.operationId)
      return
    }
    database.exec('COMMIT')
  } catch (error) {
    if (database.inTransaction) database.exec('ROLLBACK')
    throw error
  }
  if (cutPoint === 'after-commit') {
    notifyCut('after-commit', frame.operationId)
    return
  }
  send({ id: frame.id, ok: true, dbOutcome: 'committed', receipt, replayed: false })
}

function orderlyClose(frame) {
  // Physical SQLite close is observed separately from the parent seeing stdout/child exit.
  closeDatabase()
  send({ id: frame.id, ok: true, database: 'closed', closed: true })
  closing = true
  paused = true
  queue.length = 0
  process.stdin.destroy()
  process.stdout.end(() => {
    if (process.connected) process.disconnect()
    process.exitCode = 0
  })
}

function dispatch(frame) {
  if (!validateEnvelope(frame)) return
  if (frame.action === 'hello') {
    if (frame.major !== 1) { refuse(frame, 'PROTOCOL_MISMATCH'); return }
    if (!Array.isArray(frame.features) || frame.features.length !== SUPPORTED_FEATURES.length ||
        new Set(frame.features).size !== frame.features.length ||
        !SUPPORTED_FEATURES.every((feature) => frame.features.includes(feature))) {
      refuse(frame, 'FEATURE_MISMATCH')
      return
    }
    if (negotiated) { refuse(frame, 'ALREADY_NEGOTIATED'); return }
    negotiated = true
    const sqlite = database.prepare('SELECT sqlite_version() AS version, sqlite_source_id() AS sourceId').get()
    const memory = process.memoryUsage()
    send({ id: frame.id, ok: true, major: 1, features: SUPPORTED_FEATURES, instance, limits: PROFILE,
      runtime: { electron: process.versions.electron, node: process.versions.node,
        abi: process.versions.modules, napi: process.versions.napi, uv: process.versions.uv, sqlite,
        memory: { rss: memory.rss, heapUsed: memory.heapUsed } } })
    return
  }
  if (frame.action === 'attach') {
    if (!negotiated) { refuse(frame, 'NOT_NEGOTIATED'); return }
    if (frame.instance !== instance) { refuse(frame, 'STALE_INSTANCE'); return }
    if (frame.selection !== 'owned-fixture') { refuse(frame, 'INVALID_SELECTION'); return }
    if (session) { refuse(frame, 'ALREADY_ATTACHED'); return }
    session = randomUUID()
    send({ id: frame.id, ok: true, instance, session, permissionEpoch })
    return
  }
  if (!validateCapability(frame)) return
  switch (frame.action) {
    case 'commitNote':
      commitNote(frame)
      break
    case 'inspectOperation': {
      if (!validOperationId(frame.operationId)) { refuse(frame, 'INVALID_OPERATION'); return }
      const receipt = inspectReceipt(frame.operationId)
      send({ id: frame.id, ok: true, dbOutcome: receipt ? 'committed' : 'unknown', receipt })
      break
    }
    case 'readNote':
      send({ id: frame.id, ok: true, note: inspectNote() })
      break
    case 'revoke':
      if (!revoked) {
        revoked = true
        permissionEpoch = 2
        revokeFence = frame.sequence
      }
      if (cutPoint === 'after-revoke') {
        notifyCut('after-revoke', null)
        return
      }
      send({ id: frame.id, ok: true, permissionEpoch, fence: revokeFence, applied: true })
      break
    case 'close':
      orderlyClose(frame)
      break
    default:
      throw new Error('INVALID_DISPATCH')
  }
}

function pump() {
  if (processing || paused || closing) return
  processing = true
  try {
    while (queue.length && !paused && !closing) dispatch(queue.shift())
  } catch {
    failClosed('AUTHORITY_FAILURE')
  } finally {
    processing = false
  }
}

function ownedRoot() {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args[0] !== '--root' || !path.isAbsolute(args[1])) throw new Error('BOOTSTRAP')
  const nonce = process.env.DAM_PROTOCOL_BOOTSTRAP
  if (typeof nonce !== 'string' || !/^[A-Za-z0-9-]{16,128}$/.test(nonce)) throw new Error('BOOTSTRAP')
  if (!['', 'before-commit', 'after-commit', 'after-revoke'].includes(cutPoint)) throw new Error('BOOTSTRAP')
  if (process.env.ELECTRON_RUN_AS_NODE !== '1' || !process.versions.electron || !process.connected) {
    throw new Error('BOOTSTRAP')
  }
  const root = args[1]
  const rootStat = fs.lstatSync(root)
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('BOOTSTRAP')
  const realRoot = fs.realpathSync.native(root)
  const realTemporary = fs.realpathSync.native(os.tmpdir())
  if (realRoot !== root || path.dirname(realRoot) !== realTemporary ||
      !path.basename(realRoot).startsWith('dam-control-protocol-')) throw new Error('BOOTSTRAP')
  const names = fs.readdirSync(realRoot)
  const known = ['owner.json', 'control.sqlite', 'control.sqlite-journal']
  if (!names.includes('owner.json') || names.some((name) => !known.includes(name))) throw new Error('BOOTSTRAP')
  for (const name of names) {
    const stat = fs.lstatSync(path.join(realRoot, name))
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('BOOTSTRAP')
  }
  const markerFile = path.join(realRoot, 'owner.json')
  if (fs.statSync(markerFile).size > 256) throw new Error('BOOTSTRAP')
  const marker = JSON.parse(fs.readFileSync(markerFile, 'utf8'))
  if (!marker || typeof marker !== 'object' || Array.isArray(marker) ||
      !hasExactFields(marker, ['format', 'nonce']) || marker.format !== 1 || typeof marker.nonce !== 'string') {
    throw new Error('BOOTSTRAP')
  }
  const expected = Buffer.from(nonce, 'utf8')
  const actual = Buffer.from(marker.nonce, 'utf8')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('BOOTSTRAP')
  return { root: realRoot, bootstrapDigest: createHash('sha256').update(expected).digest('hex') }
}

function bootstrapStore() {
  const owned = ownedRoot()
  const filename = path.join(owned.root, 'control.sqlite')
  const existed = fs.existsSync(filename)
  const Database = createRequire(import.meta.url)('better-sqlite3')
  database = new Database(filename)
  database.pragma(`page_size = ${PROFILE.pageSize}`)
  database.pragma(`max_page_count = ${PROFILE.maxPages}`)
  database.pragma('journal_mode = DELETE')
  database.pragma('synchronous = FULL')
  database.pragma('foreign_keys = ON')
  if (!existed) {
    database.exec(`BEGIN IMMEDIATE;
      CREATE TABLE fixture_identity (singleton INTEGER PRIMARY KEY CHECK(singleton=1), format INTEGER NOT NULL CHECK(format=1), bootstrap_digest TEXT NOT NULL);
      CREATE TABLE fixture_note (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL CHECK(revision>=0), text TEXT NOT NULL, effects INTEGER NOT NULL CHECK(effects>=0));
      CREATE TABLE fixture_receipts (operation_id TEXT PRIMARY KEY, payload_digest TEXT NOT NULL, revision INTEGER NOT NULL, text TEXT NOT NULL, effects INTEGER NOT NULL);
      INSERT INTO fixture_note VALUES (1,0,'',0);
      PRAGMA user_version=1;`)
    try {
      database.prepare('INSERT INTO fixture_identity VALUES (1,1,?)').run(owned.bootstrapDigest)
      database.exec('COMMIT')
    } catch (error) {
      if (database.inTransaction) database.exec('ROLLBACK')
      throw error
    }
  }
  const identity = database.prepare('SELECT format,bootstrap_digest AS digest FROM fixture_identity WHERE singleton=1').get()
  if (!identity || identity.format !== 1 || identity.digest !== owned.bootstrapDigest ||
      database.pragma('user_version', { simple: true }) !== 1 ||
      database.pragma('page_size', { simple: true }) !== PROFILE.pageSize ||
      database.pragma('max_page_count', { simple: true }) !== PROFILE.maxPages ||
      database.pragma('journal_mode', { simple: true }) !== 'delete' ||
      database.pragma('synchronous', { simple: true }) !== 2) throw new Error('INVALID_STORE')
  const objects = database.prepare("SELECT type,name FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name LIMIT 4").all()
  if (objects.length !== 3 || objects.some((entry) => entry.type !== 'table') ||
      objects.map((entry) => entry.name).join(',') !== 'fixture_identity,fixture_note,fixture_receipts') throw new Error('INVALID_STORE')
  statements = {
    note: database.prepare('SELECT revision,text,effects FROM fixture_note WHERE id=1'),
    receipt: database.prepare('SELECT operation_id AS operationId,payload_digest AS payloadDigest,revision,text,effects FROM fixture_receipts WHERE operation_id=? LIMIT 2'),
    receiptCount: database.prepare('SELECT count(*) AS count FROM fixture_receipts'),
    updateNote: database.prepare('UPDATE fixture_note SET revision=revision+1,text=?,effects=effects+1 WHERE id=1 AND revision=?'),
    insertReceipt: database.prepare('INSERT INTO fixture_receipts VALUES (?,?,?,?,?)'),
  }
  inspectNote()
  if (statements.receiptCount.get().count > PROFILE.receipts) throw new Error('INVALID_STORE')
}

try {
  bootstrapStore()
} catch {
  diagnostic('BOOTSTRAP_FAILURE')
  try { closeDatabase() } catch { diagnostic('CLOSE_FAILURE') }
  if (process.connected) process.disconnect()
  process.exitCode = 2
}

if (database) {
  const decoder = createFrameDecoder((frame) => {
    if (closing) return
    if (queue.length >= PROFILE.pendingFrames) { failClosed('QUEUE_CAPACITY'); return }
    queue.push(frame)
    pump()
  }, failClosed)
  process.stdin.on('data', (chunk) => decoder.push(chunk))
  process.stdin.on('end', () => {
    decoder.end()
    if (!closing) failClosed('CHANNEL_EOF')
  })
  process.stdin.on('error', () => failClosed('CHANNEL_FAILURE'))
  process.stdout.on('error', () => failClosed('CHANNEL_FAILURE'))
  process.on('disconnect', () => failClosed('CONTROL_DISCONNECTED'))
}
