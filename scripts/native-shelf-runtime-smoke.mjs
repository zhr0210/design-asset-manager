// Own-app protocol smoke, not a Computer Use/user-path acceptance result.
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
if(process.platform!=='darwin')throw Error('macOS AppKit runtime required')
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-shelf-smoke-'))
const binary=path.resolve('build/shelf-candidates/DAM Shelf B.app/Contents/MacOS/Shelf')
const fixture=await fs.readFile('artifacts/window-candidates/profile-b/fixtures/蓝色参考.png')
const child=spawn(binary,['--mode=b',`--state-root=${root}`],{stdio:['pipe','pipe','pipe']})
let output='',diagnostic='',destroySent=false
child.stdout.on('data',b=>{output+=b.toString()});child.stderr.on('data',b=>{diagnostic=(diagnostic+b.toString()).slice(-4096)})
const send=v=>child.stdin.write(JSON.stringify(v)+'\n')
const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}))})
const timeout=setTimeout(()=>child.kill('SIGTERM'),10000)
try{
 send({op:'bounds',motionId:1,presentation:'expanded',x:50,y:50,width:640,height:520,docked:false})
 send({op:'publish',name:'Generated runtime smoke',note:'',colors:['#4A9DAB'],ack:0,items:Array.from({length:200},(_,i)=>({id:`fixture-${i}`,fileName:`generated-${i}.png`,fileType:'png',width:640,height:480,available:true,preview:i<20?fixture.toString('base64'):undefined}))})
 send({op:'show'})
 const timer=setTimeout(()=>{if(child.exitCode===null&&child.signalCode===null){destroySent=true;send({op:'destroy'})}},1800)
 const status=await done;clearTimeout(timer)
 assert.equal(destroySent,true,`AppKit exited during layout: ${JSON.stringify(status)} ${diagnostic}`)
 assert.equal(status.code,0,diagnostic);assert.equal(status.signal,null)
 assert.ok(output.includes('"version":3'));assert.ok(output.includes('"visibility"'))
 console.log('Actual owned AppKit helper: 200-item modern collection layout, material/window creation and clean protocol retirement. Generated data; internal runtime smoke only.')
}finally{clearTimeout(timeout);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');await fs.rm(root,{recursive:true,force:true})}
