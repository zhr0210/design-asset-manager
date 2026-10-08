import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import nativeFs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {syncBuiltinESMExports} from 'node:module'
import {createPiRuntimeHost} from '../src/main/ai-gateway/pi-runtime-host'

const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
async function fixture(extra:Record<string,Uint8Array>={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-verification-'))
 const contents:Record<string,Uint8Array>={}
 for(let i=0;i<40;i++)contents[`node_modules/fixture/file-${i}.txt`]=Buffer.from(`sealed fixture ${i}`)
 contents[`runtime/${process.platform}-${process.arch}/node`]=Buffer.from('synthetic executable never launched')
 contents['worker.mjs']=Buffer.from('synthetic worker never launched')
 Object.assign(contents,extra)
 for(const [relative,bytes]of Object.entries(contents)){const file=path.join(root,relative);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes)}
 const release={platform:process.platform,arch:process.arch,piVersion:'0.99.1',nodeVersion:'synthetic',nodePath:`runtime/${process.platform}-${process.arch}/node`,files:Object.fromEntries(Object.entries(contents).map(([relative,bytes])=>[relative,sha(bytes)])),symlinks:{}}
 const manifest=Buffer.from(JSON.stringify(release));await fs.writeFile(path.join(root,'release.json'),manifest)
 let spawns=0
 const host=createPiRuntimeHost({root,releaseSha256:sha(manifest),spawn:(()=>{spawns++;throw Error('TEST_UNEXPECTED_WORKER_SPAWN')}) as any})
 return{root,contents,release,host,get spawns(){return spawns},close:()=>fs.rm(root,{recursive:true,force:true})}
}

await test('complete sealed verification makes progress with at most sixteen file reads in flight',async()=>{
 const f=await fixture(),readFile=fs.readFile
 let active=0,maximum=0,started=0,release!:()=>void
 const held=new Promise<void>(resolve=>{release=resolve})
 // Observe the filesystem boundary while keeping real file contents and every Host check.
 // The first wave stays in flight until the sixteen-file limit is reached.
 const fallback=setTimeout(release,1000)
 fs.readFile=(async(...args:any[])=>{
  if(!String(args[0]).startsWith(f.root+path.sep)||path.basename(String(args[0]))==='release.json')return(readFile as any)(...args)
  active++;started++;maximum=Math.max(maximum,active)
  if(started===16)release()
  try{await held;return await(readFile as any)(...args)}finally{active--}
 }) as typeof fs.readFile
 try{
  const result=await f.host.verify()
  assert.equal(maximum,16,'qualification must progress concurrently without exceeding sixteen reads')
  assert.equal(active,0)
  assert.equal(result.verification.filesRead,42)
  assert.equal(result.verification.bytesRead,Object.values(f.contents).reduce((sum,bytes)=>sum+bytes.byteLength,0))
  assert.equal(f.spawns,0)
 }finally{clearTimeout(fallback);release();fs.readFile=readFile;await f.close()}
})

for(const mode of ['failure','cancellation'] as const){
 await test(`${mode} waits for in-flight verification before releasing its permit and never spawns a Worker`,async()=>{
  const f=await fixture(),readFile=fs.readFile,controller=new AbortController()
  let active=0,started=0,release!:()=>void,waveReady!:()=>void,settled=false
  const held=new Promise<void>(resolve=>{release=resolve}),wave=new Promise<void>(resolve=>{waveReady=resolve})
  fs.readFile=(async(...args:any[])=>{
   if(!String(args[0]).startsWith(f.root+path.sep)||path.basename(String(args[0]))==='release.json')return(readFile as any)(...args)
   active++;started++;if(started===16)waveReady()
   try{
    if(mode==='failure'&&String(args[0])===path.join(f.root,'node_modules/fixture/file-0.txt')){await wave;return Buffer.from('changed fixture')}
    await held;return await(readFile as any)(...args)
   }finally{active--}
  }) as typeof fs.readFile
  const operation=f.host.execute({kind:'synthetic-never-sent'},controller.signal)
  const outcome=operation.then(()=>{settled=true;return undefined},error=>{settled=true;return error})
  try{
   await wave
   if(mode==='cancellation')controller.abort(Error('TEST_CANCELLED'))
   // Allow the first rejection to reach the Host while the other file reads stay held.
   await new Promise<void>(resolve=>setImmediate(resolve));await new Promise<void>(resolve=>setImmediate(resolve))
   assert.ok(active>0);assert.equal(settled,false)
   assert.equal(f.host.inspect().active,1);assert.equal(f.spawns,0)
   release()
   const error=await outcome
   assert.ok(error);assert.equal(error.message,mode==='failure'?'PI_RUNTIME_CHANGED':'The operation was aborted')
   assert.equal(started,16,'no further files start once failure or cancellation is known')
   assert.equal(active,0);assert.equal(f.host.inspect().active,0);assert.equal(f.host.inspect().unknown,0);assert.equal(f.spawns,0)
  }finally{release();await outcome;fs.readFile=readFile;await f.close()}
 })
}

