/**
 * Test-only A: sole SQLite writer for one owned synthetic claim/sent/result attempt.
 * Fixed catalog refs and paired logical roots do not establish OS protection.
 * No product Host, domain handler, runtime service or production adapter is imported.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import {
  PROFILE, CATALOG, FEATURES, RECEIPT_FIELDS, EVENT_FIELDS, exact, identifier, operationIdentifier,
  canonicalPayload, payloadDigest, resultDigest, eventId, encodeFrame, createFrameDecoder,
} from './control-store-effect-profile.tracer.mjs'

const BASE_FIELDS = ['v', 'id', 'sequence', 'action']
const REF_FIELDS = ['catalogRef', 'profileId', 'clientId', 'libraryIdentity', 'generation']
const CAP_FIELDS = [...BASE_FIELDS, 'instance', 'session', 'permissionEpoch', ...REF_FIELDS]
const ACTION_FIELDS = Object.freeze({
  hello: [...BASE_FIELDS, 'major', 'features'],
  attach: [...BASE_FIELDS, 'instance', 'catalogRef', 'materialRef', 'profileId', 'clientId'],
  grant: CAP_FIELDS,
  readAttempt: CAP_FIELDS,
  readOutbox: CAP_FIELDS,
  readEvent: [...CAP_FIELDS, 'eventId'],
  finish: [...CAP_FIELDS, 'claimOperationId', 'claimToken', 'state'],
  revoke: CAP_FIELDS,
  quiesce: CAP_FIELDS,
  resume: CAP_FIELDS,
  close: CAP_FIELDS,
  commitIntent: [...CAP_FIELDS, 'operationId', 'payload'],
  inspectOperation: [...CAP_FIELDS, 'operationId'],
})
const CUT_POINTS = ['', 'before-effect', 'after-effect', 'late-after-effect',
  'mismatched-effect', 'malformed-after-effect', 'before-ack', 'after-ack', 'late-after-ack']
const LATE_CUT_POINTS = ['late-after-effect', 'late-after-ack']
const FINISH_STATES = ['paused', 'failed', 'cancelled', 'outcome-unknown']
const MAX_STORE_BYTES = PROFILE.pageSize * PROFILE.maxPages
const BINDING_FIELDS = [...Object.keys(CATALOG), 'layoutVersion']
const RECEIPT_SELECT = `operation_id AS operationId,payload_digest AS payloadDigest,
  instance,session,permission_epoch AS permissionEpoch,catalog_ref AS catalogRef,
  profile_id AS profileId,client_id AS clientId,library_identity AS libraryIdentity,
  generation,asset_id AS assetId,kind,claim_operation_id AS claimOperationId,
  claim_token AS claimToken,attempt_id AS attemptId,state,effects,result,
  result_digest AS resultDigest,effect_id AS effectId,event_id AS eventId,delivered`
const EVENT_SELECT = 'event_id AS eventId,effect_id AS effectId,asset_id AS assetId,result_digest AS resultDigest,delivered'
const ATTEMPT_SELECT = `asset_id AS assetId,claim_operation_id AS claimOperationId,
  claim_token AS claimToken,attempt_id AS attemptId,state,effects,instance,session,
  permission_epoch AS permissionEpoch`
const SCHEMA = Object.freeze({
  fixture_identity: `CREATE TABLE fixture_identity (
    singleton INTEGER PRIMARY KEY CHECK(singleton=1),
    format INTEGER NOT NULL CHECK(format=4),bootstrap_digest TEXT NOT NULL,
    catalog_ref TEXT NOT NULL,material_ref TEXT NOT NULL,profile_id TEXT NOT NULL,
    client_id TEXT NOT NULL,library_identity TEXT NOT NULL,generation TEXT NOT NULL,
    asset_id TEXT NOT NULL,layout_version INTEGER NOT NULL CHECK(layout_version=4))`,
  fixture_attempt: `CREATE TABLE fixture_attempt (
    asset_id TEXT PRIMARY KEY,claim_operation_id TEXT,claim_token TEXT,attempt_id TEXT,
    state TEXT NOT NULL CHECK(state IN ('idle','claimed','sent','succeeded','paused','failed','cancelled','outcome-unknown')),
    effects INTEGER NOT NULL CHECK(effects>=0 AND effects<=3),instance TEXT,session TEXT,
    permission_epoch INTEGER)`,
  fixture_receipts: `CREATE TABLE fixture_receipts (
    operation_id TEXT PRIMARY KEY,payload_digest TEXT NOT NULL,instance TEXT NOT NULL,
    session TEXT NOT NULL,permission_epoch INTEGER NOT NULL CHECK(permission_epoch>=0),
    catalog_ref TEXT NOT NULL,profile_id TEXT NOT NULL,client_id TEXT NOT NULL,
    library_identity TEXT NOT NULL,generation TEXT NOT NULL,asset_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('claim','mark-sent','effect','ack-event')),claim_operation_id TEXT,
    claim_token TEXT,attempt_id TEXT,
    state TEXT NOT NULL CHECK(state IN ('claimed','sent','succeeded','delivered')),
    effects INTEGER NOT NULL CHECK(effects>=1 AND effects<=3),result TEXT,result_digest TEXT,
    effect_id TEXT,event_id TEXT,delivered INTEGER CHECK(delivered IN (0,1)))`,
  fixture_effect: `CREATE TABLE fixture_effect (
    effect_id TEXT PRIMARY KEY,asset_id TEXT NOT NULL UNIQUE,result TEXT NOT NULL,
    result_digest TEXT NOT NULL,operation_id TEXT NOT NULL UNIQUE,
    FOREIGN KEY(asset_id) REFERENCES fixture_attempt(asset_id),
    FOREIGN KEY(operation_id) REFERENCES fixture_receipts(operation_id))`,
  fixture_outbox: `CREATE TABLE fixture_outbox (
    event_id TEXT PRIMARY KEY,effect_id TEXT NOT NULL UNIQUE,asset_id TEXT NOT NULL,
    result_digest TEXT NOT NULL,delivered INTEGER NOT NULL CHECK(delivered IN (0,1)),
    FOREIGN KEY(effect_id) REFERENCES fixture_effect(effect_id),
    FOREIGN KEY(asset_id) REFERENCES fixture_attempt(asset_id))`,
})
const COLUMN_NAMES = Object.freeze({
  fixture_identity: ['singleton', 'format', 'bootstrap_digest', 'catalog_ref', 'material_ref',
    'profile_id', 'client_id', 'library_identity', 'generation', 'asset_id', 'layout_version'],
  fixture_attempt: ['asset_id', 'claim_operation_id', 'claim_token', 'attempt_id', 'state',
    'effects', 'instance', 'session', 'permission_epoch'],
  fixture_receipts: ['operation_id', 'payload_digest', 'instance', 'session', 'permission_epoch',
    'catalog_ref', 'profile_id', 'client_id', 'library_identity', 'generation', 'asset_id',
    'kind', 'claim_operation_id', 'claim_token', 'attempt_id', 'state', 'effects',
    'result', 'result_digest', 'effect_id', 'event_id', 'delivered'],
  fixture_effect: ['effect_id', 'asset_id', 'result', 'result_digest', 'operation_id'],
  fixture_outbox: ['event_id', 'effect_id', 'asset_id', 'result_digest', 'delivered'],
})

const instance = randomUUID()
const cutPoint = process.env.DAM_EFFECT_CUT ?? ''
let session = null
let permissionEpoch = 0
let businessAdmission = false
let suspended = false
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

function diagnostic(code) {
  // Fixed codes only: never dump paths, capabilities, frame payloads or SQL errors.
  process.stderr.write(`control-effect:${code}\n`)
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
  // Scope/payload refusal never establishes the prior outcome of an operation ID.
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
  if (fs.readdirSync(state.root).sort().join(',') !== 'control,material,owner.json') {
    throw new Error('FIXTURE_LAYOUT')
  }
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
  if (!exact(marker.value, ['format', 'nonce']) || marker.value.format !== 4 ||
      typeof marker.value.nonce !== 'string') throw new Error('FIXTURE_LAYOUT')
  const actual = Buffer.from(marker.value.nonce, 'utf8')
  if (actual.length !== state.nonce.length || !timingSafeEqual(actual, state.nonce) ||
      (state.markerStat && !sameObject(state.markerStat, marker.stat))) throw new Error('FIXTURE_LAYOUT')
  const binding = readOwnedJson(path.join(state.material, 'binding.json'), 2048)
  if (!exact(binding.value, BINDING_FIELDS) || binding.value.layoutVersion !== 4 ||
      Object.keys(CATALOG).some(key => binding.value[key] !== CATALOG[key]) ||
      (state.bindingStat && !sameObject(state.bindingStat, binding.stat))) throw new Error('FIXTURE_LAYOUT')
  state.markerStat ??= marker.stat
  state.bindingStat ??= binding.stat
}

function ownedRoot() {
  const args = process.argv.slice(2)
  const bootstrap = process.env.DAM_EFFECT_BOOTSTRAP
  if (args.length !== 2 || args[0] !== '--root' || !path.isAbsolute(args[1]) ||
      typeof bootstrap !== 'string' || !/^[A-Za-z0-9-]{16,128}$/.test(bootstrap) ||
      !CUT_POINTS.includes(cutPoint) || process.env.ELECTRON_RUN_AS_NODE !== '1' ||
      !process.versions.electron || !process.connected) throw new Error('BOOTSTRAP')
  const root = args[1]
  const rootStat = directory(root)
  const temporary = fs.realpathSync.native(os.tmpdir())
  if (path.dirname(root) !== temporary || !/^dam-control-effect-[A-Za-z0-9._-]+$/.test(path.basename(root))) {
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
  const objects = database.prepare('SELECT type,name,tbl_name AS tableName,sql FROM sqlite_schema ORDER BY name LIMIT 13').all()
  const expectedIndexes = { fixture_attempt: 1, fixture_receipts: 1, fixture_effect: 3, fixture_outbox: 2 }
  const expectedNames = [...Object.keys(SCHEMA), ...Object.entries(expectedIndexes).flatMap(([name, count]) =>
    Array.from({ length: count }, (_, index) => `sqlite_autoindex_${name}_${index + 1}`))].sort()
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
        !Object.hasOwn(expectedIndexes, entry.tableName) ||
        !Array.from({ length: expectedIndexes[entry.tableName] }, (_, index) =>
          `sqlite_autoindex_${entry.tableName}_${index + 1}`).includes(entry.name)) {
      throw new Error('INVALID_STORE')
    }
  }
}

function inspectAttempt() {
  const rows = statements.attempt.all()
  if (rows.length !== 1) throw new Error('INVALID_STORE')
  const attempt = rows[0]
  if (attempt.assetId !== CATALOG.assetId) throw new Error('INVALID_STORE')
  if (attempt.state === 'idle') {
    if (attempt.effects !== 0 || ['claimOperationId', 'claimToken', 'attemptId', 'instance',
      'session', 'permissionEpoch'].some(key => attempt[key] !== null)) throw new Error('INVALID_STORE')
  } else if ((!['claimed', 'sent', 'succeeded', ...FINISH_STATES].includes(attempt.state)) ||
      (attempt.state === 'claimed' && attempt.effects !== 1) ||
      (attempt.state === 'sent' && attempt.effects !== 2) ||
      (attempt.state === 'succeeded' && attempt.effects !== 3) ||
      (FINISH_STATES.includes(attempt.state) && ![1, 2].includes(attempt.effects)) ||
      !operationIdentifier(attempt.claimOperationId) || !uuid(attempt.claimToken) ||
      !uuid(attempt.attemptId) || !uuid(attempt.instance) || !uuid(attempt.session) ||
      !attempt.claimOperationId.startsWith(`${attempt.instance}:`) ||
      !Number.isSafeInteger(attempt.permissionEpoch) || attempt.permissionEpoch < 1) {
    throw new Error('INVALID_STORE')
  }
  return attempt
}

function projectAttempt(attempt) {
  return { assetId: attempt.assetId, claimOperationId: attempt.claimOperationId,
    claimToken: attempt.claimToken, attemptId: attempt.attemptId, state: attempt.state,
    effects: attempt.effects }
}

function validReceipt(receipt) {
  if (!exact(receipt, RECEIPT_FIELDS) || !operationIdentifier(receipt.operationId) ||
      !uuid(receipt.instance) || !uuid(receipt.session) ||
      !receipt.operationId.startsWith(`${receipt.instance}:`) ||
      !Number.isSafeInteger(receipt.permissionEpoch) ||
      receipt.permissionEpoch < (receipt.kind === 'ack-event' ? 0 : 1) ||
      !REF_FIELDS.every(key => receipt[key] === CATALOG[key]) || receipt.assetId !== CATALOG.assetId) return false
  if (receipt.kind === 'ack-event') {
    if (receipt.state !== 'delivered' || receipt.effects !== 3 || receipt.result !== null ||
        receipt.delivered !== true || !eventId(receipt.eventId) || !uuid(receipt.effectId) ||
        receipt.eventId !== `event:${receipt.effectId}` ||
        ['claimOperationId', 'claimToken', 'attemptId'].some(key => receipt[key] !== null)) return false
    return receipt.payloadDigest === payloadDigest({ kind: 'ack-event', assetId: receipt.assetId,
      eventId: receipt.eventId, effectId: receipt.effectId, resultDigest: receipt.resultDigest })
  }
  if (!operationIdentifier(receipt.claimOperationId) ||
      !receipt.claimOperationId.startsWith(`${receipt.instance}:`) ||
      !uuid(receipt.claimToken) || !uuid(receipt.attemptId)) return false
  const claimed = receipt.kind === 'claim' && receipt.state === 'claimed' && receipt.effects === 1 &&
    receipt.claimOperationId === receipt.operationId
  const sent = receipt.kind === 'mark-sent' && receipt.state === 'sent' && receipt.effects === 2 &&
    receipt.claimOperationId !== receipt.operationId
  const effected = receipt.kind === 'effect' && receipt.state === 'succeeded' && receipt.effects === 3 &&
    receipt.claimOperationId !== receipt.operationId && receipt.delivered === false &&
    resultDigest(receipt.result) === receipt.resultDigest && uuid(receipt.effectId) &&
    receipt.eventId === `event:${receipt.effectId}`
  if (!claimed && !sent && !effected) return false
  if ((claimed || sent) && ['result', 'resultDigest', 'effectId', 'eventId', 'delivered']
    .some(key => receipt[key] !== null)) return false
  const payload = claimed ? { kind: 'claim', assetId: receipt.assetId }
    : { kind: effected ? 'effect' : 'mark-sent', assetId: receipt.assetId,
      claimOperationId: receipt.claimOperationId, claimToken: receipt.claimToken,
      ...(effected ? { result: receipt.result } : {}) }
  return receipt.payloadDigest === payloadDigest(payload)
}

function decodeReceipt(row) {
  if (!row) return null
  if (row.delivered !== null && ![0, 1].includes(row.delivered)) throw new Error('INVALID_STORE')
  return { ...row, delivered: row.delivered === null ? null : row.delivered === 1 }
}

function inspectReceipt(operationId) {
  const rows = statements.receipt.all(operationId).map(decodeReceipt)
  if (rows.length > 1 || (rows.length === 1 && !validReceipt(rows[0]))) throw new Error('INVALID_STORE')
  return rows[0] ?? null
}

function validEvent(event) {
  return exact(event, EVENT_FIELDS) && eventId(event.eventId) && uuid(event.effectId) &&
    event.eventId === `event:${event.effectId}` && event.assetId === CATALOG.assetId &&
    typeof event.resultDigest === 'string' && /^[0-9a-f]{64}$/.test(event.resultDigest) &&
    typeof event.delivered === 'boolean'
}

function decodeEvent(row) {
  if (!row) return null
  if (![0, 1].includes(row.delivered)) throw new Error('INVALID_STORE')
  const event = { ...row, delivered: row.delivered === 1 }
  if (!validEvent(event)) throw new Error('INVALID_STORE')
  return event
}

function inspectEvent(id) {
  const rows = statements.event.all(id).map(decodeEvent)
  if (rows.length > 1) throw new Error('INVALID_STORE')
  return rows[0] ?? null
}

function validateStoredState() {
  const attempt = inspectAttempt()
  const count = statements.receiptCount.get().count
  if (!Number.isSafeInteger(count) || count < 0 || count > PROFILE.receipts) throw new Error('INVALID_STORE')
  const receipts = database.prepare(`SELECT ${RECEIPT_SELECT} FROM fixture_receipts LIMIT ${PROFILE.receipts + 1}`)
    .all().map(decodeReceipt)
  const business = receipts.filter(receipt => receipt.kind !== 'ack-event')
  if (receipts.length !== count || business.length !== attempt.effects || receipts.some(receipt =>
    !validReceipt(receipt)) || business.some(receipt =>
    ['claimOperationId', 'claimToken', 'attemptId', 'instance', 'session', 'permissionEpoch']
      .some(key => receipt[key] !== attempt[key]))) throw new Error('INVALID_STORE')
  for (const [kind, present] of [['claim', attempt.effects >= 1], ['mark-sent', attempt.effects >= 2],
    ['effect', attempt.effects === 3]]) {
    if (business.filter(receipt => receipt.kind === kind).length !== Number(present)) throw new Error('INVALID_STORE')
  }
  const effects = statements.effect.all()
  const events = statements.outboxAll.all().map(decodeEvent)
  if (effects.length !== Number(attempt.effects === 3) || events.length !== effects.length) {
    throw new Error('INVALID_STORE')
  }
  if (effects.length) {
    const effect = effects[0]
    const receipt = business.find(entry => entry.kind === 'effect')
    const event = events[0]
    if (effect.assetId !== CATALOG.assetId || effect.operationId !== receipt.operationId ||
        ['effectId', 'result', 'resultDigest'].some(key => effect[key] !== receipt[key]) ||
        ['eventId', 'effectId', 'assetId', 'resultDigest'].some(key => event[key] !== receipt[key]) ||
        resultDigest(effect.result) !== effect.resultDigest) throw new Error('INVALID_STORE')
    const acknowledgments = receipts.filter(entry => entry.kind === 'ack-event')
    if (acknowledgments.some(entry => ['eventId', 'effectId', 'assetId', 'resultDigest']
      .some(key => entry[key] !== event[key])) || event.delivered !== (acknowledgments.length > 0)) {
      throw new Error('INVALID_STORE')
    }
  } else if (receipts.some(receipt => receipt.kind === 'ack-event')) throw new Error('INVALID_STORE')
  if (database.pragma('foreign_key_check').length !== 0) throw new Error('INVALID_STORE')
}

function bootstrapStore() {
  owned = ownedRoot()
  // A alone resolves fixed references. No wire field is a path or registration request.
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
        library_identity,generation,asset_id,layout_version) VALUES (1,4,?,?,?,?,?,?,?,?,4)`)
        .run(owned.bootstrapDigest, CATALOG.catalogRef, CATALOG.materialRef, CATALOG.profileId,
          CATALOG.clientId, CATALOG.libraryIdentity, CATALOG.generation, CATALOG.assetId)
      database.prepare(`INSERT INTO fixture_attempt
        (asset_id,claim_operation_id,claim_token,attempt_id,state,effects,instance,session,permission_epoch)
        VALUES (?,NULL,NULL,NULL,'idle',0,NULL,NULL,NULL)`).run(CATALOG.assetId)
      database.pragma('user_version = 4')
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
  if (identities.length !== 1 || identity.singleton !== 1 || identity.format !== 4 || identity.layoutVersion !== 4 ||
      identity.bootstrapDigest !== owned.bootstrapDigest || Object.keys(CATALOG).some(key => identity[key] !== CATALOG[key]) ||
      database.pragma('user_version', { simple: true }) !== 4 ||
      database.pragma('page_size', { simple: true }) !== PROFILE.pageSize ||
      database.pragma('max_page_count', { simple: true }) !== PROFILE.maxPages ||
      database.pragma('journal_mode', { simple: true }) !== 'delete' ||
      database.pragma('synchronous', { simple: true }) !== 2 ||
      database.pragma('foreign_keys', { simple: true }) !== 1 ||
      database.pragma('page_count', { simple: true }) > PROFILE.maxPages) throw new Error('INVALID_STORE')
  statements = {
    attempt: database.prepare(`SELECT ${ATTEMPT_SELECT} FROM fixture_attempt LIMIT 2`),
    receipt: database.prepare(`SELECT ${RECEIPT_SELECT} FROM fixture_receipts WHERE operation_id=? LIMIT 2`),
    receiptCount: database.prepare('SELECT count(*) AS count FROM fixture_receipts'),
    claim: database.prepare(`UPDATE fixture_attempt SET claim_operation_id=@claimOperationId,
      claim_token=@claimToken,attempt_id=@attemptId,state='claimed',effects=1,
      instance=@instance,session=@session,permission_epoch=@permissionEpoch
      WHERE asset_id=@assetId AND state='idle' AND effects=0`),
    markSent: database.prepare(`UPDATE fixture_attempt SET state='sent',effects=2
      WHERE asset_id=@assetId AND state='claimed' AND effects=1
      AND claim_operation_id=@claimOperationId AND claim_token=@claimToken AND attempt_id=@attemptId
      AND instance=@instance AND session=@session AND permission_epoch=@permissionEpoch`),
    succeed: database.prepare(`UPDATE fixture_attempt SET state='succeeded',effects=3
      WHERE asset_id=@assetId AND state='sent' AND effects=2
      AND claim_operation_id=@claimOperationId AND claim_token=@claimToken AND attempt_id=@attemptId
      AND instance=@instance AND session=@session AND permission_epoch=@permissionEpoch`),
    finish: database.prepare(`UPDATE fixture_attempt SET state=@state
      WHERE asset_id=@assetId AND state IN ('claimed','sent') AND effects IN (1,2)
      AND claim_operation_id=@claimOperationId AND claim_token=@claimToken AND attempt_id=@attemptId
      AND instance=@instance AND session=@session`),
    insertReceipt: database.prepare(`INSERT INTO fixture_receipts (operation_id,payload_digest,instance,
      session,permission_epoch,catalog_ref,profile_id,client_id,library_identity,generation,asset_id,
      kind,claim_operation_id,claim_token,attempt_id,state,effects,result,result_digest,effect_id,event_id,delivered)
      VALUES (@operationId,@payloadDigest,@instance,@session,@permissionEpoch,@catalogRef,@profileId,
      @clientId,@libraryIdentity,@generation,@assetId,@kind,@claimOperationId,@claimToken,@attemptId,@state,@effects,
      @result,@resultDigest,@effectId,@eventId,@delivered)`),
    insertEffect: database.prepare(`INSERT INTO fixture_effect (effect_id,asset_id,result,result_digest,operation_id)
      VALUES (@effectId,@assetId,@result,@resultDigest,@operationId)`),
    insertEvent: database.prepare(`INSERT INTO fixture_outbox (event_id,effect_id,asset_id,result_digest,delivered)
      VALUES (@eventId,@effectId,@assetId,@resultDigest,0)`),
    event: database.prepare(`SELECT ${EVENT_SELECT} FROM fixture_outbox WHERE event_id=? LIMIT 2`),
    outboxAll: database.prepare(`SELECT ${EVENT_SELECT} FROM fixture_outbox LIMIT 2`),
    outboxPending: database.prepare(`SELECT ${EVENT_SELECT} FROM fixture_outbox WHERE delivered=0 LIMIT 2`),
    effect: database.prepare(`SELECT effect_id AS effectId,asset_id AS assetId,result,
      result_digest AS resultDigest,operation_id AS operationId FROM fixture_effect LIMIT 2`),
    acknowledge: database.prepare(`UPDATE fixture_outbox SET delivered=1
      WHERE event_id=@eventId AND effect_id=@effectId AND asset_id=@assetId AND result_digest=@resultDigest`),
  }
  validateStoredState()
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
  // Historical status can be read separately; an older instance's ID cannot execute here.
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
  // This private cut serially pauses dispatch. Only the owned parent may stop or release it.
}

function commitIntent(frame) {
  if (!validateOperation(frame)) return
  const payload = canonicalPayload(frame.payload)
  if (!payload) { refuse(frame, 'INVALID_PAYLOAD'); return }
  const notification = payload.kind === 'ack-event'
  // Notification is a fixed private inspection capability, never an inference grant.
  if (notification && suspended) { refuse(frame, 'SUSPENDED'); return }
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
    // Replay is observation. Every new ID still requires a live grant and unsuspended scope.
    if (!notification && (revoked || suspended || !businessAdmission)) {
      database.exec('ROLLBACK')
      refuse(frame, revoked ? 'REVOKED' : suspended ? 'SUSPENDED' : 'GRANT_REQUIRED')
      return
    }
    const count = statements.receiptCount.get().count
    if (!Number.isSafeInteger(count) || count < 0 || count > PROFILE.receipts) throw new Error('INVALID_STORE')
    if (count >= PROFILE.receipts) {
      database.exec('ROLLBACK')
      refuse(frame, 'RECEIPT_CAPACITY', { outcome: 'verified-no-effect' })
      return
    }
    const current = inspectAttempt()
    let changed
    let effect = null
    if (notification) {
      const event = inspectEvent(payload.eventId)
      if (!event || ['effectId', 'assetId', 'resultDigest'].some(key => event[key] !== payload[key])) {
        database.exec('ROLLBACK')
        refuse(frame, 'EVENT_MISMATCH', { outcome: 'verified-no-effect' })
        return
      }
      changed = statements.acknowledge.run(payload)
    } else if (payload.kind === 'claim') {
      if (current.state !== 'idle') {
        database.exec('ROLLBACK')
        refuse(frame, 'CLAIM_BUSY', { outcome: 'verified-no-effect' })
        return
      }
      changed = statements.claim.run({ assetId: payload.assetId, claimOperationId: frame.operationId,
        claimToken: randomUUID(), attemptId: randomUUID(), instance, session, permissionEpoch })
    } else {
      const expectedState = payload.kind === 'mark-sent' ? 'claimed' : 'sent'
      if (current.state !== expectedState || current.claimOperationId !== payload.claimOperationId ||
          current.claimToken !== payload.claimToken || current.instance !== instance ||
          current.session !== session || current.permissionEpoch !== permissionEpoch) {
        database.exec('ROLLBACK')
        refuse(frame, current.state === 'succeeded' ? 'ALREADY_SUCCEEDED' : 'NOT_CLAIMED',
          { outcome: 'verified-no-effect' })
        return
      }
      changed = payload.kind === 'mark-sent' ? statements.markSent.run(current) : statements.succeed.run(current)
      if (payload.kind === 'effect') {
        const effectId = randomUUID()
        effect = { effectId, eventId: `event:${effectId}`, result: payload.result,
          resultDigest: resultDigest(payload.result), delivered: false }
      }
    }
    if (changed.changes !== 1) throw new Error('INVALID_STORE')
    const updated = inspectAttempt()
    receipt = { operationId: frame.operationId, payloadDigest: digest, instance, session, permissionEpoch,
      catalogRef: CATALOG.catalogRef, profileId: CATALOG.profileId, clientId: CATALOG.clientId,
      libraryIdentity: CATALOG.libraryIdentity, generation: CATALOG.generation, kind: payload.kind,
      ...projectAttempt(updated), result: null, resultDigest: null, effectId: null, eventId: null,
      delivered: null, ...(effect ?? {}), ...(notification ? {
        kind: 'ack-event', claimOperationId: null, claimToken: null, attemptId: null,
        state: 'delivered', effects: 3, resultDigest: payload.resultDigest,
        effectId: payload.effectId, eventId: payload.eventId, delivered: true,
      } : {}) }
    if (!validReceipt(receipt)) throw new Error('INVALID_STORE')
    // The protocol receipt describes this exact original scope. It is immutable.
    statements.insertReceipt.run({ ...receipt, delivered: receipt.delivered === null ? null : Number(receipt.delivered) })
    if (effect) {
      statements.insertEffect.run(receipt)
      statements.insertEvent.run(receipt)
    }
    // Every transition row, result, receipt and event is in MAIN, synchronously.
    validateStoredState()
    const beforePoint = notification ? 'before-ack' : payload.kind === 'effect' ? 'before-effect' : null
    if (!cutUsed && beforePoint && cutPoint === beforePoint) {
      notifyCut(beforePoint, frame.operationId)
      return
    }
    database.exec('COMMIT')
  } catch (error) {
    if (database.inTransaction) database.exec('ROLLBACK')
    throw error
  }
  const response = { id: frame.id, ok: true, outcome: 'committed', receipt, replayed: false }
  const point = notification ? 'after-ack' : payload.kind === 'effect' ? 'after-effect' : null
  const latePoint = `late-${point}`
  if (!cutUsed && point && [point, latePoint].includes(cutPoint)) {
    notifyCut(cutPoint, frame.operationId, cutPoint === latePoint ? response : null)
    return
  }
  if (!cutUsed && cutPoint === 'mismatched-effect' && payload.kind === 'effect') {
    cutUsed = true
    send({ ...response, receipt: { ...receipt, payloadDigest: '0'.repeat(64) } })
    return
  }
  if (!cutUsed && cutPoint === 'malformed-after-effect' && payload.kind === 'effect') {
    cutUsed = true
    const { resultDigest: omitted, ...malformedReceipt } = receipt
    send({ ...response, receipt: malformedReceipt })
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

function finishAttempt(frame) {
  if (!operationIdentifier(frame.claimOperationId) || !uuid(frame.claimToken) ||
      !FINISH_STATES.includes(frame.state)) { refuse(frame, 'INVALID_FINISH'); return }
  let updated
  database.exec('BEGIN IMMEDIATE')
  try {
    const current = inspectAttempt()
    // Coordination retains this exact live same-A claim after admission is fenced.
    // Fresh sessions and old tokens never become execution or coordination authority.
    if (current.claimOperationId !== frame.claimOperationId || current.claimToken !== frame.claimToken ||
        current.instance !== instance || current.session !== session) {
      database.exec('ROLLBACK')
      refuse(frame, 'NOT_CLAIMED', { outcome: 'verified-no-effect' })
      return
    }
    if (current.state === 'succeeded') {
      database.exec('ROLLBACK')
      refuse(frame, 'ALREADY_SUCCEEDED', { outcome: 'verified-no-effect' })
      return
    }
    if (!['claimed', 'sent'].includes(current.state)) {
      database.exec('ROLLBACK')
      refuse(frame, 'NOT_CLAIMED', { outcome: 'verified-no-effect' })
      return
    }
    const changed = statements.finish.run({ ...current, state: frame.state })
    if (changed.changes !== 1) throw new Error('INVALID_STORE')
    updated = inspectAttempt()
    validateStoredState()
    database.exec('COMMIT')
  } catch (error) {
    if (database.inTransaction) database.exec('ROLLBACK')
    throw error
  }
  send({ id: frame.id, ok: true, applied: true, attempt: projectAttempt(updated) })
}

function advancePermission() {
  if (permissionEpoch >= Number.MAX_SAFE_INTEGER) throw new Error('EPOCH_CAPACITY')
  permissionEpoch++
}

function applyFence(frame, isSuspended) {
  businessAdmission = false
  suspended = isSuspended
  advancePermission()
  const response = { id: frame.id, ok: true, permissionEpoch, applied: true,
    fence: frame.sequence, suspended }
  send(response)
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
    send({ id: frame.id, ok: true, instance, session, permissionEpoch, businessAdmission, suspended,
      catalogRef: CATALOG.catalogRef, materialRef: CATALOG.materialRef, profileId: CATALOG.profileId,
      clientId: CATALOG.clientId, libraryIdentity: CATALOG.libraryIdentity, generation: CATALOG.generation })
    return
  }
  if (!validateCapability(frame)) return
  switch (frame.action) {
    case 'grant':
      if (revoked || suspended) { refuse(frame, revoked ? 'REVOKED' : 'SUSPENDED'); return }
      advancePermission()
      businessAdmission = true
      send({ id: frame.id, ok: true, permissionEpoch, applied: true })
      break
    case 'readAttempt':
      send({ id: frame.id, ok: true, attempt: projectAttempt(inspectAttempt()) })
      break
    case 'readOutbox':
      if (suspended) { refuse(frame, 'SUSPENDED'); return }
      send({ id: frame.id, ok: true, events: statements.outboxPending.all().map(decodeEvent) })
      break
    case 'readEvent':
      if (suspended) { refuse(frame, 'SUSPENDED'); return }
      if (!eventId(frame.eventId)) { refuse(frame, 'INVALID_EVENT'); return }
      send({ id: frame.id, ok: true, event: inspectEvent(frame.eventId) })
      break
    case 'finish':
      finishAttempt(frame)
      break
    case 'commitIntent':
      commitIntent(frame)
      break
    case 'inspectOperation': {
      // Fresh-session observation of historical receipts never grants inference or execution.
      if (!operationIdentifier(frame.operationId)) { refuse(frame, 'INVALID_OPERATION'); return }
      const receipt = inspectReceipt(frame.operationId)
      send({ id: frame.id, ok: true, outcome: receipt ? 'committed' : 'unknown', receipt })
      break
    }
    case 'quiesce':
      applyFence(frame, true)
      break
    case 'resume':
      if (revoked) { refuse(frame, 'REVOKED'); return }
      applyFence(frame, false)
      break
    case 'revoke':
      businessAdmission = false
      revoked = true
      advancePermission()
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
    if (!exact(message, ['kind']) || message.kind !== 'release-cut' || !LATE_CUT_POINTS.includes(cutPoint) ||
        !cutUsed || !paused || !savedLateReply || releasedCut) { failClosed('INVALID_PRIVATE_CONTROL'); return }
    const response = savedLateReply
    savedLateReply = null
    releasedCut = true
    paused = false
    // Release sends one original ACK. It never grants or advances the permission epoch.
    if (send(response)) pump()
  })
}
