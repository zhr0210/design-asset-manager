import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { test } from 'node:test'
import { createOcrRuntime } from '../src/main/ocr/ocr-runtime'

// Real installed RapidOCR and the actual bundled worker. This opt-in integration
// test requires prepared dependencies; it never seeds qualification or an active
// profile. Run through the Electron SQLite test entry with DAM_TEST_OCR_ROOT.
await test('a cold real OCR recheck notifies open consumers after release, even when an observer throws', { timeout: 180000 }, async () => {
  const selected = process.env.DAM_TEST_OCR_ROOT
  assert.ok(selected, 'Set DAM_TEST_OCR_ROOT to an explicitly trusted prepared OCR root')
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-ocr-auto-event-')))
  const db = new Database(path.join(root, 'app.sqlite'))
  let held = 0, events = 0, notify!: () => void
  const observed = new Promise<void>(resolve => { notify = resolve })
  const deps = { database: db, runner: path.resolve('out/main/ai-service/tools/local_ocr_worker.py'),
    selectRoot: async () => selected!, reserve: async (_bytes: number, signal: AbortSignal) => {
      signal.throwIfAborted(); held++
      return { release() { held--; assert.ok(held >= 0) } }
    } }
  const first = createOcrRuntime(deps)
  let cold: ReturnType<typeof createOcrRuntime> | undefined
  let blocked: ReturnType<typeof createOcrRuntime> | undefined
  try {
    await first.configure(AbortSignal.timeout(90000))
    const warm = await first.current()
    assert.ok(warm?.qualification && warm.qualification.measuredPeakRamBytes > 0)
    await first.suspendAndDrain()
    cold = createOcrRuntime({ ...deps, changed() {
      assert.equal(held, 0, 'notification follows the actual verification process release')
      events++; notify(); throw Error('controlled notification delivery loss')
    } })
    assert.equal(await cold.current(), null, 'cold status does not block on or borrow the stored qualification')
    assert.equal(events, 0)
    let timer: ReturnType<typeof setTimeout> | undefined
    try { await Promise.race([observed, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error('REAL_OCR_RECHECK_NOTIFICATION_TIMEOUT')), 90000)
    })]) } finally { clearTimeout(timer) }
    const ready = await cold.current()
    assert.ok(ready?.qualification && ready.qualification.measuredPeakRamBytes > 0)
    assert.equal(ready.fingerprint, warm.fingerprint)
    assert.equal(events, 1)
    assert.equal(held, 0)
    assert.ok(Date.parse(ready.qualification.testedAt) >= Date.parse(warm.qualification.testedAt))
    let failedEvents = 0, refused!: () => void
    const refusal = new Promise<void>(resolve => { refused = resolve })
    blocked = createOcrRuntime({ ...deps, reserve: async () => {
      refused(); throw Error('OCR_RESOURCE_BUDGET')
    }, changed: () => { failedEvents++ } })
    assert.equal(await blocked.current(), null)
    await refusal; await new Promise<void>(resolve => setImmediate(resolve))
    assert.equal(failedEvents, 0, 'failed admission cannot trigger a consumer-read/recheck event loop')
    assert.match(blocked.unavailabilityReason!(), /复核尚未完成/)
  } finally {
    await blocked?.suspendAndDrain(); await cold?.suspendAndDrain(); await first.suspendAndDrain(); db.close()
    assert.equal(path.dirname(root), await fs.realpath(os.tmpdir()))
    assert.ok(path.basename(root).startsWith('dam-ocr-auto-event-'))
    await fs.rm(root, { recursive: true, force: true })
  }
})
