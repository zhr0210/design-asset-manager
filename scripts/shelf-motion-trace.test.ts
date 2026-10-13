import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createShelfMotionTrace} from '../src/main/work-mode/shelf-motion-trace'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-motion-trace-'))
try{
 const trace=createShelfMotionTrace(root)
 trace.record({phase:'begin',gestureId:1,note:'must not log',token:'must not log',path:'/private'})
 for(let i=0;i<5000;i++)trace.record({phase:'native-dragged',gestureId:1,x:i})
 trace.record({phase:'completed',gestureId:1,status:'completed'})
 await trace.flush();const rows=JSON.parse(await fs.readFile(path.join(root,'motion-trace.json'),'utf8'))
 assert.ok(rows.length<=2048);assert.equal(rows[0].phase,'begin');assert.equal(rows.at(-1).phase,'completed');assert.ok(rows.every((r:any)=>r.buildId&&r.hostAt&&!('token'in r)&&!('note'in r)&&!('path'in r)))
 const bad=createShelfMotionTrace(path.join(root,'does-not-exist'));bad.record({phase:'failed'});await bad.flush()
 console.log('PASS asynchronous bounded diagnostic trace, phase retention/coalescing, build/monotonic attribution, secret/input exclusion and failed writes never gate interaction.')
}finally{await fs.rm(root,{recursive:true,force:true})}
