import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createVisualAdmission } from '../src/main/visual-ai/visual-admission'
import { reserveWindowsBackupMemory } from '../src/main/platform/windows-backup-resource.internal'
import { PiProcessUnconfirmedError } from '../src/main/ai-gateway/pi-runtime-host'

const signal = () => new AbortController().signal
const sufficient = () => ({free:8*1024**3,total:16*1024**3})
const tick = () => new Promise<void>(resolve => setImmediate(resolve))
await test('real OS evidence reserves shared RAM and release is idempotent', () => {
  const admission = createVisualAdmission(), hold = admission.hold()
  try {
    const permit = reserveWindowsBackupMemory({hold,imageBytes:4096,signal:signal()})
    assert.ok(permit.bytes>320*1024**2); assert.equal(admission.inspect().materialBytes,permit.bytes)
    assert.equal(admission.inspect().requests,1); permit.release(); permit.release()
    assert.equal(admission.inspect().materialBytes,0)
  } finally {hold()}
})
await test('unknown/insufficient OS memory and invalid images refuse without occupancy', () => {
  const admission=createVisualAdmission(),hold=admission.hold()
  try {
    for(const readMemory of [()=>({free:0,total:1024**3}),()=>({free:NaN,total:1}),()=>({free:2,total:1}),()=>{throw Error('OS fault')}]) assert.throws(()=>reserveWindowsBackupMemory({hold,imageBytes:4096,signal:signal(),readMemory}),/BACKUP_MEMORY_(UNKNOWN|INSUFFICIENT)/)
    for(const imageBytes of [99,4*1024**2+1,NaN]) assert.throws(()=>reserveWindowsBackupMemory({hold,imageBytes,signal:signal(),readMemory:sufficient}),/IMAGE_LIMIT/)
    assert.equal(admission.inspect().materialBytes,0)
  }finally{hold()}
})
await test('exact live hold cannot bypass other barriers, revocation or cancellation', () => {
  const admission=createVisualAdmission(),hold=admission.hold(),other=admission.hold()
  const reserve=()=>reserveWindowsBackupMemory({hold,imageBytes:4096,signal:signal(),readMemory:sufficient})
  assert.throws(reserve,/SUSPENDED/);other();const a=new AbortController();a.abort()
  assert.throws(()=>reserveWindowsBackupMemory({hold,imageBytes:4096,signal:a.signal,readMemory:sufficient}),/CANCELLED/)
  admission.suspend();assert.throws(reserve,/SUSPENDED/);admission.resume();hold();assert.throws(reserve,/SUSPENDED/)
  assert.equal(admission.inspect().materialBytes,0)
})
await test('UNKNOWN Pi occupancy blocks backup until actual release; restoring resource does not restore permission', async () => {
  let release!:()=>void;const released=new Promise<void>(resolve=>{release=resolve})
  const admission=createVisualAdmission({codec:async()=>({jpeg:new Uint8Array([1]),pixels:1,additionalRss:1})})
  const lease=admission.open('test',{sessionToken:'session',leaseIdentity:'lease'})
  await lease.prepare('asset',async()=>new Uint8Array([1]));lease.consume()
  await assert.rejects(lease.withRequest('asset','combined',signal(),async()=>{throw new PiProcessUnconfirmedError(released)}),/UNCONFIRMED/)
  lease.dispose();const hold=admission.hold()
  try {
    const reserve=()=>reserveWindowsBackupMemory({hold,imageBytes:4096,signal:signal(),readMemory:sufficient})
    assert.throws(reserve,/BUSY/);assert.equal(admission.inspect().requests,1)
    release();await tick();const permit=reserve();permit.release()
    await assert.rejects(lease.prepare('late',async()=>new Uint8Array([1])),/EXPIRED/)
  }finally{release();hold()}
})
