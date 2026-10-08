// Diagnostic only: no application imports, codecs, assets, library or services.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
for(let i=0;i<3;i++)await test(`owned empty child ${i}`,async()=>{
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['-e',"process.stdin.resume();process.stdin.on('end',()=>{require('node:fs').writeSync(3,'{}');process.stdout.end('x')})"],{env:{ELECTRON_RUN_AS_NODE:'1'},stdio:['pipe','pipe','ignore','pipe']})
  child.stdout.resume();child.stdio[3].resume();child.stdin.end('generated')
  child.on('error',reject);child.on('close',code=>{assert.equal(code,0);resolve()})
 })
})
for(let i=0;i<4;i++)await test(`settled promise ${i}`,async()=>{await new Promise(resolve=>setImmediate(resolve))})
await test('synthetic external-buffer pressure without any application or codec',()=>{
 let buffers=[]
 for(let i=0;i<16;i++)buffers.push(new Uint8Array(4*1024*1024))
 assert.equal(buffers.reduce((n,b)=>n+b.byteLength,0),64*1024*1024)
 buffers=[]
})
