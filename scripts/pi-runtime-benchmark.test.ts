import {test} from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {createPiRuntimeHost} from '../src/main/ai-gateway/pi-runtime-host'
const runtime=createPiRuntimeHost({root:path.resolve('pi-runtime')})
await test('first and repeated full integrity checks measured without caching or weakening protection',async()=>{
 const samples=[];for(let i=0;i<3;i++){const v=await runtime.verify();samples.push(v.verification);assert.ok(v.verification.filesRead>11000);assert.ok(v.verification.bytesRead>122000000)}
 console.log('VERIFICATION_BENCHMARK '+JSON.stringify({node:process.versions.node,platform:process.platform,arch:process.arch,cacheCondition:'first invocation in fresh runner; OS cache uncontrolled; true disk-cold NOT_RUN',samples}))
})
await test('integrity verification observes cancellation before spawn and releases the occupied runtime slot',async()=>{
 let spawns=0;const supervised=createPiRuntimeHost({root:path.resolve('pi-runtime'),spawn:((...args:Parameters<typeof spawn>)=>{spawns++;return spawn(...args)}) as typeof spawn})
 const a=new AbortController(),start=performance.now(),pending=supervised.execute({kind:'models'},a.signal);setTimeout(()=>a.abort(),10);await assert.rejects(pending);const elapsedMs=performance.now()-start;assert.ok(elapsedMs<2000);assert.equal(spawns,0);assert.equal(supervised.inspect().active,0);assert.equal(supervised.inspect().unknown,0);console.log('VERIFICATION_CANCEL '+JSON.stringify({elapsedMs,abortAfterMs:10,spawned:false}))
})
