import assert from 'node:assert/strict'
import {test, after} from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createProtocolFixture} from './fixtures/control-store-protocol-client.tracer.mjs'
import {PROFILE, encodeFrame, createFrameDecoder} from './fixtures/control-store-protocol-wire.tracer.mjs'

// The two roles communicate through real child stdio; only the owned A writes SQLite.
const cases = []
async function scenario(name, exercise) {
  const fixture = await createProtocolFixture()
  let passed = false
  let errorCode
  try { await exercise(fixture); passed = true }
  catch (error) { errorCode = error.code ?? 'ASSERTION_OR_HARNESS_FAILURE'; throw error }
  finally {
    const terminal = await fixture.dispose({preserve: !passed})
    const record = {name, status: passed ? 'PASS' : 'FAIL', errorCode, ...terminal}
    cases.push(record)
    if (passed) {
      try {
        assert.equal(terminal.allExited, true)
        assert.equal(terminal.uncertain, false)
        assert.equal(terminal.readers, 0)
        assert.equal(terminal.cleanup, 'REMOVED_OWNED_FIXTURE')
      } catch (error) { record.status = 'FAIL'; record.errorCode = 'TERMINAL_ASSERTION_FAILURE'; throw error }
    }
  }
}
const refused = (reply, code) => { assert.equal(reply.ok, false); if (code) assert.equal(reply.code, code) }
const unchanged = note => { assert.equal(note.revision, 0); assert.equal(note.effects, 0) }
const observeLoss = promise => promise.then(() => 'UNEXPECTED_ACK', error => error.code)

test('PT01: one SQL transaction publishes note, effect and matching receipt', async () => scenario('PT01', async f => {
  const h = await f.start()
  const id = h.operationId('one')
  const result = await h.commitNote(id, {expectedRevision: 0, text: 'synthetic saved note'})
  assert.equal(result.dbOutcome, 'committed')
  assert.equal(result.receipt.revision, 1)
  assert.equal(result.receipt.effects, 1)
  const inspected = await h.inspectOperation(id)
  assert.deepEqual(inspected.receipt, result.receipt)
  assert.equal((await h.close()).code, 0)
  const disk = f.readAfterExit(id)
  assert.equal(disk.integrity, 'ok')
  assert.equal(disk.receipts, 1)
  assert.equal(disk.note.text, 'synthetic saved note')
  assert.equal(disk.note.effects, 1)
  assert.equal(disk.receipt.payloadDigest, result.receipt.payloadDigest)
  assert.equal(disk.receipt.revision, disk.note.revision)
}))

test('PT02: same ID replays once; changed payload and CAS conflict have no effect', async () => scenario('PT02', async f => {
  const h = await f.start()
  const id = h.operationId('replay')
  const payload = {expectedRevision: 0, text: 'synthetic immutable receipt'}
  const first = await h.commitNote(id, payload)
  assert.deepEqual((await h.commitNote(id, payload)).receipt, first.receipt)
  refused(await h.raw('commitNote', {operationId: id, payload: {...payload, text: 'different'}}), 'PAYLOAD_MISMATCH')
  refused(await h.raw('commitNote', {operationId: h.operationId('cas'), payload: {expectedRevision: 0, text: 'conflict'}}), 'REVISION_CONFLICT')
  const missing = await h.inspectOperation(h.operationId('cas'))
  assert.equal(missing.dbOutcome, 'unknown')
  assert.equal(missing.receipt, null)
  await h.close()
  const disk = f.readAfterExit(id)
  assert.equal(disk.note.revision, 1)
  assert.equal(disk.note.effects, 1)
  assert.equal(disk.receipts, 1)
}))

test('PT03: pre-COMMIT death rolls back both rows; missing receipt is unknown and old ID cannot execute', async () => scenario('PT03', async f => {
  const h = await f.start('before-commit')
  const id = h.operationId('pre-cut')
  const payload = {expectedRevision: 0, text: 'must roll back'}
  const lost = observeLoss(h.commitNote(id, payload))
  assert.equal((await h.waitForCut()).point, 'before-commit')
  await h.stopAtCut()
  assert.equal(await lost, 'AUTHORITY_EXITED_ACK_UNKNOWN')
  assert.equal(h.localState().gate, 'closed-unknown')
  const disk = f.readAfterExit(id)
  unchanged(disk.note)
  assert.equal(disk.receipt, null)
  assert.equal(disk.receipts, 0)
  assert.equal(disk.integrity, 'ok')
  const fresh = await f.start()
  const inspection = await fresh.inspectOperation(id)
  assert.equal(inspection.dbOutcome, 'unknown')
  assert.equal(inspection.receipt, null)
  refused(await fresh.raw('commitNote', {operationId: id, payload}), 'STALE_OPERATION')
  unchanged((await fresh.readNote()).note)
  await fresh.close()
  unchanged(f.readAfterExit(id).note)
}))

