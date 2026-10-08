import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
import {test} from 'node:test'
import {prepareWindowsBackupMetadataProbe,openWindowsBackupMetadataProbe,type WindowsBackupMetadataProbe,type WindowsBackupMetadataProbeOpen} from './fixtures/windows-backup-metadata-probe'

const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')
const preparation=await prepareWindowsBackupMetadataProbe()
const {path:artifactPath,...artifact}=preparation.artifact
console.log(JSON.stringify({metadataProbePreparation:{artifact,loadReceipt:preparation.loadReceipt,productionQualified:false}}))

async function fixture(){
  const temp=await fs.realpath(os.tmpdir()),root=await fs.realpath(await fs.mkdtemp(path.join(temp,'dam-backup-metadata-probe-')))
  const file=path.join(root,'synthetic.bin'),bytes=Buffer.alloc(256,0x61);await fs.writeFile(file,bytes)
  const cleanup=async()=>{
    assert.equal(path.dirname(root),temp);assert.ok(path.basename(root).startsWith('dam-backup-metadata-probe-'))
    assert.equal(await fs.realpath(root),root);assert.equal((await fs.lstat(root)).isSymbolicLink(),false)
    // Refuse traversal cleanup while any synthetic reparse entry remains.
    const inspect=async(current:string):Promise<void>=>{for(const entry of await fs.readdir(current,{withFileTypes:true})){const child=path.join(current,entry.name),stat=await fs.lstat(child);assert.equal(stat.isSymbolicLink(),false);if(stat.isDirectory())await inspect(child)}}
    await inspect(root);await fs.rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100})
  }
  return {root,file,bytes,cleanup}
}
function opened(result:WindowsBackupMetadataProbeOpen):WindowsBackupMetadataProbe {assert.equal(result.opened,true);assert.equal(result.win32Error,0);assert.equal(result.shareMode,7);assert.ok(result.session);return result.session}
function report(scenario:string,result:unknown){console.log(JSON.stringify({metadataProbe:{scenario,result,productionQualified:false,atomicNamespaceQualified:false}}))}

await test('same retained reader computes the complete SHA and preserves identity',async()=>{
  const f=await fixture();let handle:WindowsBackupMetadataProbe|undefined
  try{handle=opened(openWindowsBackupMetadataProbe({root:f.root,target:f.file,access:'read'}));const view=handle.snapshot();assert.equal(view.available,true);assert.equal(view.sameHandle,true);assert.equal(view.fullHash,sha(f.bytes));assert.equal(view.size,'256');assert.equal(view.links,1);report('same-handle-reader',view)}finally{handle?.close();await f.cleanup()}
})

await test('attribute handle has explicit hash UNKNOWN and read/write FSCTL access refusal',async()=>{
  const f=await fixture();let handle:WindowsBackupMetadataProbe|undefined
  try{
    handle=opened(openWindowsBackupMetadataProbe({root:f.root,target:f.file,access:'attributes'}));const before=handle.snapshot();assert.equal(before.fullHash,null);assert.equal(before.hashUnavailable,'NO_READ_DATA_ACCESS')
    for(const operation of ['set-compression','zero-data'] as const){const result=handle.attempt({operation});assert.equal(result.succeeded,false);assert.equal(result.win32Error,5);assert.equal(result.sameIdentity,true);assert.equal(result.contentChanged,null);assert.deepEqual(await fs.readFile(f.file),f.bytes);report('attribute-access-'+operation,result)}
    const changed=handle.attempt({operation:'set-time'});assert.equal(changed.succeeded,true);assert.notEqual(changed.before.lastWriteTime,changed.after.lastWriteTime);assert.equal(changed.contentChanged,null);report('attribute-time',changed)
  }finally{handle?.close();await f.cleanup()}
})

