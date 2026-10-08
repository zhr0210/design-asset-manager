/** H-only owned synthetic append ledger. Ordinary fsync is not OS crash qualification. */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { TextDecoder } from 'node:util'
import {
  CATALOG, LIMITS, OP_FIELDS, RECEIPT_FIELDS, SCOPE_FIELDS, STATE_FIELDS,
  canonicalPayload, error, exact, initialState, operationId, payloadDigest,
  resultDigest, sha, token,
} from './control-store-restart-profile.tracer.mjs'

const INFERENCE_FIELDS = ['status', 'reservations', 'result', 'resultDigest']
const NOTIFICATION_FIELDS = ['attempts', 'callbackCalls']
const ENVELOPE_FIELDS = ['revision', 'previous', 'state', 'digest']
const IDENTITY_FIELDS = ['canonicalPath', 'dev', 'ino', 'birthtimeMs', 'nlink']
const digest = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
const clone = value => JSON.parse(JSON.stringify(value))
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const statuses = ['pending', 'unknown', 'committed', 'verified-no-effect']
const integer = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max
const refs = ['catalogRef', 'profileId', 'clientId', 'libraryIdentity', 'generation']

function validScope(scope, kind) {
  return exact(scope, SCOPE_FIELDS) && token(scope.instance) && token(scope.session) &&
    integer(scope.permissionEpoch, Number.MAX_SAFE_INTEGER) &&
    scope.permissionEpoch >= (kind === 'ack-event' ? 0 : 1) &&
    refs.every(key => scope[key] === CATALOG[key])
}

function validOperationBase(record) {
  if (!exact(record, OP_FIELDS) || !operationId(record.operationId) ||
      !validScope(record.scope, record.payload?.kind) ||
      !record.operationId.startsWith(`${record.scope.instance}:`) ||
      !statuses.includes(record.status)) return false
  const payload = canonicalPayload(record.payload)
  if (!payload || !same(record.payload, payload) ||
      record.payloadDigest !== payloadDigest(payload)) return false
  return ['claim', 'ack-event'].includes(payload.kind)
    ? record.claimAttemptId === null : token(record.claimAttemptId)
}

/** Exact original-operation receipt validation, shared with the private H worker. */
export function validReceipt(record) {
  if (!validOperationBase(record)) return false
  const receipt = record.receipt
  if (!exact(receipt, RECEIPT_FIELDS) ||
      SCOPE_FIELDS.some(key => receipt[key] !== record.scope[key]) ||
      receipt.operationId !== record.operationId ||
      receipt.payloadDigest !== record.payloadDigest ||
      receipt.assetId !== CATALOG.assetId || receipt.kind !== record.payload.kind) return false
  const payload = record.payload
  if (payload.kind === 'ack-event') {
    return ['claimOperationId', 'claimToken', 'attemptId', 'result'].every(key => receipt[key] === null) &&
      receipt.state === 'delivered' && receipt.effects === 3 && receipt.delivered === true &&
      receipt.eventId === payload.eventId && receipt.effectId === payload.effectId &&
      receipt.resultDigest === payload.resultDigest
  }
  if (!token(receipt.attemptId) || !token(receipt.claimToken) ||
      !operationId(receipt.claimOperationId) ||
      !receipt.claimOperationId.startsWith(`${record.scope.instance}:`)) return false
  if (payload.kind === 'effect') {
    return receipt.claimOperationId === payload.claimOperationId &&
      receipt.claimToken === payload.claimToken && receipt.attemptId === record.claimAttemptId &&
      receipt.state === 'succeeded' && receipt.effects === 3 && receipt.result === payload.result &&
      receipt.resultDigest === resultDigest(payload.result) && token(receipt.effectId) &&
      receipt.eventId === `event:${receipt.effectId}` && receipt.delivered === false
  }
  if (['result', 'resultDigest', 'effectId', 'eventId', 'delivered']
    .some(key => receipt[key] !== null)) return false
  return payload.kind === 'claim'
    ? receipt.claimOperationId === record.operationId && receipt.state === 'claimed' && receipt.effects === 1
    : receipt.claimOperationId === payload.claimOperationId && receipt.claimToken === payload.claimToken &&
      receipt.attemptId === record.claimAttemptId && receipt.state === 'sent' && receipt.effects === 2
}

