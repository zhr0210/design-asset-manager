import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createHash} from 'node:crypto'
import {test} from 'node:test'
import Database from 'better-sqlite3'

import {runNativeBackupTracer} from './fixtures/windows-backup-native-harness'
import {prepareWindowsBackupHelper} from './fixtures/windows-backup-helper-process'
import {serializeWindowsBackupBinding, inspectWindowsBackupRecovery, type WindowsBackupBinding} from '../src/main/platform/windows-backup-recovery.internal'
import {validateWindowsBackupSource, requireWindowsBackupSpace} from '../src/main/platform/windows-backup-source.internal'
await prepareWindowsBackupHelper()

const hash=(image:Buffer)=>createHash('sha256').update(image).digest('hex')
async function fixture(){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-target-'))),directory=path.join(root,'directory'),outside=path.join(root,'outside')
 await fs.mkdir(directory);await fs.mkdir(outside);await fs.writeFile(path.join(outside,'sentinel.txt'),'owned synthetic sentinel')
 const source=new Database(':memory:');source.exec('CREATE TABLE user_state (id INTEGER PRIMARY KEY, caption TEXT); INSERT INTO user_state VALUES(1,\'用户合成描述\')');source.pragma('user_version=7')
 const image=source.serialize();source.close()
 const owned=async(file:string)=>{const absolute=path.resolve(file);assert.ok(absolute.startsWith(root+path.sep));assert.equal(await fs.realpath(root),root)}
 const run=async(mode:string,target=directory,destination=outside,data=image,afterReady?:()=>Promise<void>)=>{
  await owned(target);await owned(destination)
  return runNativeBackupTracer({directory:target,destination,mode,image:data,afterReady})
 }
 const close=async()=>{assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-target-'));const operation=path.join(directory,'snapshot-op');try{if((await fs.lstat(operation)).isSymbolicLink())await fs.unlink(operation)}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}await fs.rm(root,{recursive:true,force:true,maxRetries:3,retryDelay:100})}
 return{root,directory,outside,image,run,close}
}

await test('native single-component target publishes and reads back serialized SQLite behind retained handles',async context=>{
 assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.versions.electron,'30.5.1');assert.equal(process.versions.node,'20.16.0');assert.equal(process.versions.modules,'123')
 const f=await fixture()
 try{
  const r=await f.run('normal');assert.equal(r.Outcome,'target-verified',r.Reason);assert.equal(r.ProductionQualified,false);assert.deepEqual(r.FlushOrder,['file','operation','parent']);assert.equal(r.Hash,hash(f.image));assert.equal(r.Bytes,f.image.length)
  assert.equal(r.Resource.targetExited,true);assert.equal(r.Resource.processLimit,128*1024*1024);assert.equal(r.Resource.jobLimit,256*1024*1024);assert.equal(r.Resource.startupHardLimited,true)
  assert.equal(r.Resource.launcherTailUnmeasured,false);assert.equal(r.Resource.launcherExited,true);assert.equal(r.Resource.jobEmpty,true);assert.equal(r.Resource.managedArtifactsPinned,true)
  assert.ok(r.Resource.targetPeakCommit<=r.Resource.processLimit);assert.ok(r.Resource.jobPeakCommit<=r.Resource.jobLimit);context.diagnostic(JSON.stringify(r.Resource))
  const bytes=await fs.readFile(path.join(f.directory,'snapshot-op','library.sqlite'));assert.equal(hash(bytes),hash(f.image))
  const checked=new Database(bytes,{readonly:true});try{assert.equal(checked.pragma('quick_check',{simple:true}),'ok');assert.equal(checked.pragma('user_version',{simple:true}),7);assert.equal(checked.prepare('SELECT caption FROM user_state').pluck().get(),'用户合成描述')}finally{checked.close()}
  assert.deepEqual(await fs.readdir(f.outside),['sentinel.txt'])
 }finally{await f.close()}
})

