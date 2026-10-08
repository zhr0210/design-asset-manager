import {createHook} from 'node:async_hooks'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {createVisualAdmission,VISUAL_ADMISSION_PROFILE as profile} from '../../../src/main/visual-ai/visual-admission'
import {prepareVisualJpeg} from '../../../src/main/visual-ai/visual-preparation'
import {readBoundedPreviewBytes} from '../../../src/main/library-lifecycle/bounded-preview-reader'
const liveTimers=new Map<number,string>()
const hooks=createHook({init(id,type){if(type==='Timeout')liveTimers.set(id,new Error('owned timer origin').stack??'')},destroy(id){liveTimers.delete(id)}});hooks.enable()
const session={sessionToken:'synthetic-session',leaseIdentity:'synthetic-lease'}
const gate=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r});return{promise,resolve}}
const tick=()=>new Promise<void>(r=>setImmediate(r))

await test('qualified size rejection happens before any file bytes are read',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-bounded-preview-')),file=path.join(root,'generated.sparse'),handle=await fs.open(file,'wx+')
 try{await handle.truncate(profile.sourceBytes+1);let reads=0
  const observer={stat:handle.stat.bind(handle),read:(...args:any[])=>{reads++;return(handle.read as any)(...args)}}
  await assert.rejects(readBoundedPreviewBytes(observer,profile.sourceBytes),/VISUAL_SOURCE_TOO_LARGE/);assert.equal(reads,0)
 }finally{await handle.close();await fs.rm(root,{recursive:true,force:true})}
})
for(const format of ['png','jpeg','webp'] as const)await test(`owned codec converts generated ${format} and returns budget-qualified evidence`,async()=>{
 const bytes=await sharp({create:{width:1500,height:1200,channels:4,background:'#7799bb88'}}).toFormat(format).toBuffer()
 const result=await prepareVisualJpeg(bytes,new AbortController().signal),meta=await sharp(result.jpeg).metadata()
 assert.equal(meta.format,'jpeg');assert.ok(meta.width!<=1024&&meta.height!<=1024);assert.equal(result.pixels,1500*1200)
 assert.ok(result.additionalRss<=bytes.length+4*result.pixels+profile.codecBytes)
})
await test('combined and tags share two real request permits; queued cancellation and active disposal do not free early',async()=>{
 const admission=createVisualAdmission({codec:async()=>({jpeg:new Uint8Array(1024),pixels:1,additionalRss:1})})
 const leases=['one','two','three','four'].map(owner=>admission.open(owner,session))
 try{
  assert.throws(()=>admission.open('fifth',session),/VISUAL_ADMISSION_BUSY/)
  for(const lease of leases){await lease.prepare('asset',async()=>new Uint8Array([1]));lease.consume()}
  const g1=gate(),g2=gate(),g4=gate();let activeSignal:AbortSignal|undefined
  const first=leases[0].withRequest('asset','combined',new AbortController().signal,async(_jpeg,signal)=>{activeSignal=signal;await g1.promise})
  const second=leases[1].withRequest('asset','tags-only',new AbortController().signal,async()=>g2.promise)
  await tick();assert.equal(admission.inspect().requests,2);assert.equal(admission.inspect().tags,1)
  const cancelled=new AbortController(),third=leases[2].withRequest('asset','tags-only',cancelled.signal,async()=>{throw Error('must not dispatch')})
  await tick();assert.equal(admission.inspect().waiting,1);cancelled.abort();await assert.rejects(third);assert.equal(admission.inspect().waiting,0)
  leases[0].dispose();assert.equal(activeSignal?.aborted,true);assert.equal(admission.inspect().requests,2,'Ignored abort still owns a request slot until promise settles')
  g1.resolve();await assert.rejects(first,{name:'AbortError'});assert.equal(admission.inspect().requests,1)
  const fourth=leases[3].withRequest('asset','tags-only',new AbortController().signal,async()=>g4.promise)
  await tick();assert.equal(admission.inspect().waiting,1,'One free shared slot is not a second tags slot')
  g2.resolve();await second;await tick();assert.equal(admission.inspect().tags,1);assert.equal(admission.inspect().requests,1)
  g4.resolve();await fourth
 }finally{for(const lease of leases)lease.dispose()}
 assert.deepEqual(admission.inspect(),{materialBytes:0,frozenBytes:0,preparing:0,requests:0,tags:0,receipts:0,waiting:0,accepting:true})
})
await test('frozen JPEG totals are bounded and rejecting a third receipt leaks no material',async()=>{
 const admission=createVisualAdmission({codec:async()=>({jpeg:new Uint8Array(profile.maxJpegBytes),pixels:1,additionalRss:1})})
 const leases=['one','two','three'].map(owner=>admission.open(owner,session))
 try{
  for(const lease of leases.slice(0,2))for(let i=0;i<8;i++)await lease.prepare(String(i),async()=>new Uint8Array([1]))
  assert.equal(admission.inspect().frozenBytes,profile.maxFrozenBytes)
  await assert.rejects(leases[2].prepare('rejected',async()=>new Uint8Array([1])),/VISUAL_FROZEN_BUDGET/)
  assert.equal(admission.inspect().materialBytes,profile.maxFrozenBytes);assert.equal(admission.inspect().preparing,0)
 }finally{for(const lease of leases)lease.dispose()}
 assert.equal(admission.inspect().materialBytes,0)
})
await test('TTL during a codec call retains reservation until the codec has really settled',async()=>{
 let expire!:()=>void;const running=gate(),entered=gate()
 const admission=createVisualAdmission({clock:{now:()=>0,scheduleTimeout:callback=>{expire=callback;return()=>{}}},codec:async()=>{entered.resolve();await running.promise;return{jpeg:new Uint8Array(1),pixels:1,additionalRss:1}}})
 const lease=admission.open('owner',session),preparing=lease.prepare('asset',async()=>new Uint8Array([1]));await entered.promise
 const reserved=admission.inspect().materialBytes;assert.ok(reserved>0);expire();assert.equal(admission.inspect().materialBytes,reserved)
 running.resolve();await assert.rejects(preparing);assert.equal(admission.inspect().materialBytes,0);assert.equal(admission.inspect().receipts,0)
})

await tick();await tick();hooks.disable();
assert.equal(liveTimers.size,0,JSON.stringify([...liveTimers.values()]));