function validateState(state, fixtureId) {
  if (!exact(state, STATE_FIELDS) || state.format !== 1 || state.fixtureId !== fixtureId ||
      state.catalogRef !== CATALOG.catalogRef || state.libraryIdentity !== CATALOG.libraryIdentity ||
      state.generation !== CATALOG.generation || typeof state.revoked !== 'boolean' ||
      !exact(state.inference, INFERENCE_FIELDS) || !exact(state.notification, NOTIFICATION_FIELDS) ||
      !Array.isArray(state.operations) || state.operations.length > LIMITS.operations) {
    throw error('LEDGER_STATE')
  }
  const inference = state.inference
  const validInference = inference.status === 'not-started' && inference.reservations === 0 &&
    inference.result === null && inference.resultDigest === null ||
    inference.status === 'reserved' && inference.reservations === 1 &&
    inference.result === null && inference.resultDigest === null ||
    inference.status === 'result' && inference.reservations === 1 &&
    inference.result === 'owned-stub-result' && inference.resultDigest === resultDigest(inference.result)
  if (!validInference || !integer(state.notification.attempts, LIMITS.notificationAttempts) ||
      !integer(state.notification.callbackCalls, LIMITS.notificationAttempts) ||
      state.notification.callbackCalls > state.notification.attempts) throw error('LEDGER_STATE')
  const ids = new Set()
  for (const record of state.operations) {
    if (!validOperationBase(record) || ids.has(record.operationId) ||
        (record.status === 'committed' ? !validReceipt(record) : record.receipt !== null)) {
      throw error('LEDGER_STATE')
    }
    ids.add(record.operationId)
  }
  const byKind = kind => state.operations.filter(record => record.payload.kind === kind)
  const claims = byKind('claim'), sent = byKind('mark-sent'), effects = byKind('effect')
  if ([claims, sent, effects].some(records => records.length > 1)) throw error('LEDGER_STATE')
  const claim = claims[0], mark = sent[0], effect = effects[0]
  for (const record of [...sent, ...effects]) {
    if (!claim || claim.status !== 'committed' ||
        record.payload.claimOperationId !== claim.operationId ||
        record.payload.claimToken !== claim.receipt.claimToken ||
        record.claimAttemptId !== claim.receipt.attemptId || !same(record.scope, claim.scope)) {
      throw error('LEDGER_STATE')
    }
  }
  if (effect && (!mark || mark.status !== 'committed' || inference.status !== 'result' ||
      effect.payload.result !== inference.result)) throw error('LEDGER_STATE')
  if (inference.status !== 'not-started' && (!claim || claim.status !== 'committed' ||
      !mark || mark.status !== 'committed')) throw error('LEDGER_STATE')
  const acknowledgements = byKind('ack-event')
  for (const record of acknowledgements) {
    if (!effect || effect.status !== 'committed' ||
        ['eventId', 'effectId', 'resultDigest'].some(key => record.payload[key] !== effect.receipt[key])) {
      throw error('LEDGER_STATE')
    }
  }
  if (state.notification.attempts && (!effect || effect.status !== 'committed') ||
      acknowledgements.length > state.notification.callbackCalls) throw error('LEDGER_STATE')
}

function validateTransition(before, after) {
  if (before.revoked && !after.revoked || after.operations.length < before.operations.length ||
      after.inference.reservations < before.inference.reservations ||
      after.notification.attempts < before.notification.attempts ||
      after.notification.callbackCalls < before.notification.callbackCalls) throw error('LEDGER_HISTORY')
  const inferenceOrder = ['not-started', 'reserved', 'result']
  const oldIndex = inferenceOrder.indexOf(before.inference.status)
  const newIndex = inferenceOrder.indexOf(after.inference.status)
  if (newIndex < oldIndex || newIndex > oldIndex + 1 ||
      before.inference.status === 'result' && !same(before.inference, after.inference)) {
    throw error('LEDGER_HISTORY')
  }
  for (let index = 0; index < before.operations.length; index++) {
    const oldRecord = before.operations[index], newRecord = after.operations[index]
    if (OP_FIELDS.filter(key => !['status', 'receipt'].includes(key))
      .some(key => !same(oldRecord[key], newRecord[key]))) throw error('LEDGER_HISTORY')
    if (oldRecord.status === 'committed' && !same(oldRecord, newRecord) ||
        oldRecord.status === 'verified-no-effect' && !same(oldRecord, newRecord) ||
        oldRecord.status === 'unknown' && !['unknown', 'committed'].includes(newRecord.status)) {
      throw error('LEDGER_HISTORY')
    }
  }
  // New intents must have been durably pending before any authority response was observed.
  if (after.operations.slice(before.operations.length).some(record =>
    record.status !== 'pending' || record.receipt !== null)) throw error('LEDGER_HISTORY')
}

function identity(file, directory) {
  let stat, canonicalPath
  try { stat = fs.lstatSync(file); canonicalPath = fs.realpathSync.native(file) }
  catch { throw error('LEDGER_OBJECT') }
  if (stat.isSymbolicLink() || stat.nlink !== 1 ||
      (directory ? !stat.isDirectory() : !stat.isFile())) throw error('LEDGER_OBJECT')
  return { canonicalPath, dev: stat.dev, ino: stat.ino, birthtimeMs: stat.birthtimeMs, nlink: stat.nlink }
}

