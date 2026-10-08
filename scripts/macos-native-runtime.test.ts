import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {spawn} from 'node:child_process'
import sharp from 'sharp'
import {createMacVideoRuntime} from '../src/main/work-mode/macos-video-runtime'
import {readOwnedMacProcessMemory} from '../src/main/platform/macos-owned-memory'
import type {VisualAdmission} from '../src/main/visual-ai/visual-admission'
const directory=path.resolve('build/macos-runtime'), fixture=path.resolve('.scratch/macos-migration-20261009/codec-fixture/generated-internal-only.mp4')
const staging=path.dirname(fixture)
let current:ReturnType<typeof spawn>|undefined, closed=true, held=0
const launch:typeof spawn=(...args:any[])=>{
 const child=spawn(args[0],args[1],args[2]);current=child;closed=false
 child.once('close',()=>{closed=true})
 return child
}
const admission={async reserveLocalWork(){held++;return{release(){assert.equal(closed,true,'Only actual owned close releases decode reservation');held--}}}} as VisualAdmission
const runtime=createMacVideoRuntime({directory,launch,admission})
const metadata=await runtime.probe(fixture)
assert.equal(metadata.width,96);assert.equal(metadata.height,64);assert.equal(held,0)
const captured=await runtime.frame(fixture,5000000,staging)
assert.ok(captured.metadata.actualTicks>=5000000)
assert.equal((await sharp(captured.png).metadata()).width,96);assert.equal(held,0)
const abort=new AbortController();abort.abort()
await assert.rejects(runtime.frame(fixture,1000000,staging,abort.signal));assert.equal(held,0)
const startedAfter=Date.now(), child=spawn(path.resolve('pi-runtime/runtime/darwin-arm64/node'),['-e','const bytes=Buffer.alloc(20*1024*1024,1);process.stdout.write("ready");setInterval(()=>{},1000)'],{stdio:['ignore','pipe','pipe'],env:{LANG:'en_US.UTF-8'}}),startedBefore=Date.now()+1000
await new Promise(resolve=>child.stdout.once('data',resolve))
try {
 const memory=await readOwnedMacProcessMemory({pid:child.pid!,startedAfter,startedBefore},directory)
 assert.ok(memory.rssBytes>0);assert.ok(memory.peakRamBytes>=memory.rssBytes)
 await assert.rejects(readOwnedMacProcessMemory({pid:child.pid!,startedAfter:NaN,startedBefore},directory),/LOCAL_RESOURCE_OBSERVATION_INVALID/)
 await assert.rejects(readOwnedMacProcessMemory({pid:child.pid!,startedAfter:startedBefore+1,startedBefore},directory),/LOCAL_RESOURCE_OBSERVATION_INVALID/)
 console.log(JSON.stringify({kind:'internal-generated-codec-and-owned-memory',video:metadata,frameTicks:captured.metadata.actualTicks,memory,realBlenderAcceptance:false}))
}finally {const done=new Promise(resolve=>child.once('close',resolve));child.kill();await done}
console.log('Mac native decode, reference time, PNG, pre-cancel, close accounting and physical memory probe passed')