await test('unprotected read-write positive controls perform bounded sparse compression and zero-data',async()=>{
  const f=await fixture();let handle:WindowsBackupMetadataProbe|undefined
  try{
    handle=opened(openWindowsBackupMetadataProbe({root:f.root,target:f.file,access:'read-write'}))
    const sparse=handle.attempt({operation:'set-sparse'});assert.equal(sparse.succeeded,true);assert.ok((sparse.after.attributes??0)&0x200);assert.equal(sparse.contentChanged,false);report('unprotected-sparse',sparse)
    assert.equal(handle.attempt({operation:'set-sparse',enabled:false}).succeeded,true)
    const compression=handle.attempt({operation:'set-compression'});assert.equal(compression.succeeded,true);assert.ok((compression.after.attributes??0)&0x800);assert.equal(compression.contentChanged,false);report('unprotected-compression',compression)
    assert.equal(handle.attempt({operation:'set-compression',enabled:false}).succeeded,true)
    const zero=handle.attempt({operation:'zero-data',offset:32,length:16});assert.equal(zero.succeeded,true);assert.equal(zero.sameIdentity,true);assert.equal(zero.contentChanged,true);const expected=Buffer.from(f.bytes);expected.fill(0,32,48);assert.deepEqual(await fs.readFile(f.file),expected);assert.equal(zero.after.fullHash,sha(expected));report('unprotected-zero-data',zero)
  }finally{handle?.close();await f.cleanup()}
})

await test('unprotected same-handle rename then delete retain the actual file object',async()=>{
  const f=await fixture();let handle:WindowsBackupMetadataProbe|undefined
  try{
    handle=opened(openWindowsBackupMetadataProbe({root:f.root,target:f.file,access:'delete'}));const destination=path.join(f.root,'renamed.bin')
    const renamed=handle.attempt({operation:'rename',destination});report('unprotected-rename',renamed);assert.equal(renamed.succeeded,true);assert.equal(renamed.sameIdentity,true);assert.deepEqual(await fs.readFile(destination),f.bytes);await assert.rejects(fs.lstat(f.file),{code:'ENOENT'})
    const deleted=handle.attempt({operation:'delete'});assert.equal(deleted.succeeded,true);assert.equal(deleted.sameIdentity,true);assert.equal(deleted.after.deletePending,true);report('unprotected-delete',deleted)
    handle.close();handle=undefined;await assert.rejects(fs.lstat(destination),{code:'ENOENT'})
  }finally{handle?.close();await f.cleanup()}
})

await test('unprotected hardlink is explicit pathname authority and changes same-object link count',async()=>{
  const f=await fixture();let handle:WindowsBackupMetadataProbe|undefined
  try{
    handle=opened(openWindowsBackupMetadataProbe({root:f.root,target:f.file,access:'attributes'}));const destination=path.join(f.root,'owned-alias.bin'),result=handle.attempt({operation:'link',destination})
    assert.equal(result.authority,'PATHNAME_CREATE_HARD_LINK');assert.equal(result.succeeded,true);assert.equal(result.sameIdentity,true);assert.equal(result.after.links,2);assert.deepEqual(await fs.readFile(destination),f.bytes);report('unprotected-hardlink',result)
    await fs.unlink(destination);assert.equal(handle.snapshot().links,1)
  }finally{handle?.close();await f.cleanup()}
})

await test('empty directory mount-point control is removed through its original handle before cleanup',async()=>{
  const f=await fixture();let handle:WindowsBackupMetadataProbe|undefined
  const directory=path.join(f.root,'empty'),destination=path.join(f.root,'destination');await fs.mkdir(directory);await fs.mkdir(destination);await fs.writeFile(path.join(destination,'owned-sentinel.txt'),'synthetic sentinel')
  try{
    handle=opened(openWindowsBackupMetadataProbe({root:f.root,target:directory,access:'attributes',directory:true}));const set=handle.attempt({operation:'set-reparse',destination});assert.equal(set.succeeded,true);assert.equal(set.sameIdentity,true);assert.equal(set.after.reparse,true);assert.equal(set.after.reparseTag,0xa0000003);report('unprotected-empty-mount-point',set)
    assert.equal(await fs.readFile(path.join(directory,'owned-sentinel.txt'),'utf8'),'synthetic sentinel')
  }finally{
    if(handle){if(handle.snapshot().reparse){const removed=handle.attempt({operation:'remove-reparse'});assert.equal(removed.succeeded,true);assert.equal(removed.after.reparse,false);report('same-handle-mount-point-removal',removed)}handle.close()}
    assert.equal((await fs.lstat(directory)).isSymbolicLink(),false);assert.equal(await fs.readFile(path.join(destination,'owned-sentinel.txt'),'utf8'),'synthetic sentinel');await f.cleanup()
  }
})

