/**
 * Test-only A: the sole SQLite writer in an owned caption-shaped H/A fixture.
 * Fixed references and two logical roots are cooperating-fixture checks, not OS protection.
 * No product Host, real library, provisioner or production adapter imports this module.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import {
  PROFILE, CATALOG, FEATURES, exact, identifier, operationIdentifier,
  canonicalPayload, payloadDigest, encodeFrame, createFrameDecoder,
} from './control-store-facade-profile.tracer.mjs'

const BASE_FIELDS = ['v', 'id', 'sequence', 'action']
const REF_FIELDS = ['catalogRef', 'profileId', 'clientId', 'libraryIdentity', 'generation']
const CAP_FIELDS = [...BASE_FIELDS, 'instance', 'session', 'permissionEpoch', ...REF_FIELDS]
const ACTION_FIELDS = Object.freeze({
  hello: [...BASE_FIELDS, 'major', 'features'],
  attach: [...BASE_FIELDS, 'instance', 'catalogRef', 'materialRef', 'profileId', 'clientId'],
  grant: CAP_FIELDS,
  readCaption: CAP_FIELDS,
  revoke: CAP_FIELDS,
  close: CAP_FIELDS,
  commitCaption: [...CAP_FIELDS, 'operationId', 'payload'],
  inspectOperation: [...CAP_FIELDS, 'operationId'],
})
const CUT_POINTS = ['', 'before-commit', 'after-commit', 'after-revoke',
  'late-after-commit', 'malformed-after-commit', 'mismatched-receipt']
const MAX_STORE_BYTES = PROFILE.pageSize * PROFILE.maxPages
const BINDING_FIELDS = [...Object.keys(CATALOG), 'layoutVersion']
const RECEIPT_FIELDS = ['operationId', 'payloadDigest', 'instance', 'session', 'permissionEpoch',
  'catalogRef', 'profileId', 'clientId', 'libraryIdentity', 'generation', 'assetId', 'caption',
  'revision', 'effects']
const RECEIPT_SELECT = `operation_id AS operationId,payload_digest AS payloadDigest,
  instance,session,permission_epoch AS permissionEpoch,catalog_ref AS catalogRef,
  profile_id AS profileId,client_id AS clientId,library_identity AS libraryIdentity,
  generation,asset_id AS assetId,caption,revision,effects`
const SCHEMA = Object.freeze({
  fixture_identity: `CREATE TABLE fixture_identity (
    singleton INTEGER PRIMARY KEY CHECK(singleton=1),
    format INTEGER NOT NULL CHECK(format=2),bootstrap_digest TEXT NOT NULL,
    catalog_ref TEXT NOT NULL,material_ref TEXT NOT NULL,profile_id TEXT NOT NULL,
    client_id TEXT NOT NULL,library_identity TEXT NOT NULL,generation TEXT NOT NULL,
    asset_id TEXT NOT NULL,layout_version INTEGER NOT NULL CHECK(layout_version=2))`,
  fixture_caption: `CREATE TABLE fixture_caption (
    asset_id TEXT PRIMARY KEY,caption TEXT,revision INTEGER NOT NULL CHECK(revision>=0),
    effects INTEGER NOT NULL CHECK(effects>=0))`,
  fixture_receipts: `CREATE TABLE fixture_receipts (
    operation_id TEXT PRIMARY KEY,payload_digest TEXT NOT NULL,instance TEXT NOT NULL,
    session TEXT NOT NULL,permission_epoch INTEGER NOT NULL CHECK(permission_epoch>=1),
    catalog_ref TEXT NOT NULL,profile_id TEXT NOT NULL,client_id TEXT NOT NULL,
    library_identity TEXT NOT NULL,generation TEXT NOT NULL,asset_id TEXT NOT NULL,
    caption TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>=1),
    effects INTEGER NOT NULL CHECK(effects>=1))`,
})
const COLUMN_NAMES = Object.freeze({
  fixture_identity: ['singleton', 'format', 'bootstrap_digest', 'catalog_ref', 'material_ref',
    'profile_id', 'client_id', 'library_identity', 'generation', 'asset_id', 'layout_version'],
  fixture_caption: ['asset_id', 'caption', 'revision', 'effects'],
  fixture_receipts: ['operation_id', 'payload_digest', 'instance', 'session', 'permission_epoch',
    'catalog_ref', 'profile_id', 'client_id', 'library_identity', 'generation', 'asset_id',
    'caption', 'revision', 'effects'],
})

const instance = randomUUID()
const cutPoint = process.env.DAM_FACADE_CUT ?? ''
let session = null
let permissionEpoch = 0
let businessAdmission = false
let revoked = false
let negotiated = false
let lastSequence = 0
let database = null
let statements = null
let owned = null
let closing = false
let paused = false
let processing = false
let cutUsed = false
let releasedCut = false
let savedLateReply = null
const queue = []

const sameObject = (left, right) => left.dev === right.dev && left.ino === right.ino &&
  left.birthtimeMs === right.birthtimeMs
const normalizeSql = value => value.replace(/\s+/g, ' ').trim().replace(/;$/, '')
const uuid = value => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)
const captionText = value => typeof value === 'string' &&
  Buffer.byteLength(value, 'utf8') <= PROFILE.textBytes && Buffer.from(value, 'utf8').toString('utf8') === value

function diagnostic(code) {
  // Diagnostics use fixed codes only, never paths, capabilities, payloads or SQL errors.
  process.stderr.write(`control-facade:${code}\n`)
}

function closeDatabase() {
  if (!database) return
  if (database.inTransaction) database.exec('ROLLBACK')
  database.close()
  database = null
  statements = null
}

function stopChannels(exitCode) {
  process.exitCode = exitCode
  process.stdin.destroy()
  process.stdout.end(() => { if (process.connected) process.disconnect() })
}

function failClosed(code) {
  if (closing) return
  closing = true
  paused = true
  businessAdmission = false
  queue.length = 0
  savedLateReply = null
  diagnostic(code)
  try { closeDatabase() } catch { diagnostic('CLOSE_FAILURE') }
  stopChannels(2)
}

function send(response) {
  if (closing) return false
  const bytes = encodeFrame(response)
  if (process.stdout.writableLength + bytes.length > PROFILE.frameBytes * PROFILE.pendingFrames) {
    failClosed('OUTPUT_CAPACITY')
    return false
  }
  process.stdout.write(bytes)
  return true
}

function refuse(frame, code, extra = {}) {
  // Rejection does not establish the outcome of a previous use of the operation ID.
  send({ id: frame.id, ok: false, code, ...extra })
}

function directory(filename) {
  const stat = fs.lstatSync(filename)
  if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync.native(filename) !== filename) {
    throw new Error('FIXTURE_LAYOUT')
  }
  return stat
}

function regular(filename, maximum) {
  const stat = fs.lstatSync(filename)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 ||
      !Number.isSafeInteger(stat.size) || stat.size < 0 || stat.size > maximum ||
      fs.realpathSync.native(filename) !== filename) throw new Error('FIXTURE_LAYOUT')
  return stat
}

function readOwnedJson(filename, maximum) {
  const before = regular(filename, maximum)
  const fd = fs.openSync(filename, fs.constants.O_RDONLY)
  try {
    const opened = fs.fstatSync(fd)
    if (!sameObject(before, opened) || !opened.isFile() || opened.nlink !== 1 || opened.size > maximum) {
      throw new Error('FIXTURE_LAYOUT')
    }
    // Never let a concurrent size change turn a small marker into an unbounded allocation.
    const bounded = Buffer.alloc(maximum + 1)
    let length = 0
    while (length < bounded.length) {
      const read = fs.readSync(fd, bounded, length, bounded.length - length, null)
      if (read === 0) break
      length += read
    }
    const bytes = bounded.subarray(0, length)
    const after = fs.fstatSync(fd)
    if (bytes.length > maximum || !sameObject(opened, after) || opened.size !== after.size ||
        bytes.length !== after.size || !sameObject(after, regular(filename, maximum))) {
      throw new Error('FIXTURE_LAYOUT')
    }
    const decoded = bytes.toString('utf8')
    if (!Buffer.from(decoded, 'utf8').equals(bytes)) throw new Error('FIXTURE_LAYOUT')
    return { value: JSON.parse(decoded), stat: after }
  } finally { fs.closeSync(fd) }
}

function checkLayout(state, withStore) {
  for (const [filename, expected] of [[state.root, state.rootStat], [state.control, state.controlStat],
    [state.material, state.materialStat]]) {
    if (!sameObject(expected, directory(filename))) throw new Error('FIXTURE_LAYOUT')
  }
  const rootNames = fs.readdirSync(state.root).sort()
  if (rootNames.join(',') !== 'control,material,owner.json') throw new Error('FIXTURE_LAYOUT')
  if (fs.readdirSync(state.material).join(',') !== 'binding.json') throw new Error('FIXTURE_LAYOUT')
  const controlNames = fs.readdirSync(state.control)
  if (controlNames.some(name => !['store.sqlite', 'store.sqlite-journal'].includes(name)) ||
      (controlNames.includes('store.sqlite-journal') && !controlNames.includes('store.sqlite')) ||
      (withStore && !controlNames.includes('store.sqlite'))) throw new Error('FIXTURE_LAYOUT')
  for (const name of controlNames) {
    const maximum = name === 'store.sqlite' ? MAX_STORE_BYTES : MAX_STORE_BYTES * 2
    const stat = regular(path.join(state.control, name), maximum)
    if (name === 'store.sqlite' && state.storeStat && !sameObject(state.storeStat, stat)) {
      throw new Error('FIXTURE_LAYOUT')
    }
  }
  const marker = readOwnedJson(path.join(state.root, 'owner.json'), 256)
  if (!exact(marker.value, ['format', 'nonce']) || marker.value.format !== 2 ||
      typeof marker.value.nonce !== 'string') throw new Error('FIXTURE_LAYOUT')
  const actual = Buffer.from(marker.value.nonce, 'utf8')
  if (actual.length !== state.nonce.length || !timingSafeEqual(actual, state.nonce) ||
      (state.markerStat && !sameObject(state.markerStat, marker.stat))) throw new Error('FIXTURE_LAYOUT')
  const binding = readOwnedJson(path.join(state.material, 'binding.json'), 2048)
  if (!exact(binding.value, BINDING_FIELDS) || binding.value.layoutVersion !== 2 ||
      Object.keys(CATALOG).some(key => binding.value[key] !== CATALOG[key]) ||
      (state.bindingStat && !sameObject(state.bindingStat, binding.stat))) throw new Error('FIXTURE_LAYOUT')
  state.markerStat ??= marker.stat
  state.bindingStat ??= binding.stat
}

function ownedRoot() {
  const args = process.argv.slice(2)
  const bootstrap = process.env.DAM_FACADE_BOOTSTRAP
  if (args.length !== 2 || args[0] !== '--root' || !path.isAbsolute(args[1]) ||
      typeof bootstrap !== 'string' || !/^[A-Za-z0-9-]{16,128}$/.test(bootstrap) ||
      !CUT_POINTS.includes(cutPoint) || process.env.ELECTRON_RUN_AS_NODE !== '1' ||
      !process.versions.electron || !process.connected) throw new Error('BOOTSTRAP')
  const root = args[1]
  const rootStat = directory(root)
  const temporary = fs.realpathSync.native(os.tmpdir())
  if (path.dirname(root) !== temporary || !/^dam-control-facade-[A-Za-z0-9._-]+$/.test(path.basename(root))) {
    throw new Error('BOOTSTRAP')
  }
  const control = path.join(root, 'control')
  const material = path.join(root, 'material')
  const nonce = Buffer.from(bootstrap, 'utf8')
  const state = { root, control, material, rootStat, controlStat: directory(control),
    materialStat: directory(material), nonce,
    bootstrapDigest: createHash('sha256').update(nonce).digest('hex') }
  checkLayout(state, false)
  return state
}

function validateSchema() {
  const objects = database.prepare('SELECT type,name,tbl_name AS tableName,sql FROM sqlite_schema ORDER BY name LIMIT 6').all()
  // Only three exact tables and the two SQLite-owned TEXT-primary-key indexes are permitted.
  const expectedNames = ['fixture_caption', 'fixture_identity', 'fixture_receipts',
    'sqlite_autoindex_fixture_caption_1', 'sqlite_autoindex_fixture_receipts_1'].sort()
  if (objects.length !== expectedNames.length ||
      objects.map(entry => entry.name).join(',') !== expectedNames.join(',')) throw new Error('INVALID_STORE')
  for (const entry of objects) {
    if (Object.hasOwn(SCHEMA, entry.name)) {
      if (entry.type !== 'table' || entry.tableName !== entry.name || typeof entry.sql !== 'string' ||
          normalizeSql(entry.sql) !== normalizeSql(SCHEMA[entry.name])) throw new Error('INVALID_STORE')
      const columns = database.prepare(`PRAGMA table_info(${entry.name})`).all()
      if (columns.map(column => column.name).join(',') !== COLUMN_NAMES[entry.name].join(',')) {
        throw new Error('INVALID_STORE')
      }
    } else if (entry.type !== 'index' || entry.sql !== null ||
        !['fixture_caption', 'fixture_receipts'].includes(entry.tableName) ||
        entry.name !== `sqlite_autoindex_${entry.tableName}_1`) throw new Error('INVALID_STORE')
  }
}

function inspectCaption() {
  const rows = statements.caption.all()
  if (rows.length !== 1) throw new Error('INVALID_STORE')
  const caption = rows[0]
  if (caption.assetId !== CATALOG.assetId || (caption.caption !== null && !captionText(caption.caption)) ||
      !Number.isSafeInteger(caption.revision) || !Number.isSafeInteger(caption.effects) ||
      caption.revision < 0 || caption.effects < 0 || caption.revision !== caption.effects) {
    throw new Error('INVALID_STORE')
  }
  return caption
}

function validReceipt(receipt) {
  return exact(receipt, RECEIPT_FIELDS) && operationIdentifier(receipt.operationId) &&
    /^[0-9a-f]{64}$/.test(receipt.payloadDigest) && uuid(receipt.instance) && uuid(receipt.session) &&
    receipt.operationId.startsWith(`${receipt.instance}:`) && Number.isSafeInteger(receipt.permissionEpoch) &&
    receipt.permissionEpoch >= 1 && REF_FIELDS.every(key => receipt[key] === CATALOG[key]) &&
    receipt.assetId === CATALOG.assetId && captionText(receipt.caption) &&
    Number.isSafeInteger(receipt.revision) && receipt.revision >= 1 &&
    Number.isSafeInteger(receipt.effects) && receipt.effects === receipt.revision
}

function inspectReceipt(operationId) {
  const rows = statements.receipt.all(operationId)
  if (rows.length > 1 || (rows.length === 1 && !validReceipt(rows[0]))) throw new Error('INVALID_STORE')
  return rows[0] ?? null
}

function bootstrapStore() {
  owned = ownedRoot()
  // Resolver is A-owned and fixed. No wire field becomes a pathname or registration request.
  const filename = path.join(owned.control, 'store.sqlite')
  const existed = fs.existsSync(filename)
  if (!existed) {
    const fd = fs.openSync(filename, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR, 0o600)
    fs.closeSync(fd)
  }
  owned.storeStat = regular(filename, MAX_STORE_BYTES)
  checkLayout(owned, true)
  const Database = createRequire(import.meta.url)('better-sqlite3')
  database = new Database(filename, { fileMustExist: true, timeout: 0 })
  checkLayout(owned, true)
  database.pragma(`page_size = ${PROFILE.pageSize}`)
  database.pragma(`max_page_count = ${PROFILE.maxPages}`)
  database.pragma('journal_mode = DELETE')
  database.pragma('synchronous = FULL')
  database.pragma('foreign_keys = ON')
  if (!existed) {
    database.exec('BEGIN IMMEDIATE')
    try {
      for (const sql of Object.values(SCHEMA)) database.exec(sql)
      database.prepare(`INSERT INTO fixture_identity
        (singleton,format,bootstrap_digest,catalog_ref,material_ref,profile_id,client_id,
        library_identity,generation,asset_id,layout_version) VALUES (1,2,?,?,?,?,?,?,?,?,2)`)
        .run(owned.bootstrapDigest, CATALOG.catalogRef, CATALOG.materialRef, CATALOG.profileId,
          CATALOG.clientId, CATALOG.libraryIdentity, CATALOG.generation, CATALOG.assetId)
      database.prepare('INSERT INTO fixture_caption (asset_id,caption,revision,effects) VALUES (?,NULL,0,0)')
        .run(CATALOG.assetId)
      database.pragma('user_version = 2')
      database.exec('COMMIT')
    } catch (error) {
      if (database.inTransaction) database.exec('ROLLBACK')
      throw error
    }
  }
  validateSchema()
  const identities = database.prepare(`SELECT singleton,format,bootstrap_digest AS bootstrapDigest,
    catalog_ref AS catalogRef,material_ref AS materialRef,profile_id AS profileId,client_id AS clientId,
    library_identity AS libraryIdentity,generation,asset_id AS assetId,layout_version AS layoutVersion
    FROM fixture_identity LIMIT 2`).all()
  const identity = identities[0]
  if (identities.length !== 1 || identity.singleton !== 1 || identity.format !== 2 || identity.layoutVersion !== 2 ||
      identity.bootstrapDigest !== owned.bootstrapDigest || Object.keys(CATALOG).some(key => identity[key] !== CATALOG[key]) ||
      database.pragma('user_version', { simple: true }) !== 2 ||
      database.pragma('page_size', { simple: true }) !== PROFILE.pageSize ||
      database.pragma('max_page_count', { simple: true }) !== PROFILE.maxPages ||
      database.pragma('journal_mode', { simple: true }) !== 'delete' ||
      database.pragma('synchronous', { simple: true }) !== 2 ||
      database.pragma('foreign_keys', { simple: true }) !== 1 ||
      database.pragma('page_count', { simple: true }) > PROFILE.maxPages) throw new Error('INVALID_STORE')
  statements = {
    caption: database.prepare('SELECT asset_id AS assetId,caption,revision,effects FROM fixture_caption LIMIT 2'),
    receipt: database.prepare(`SELECT ${RECEIPT_SELECT} FROM fixture_receipts WHERE operation_id=? LIMIT 2`),
    receiptCount: database.prepare('SELECT count(*) AS count FROM fixture_receipts'),
    updateCaption: database.prepare(`UPDATE fixture_caption SET caption=?,revision=revision+1,effects=effects+1
      WHERE asset_id=? AND revision=?`),
    insertReceipt: database.prepare(`INSERT INTO fixture_receipts (operation_id,payload_digest,instance,
      session,permission_epoch,catalog_ref,profile_id,client_id,library_identity,generation,asset_id,
      caption,revision,effects) VALUES (@operationId,@payloadDigest,@instance,@session,@permissionEpoch,
      @catalogRef,@profileId,@clientId,@libraryIdentity,@generation,@assetId,@caption,@revision,@effects)`),
  }
  inspectCaption()
  const count = statements.receiptCount.get().count
  if (!Number.isSafeInteger(count) || count < 0 || count > PROFILE.receipts) throw new Error('INVALID_STORE')
  const receipts = database.prepare(`SELECT ${RECEIPT_SELECT} FROM fixture_receipts LIMIT ${PROFILE.receipts + 1}`).all()
  if (receipts.length !== count || receipts.some(receipt => !validReceipt(receipt))) throw new Error('INVALID_STORE')
  checkLayout(owned, true)
}

function validateEnvelope(frame) {
  if (!identifier(frame.id) || !/^r[1-9][0-9]*$/.test(frame.id) || !Number.isSafeInteger(frame.sequence) ||
      frame.sequence < 1 || typeof frame.action !== 'string') {
    failClosed('INVALID_FRAME')
    return false
  }
  if (frame.v !== 1) { refuse(frame, 'PROTOCOL_MISMATCH'); return false }
  if (frame.sequence <= lastSequence) { refuse(frame, 'SEQUENCE_MISMATCH'); return false }
  lastSequence = frame.sequence
  const fields = Object.hasOwn(ACTION_FIELDS, frame.action) ? ACTION_FIELDS[frame.action] : null
  if (!fields) { refuse(frame, 'UNKNOWN_ACTION'); return false }
  if (!exact(frame, fields)) { refuse(frame, 'UNKNOWN_FIELD'); return false }
  return true
}

function validateReferences(frame, materialRequired = false) {
  if (frame.catalogRef !== CATALOG.catalogRef) { refuse(frame, 'CATALOG_REFERENCE_MISMATCH'); return false }
  if (materialRequired && frame.materialRef !== CATALOG.materialRef) { refuse(frame, 'MATERIAL_REFERENCE_MISMATCH'); return false }
  if (frame.profileId !== CATALOG.profileId) { refuse(frame, 'PROFILE_MISMATCH'); return false }
  if (frame.clientId !== CATALOG.clientId) { refuse(frame, 'CLIENT_MISMATCH'); return false }
  if (!materialRequired && (frame.libraryIdentity !== CATALOG.libraryIdentity || frame.generation !== CATALOG.generation)) {
    refuse(frame, 'LIBRARY_SCOPE_MISMATCH')
    return false
  }
  return true
}

function validateCapability(frame) {
  if (!negotiated) { refuse(frame, 'NOT_NEGOTIATED'); return false }
  if (frame.instance !== instance) { refuse(frame, 'STALE_INSTANCE'); return false }
  if (!session || frame.session !== session) { refuse(frame, 'INVALID_SESSION'); return false }
  if (frame.permissionEpoch !== permissionEpoch) { refuse(frame, 'STALE_PERMISSION_EPOCH'); return false }
  return validateReferences(frame)
}

function validateOperation(frame) {
  if (!operationIdentifier(frame.operationId)) { refuse(frame, 'INVALID_OPERATION'); return false }
  if (!frame.operationId.startsWith(`${instance}:`)) { refuse(frame, 'STALE_OPERATION'); return false }
  return true
}

function notifyCut(point, operationId, lateReply = null) {
  if (cutUsed) throw new Error('INVALID_CUT')
  cutUsed = true
  paused = true
  savedLateReply = lateReply
  if (!process.connected || typeof process.send !== 'function') { failClosed('CUT_CHANNEL_MISSING'); return }
  process.send({ kind: 'cut', point, operationId }, error => { if (error) failClosed('CUT_CHANNEL_FAILURE') })
  // No business ACK at a cut. Only the owned parent can kill, or release the private late-ACK cut.
}

function commitCaption(frame) {
  if (!validateOperation(frame)) return
  const payload = canonicalPayload(frame.payload)
  if (!payload) { refuse(frame, 'INVALID_PAYLOAD'); return }
  const digest = payloadDigest(payload)
  let receipt
  database.exec('BEGIN IMMEDIATE')
  try {
    receipt = inspectReceipt(frame.operationId)
    if (receipt) {
      database.exec('ROLLBACK')
      if (receipt.payloadDigest !== digest) refuse(frame, 'PAYLOAD_MISMATCH')
      else send({ id: frame.id, ok: true, outcome: 'committed', receipt, replayed: true })
      return
    }
    // Receipt lookup precedes the gate for a new ID. Replay is observation, not a fresh effect.
    if (revoked || !businessAdmission) {
      database.exec('ROLLBACK')
      refuse(frame, revoked ? 'REVOKED' : 'GRANT_REQUIRED')
      return
    }
    const count = statements.receiptCount.get().count
    if (!Number.isSafeInteger(count) || count < 0 || count > PROFILE.receipts) throw new Error('INVALID_STORE')
    if (count >= PROFILE.receipts) {
      database.exec('ROLLBACK')
      refuse(frame, 'RECEIPT_CAPACITY', { outcome: 'verified-no-effect' })
      return
    }
    const current = inspectCaption()
    if (Object.hasOwn(payload, 'expectedCaption') && (current.caption ?? '') !== payload.expectedCaption) {
      database.exec('ROLLBACK')
      refuse(frame, 'CAPTION_CONFLICT', { outcome: 'verified-no-effect' })
      return
    }
    if (current.revision >= Number.MAX_SAFE_INTEGER || current.effects >= Number.MAX_SAFE_INTEGER) {
      database.exec('ROLLBACK')
      refuse(frame, 'REVISION_CAPACITY', { outcome: 'verified-no-effect' })
      return
    }
    const changed = statements.updateCaption.run(payload.caption, payload.assetId, current.revision)
    if (changed.changes !== 1) throw new Error('INVALID_STORE')
    const updated = inspectCaption()
    receipt = { operationId: frame.operationId, payloadDigest: digest, instance, session, permissionEpoch,
      catalogRef: CATALOG.catalogRef, profileId: CATALOG.profileId, clientId: CATALOG.clientId,
      libraryIdentity: CATALOG.libraryIdentity, generation: CATALOG.generation, ...updated }
    if (!validReceipt(receipt)) throw new Error('INVALID_STORE')
    statements.insertReceipt.run(receipt)
    if (!cutUsed && cutPoint === 'before-commit') { notifyCut('before-commit', frame.operationId); return }
    database.exec('COMMIT')
  } catch (error) {
    if (database.inTransaction) database.exec('ROLLBACK')
    throw error
  }
  const response = { id: frame.id, ok: true, outcome: 'committed', receipt, replayed: false }
  if (!cutUsed && ['after-commit', 'late-after-commit'].includes(cutPoint)) {
    notifyCut(cutPoint, frame.operationId, cutPoint === 'late-after-commit' ? response : null)
    return
  }
  if (!cutUsed && cutPoint === 'malformed-after-commit') {
    cutUsed = true
    const bytes = Buffer.from('{bad}\n', 'utf8')
    if (process.stdout.writableLength + bytes.length > PROFILE.frameBytes * PROFILE.pendingFrames) {
      failClosed('OUTPUT_CAPACITY')
      return
    }
    process.stdout.write(bytes)
    return
  }
  if (!cutUsed && cutPoint === 'mismatched-receipt') {
    cutUsed = true
    send({ ...response, receipt: { ...receipt, payloadDigest: '0'.repeat(64) } })
    return
  }
  send(response)
}

function orderlyClose(frame) {
  closeDatabase()
  if (!send({ id: frame.id, ok: true, database: 'closed', closed: true })) return
  closing = true
  paused = true
  businessAdmission = false
  queue.length = 0
  stopChannels(0)
}

function advancePermission() {
  if (permissionEpoch >= Number.MAX_SAFE_INTEGER) throw new Error('EPOCH_CAPACITY')
  permissionEpoch++
}

function dispatch(frame) {
  if (!validateEnvelope(frame)) return
  checkLayout(owned, true)
  if (frame.action === 'hello') {
    if (frame.major !== 1) { refuse(frame, 'PROTOCOL_MISMATCH'); return }
    if (!Array.isArray(frame.features) || frame.features.length !== FEATURES.length ||
        new Set(frame.features).size !== FEATURES.length || !FEATURES.every(feature => frame.features.includes(feature))) {
      refuse(frame, 'FEATURE_MISMATCH')
      return
    }
    if (negotiated) { refuse(frame, 'ALREADY_NEGOTIATED'); return }
    negotiated = true
    const sqlite = database.prepare('SELECT sqlite_version() AS version,sqlite_source_id() AS sourceId').get()
    const memory = process.memoryUsage()
    send({ id: frame.id, ok: true, major: 1, features: FEATURES, instance, limits: PROFILE,
      runtime: { electron: process.versions.electron, node: process.versions.node, abi: process.versions.modules,
        napi: process.versions.napi, uv: process.versions.uv, sqlite,
        memory: { rss: memory.rss, heapUsed: memory.heapUsed } } })
    return
  }
  if (frame.action === 'attach') {
    if (!negotiated) { refuse(frame, 'NOT_NEGOTIATED'); return }
    if (frame.instance !== instance) { refuse(frame, 'STALE_INSTANCE'); return }
    if (!validateReferences(frame, true)) return
    if (session) { refuse(frame, 'ALREADY_ATTACHED'); return }
    session = randomUUID()
    send({ id: frame.id, ok: true, instance, session, permissionEpoch, businessAdmission,
      catalogRef: CATALOG.catalogRef, materialRef: CATALOG.materialRef, profileId: CATALOG.profileId,
      clientId: CATALOG.clientId, libraryIdentity: CATALOG.libraryIdentity, generation: CATALOG.generation })
    return
  }
  if (!validateCapability(frame)) return
  switch (frame.action) {
    case 'grant':
      if (revoked) { refuse(frame, 'REVOKED'); return }
      advancePermission()
      businessAdmission = true
      send({ id: frame.id, ok: true, permissionEpoch, applied: true })
      break
    case 'readCaption':
      send({ id: frame.id, ok: true, caption: inspectCaption() })
      break
    case 'commitCaption':
      commitCaption(frame)
      break
    case 'inspectOperation': {
      // Fresh-session inspection can reconcile an older instance's receipt without granting execution.
      if (!operationIdentifier(frame.operationId)) { refuse(frame, 'INVALID_OPERATION'); return }
      const receipt = inspectReceipt(frame.operationId)
      send({ id: frame.id, ok: true, outcome: receipt ? 'committed' : 'unknown', receipt })
      break
    }
    case 'revoke':
      businessAdmission = false
      revoked = true
      advancePermission()
      if (!cutUsed && cutPoint === 'after-revoke') { notifyCut('after-revoke', null); return }
      send({ id: frame.id, ok: true, permissionEpoch, fence: frame.sequence, applied: true })
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
  try { while (queue.length && !paused && !closing) dispatch(queue.shift()) }
  catch { failClosed('AUTHORITY_FAILURE') }
  finally { processing = false }
}

try { bootstrapStore() }
catch {
  diagnostic('BOOTSTRAP_FAILURE')
  try { closeDatabase() } catch { diagnostic('CLOSE_FAILURE') }
  closing = true
  stopChannels(2)
}

if (database) {
  const decoder = createFrameDecoder(frame => {
    if (closing) return
    if (queue.length >= PROFILE.pendingFrames) { failClosed('QUEUE_CAPACITY'); return }
    queue.push(frame)
    pump()
  }, failClosed)
  process.stdin.on('data', chunk => decoder.push(chunk))
  process.stdin.on('end', () => { decoder.end(); if (!closing) failClosed('CHANNEL_EOF') })
  process.stdin.on('error', () => failClosed('CHANNEL_FAILURE'))
  process.stdout.on('error', () => failClosed('CHANNEL_FAILURE'))
  process.on('disconnect', () => failClosed('CONTROL_DISCONNECTED'))
  process.on('message', message => {
    if (closing) return
    if (!exact(message, ['kind']) || message.kind !== 'release-cut' || cutPoint !== 'late-after-commit' ||
        !cutUsed || !paused || !savedLateReply || releasedCut) { failClosed('INVALID_PRIVATE_CONTROL'); return }
    const response = savedLateReply
    savedLateReply = null
    releasedCut = true
    paused = false
    // Releasing one delayed ACK never grants business permission or changes the permission epoch.
    if (send(response)) pump()
  })
}