await test('native target memory exhaustion meets prelaunch Job commit limit and makes no backup writes',async context=>{
 const f=await fixture()
 try{
  const receipt=await f.run('memory-limit');assert.equal(receipt.Outcome,'refused');assert.equal(receipt.Reason,'HELPER_MEMORY_LIMIT_REACHED')
  assert.equal(receipt.Resource.targetExited,true);assert.ok(receipt.Resource.targetPeakCommit<=receipt.Resource.processLimit);assert.ok(receipt.Resource.targetPeakCommit>96*1024*1024)
  assert.ok(receipt.Resource.jobPeakCommit<=receipt.Resource.jobLimit);assert.deepEqual(await fs.readdir(f.directory),[]);context.diagnostic(JSON.stringify(receipt.Resource))
 }finally{await f.close()}
})

for(const interrupted of [false,true])await test('bound native recovery reads retained content/status and classifies '+(interrupted?'interruption':'claim')+' without restore authority',async()=>{
 const f=await fixture();let expected:WindowsBackupBinding|undefined,held=false
 try{
  await fs.writeFile(path.join(f.directory,'library.sqlite'),f.image,{flag:'wx'})
  const input={directory:f.directory,mode:'source-hold',image:f.image,onSource:source=>{
   const connection={pages:f.image.length/4096,pageSize:4096,dataVersion:1,schemaVersion:7},policy=validateWindowsBackupSource(source,connection,f.image)
   requireWindowsBackupSpace(source,policy.beforeBackup)
   expected={format:1,operation:'snapshot-op',library:'synthetic-library',lineage:'synthetic-lineage',controlStore:'synthetic-control',generation:'1',source,connection,imageSha256:hash(f.image)}
   return serializeWindowsBackupBinding(expected)
  },timeoutMs:interrupted?3000:20000,whileHeld:async()=>{held=true;return interrupted?new Promise<number>(()=>{}):1}}
  if(interrupted)await assert.rejects(runNativeBackupTracer(input),/TIMEOUT_AFTER_CLOSE/)
  else assert.equal((await runNativeBackupTracer(input)).Outcome,'target-verified')
  assert.equal(held,true);assert.ok(expected)
  const operation=path.join(f.directory,'schema-backups','snapshot-op'),before=new Map<string,string>()
  for(const file of await fs.readdir(operation))before.set(file,hash(await fs.readFile(path.join(operation,file))))
  const read=await runNativeBackupTracer({directory:f.directory,mode:'bound-retrieve',image:f.image});assert.equal(read.Outcome,'retrieved-content',read.Reason);assert.deepEqual(read.FlushOrder,[])
  const bundle={binding:read.Binding,backing:read.Backing,verified:read.Verified,finished:read.Finished,imageSha256:read.Hash}
  const recovery=inspectWindowsBackupRecovery(bundle,expected);assert.equal(recovery.kind,interrupted?'interrupted':'commit-claimed');assert.equal(recovery.restoreAllowed,false);assert.equal(recovery.sourceCommit,'unproven')
  for(const[file,digest]of before)assert.equal(hash(await fs.readFile(path.join(operation,file))),digest,'retrieval writes nothing')
  await fs.writeFile(path.join(operation,'binding.json'),serializeWindowsBackupBinding({...expected,generation:'2'}))
  const changed=await runNativeBackupTracer({directory:f.directory,mode:'bound-retrieve',image:f.image});assert.equal(changed.Outcome,'retrieved-content')
  assert.throws(()=>inspectWindowsBackupRecovery({...bundle,binding:changed.Binding},expected),/BINDING_REFUSED/)
  await fs.unlink(path.join(operation,'status-verified.json'));await fs.symlink(path.join(f.outside,'sentinel.txt'),path.join(operation,'status-verified.json'))
  const unsafe=await runNativeBackupTracer({directory:f.directory,mode:'bound-retrieve',image:f.image});assert.equal(unsafe.Outcome,'refused');assert.match(unsafe.Reason,/REPARSE|NT_CREATE_REFUSED/)
  await fs.unlink(path.join(operation,'status-verified.json'));assert.equal(await fs.readFile(path.join(f.outside,'sentinel.txt'),'utf8'),'owned synthetic sentinel')
 }finally{await f.close()}
})
await test('held native directory target stays confined when its pathname becomes a junction',async()=>{
 const f=await fixture(),operation=path.join(f.directory,'snapshot-op')
 try{
  const r=await f.run('pause',f.directory,f.outside,f.image,async()=>{assert.equal(await f.run('mutate',operation),true)})
  assert.equal(r.Outcome,'refused');assert.equal(r.Reason,'NT_CREATE_REFUSED_C0000280');assert.equal(r.ProductionQualified,false);assert.equal(r.Bytes,0);assert.equal(r.Hash,null);assert.deepEqual(r.FlushOrder,[])
  assert.deepEqual(await fs.readdir(f.outside),['sentinel.txt']);assert.equal(await fs.readFile(path.join(f.outside,'sentinel.txt'),'utf8'),'owned synthetic sentinel')
  assert.equal(await f.run('remove',operation),true)
  assert.deepEqual(await fs.readdir(operation),[],'native create refuses the changed directory before creating any target')
 }finally{await f.close()}
})
await test('existing operation name is refused before target writes',async()=>{
 const f=await fixture(),operation=path.join(f.directory,'snapshot-op')
 try{await fs.symlink(f.outside,operation,'junction');const r=await f.run('normal');assert.equal(r.Outcome,'refused');assert.match(r.Reason,/NT_CREATE_REFUSED/);assert.deepEqual(await fs.readdir(f.outside),['sentinel.txt'])}finally{await f.close()}
})
await test('flush failure leaves an unqualified partial and never claims a verified durable target',async()=>{
 const f=await fixture()
 try{const r=await f.run('fail-operation-flush');assert.equal(r.Outcome,'refused');assert.equal(r.Reason,'SYNTHETIC_OPERATION_FLUSH_FAILURE');assert.deepEqual(r.FlushOrder,['file']);assert.equal(r.ProductionQualified,false);assert.equal(hash(await fs.readFile(path.join(f.directory,'snapshot-op','library.sqlite'))),hash(f.image))}finally{await f.close()}
})