const sameIdentity = (left, right) => exact(right, IDENTITY_FIELDS) &&
  IDENTITY_FIELDS.every(key => left[key] === right[key])
const identityFromFd = (fd, canonicalPath) => {
  const stat = fs.fstatSync(fd)
  if (!stat.isFile() || stat.nlink !== 1) throw error('LEDGER_OBJECT')
  return { canonicalPath, dev: stat.dev, ino: stat.ino, birthtimeMs: stat.birthtimeMs, nlink: stat.nlink }
}
const closeFile = fd => {
  try { fs.closeSync(fd) } catch { throw error('LEDGER_IO') }
}

function boundedRead(file, expectedIdentity, maxBytes) {
  const before = identity(file, false)
  if (!sameIdentity(before, expectedIdentity)) throw error('LEDGER_OBJECT')
  let fd
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0))
    if (!sameIdentity(identityFromFd(fd, before.canonicalPath), before)) throw error('LEDGER_OBJECT')
    const size = fs.fstatSync(fd).size
    if (!integer(size, maxBytes)) throw error('LEDGER_CAPACITY')
    const bytes = Buffer.alloc(size)
    let offset = 0
    while (offset < size) {
      const read = fs.readSync(fd, bytes, offset, size - offset, offset)
      if (read <= 0) throw error('LEDGER_CHANGED')
      offset += read
    }
    if (fs.fstatSync(fd).size !== size ||
        !sameIdentity(identityFromFd(fd, before.canonicalPath), before) ||
        !sameIdentity(identity(file, false), before)) throw error('LEDGER_CHANGED')
    return bytes
  } catch (caught) { throw error(caught?.code?.startsWith('LEDGER_') ? caught.code : 'LEDGER_IO') }
  finally { if (fd !== undefined) closeFile(fd) }
}

function parseJournal(bytes, fixtureId) {
  if (!bytes.length) return { state: initialState(fixtureId), revision: 0, head: null }
  let serialized
  try { serialized = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) }
  catch { throw error('LEDGER_ENCODING') }
  if (!serialized.endsWith('\n')) throw error('LEDGER_TRUNCATED')
  const lines = serialized.slice(0, -1).split('\n')
  if (lines.length > LIMITS.revisions) throw error('LEDGER_CAPACITY')
  let prior = initialState(fixtureId), head = null
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (!line || Buffer.byteLength(line + '\n', 'utf8') > LIMITS.snapshotBytes) throw error('LEDGER_RECORD')
    let envelope
    try { envelope = JSON.parse(line) } catch { throw error('LEDGER_ENCODING') }
    if (!exact(envelope, ENVELOPE_FIELDS) || JSON.stringify(envelope) !== line ||
        envelope.revision !== index + 1 || envelope.previous !== head || !digest(envelope.digest) ||
        envelope.digest !== sha({ revision: envelope.revision, previous: envelope.previous, state: envelope.state })) {
      throw error('LEDGER_CHAIN')
    }
    validateState(envelope.state, fixtureId)
    if (index === 0 && !same(envelope.state, prior)) throw error('LEDGER_HISTORY')
    if (index > 0) validateTransition(prior, envelope.state)
    prior = envelope.state
    head = envelope.digest
  }
  return { state: prior, revision: lines.length, head }
}

