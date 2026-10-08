import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createVisualAdmission } from '../src/main/visual-ai/visual-admission'
import { prepareWindowsBackupLifecycle, WindowsBackupPhysicalExitUnconfirmedError } from '../src/main/platform/windows-backup-lifecycle.internal'

function gate<T>() {let resolve!:(value:T)=>void; const promise=new Promise<T>(done=>{resolve=done}); return {promise,resolve}}
const tick = () => new Promise<void>(resolve=>setImmediate(resolve))
for (const committed of [true,false]) await test('finish '+committed+' retains RAM until physical close and settles once',async()=>{
  const admission=createVisualAdmission(),hold=admission.hold(),close=gate<void>(),decision=gate<number>()
  const abort=new AbortController()
  try {
    const session=await prepareWindowsBackupLifecycle({hold,imageBytes:4096,signal:abort.signal,readMemory:()=>({free:8*1024**3,total:16*1024**3}),createImage:()=>Buffer.alloc(4096),verifyImage:()=>{},runTarget:async(image,whileHeld)=>{assert.equal(image.length,4096);decision.resolve(await whileHeld('a'.repeat(64)));await close.promise}})
    session.checkHeld();const bytes=admission.inspect().materialBytes;assert.ok(bytes>0)
    const settled=session.finish(committed);assert.equal(session.finish(!committed),settled)
    assert.equal(await decision.promise,committed?1:0);abort.abort();await tick()
    assert.equal(admission.inspect().materialBytes,bytes,'cancel/finish request is not release')
    close.resolve();await settled;assert.equal(admission.inspect().materialBytes,0);assert.throws(session.checkHeld)
  }finally{close.resolve();hold()}
})
await test('verifier failure waits for close and preserves refusal; early close never grants DDL',async()=>{
  const admission=createVisualAdmission(),hold=admission.hold(),close=gate<void>(),entered=gate<void>()
  const options={hold,imageBytes:4096,signal:new AbortController().signal,readMemory:()=>({free:8*1024**3,total:16*1024**3}),createImage:()=>Buffer.alloc(4096)}
  try {
    const preparation=prepareWindowsBackupLifecycle({...options,verifyImage:()=>{throw Error('BACKUP_SNAPSHOT_INVALID')},runTarget:async(_,whileHeld)=>{try{await whileHeld('hash')}catch(e){entered.resolve();await close.promise;throw e}}})
    await entered.promise;assert.ok(admission.inspect().materialBytes>0);close.resolve()
    await assert.rejects(preparation,/SNAPSHOT_INVALID/);assert.equal(admission.inspect().materialBytes,0)
    await assert.rejects(prepareWindowsBackupLifecycle({...options,verifyImage:()=>{},runTarget:async()=>{}}),/CLOSED_BEFORE_READY/)
    assert.equal(admission.inspect().materialBytes,0)
  }finally{close.resolve();hold()}
})
await test('image allocation failure releases permit without launching target',async()=>{
  const admission=createVisualAdmission(),hold=admission.hold();let launched=false
  try{await assert.rejects(prepareWindowsBackupLifecycle({hold,imageBytes:4096,signal:new AbortController().signal,readMemory:()=>({free:8*1024**3,total:16*1024**3}),createImage:()=>{throw Error('allocation fault')},verifyImage:()=>{},runTarget:async()=>{launched=true}}),/allocation fault/);assert.equal(launched,false);assert.equal(admission.inspect().materialBytes,0)}finally{hold()}
})
await test('HELD cancellation settles only after known physical close; unrelated failures remain errors',async()=>{
  for (const unrelated of [false,true]) {
    const admission=createVisualAdmission(),hold=admission.hold(),close=gate<void>(),abort=new AbortController()
    try {
      const session=await prepareWindowsBackupLifecycle({hold,imageBytes:4096,signal:abort.signal,readMemory:()=>({free:8*1024**3,total:16*1024**3}),createImage:()=>Buffer.alloc(4096),verifyImage:()=>{},
        runTarget:async(_,whileHeld)=>{await whileHeld('a'.repeat(64));await close.promise;throw unrelated?Error('independent close fault'):abort.signal.reason}})
      abort.abort();const settlement=session.finish(false);assert.ok(admission.inspect().materialBytes>0)
      close.resolve()
      if (unrelated) await assert.rejects(settlement,/independent close fault/)
      else await settlement
      assert.equal(admission.inspect().materialBytes,0)
    } finally {close.resolve();hold()}
  }
})
await test('async source pin stays reserved; cancellation before serialize completion launches no target',async()=>{
  const admission=createVisualAdmission(),hold=admission.hold(),image=gate<Buffer>(),abort=new AbortController();let launched=false
  try{
    const preparation=prepareWindowsBackupLifecycle({hold,imageBytes:4096,signal:abort.signal,readMemory:()=>({free:8*1024**3,total:16*1024**3}),
      createImage:()=>image.promise,verifyImage:()=>{},runTarget:async()=>{launched=true}})
    assert.ok(admission.inspect().materialBytes>0,'reserve precedes asynchronous native source pin')
    abort.abort();assert.ok(admission.inspect().materialBytes>0,'cancellation is not allocation completion')
    image.resolve(Buffer.alloc(4096));await assert.rejects(preparation,/aborted/)
    assert.equal(launched,false);assert.equal(admission.inspect().materialBytes,0)
  }finally{image.resolve(Buffer.alloc(4096));hold()}
})
for (const synchronous of [false,true]) await test('UNKNOWN '+(synchronous?'synchronous throw':'async rejection')+' remains in shared ledger until independent physical release',async()=>{
  const admission=createVisualAdmission(),hold=admission.hold(),released=gate<void>(),abort=new AbortController()
  await assert.rejects(prepareWindowsBackupLifecycle({hold,imageBytes:4096,signal:abort.signal,readMemory:()=>({free:8*1024**3,total:16*1024**3}),
    createImage:()=>Buffer.alloc(4096),verifyImage:()=>{},runTarget:()=>{
      const error = new WindowsBackupPhysicalExitUnconfirmedError(released.promise)
      if (synchronous) throw error
      return Promise.reject(error)
    }}),/PHYSICAL_EXIT_UNCONFIRMED/)
  const bytes=admission.inspect().materialBytes;assert.ok(bytes>0)
  abort.abort();hold();admission.resume();await tick()
  assert.equal(admission.inspect().materialBytes,bytes,'abort/barrier release/resume do not prove resource exit')
  released.resolve();await tick();assert.equal(admission.inspect().materialBytes,0)
})