await test('owned child timeout reports only after physical close even if Main hook never settles',async()=>{
 const f=await fixture();let held=false
 try{
  await assert.rejects(runNativeBackupTracer({directory:f.directory,mode:'hold',image:f.image,timeoutMs:3000,whileHeld:async()=>{held=true;return new Promise<number>(()=>{})}}),/TRACER_CHILD_TIMEOUT_AFTER_CLOSE/)
  assert.equal(held,true,'cut must reach the held target')
  const operation=path.join(f.directory,'schema-backups','snapshot-op')
  assert.equal(hash(await fs.readFile(path.join(operation,'library.sqlite'))),hash(f.image),'exclusive target handle was physically released before rejection')
  assert.equal(JSON.parse(await fs.readFile(path.join(operation,'status-verified.json'),'utf8')).productionQualified,false)
  await fs.rename(path.join(f.directory,'schema-backups'),path.join(f.directory,'released-parent'))
 }finally{await f.close()}
})

const backing=['backing-status-file','backing-operation','backing-parent','backing-control']
for(const [cut,order] of [
 ['backing-status',[]],['backing-operation',['backing-status-file']],['backing-parent',['backing-status-file','backing-operation']],['backing-control',['backing-status-file','backing-operation','backing-parent']],['file',backing],['status',[...backing,'file']],
 ['operation',[...backing,'file','status-file']],['parent',[...backing,'file','status-file','operation']],
 ['control',[...backing,'file','status-file','operation','parent']]
] as const) await test('durability cut '+cut+' refuses and restarted writer cannot overwrite partial operation',async()=>{
 const f=await fixture()
 try{
  const first=await f.run('hold-fail-'+cut);assert.equal(first.Outcome,'refused');assert.match(first.Reason,/SYNTHETIC_/);assert.equal(first.ProductionQualified,false);assert.deepEqual(first.FlushOrder,order)
  const operation=path.join(f.directory,'schema-backups','snapshot-op'),before=new Map<string,string>()
  for(const name of await fs.readdir(operation))before.set(name,hash(await fs.readFile(path.join(operation,name))))
  const retry=await f.run('hold');assert.equal(retry.Outcome,'refused');assert.match(retry.Reason,/NT_CREATE_REFUSED/);assert.equal(retry.Bytes,0);assert.deepEqual(retry.FlushOrder,[])
  for(const [name,digest] of before)assert.equal(hash(await fs.readFile(path.join(operation,name))),digest)
  assert.deepEqual(await fs.readdir(operation),[...before.keys()]);assert.deepEqual(await fs.readdir(f.outside),['sentinel.txt'])
 }finally{await f.close()}
})
await test('interrupt after verified status survives child restart and remains an uncommitted tracer',async()=>{
 const f=await fixture();let held=false
 try{
  await assert.rejects(runNativeBackupTracer({directory:f.directory,mode:'hold',image:f.image,timeoutMs:3000,whileHeld:async()=>{held=true;return new Promise<number>(()=>{})}}),/TIMEOUT_AFTER_CLOSE/)
  assert.equal(held,true);const operation=path.join(f.directory,'schema-backups','snapshot-op')
  const bytes=await fs.readFile(path.join(operation,'library.sqlite'));assert.equal(hash(bytes),hash(f.image))
  const status=await fs.readFile(path.join(operation,'status-verified.json'));assert.equal(JSON.parse(status.toString()).sha256,hash(bytes));await assert.rejects(fs.access(path.join(operation,'status-finished.json')))
  const restart=await f.run('hold');assert.equal(restart.Outcome,'refused');assert.match(restart.Reason,/NT_CREATE_REFUSED/)
  assert.equal(hash(await fs.readFile(path.join(operation,'status-verified.json'))),hash(status));assert.equal(hash(await fs.readFile(path.join(operation,'library.sqlite'))),hash(bytes))
 }finally{await f.close()}
})