/** Parent must supply its live full-prefix witness. This is not cold-start anti-rollback. */
export function openLedger({ root, fixtureId, expected }) {
  if (typeof root !== 'string' || !token(fixtureId) ||
      !expected || !integer(expected.bytes, LIMITS.journalBytes) ||
      (expected.bytes === 0 ? expected.head !== null : !digest(expected.head))) throw error('LEDGER_ARGUMENT')
  let temporary, resolved
  try { temporary = fs.realpathSync.native(os.tmpdir()); resolved = path.resolve(root) }
  catch { throw error('LEDGER_OBJECT') }
  if (path.dirname(resolved).toLowerCase() !== temporary.toLowerCase() ||
      !/^dam-control-restart-[A-Za-z0-9-]+$/.test(path.basename(resolved))) throw error('LEDGER_ROOT')
  const ownerPath = path.join(resolved, 'owner.json'), journalPath = path.join(resolved, 'ledger.jsonl')
  const identities = { root: identity(resolved, true), owner: identity(ownerPath, false),
    journal: identity(journalPath, false) }
  if (identities.root.canonicalPath.toLowerCase() !== resolved.toLowerCase()) throw error('LEDGER_ROOT')
  if (expected.identity && (!exact(expected.identity, ['root', 'owner', 'journal']) ||
      Object.keys(identities).some(key => !sameIdentity(identities[key], expected.identity[key])))) {
    throw error('LEDGER_OBJECT')
  }
  const ownerBytes = boundedRead(ownerPath, identities.owner, 256)
  let owner
  try { owner = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(ownerBytes)) }
  catch { throw error('LEDGER_OWNER') }
  if (!exact(owner, ['format', 'fixtureId']) || owner.format !== 1 || owner.fixtureId !== fixtureId ||
      !ownerBytes.equals(Buffer.from(JSON.stringify({ format: 1, fixtureId }), 'utf8'))) {
    throw error('LEDGER_OWNER')
  }
  let closed = false, poisoned = false, witnessedBytes = expected.bytes, witnessedHead = expected.head
  let lastVerified = null
  const checkObjects = () => {
    if (closed) throw error('LEDGER_CLOSED')
    if (poisoned) throw error('LEDGER_POISONED')
    if (!sameIdentity(identity(resolved, true), identities.root) ||
        !sameIdentity(identity(ownerPath, false), identities.owner) ||
        !sameIdentity(identity(journalPath, false), identities.journal) ||
        !boundedRead(ownerPath, identities.owner, 256).equals(ownerBytes)) throw error('LEDGER_OBJECT')
  }
  const readCurrent = () => {
    checkObjects()
    const bytes = boundedRead(journalPath, identities.journal, LIMITS.journalBytes)
    const parsed = parseJournal(bytes, fixtureId)
    checkObjects()
    if (bytes.length !== witnessedBytes || parsed.head !== witnessedHead) throw error('LEDGER_WITNESS')
    lastVerified = { bytes: bytes.length, head: parsed.head, revision: parsed.revision }
    return { ...parsed, bytes: bytes.length }
  }
  readCurrent()
  return {
    load() { return clone(readCurrent().state) },
    inspect() {
      // After close this is only the last verified metadata, never a new persistence proof.
      if (closed) return { ...lastVerified }
      const current = readCurrent()
      return { bytes: current.bytes, head: current.head, revision: current.revision }
    },
    ensureCapacity(count) {
      const current = readCurrent()
      if (!Number.isSafeInteger(count) || count < 1 || count > LIMITS.revisions) throw error('LEDGER_ARGUMENT')
      if (current.revision + count > LIMITS.revisions ||
          current.bytes + count * LIMITS.snapshotBytes > LIMITS.journalBytes) throw error('LEDGER_CAPACITY')
    },
    save(state) {
      const current = readCurrent()
      validateState(state, fixtureId)
      if (current.revision === 0) {
        if (!same(state, initialState(fixtureId))) throw error('LEDGER_HISTORY')
      } else validateTransition(current.state, state)
      if (current.revision >= LIMITS.revisions) throw error('LEDGER_CAPACITY')
      const body = { revision: current.revision + 1, previous: current.head, state: clone(state) }
      const nextHead = sha(body), line = Buffer.from(JSON.stringify({ ...body, digest: nextHead }) + '\n', 'utf8')
      if (line.length > LIMITS.snapshotBytes || current.bytes + line.length > LIMITS.journalBytes) {
        throw error('LEDGER_CAPACITY')
      }
      checkObjects()
      let fd
      try {
        fd = fs.openSync(journalPath, fs.constants.O_WRONLY | fs.constants.O_APPEND | (fs.constants.O_NOFOLLOW ?? 0))
        if (!sameIdentity(identityFromFd(fd, identities.journal.canonicalPath), identities.journal) ||
            fs.fstatSync(fd).size !== current.bytes) throw error('LEDGER_CHANGED')
        let offset = 0
        while (offset < line.length) {
          const written = fs.writeSync(fd, line, offset, line.length - offset)
          if (written <= 0) throw error('LEDGER_IO')
          offset += written
        }
        fs.fsyncSync(fd)
        if (fs.fstatSync(fd).size !== current.bytes + line.length ||
            !sameIdentity(identityFromFd(fd, identities.journal.canonicalPath), identities.journal)) {
          throw error('LEDGER_CHANGED')
        }
        closeFile(fd); fd = undefined
        checkObjects()
        const written = boundedRead(journalPath, identities.journal, LIMITS.journalBytes)
        const parsed = parseJournal(written, fixtureId)
        if (written.length !== current.bytes + line.length || parsed.head !== nextHead ||
            !same(parsed.state, state)) throw error('LEDGER_CHANGED')
        witnessedBytes = written.length; witnessedHead = nextHead
        lastVerified = { bytes: witnessedBytes, head: witnessedHead, revision: parsed.revision }
        return { bytes: witnessedBytes, head: witnessedHead, revision: parsed.revision }
      } catch (caught) {
        poisoned = true
        throw error(caught?.code?.startsWith('LEDGER_') ? caught.code : 'LEDGER_IO')
      } finally { if (fd !== undefined) closeFile(fd) }
    },
    close() { closed = true },
  }
}
