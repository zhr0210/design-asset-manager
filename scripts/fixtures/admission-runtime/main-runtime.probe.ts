// Loaded only by the isolated Electron E2E; exercises production adapters in Electron Main.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createVisualAdmission,VISUAL_ADMISSION_PROFILE as profile} from '../../../src/main/visual-ai/visual-admission'
import {readBoundedPreviewBytes} from '../../../src/main/library-lifecycle/bounded-preview-reader'
export async function exercise(source:string){
 const scope={sessionToken:'generated-session',leaseIdentity:'generated-lease'}
 const real=createVisualAdmission(),lease=real.open('generated',scope)
 try{
  await lease.prepare('large',async()=>{const h=await fs.open(source,'r');try{return await readBoundedPreviewBytes(h,profile.sourceBytes)}finally{await h.close()}})
  lease.consume();assert.ok(lease.describe('large').byteLength<profile.maxJpegBytes)
  await lease.withRequest('large','tags-only',new AbortController().signal,async jpeg=>{assert.ok(jpeg.length>0)})
 }finally{lease.dispose()}
 assert.equal(real.inspect().materialBytes,0);assert.equal(real.inspect().requests,0)
 const pressure=createVisualAdmission({codec:async()=>({jpeg:new Uint8Array(profile.maxJpegBytes),pixels:1,additionalRss:1})})
 const leases=['one','two','three'].map(owner=>pressure.open(owner,scope))
 try{
  for(const l of leases.slice(0,2))for(let i=0;i<8;i++)await l.prepare(String(i),async()=>new Uint8Array([1]))
  assert.equal(pressure.inspect().frozenBytes,profile.maxFrozenBytes)
  await assert.rejects(leases[2].prepare('over',async()=>new Uint8Array([1])),/VISUAL_FROZEN_BUDGET/)
 }finally{for(const l of leases)l.dispose()}
 assert.equal(pressure.inspect().materialBytes,0);assert.equal(pressure.inspect().preparing,0)
 return{realCodecAndReleased:true,frozenBudgetBytes:profile.maxFrozenBytes,returnedToZero:true,runtime:'formal-electron-main'}
}