for(const cut of ['status','operation','parent','control'])await test('finish '+cut+' failure never claims success or grants production recovery',async()=>{
 const f=await fixture();let held=false
 try{
  const receipt=await runNativeBackupTracer({directory:f.directory,mode:'hold-fail-finish-'+cut,image:f.image,whileHeld:async()=>{held=true;return 1}})
  assert.equal(held,true);assert.equal(receipt.Outcome,'refused');assert.match(receipt.Reason,/SYNTHETIC_FINISH_/);assert.equal(receipt.ProductionQualified,false)
  assert.equal(hash(await fs.readFile(path.join(f.directory,'schema-backups','snapshot-op','library.sqlite'))),hash(f.image))
 }finally{await f.close()}
})
await test('native same-handle retrieval rejects altered bytes and reparse operation without writing',async()=>{
 const f=await fixture()
 try{
  await runNativeBackupTracer({directory:f.directory,mode:'hold',image:f.image,whileHeld:async()=>1})
  const retrieved=await f.run('retrieve');assert.equal(retrieved.Outcome,'retrieved-content');assert.equal(retrieved.Hash,hash(f.image));assert.equal(retrieved.ProductionQualified,false);assert.deepEqual(retrieved.FlushOrder,[])
  const operation=path.join(f.directory,'schema-backups','snapshot-op'),target=path.join(operation,'library.sqlite')
  const altered=Buffer.from(f.image);altered[altered.length-1]^=1;await fs.writeFile(target,altered)
  const mismatch=await f.run('retrieve');assert.equal(mismatch.Outcome,'refused');assert.equal(mismatch.Reason,'HASH_MISMATCH');assert.deepEqual(mismatch.FlushOrder,[]);assert.equal(hash(await fs.readFile(target)),hash(altered))
  await fs.rename(operation,path.join(f.directory,'saved-operation'));await fs.symlink(f.outside,operation,'junction')
  try{const reparse=await f.run('retrieve');assert.equal(reparse.Outcome,'refused');assert.match(reparse.Reason,/NT_CREATE_REFUSED|REPARSE_REFUSED/);assert.deepEqual(await fs.readdir(f.outside),['sentinel.txt'])}finally{await fs.unlink(operation)}
 }finally{await f.close()}
})
