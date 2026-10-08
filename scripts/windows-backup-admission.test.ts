import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'

await test('a schema backup borrows the controller hold without releasing its authority', () => {
  const admission = createVisualAdmission(), controller = admission.hold(), backup = admission.backupHold()
  const permit = backup.reserveBackup(64 * 1024 * 1024, new AbortController().signal)
  backup()
  assert.equal(admission.inspect().accepting, false)
  assert.equal(admission.inspect().materialBytes, 64 * 1024 * 1024)
  permit.release()
  assert.equal(admission.inspect().accepting, false)
  controller()
  assert.equal(admission.inspect().accepting, true)
})

await test('independent holds cannot be joined into a schema backup grant', () => {
  const admission = createVisualAdmission(), first = admission.hold(), second = admission.hold()
  assert.throws(() => admission.backupHold(), /BACKUP_MEMORY_SUSPENDED/)
  assert.equal(admission.inspect().materialBytes, 0)
  first()
  assert.equal(admission.inspect().accepting, false)
  second()
  assert.equal(admission.inspect().accepting, true)
})

await test('unconfirmed existing work stays charged and prevents backup until its owner releases', async () => {
  const admission = createVisualAdmission()
  const existing = await admission.reserveOcr(32 * 1024 * 1024, new AbortController().signal)
  const controller = admission.hold(), backup = admission.backupHold()
  assert.throws(() => backup.reserveBackup(64 * 1024 * 1024, new AbortController().signal), /BACKUP_MEMORY_BUSY/)
  backup()
  assert.equal(admission.inspect().materialBytes, 32 * 1024 * 1024)
  assert.equal(admission.inspect().accepting, false)
  existing.release()
  const afterExit = admission.backupHold(), permit = afterExit.reserveBackup(64 * 1024 * 1024, new AbortController().signal)
  permit.release(); afterExit()
  assert.equal(admission.inspect().accepting, false)
  controller()
  assert.equal(admission.inspect().materialBytes, 0)
})

await test('a backup owns a fresh hold but cannot undo shutdown suspension', () => {
  const admission = createVisualAdmission()
  admission.suspend()
  const backup = admission.backupHold()
  assert.throws(() => backup.reserveBackup(64 * 1024 * 1024, new AbortController().signal), /BACKUP_MEMORY_SUSPENDED/)
  backup()
  assert.equal(admission.inspect().accepting, false)
  admission.resume()
  assert.equal(admission.inspect().accepting, true)
})