await test('verification has no cache and a changed file after the first wave prevents Worker spawn',async()=>{
 const f=await fixture({'node_modules/fixture/large.bin':Buffer.alloc(1024*1024+1,0x31)})
 try{
  await f.host.verify()
  await fs.appendFile(path.join(f.root,'node_modules/fixture/large.bin'),'changed tail')
  await assert.rejects(f.host.execute({kind:'synthetic-never-sent'},new AbortController().signal),/PI_RUNTIME_CHANGED/)
  assert.equal(f.spawns,0);assert.deepEqual(f.host.inspect(),{unknown:0,active:0})
 }finally{await f.close()}
})

for(const mode of ['missing','unsealed','file-type','manifest-pin','metadata-type'] as const){
 await test(`${mode} still refuses the sealed bundle before Worker spawn`,async()=>{
  const f=await fixture()
  try{
   if(mode==='missing')await fs.unlink(path.join(f.root,'node_modules/fixture/file-39.txt'))
   if(mode==='unsealed')await fs.writeFile(path.join(f.root,'node_modules/fixture/unsealed.txt'),'unsealed')
   if(mode==='file-type'){await fs.unlink(path.join(f.root,'worker.mjs'));await fs.mkdir(path.join(f.root,'worker.mjs'))}
   if(mode==='manifest-pin')await fs.appendFile(path.join(f.root,'release.json'),' ')
   if(mode==='metadata-type'){
    const metadata=path.join(f.root,'node_modules/.DS_Store');await fs.writeFile(metadata,'synthetic ignored regular file');await f.host.verify();await fs.unlink(metadata);await fs.mkdir(metadata)
   }
   await assert.rejects(f.host.execute({kind:'synthetic-never-sent'},new AbortController().signal),/PI_RUNTIME_CHANGED/)
   assert.equal(f.spawns,0);assert.deepEqual(f.host.inspect(),{unknown:0,active:0})
  }finally{await f.close()}
 })
}

await test('already-cancelled verification refuses without reading or spawning',async()=>{
 const f=await fixture(),controller=new AbortController();controller.abort(Error('TEST_CANCELLED_BEFORE_VERIFY'))
 try{
  await assert.rejects(f.host.verify(controller.signal),/TEST_CANCELLED_BEFORE_VERIFY/)
  await assert.rejects(f.host.execute({kind:'synthetic-never-sent'},controller.signal),/TEST_CANCELLED_BEFORE_VERIFY/)
  assert.equal(f.spawns,0);assert.deepEqual(f.host.inspect(),{unknown:0,active:0})
 }finally{await f.close()}
})

await test('large sealed files hash every byte in bounded chunks while one-MiB files retain abortable reads',async()=>{
 const largeRelative='node_modules/fixture/large.bin',smallRelative='node_modules/fixture/boundary.bin'
 const f=await fixture({[largeRelative]:Buffer.alloc(2*1024*1024+17,0x5a),[smallRelative]:Buffer.alloc(1024*1024,0x2a)})
 const readFile=fs.readFile,createReadStream=nativeFs.createReadStream,controller=new AbortController()
 let streamedBytes=0,chunks=0,boundaryReads=0,streamSignal:AbortSignal|undefined
 fs.readFile=(async(...args:any[])=>{
  if(String(args[0])===path.join(f.root,largeRelative))throw Error('TEST_LARGE_FILE_READ_WAS_NOT_BOUNDED')
  if(String(args[0])===path.join(f.root,smallRelative)){boundaryReads++;assert.equal(args[1]?.signal,controller.signal)}
  return(readFile as any)(...args)
 }) as typeof fs.readFile
 nativeFs.createReadStream=((file,options:any)=>{
  const stream=createReadStream(file,options)
  if(String(file)===path.join(f.root,largeRelative)){
   assert.equal(options.highWaterMark,64*1024);streamSignal=options.signal
   stream.on('data',chunk=>{assert.ok(chunk.length<=64*1024);streamedBytes+=chunk.length;chunks++})
  }
  return stream
 }) as typeof nativeFs.createReadStream
 syncBuiltinESMExports()
 try{
  const result=await f.host.verify(controller.signal)
  assert.equal(streamedBytes,2*1024*1024+17);assert.ok(chunks>1)
  assert.equal(streamSignal,controller.signal);assert.equal(boundaryReads,1)
  assert.equal(result.verification.filesRead,44)
  assert.equal(result.verification.bytesRead,Object.values(f.contents).reduce((sum,bytes)=>sum+bytes.byteLength,0))
 }finally{fs.readFile=readFile;nativeFs.createReadStream=createReadStream;syncBuiltinESMExports();await f.close()}
})