await test('64 live session limit refuses extra handles and a physical close permits one replacement',async()=>{
  const f=await fixture(),handles:WindowsBackupMetadataProbe[]=[]
  try{
    for(let i=0;i<64;i++)handles.push(opened(openWindowsBackupMetadataProbe({root:f.root,target:f.file,access:'attributes'})))
    assert.throws(()=>openWindowsBackupMetadataProbe({root:f.root,target:f.file,access:'attributes'}),/METADATA_SESSION_LIMIT_REFUSED/)
    handles.pop()!.close();handles.push(opened(openWindowsBackupMetadataProbe({root:f.root,target:f.file,access:'attributes'})))
    report('session-cap',{maximum:64,extraRefused:true,replacementAfterClose:true,productionQualified:false})
  }finally{for(const handle of handles)handle.close();await f.cleanup()}
})

await test('owned root escape and reparse source are refused without touching outside data',async()=>{
  const f=await fixture(),destination=path.join(f.root,'real'),junction=path.join(f.root,'junction');await fs.mkdir(destination);await fs.writeFile(path.join(destination,'safe.bin'),f.bytes);await fs.symlink(destination,junction,'junction')
  try{
    assert.throws(()=>openWindowsBackupMetadataProbe({root:path.dirname(f.root),target:f.file,access:'read'}),/METADATA_ROOT_SCOPE_REFUSED|METADATA_ROOT_COMPONENT_REFUSED|METADATA_TARGET_SCOPE_REFUSED/)
    assert.throws(()=>openWindowsBackupMetadataProbe({root:f.root,target:path.dirname(f.root),access:'read',directory:true}),/METADATA_TARGET_SCOPE_REFUSED/)
    let denied=false;try{const result=openWindowsBackupMetadataProbe({root:f.root,target:path.join(junction,'safe.bin'),access:'read'});denied=!result.opened;result.session?.close()}catch(error){assert.match(String(error),/METADATA_REPARSE_REFUSED/);denied=true}assert.equal(denied,true)
    assert.deepEqual(await fs.readFile(path.join(destination,'safe.bin')),f.bytes)
  }finally{assert.equal((await fs.lstat(junction)).isSymbolicLink(),true);assert.equal(path.resolve(await fs.readlink(junction)),destination);await fs.rmdir(junction);await f.cleanup()}
})

await test('operation whitelist and bounded writes reject before synthetic byte mutation',async()=>{
  const f=await fixture();let handle:WindowsBackupMetadataProbe|undefined
  try{
    handle=opened(openWindowsBackupMetadataProbe({root:f.root,target:f.file,access:'read-write'}))
    assert.throws(()=>handle!.attempt({operation:'write-data',bytes:Buffer.alloc(4097)}),/METADATA_WRITE_BOUND_REFUSED/)
    assert.throws(()=>handle!.attempt({operation:'write-data',offset:1024*1024,bytes:Buffer.from([1])}),/METADATA_WRITE_BOUND_REFUSED/)
    assert.throws(()=>handle!.attempt({operation:'zero-data',length:4097}),/METADATA_BOUND_REFUSED/)
    assert.throws(()=>handle!.attempt({operation:'set-attributes',attributes:0x400}),/METADATA_ATTRIBUTES_REFUSED/)
    // The JS boundary cannot turn an unknown operation into a DeviceIoControl.
    const invalid={operation:'arbitrary-fsctl'}
    assert.throws(()=>handle!.attempt(invalid as Parameters<WindowsBackupMetadataProbe['attempt']>[0]),/METADATA_OPERATION_REFUSED/)
    assert.equal(handle.snapshot().fullHash,sha(f.bytes));assert.deepEqual(await fs.readFile(f.file),f.bytes)
  }finally{handle?.close();await f.cleanup()}
})

await test('private token boundary rejects unauthenticated values and closed owned tokens',async()=>{
  const f=await fixture()
  // This exact prepared module is already loaded and independently checked;
  // require only retrieves its cached exports, with no unguarded first load.
  const native=createRequire(path.resolve('package.json'))(artifactPath) as {open(input:unknown):{opened:boolean;token:object};snapshot(input:unknown):unknown;close(token:object):void}
  try{
    assert.throws(()=>native.snapshot({}),/METADATA_SESSION_REFUSED/)
    assert.throws(()=>native.snapshot(Buffer.from('synthetic-not-token')),/METADATA_SESSION_REFUSED/)
    const held=native.open({root:f.root,target:f.file,access:'attributes',directory:false});assert.equal(held.opened,true);native.close(held.token);assert.throws(()=>native.snapshot(held.token),/METADATA_SESSION_CLOSED/)
    report('token-boundary',{unauthenticatedObjectsRefused:true,closedTokenRefused:true,crossAddonExternalNotRun:true,kernelCloseFaultNotRun:true})
  }finally{await f.cleanup()}
})