test('PT04: post-COMMIT ACK loss preserves one effect and receipt across fresh authority', async () => scenario('PT04', async f => {
  const h = await f.start('after-commit')
  const id = h.operationId('post-cut')
  const payload = {expectedRevision: 0, text: 'saved without ACK'}
  const lost = observeLoss(h.commitNote(id, payload))
  assert.equal((await h.waitForCut()).point, 'after-commit')
  await h.stopAtCut()
  assert.equal(await lost, 'AUTHORITY_EXITED_ACK_UNKNOWN')
  const disk = f.readAfterExit(id)
  assert.equal(disk.integrity, 'ok')
  assert.equal(disk.note.revision, 1)
  assert.equal(disk.note.effects, 1)
  assert.equal(disk.receipts, 1)
  assert.equal(disk.receipt.text, payload.text)
  const fresh = await f.start()
  const inspection = await fresh.inspectOperation(id)
  assert.equal(inspection.dbOutcome, 'committed')
  assert.equal(inspection.receipt.payloadDigest, disk.receipt.payloadDigest)
  assert.equal(inspection.receipt.revision, 1)
  refused(await fresh.raw('commitNote', {operationId: id, payload}), 'STALE_OPERATION')
  assert.equal((await fresh.readNote()).note.effects, 1)
  await fresh.close()
}))

test('PT05: revoke closes H immediately and acknowledged A fence rejects direct bypass', async () => scenario('PT05', async f => {
  const h = await f.start()
  const revoking = h.revoke()
  assert.equal(h.localState().gate, 'closed-unknown')
  assert.equal(h.localState().revocation, 'pending')
  await assert.rejects(h.commitNote(h.operationId('blocked-local'), {expectedRevision: 0, text: 'denied'}), {code: 'LOCAL_SEND_GATE_CLOSED'})
  const ack = await revoking
  assert.equal(ack.applied, true)
  assert.equal(h.localState().revocation, 'acknowledged')
  refused(await h.raw('commitNote', {operationId: h.operationId('blocked-remote'), payload: {expectedRevision: 0, text: 'bypass'}}), 'REVOKED')
  unchanged((await h.readNote()).note)
  await h.close()
  assert.equal(f.readAfterExit().receipts, 0)
}))

test('PT06: commit sequenced before revoke remains committed and later write is denied', async () => scenario('PT06', async f => {
  const h = await f.start()
  const committing = h.commitNote(h.operationId('commit-first'), {expectedRevision: 0, text: 'committed before fence'})
  const revoking = h.revoke()
  const result = await committing
  assert.equal(result.dbOutcome, 'committed')
  assert.equal((await revoking).applied, true)
  refused(await h.raw('commitNote', {operationId: h.operationId('after-fence'), payload: {expectedRevision: 1, text: 'denied'}}), 'REVOKED')
  assert.equal((await h.readNote()).note.text, 'committed before fence')
  await h.close()
  const disk = f.readAfterExit()
  assert.equal(disk.note.effects, 1)
  assert.equal(disk.receipts, 1)
}))

test('PT07: applied revoke with lost ACK stays closed/unknown; restart does not revive old operation', async () => scenario('PT07', async f => {
  const h = await f.start('after-revoke')
  const oldId = h.operationId('old-permission')
  const lost = observeLoss(h.revoke())
  assert.equal(h.localState().revocation, 'pending')
  assert.equal((await h.waitForCut()).point, 'after-revoke')
  await h.stopAtCut()
  assert.equal(await lost, 'AUTHORITY_EXITED_ACK_UNKNOWN')
  assert.equal(h.localState().revocation, 'unknown')
  assert.equal(h.localState().gate, 'closed-unknown')
  await assert.rejects(h.commitNote(oldId, {expectedRevision: 0, text: 'must not resume'}), {code: 'LOCAL_SEND_GATE_CLOSED'})
  const fresh = await f.start()
  refused(await fresh.raw('commitNote', {operationId: oldId, payload: {expectedRevision: 0, text: 'must not resume'}}), 'STALE_OPERATION')
  refused(await fresh.raw('readNote', {session: 'stale-synthetic-capability'}), 'INVALID_SESSION')
  unchanged((await fresh.readNote()).note)
  await fresh.close()
}))