await test('cancelling a large-file hash closes its stream before verification releases the execute permit',async()=>{
 const relative='node_modules/fixture/large.bin',f=await fixture({[relative]:Buffer.alloc(2*1024*1024+1,0x5a)})
 const createReadStream=nativeFs.createReadStream,controller=new AbortController()
 let chunks=0,closed=false
 nativeFs.createReadStream=((file,options:any)=>{
  const stream=createReadStream(file,options)
  if(String(file)===path.join(f.root,relative)){
   stream.once('close',()=>{closed=true})
   stream.once('data',()=>{chunks++;controller.abort()})
  }
  return stream
 }) as typeof nativeFs.createReadStream
 syncBuiltinESMExports()
 try{
  await assert.rejects(f.host.execute({kind:'synthetic-never-sent'},controller.signal),error=>error instanceof Error&&error.name==='AbortError')
  assert.equal(chunks,1);assert.equal(closed,true);assert.equal(f.spawns,0)
  assert.deepEqual(f.host.inspect(),{unknown:0,active:0})
 }finally{nativeFs.createReadStream=createReadStream;syncBuiltinESMExports();await f.close()}
})

await test('a sealed path cannot escape the runtime root even when its manifest pin matches',async()=>{
 const f=await fixture();let spawns=0
 try{
  f.release.files['../outside-fixture']=sha(Buffer.from('never read'))
  const manifest=Buffer.from(JSON.stringify(f.release));await fs.writeFile(path.join(f.root,'release.json'),manifest)
  const host=createPiRuntimeHost({root:f.root,releaseSha256:sha(manifest),spawn:(()=>{spawns++;throw Error('TEST_UNEXPECTED_WORKER_SPAWN')}) as any})
  await assert.rejects(host.execute({kind:'synthetic-never-sent'},new AbortController().signal),/PI_RUNTIME_CHANGED/)
  assert.equal(spawns,0);assert.deepEqual(host.inspect(),{unknown:0,active:0})
 }finally{await f.close()}
})

for(const field of ['platform','arch'] as const)await test('a correctly pinned manifest for another '+field+' still refuses before Worker spawn',async()=>{
 const f=await fixture();let spawns=0
 try{
  f.release[field]='synthetic-wrong-target'
  const manifest=Buffer.from(JSON.stringify(f.release));await fs.writeFile(path.join(f.root,'release.json'),manifest)
  const host=createPiRuntimeHost({root:f.root,releaseSha256:sha(manifest),spawn:(()=>{spawns++;throw Error('TEST_UNEXPECTED_WORKER_SPAWN')}) as any})
  await assert.rejects(host.execute({kind:'synthetic-never-sent'},new AbortController().signal),/PI_RUNTIME_PLATFORM_UNAVAILABLE/)
  assert.equal(spawns,0);assert.deepEqual(host.inspect(),{unknown:0,active:0})
 }finally{await f.close()}
})

await test('LF to CRLF drift of a sealed source is rejected even with an unchanged valid manifest pin',async()=>{
 const f=await fixture({'worker.mjs':Buffer.from('synthetic worker\nnever launched\n')})
 try{
  await f.host.verify()
  await fs.writeFile(path.join(f.root,'worker.mjs'),'synthetic worker\r\nnever launched\r\n')
  await assert.rejects(f.host.execute({kind:'synthetic-never-sent'},new AbortController().signal),/PI_RUNTIME_CHANGED/)
  assert.equal(f.spawns,0);assert.deepEqual(f.host.inspect(),{unknown:0,active:0})
 }finally{await f.close()}
})

await test('an unsealed directory link cannot introduce a second package tree',async()=>{
 const f=await fixture()
 try{
  await fs.symlink(path.join(f.root,'node_modules/fixture'),path.join(f.root,'node_modules/unsealed-link'),process.platform==='win32'?'junction':'dir')
  await assert.rejects(f.host.execute({kind:'synthetic-never-sent'},new AbortController().signal),/PI_RUNTIME_CHANGED/)
  assert.equal(f.spawns,0);assert.deepEqual(f.host.inspect(),{unknown:0,active:0})
 }finally{await f.close()}
})
