import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {test} from 'node:test'
import {build} from 'esbuild'
import {createHook} from 'node:async_hooks'
import {Script} from 'node:vm'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {requireVisualCodecQualification} from '../src/main/visual-ai/visual-codec-qualification.internal'

const timers=new Set<number>()
const observer=createHook({init(id,type){if(type==='Timeout')timers.add(id)},destroy(id){timers.delete(id)}})
observer.enable()
// Fault builds retain the actual preparation/admission modules and installed native
// qualification. Only the fixed worker is substituted; production has no such hook.
async function faultWorker(name:string,source:string){
 new Script(source)
 const outfile=path.resolve('dist-temp/tests','windows-codec-fault-'+name+'.mjs')
 await build({entryPoints:['src/main/visual-ai/visual-preparation.ts'],outfile,bundle:true,platform:'node',format:'esm',packages:'external',target:'node20',plugins:[{
  name:'synthetic-owned-worker-fault',setup(builder){builder.onLoad({filter:/visual-codec\.worker\.ts$/},()=>({contents:'export const VISUAL_CODEC_WORKER_SOURCE='+JSON.stringify(source),loader:'ts'}))}
 }]})
 return(await import(pathToFileURL(outfile).href)).prepareVisualJpeg as typeof import('../src/main/visual-ai/visual-preparation').prepareVisualJpeg
}

await test('tampered installed codec bytes refuse and leave shared OCR/Pi admission available',async()=>{
 const original=fs.readFile.bind(fs)
 fs.readFile=(async(file:any,...args:any[])=>String(file).endsWith('sharp-win32-x64.node')?Buffer.from('synthetic wrong hash'):(original as any)(file,...args)) as typeof fs.readFile
 const admission=createVisualAdmission(),lease=admission.open('synthetic-native-refusal',{sessionToken:'synthetic',leaseIdentity:'synthetic'})
 try{await assert.rejects(requireVisualCodecQualification(),/UNQUALIFIED/);await assert.rejects(lease.prepare('image',async()=>new Uint8Array([1])),/UNQUALIFIED/)}
 finally{fs.readFile=original as typeof fs.readFile;lease.dispose()}
 const ocr=await admission.reserveOcr(1,new AbortController().signal);ocr.release()
 const pi=await admission.reservePiProbe(new AbortController().signal);pi.release()
 assert.equal(admission.inspect().materialBytes,0);assert.equal(admission.inspect().accepting,true)
})

for(const baseline of [0,1])await test('invalid or excessive real worker peak evidence trips the existing resource gate: baseline '+baseline,async()=>{
 const prepare=await faultWorker('baseline-'+baseline,String.raw`const fs=require('node:fs');process.stdin.resume();process.stdin.on('end',()=>{${baseline===1?'const excessive=Buffer.alloc(300*1024*1024,1);':''}fs.writeSync(3,JSON.stringify({sharp:'0.34.5',vips:'8.17.3',pixels:1,baseline:${baseline},additionalRss:null})+'\n');fs.writeSync(1,Buffer.from([1]));const ack=Buffer.alloc(1);fs.readSync(4,ack,0,1,null);});`)
 const admission=createVisualAdmission({codec:prepare}),lease=admission.open('synthetic-unsafe',{sessionToken:'synthetic',leaseIdentity:'synthetic'})
 try{await assert.rejects(lease.prepare('image',async()=>new Uint8Array([1])),/VISUAL_CODEC_ESTIMATE_EXCEEDED/)}finally{lease.dispose()}
 assert.equal(admission.inspect().materialBytes,0);assert.equal(admission.inspect().accepting,false)
 await assert.rejects(admission.reservePiProbe(new AbortController().signal),/SUSPENDED/)
})

await test('real 30 second preparation deadline terminates its hung owned worker and releases all timers',async()=>{
 const prepare=await faultWorker('timeout','setInterval(()=>{},1000)')
 const admission=createVisualAdmission({codec:prepare}),lease=admission.open('synthetic-hung',{sessionToken:'synthetic',leaseIdentity:'synthetic'})
 const started=Date.now()
 try{await assert.rejects(lease.prepare('image',async()=>new Uint8Array([1])),/VISUAL_PREPARATION_TIMEOUT/)}finally{lease.dispose()}
 assert.ok(Date.now()-started>=30000);assert.equal(admission.inspect().materialBytes,0);assert.equal(admission.inspect().preparing,0)
 assert.equal(admission.inspect().accepting,true)
})

await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));observer.disable()
assert.equal(timers.size,0,'no preparation deadline or force-kill timer survives actual child close')