test('PT08: version, unknown fields, sequence and scope fail before effects', async () => scenario('PT08', async f => {
  const h = await f.start()
  refused(await h.raw('readNote', {v: 2}), 'PROTOCOL_MISMATCH')
  refused(await h.raw('readNote', {unexpected: 'synthetic'}), 'UNKNOWN_FIELD')
  refused(await h.raw('readNote', {permissionEpoch: 0}), 'STALE_PERMISSION_EPOCH')
  refused(await h.raw('readNote', {instance: 'stale-instance'}), 'STALE_INSTANCE')
  refused(await h.raw('readNote', {sequence: 1}))
  unchanged((await h.readNote()).note)
  await h.close()
  assert.equal(f.readAfterExit().receipts, 0)
}))

test('PT09: retained receipt capacity rejects new write without purge or changed domain', async () => scenario('PT09', async f => {
  const h = await f.start()
  for (let i = 0; i < PROFILE.receipts; i++) await h.commitNote(h.operationId('capacity-' + i), {expectedRevision: i, text: 'synthetic bounded ' + i})
  refused(await h.raw('commitNote', {operationId: h.operationId('overflow'), payload: {expectedRevision: PROFILE.receipts, text: 'overflow'}}), 'RECEIPT_CAPACITY')
  // Replay is still available at capacity; it must not append or purge.
  const replay = await h.commitNote(h.operationId('capacity-0'), {expectedRevision: 0, text: 'synthetic bounded 0'})
  assert.equal(replay.receipt.revision, 1)
  await h.close()
  const disk = f.readAfterExit()
  assert.equal(disk.note.effects, PROFILE.receipts)
  assert.equal(disk.note.revision, PROFILE.receipts)
  assert.equal(disk.receipts, PROFILE.receipts)
}))

test('PT10: oversized real channel closes without a domain write', async () => scenario('PT10', async f => {
  const h = await f.start()
  h.rawBytes(Buffer.concat([Buffer.alloc(PROFILE.frameBytes + 1, 0x20), Buffer.from('\n')]))
  await h.waitForExit()
  assert.equal(h.localState().gate, 'closed-unknown')
  unchanged(f.readAfterExit().note)
  assert.equal(f.readAfterExit().receipts, 0)
}))

test('PT11: wire decoder bounds fragmented UTF-8, malformed and truncated response-shaped frames', () => {
  const replies = []
  const errors = []
  const decode = createFrameDecoder(value => replies.push(value), error => errors.push(error))
  const valid = encodeFrame({id: 'r1', ok: true, synthetic: '合成'})
  for (const byte of valid) decode.push(Buffer.from([byte]))
  assert.equal(replies.length, 1)
  assert.equal(replies[0].synthetic, '合成')
  assert.equal(errors.length, 0)
  for (const bytes of [Buffer.from('{bad}\n'), Buffer.from('{"id":"r2"'), Buffer.alloc(PROFILE.frameBytes + 1, 0x20), Buffer.from([0xff, 0x0a])]) {
    const failures = []
    const parser = createFrameDecoder(() => assert.fail('invalid frame accepted'), error => failures.push(error))
    parser.push(bytes)
    parser.end()
    parser.push(Buffer.from('{}\n'))
    assert.equal(failures.length, 1)
  }
  assert.throws(() => encodeFrame({oversized: 'x'.repeat(PROFILE.frameBytes)}))
  cases.push({name: 'PT11', status: 'PASS', scope: 'wire codec only; does not prove live H malformed-response recovery'})
})

after(async () => {
  const run = process.env.DAM_PROTOCOL_RUN
  if (!run) return
  if (!/^run-\d{2}$/.test(run)) throw Error('INVALID_EVIDENCE_RUN')
  const directory = path.resolve('.scratch/windows-control-protocol-20261005', run)
  // The invoking evidence harness must create this owned run directory first.
  const stat = await fs.lstat(directory)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('INVALID_EVIDENCE_DIRECTORY')
  await fs.writeFile(path.join(directory, 'results.json'), JSON.stringify({
    at: new Date().toISOString(), kind: 'Owned synthetic protocol tracer; no formal product wiring or OS isolation claim',
    parentRuntime: {electron: process.versions.electron, node: process.versions.node, abi: process.versions.modules, napi: process.versions.napi, uv: process.versions.uv, platform: process.platform, release: os.release()},
    profile: PROFILE, cases, productionQualified: false, restoreAllowed: false, formalAdapterWired: false,
    computerUse: 'NOT_RUN; previous BLOCKED_UX_ACCEPTANCE remains', productBuild: 'NOT_RUN'
  }, null, 2) + '\n', {flag: 'wx'})
})

