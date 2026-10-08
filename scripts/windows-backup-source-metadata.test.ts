import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import Database from 'better-sqlite3'
import {openWindowsBackupJournalSource,prepareWindowsBackupJournalVfs,type WindowsBackupJournalSource} from './fixtures/windows-backup-journal-vfs'
import {prepareWindowsBackupMetadataProbe,openWindowsBackupMetadataProbe,type WindowsBackupMetadataProbe} from './fixtures/windows-backup-metadata-probe'
import {prepareWindowsBackupVfs,prepareWindowsBackupVfsConnection,pinWindowsBackupVfsSource,type WindowsBackupVfsPin} from './fixtures/windows-backup-vfs'

const SPARSE=0x200,COMPRESSED=0x800
assert.equal(process.env.SQLITE_USE_URI,'1','Use the repository Electron runner for this owned URI qualification process')

async function fixture(){
  const temporary=await fs.realpath(os.tmpdir())
  const root=await fs.realpath(await fs.mkdtemp(path.join(temporary,'dam-native-target-source-metadata-')))
  const control=path.join(root,'.dam');await fs.mkdir(control)
  const file=path.join(control,'library.sqlite'),db=new Database(file,{timeout:0})
  db.pragma('journal_mode=DELETE');db.pragma('synchronous=FULL');db.pragma('user_version=1')
  db.exec("CREATE TABLE synthetic(id INTEGER PRIMARY KEY,value TEXT);INSERT INTO synthetic VALUES(1,'before')")
  db.close()
  return {root,control,file,close:async()=>{
    assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),temporary)
    assert.ok(path.basename(root).startsWith('dam-native-target-source-metadata-'))
    await fs.rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100})
  }}
}
type Fixture=Awaited<ReturnType<typeof fixture>>
function observe(scenario:string,result:unknown){console.log(JSON.stringify({sourceJournalMetadata:{scenario,result,productionQualified:false,atomicNamespaceQualified:false}}))}
function open(f:Fixture,target:string,access:'attributes'|'read'|'read-write'|'delete',directory=false){
  return openWindowsBackupMetadataProbe({root:f.root,target,access,directory})
}

await prepareWindowsBackupJournalVfs()
await prepareWindowsBackupVfs()
console.log(JSON.stringify({metadataProbePreparation:await prepareWindowsBackupMetadataProbe()}))

// Retained attribute access can coexist with data/no-delete sharing. A detected
// mutation is refused; none of these checks claims atomic namespace isolation.
for(const operation of ['set-sparse','set-compression'] as const)await test(`before pin source ${operation} is refused without changing bytes`,async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined,mutation:WindowsBackupMetadataProbe|undefined
  try{
    const before=await fs.readFile(f.file),opened=open(f,f.file,operation==='set-sparse'?'attributes':'read-write')
    assert.equal(opened.opened,true);mutation=opened.session!
    const result=mutation.attempt({operation,enabled:true})
    if(result.succeeded){
      assert.ok(Number(mutation.snapshot().attributes)&(operation==='set-sparse'?SPARSE:COMPRESSED))
      await assert.rejects(openWindowsBackupJournalSource(f.control),/JOURNAL_REGISTER_SOURCE_REFUSED/)
      await assert.rejects(openWindowsBackupJournalSource(f.control,true),/JOURNAL_REGISTER_SOURCE_REFUSED/)
      assert.deepEqual(await fs.readFile(f.file),before)
      observe(`prepin-source-${operation}`,{...result,classification:'detected-limited-before-registration'})
    }else observe(`prepin-source-${operation}`,{...result,classification:'blocked-by-OS'})
  }finally{source?.close();if(mutation){mutation.attempt({operation,enabled:false});mutation.close()}await f.close()}
})

for(const access of ['attributes','read-write','delete'] as const)await test(`source preexisting ${access} handle has measured pin sharing outcome`,async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined,held:WindowsBackupMetadataProbe|undefined
  try{
    const before=await fs.readFile(f.file),opened=open(f,f.file,access)
    assert.equal(opened.opened,true);held=opened.session!
    if(access==='delete'){
      await assert.rejects(openWindowsBackupJournalSource(f.control),/JOURNAL_REGISTER_SOURCE_REFUSED/)
      observe(`prepin-source-${access}`,{classification:'blocked-by-no-delete-sharing',opened:true})
    }else{
      source=await openWindowsBackupJournalSource(f.control)
      if(access==='attributes')console.log(JSON.stringify({actualJournalVfsArtifact:source.artifact,actualJournalBootstrapLoad:source.bootstrapLoad}))
      assert.equal(source.db.prepare('SELECT value FROM synthetic').pluck().get(),'before')
      if(access==='read-write'){
        const last=before.length-1,changed=held.attempt({operation:'write-data',offset:last,bytes:Buffer.from([before[last]^0xff])})
        assert.equal(changed.succeeded,true);assert.notDeepEqual(await fs.readFile(f.file),before)
        observe(`prepin-source-${access}`,{...changed,classification:'known-counterexample-existing-byte-writer-remains-OS-writable'})
        assert.equal(held.attempt({operation:'write-data',offset:last,bytes:before.subarray(last)}).succeeded,true)
      }else observe(`prepin-source-${access}`,{classification:'known-counterexample-attribute-handle-coexists',snapshot:held.snapshot()})
      assert.deepEqual(await fs.readFile(f.file),before)
    }
  }finally{source?.close();held?.close();await f.close()}
})

for(const operation of ['set-sparse','set-compression'] as const)await test(`source post-pin ${operation} refuses actual delegated source I/O before writing`,async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined,mutation:WindowsBackupMetadataProbe|undefined
  try{
    const before=await fs.readFile(f.file);source=await openWindowsBackupJournalSource(f.control)
    const opened=open(f,f.file,operation==='set-sparse'?'attributes':'read-write');assert.equal(opened.opened,true);mutation=opened.session!
    const result=mutation.attempt({operation,enabled:true})
    if(result.succeeded){
      assert.ok(Number(mutation.snapshot().attributes)&(operation==='set-sparse'?SPARSE:COMPRESSED))
      assert.throws(()=>source!.db.exec("UPDATE synthetic SET value='must refuse changed metadata'"),/disk I\/O error/)
      assert.equal(source.receipt().reason,'SOURCE_CURRENT_METADATA_REFUSED');assert.equal(source.receipt().deleted,0)
      assert.deepEqual(await fs.readFile(f.file),before)
      observe(`postpin-source-${operation}`,{...result,classification:'detected-limited-at-source-I/O'})
    }else{assert.deepEqual(await fs.readFile(f.file),before);observe(`postpin-source-${operation}`,{...result,classification:'blocked-by-OS'})}
  }finally{source?.close();if(mutation){mutation.attempt({operation,enabled:false});mutation.close()}await f.close()}
})

await test('source sparse mutation between registration and actual MAIN open is refused before source SQL',async()=>{
  const f=await fixture();let mutation:WindowsBackupMetadataProbe|undefined,source:WindowsBackupJournalSource|undefined,mutated=false
  try{
    const before=await fs.readFile(f.file)
    const opened=open(f,f.file,'attributes');assert.equal(opened.opened,true);mutation=opened.session!
    try{
      source=await openWindowsBackupJournalSource(f.control,false,async()=>{
        const result=mutation!.attempt({operation:'set-sparse',enabled:true});mutated=result.succeeded
        observe('registered-before-main-sparse',{...result,classification:mutated?'detected-limited-at-main-open':'blocked-by-OS'})
      })
      assert.equal(mutated,false,'A mutated registered source must never finish opening')
    }catch(error){assert.equal(mutated,true);assert.match(String(error),/unable to open database file/)}
    assert.deepEqual(await fs.readFile(f.file),before)
  }finally{source?.close();if(mutation){mutation.attempt({operation:'set-sparse',enabled:false});mutation.close()}await f.close()}
})

await test('cached readonly SQL remains a limited counterexample and cannot stand in for current source qualification',async()=>{
  const f=await fixture();let mutation:WindowsBackupMetadataProbe|undefined,source:WindowsBackupJournalSource|undefined
  try{
    const before=await fs.readFile(f.file);source=await openWindowsBackupJournalSource(f.control,true)
    source.db.exec('BEGIN');const query=source.db.prepare('SELECT value FROM synthetic');assert.equal(query.pluck().get(),'before')
    const opened=open(f,f.file,'attributes');assert.equal(opened.opened,true);mutation=opened.session!
    const result=mutation.attempt({operation:'set-sparse',enabled:true})
    if(result.succeeded){
      // SQLite already holds its shared transaction and page cache. This is
      // deliberately not reported as a disk read or a qualified source check.
      assert.equal(query.get(),'before');assert.equal(source.receipt().productionQualified,false)
      await assert.rejects(openWindowsBackupJournalSource(f.control,true),/JOURNAL_REGISTER_SOURCE_REFUSED/)
      observe('cached-readonly-sparse',{...result,classification:'known-counterexample-cache-is-not-source-qualification'})
    }else observe('cached-readonly-sparse',{...result,classification:'blocked-by-OS'})
    source.db.exec('ROLLBACK');assert.deepEqual(await fs.readFile(f.file),before)
  }finally{source?.close();if(mutation){mutation.attempt({operation:'set-sparse',enabled:false});mutation.close()}await f.close()}
})

await test('live journal sparse FSCTL refuses COMMIT and retains exact residual journal',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined,mutation:WindowsBackupMetadataProbe|undefined
  try{
    const before=await fs.readFile(f.file);source=await openWindowsBackupJournalSource(f.control)
    source.db.exec("BEGIN;UPDATE synthetic SET value='must refuse changed journal metadata'")
    assert.equal(source.receipt().journalRetained,true)
    const opened=open(f,f.file+'-journal','attributes')
    if(!opened.opened){observe('livejournal-sparse',{...opened,classification:'blocked-by-sharing'});source.db.exec('ROLLBACK');return}
    mutation=opened.session!
    const result=mutation.attempt({operation:'set-sparse',enabled:true})
    if(result.succeeded){
      assert.ok(Number(mutation.snapshot().attributes)&SPARSE)
      assert.throws(()=>source!.db.exec('COMMIT'),/disk I\/O error/)
      assert.equal(source.receipt().deleted,0);assert.equal(source.receipt().journalRetained,true)
      assert.deepEqual(await fs.readFile(f.file),before)
      const identity=mutation.snapshot();source.close();source=undefined
      assert.equal(mutation.snapshot().file,identity.file);assert.equal(mutation.snapshot().volume,identity.volume)
      await assert.rejects(openWindowsBackupJournalSource(f.control,true),/JOURNAL_REGISTER_SOURCE_REFUSED/)
      observe('livejournal-sparse',{...result,classification:'detected-limited-commit-refused-journal-retained'})
    }else{source.db.exec('ROLLBACK');observe('livejournal-sparse',{...result,classification:'blocked-by-OS'})}
  }finally{source?.close();mutation?.close();await f.close()}
})

await test('source ancestor late reparse is blocked or detected before a journal/source write',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined,mutation:WindowsBackupMetadataProbe|undefined
  try{
    const before=await fs.readFile(f.file),destination=path.join(f.root,'destination');await fs.mkdir(destination)
    const sentinel=path.join(destination,'sentinel.txt');await fs.writeFile(sentinel,'owned ancestor sentinel',{flag:'wx'})
    source=await openWindowsBackupJournalSource(f.control)
    const opened=open(f,f.control,'attributes',true)
    if(!opened.opened){observe('postpin-control-reparse',{...opened,classification:'blocked-by-sharing'});return}
    mutation=opened.session!
    const result=mutation.attempt({operation:'set-reparse',destination})
    if(result.succeeded){
      assert.ok(Number(mutation.snapshot().attributes)&0x400)
      assert.throws(()=>source!.db.exec("UPDATE synthetic SET value='must refuse mutated ancestor'"),/disk I\/O error|unable to open database file/)
      assert.equal(source.receipt().created,0);assert.equal(source.receipt().deleted,0)
      assert.equal(mutation.attempt({operation:'remove-reparse'}).succeeded,true)
      observe('postpin-control-reparse',{...result,classification:'detected-limited'})
    }else observe('postpin-control-reparse',{...result,classification:'blocked-by-OS'})
    assert.equal(await fs.readFile(sentinel,'utf8'),'owned ancestor sentinel');assert.deepEqual(await fs.readFile(f.file),before)
  }finally{source?.close();mutation?.close();await f.close()}
})

for(const cut of ['before-pin','after-pin'] as const)await test(`actual default VFS sparse ${cut} refuses settled source evidence`,async()=>{
  const f=await fixture();let db:Database.Database|undefined,pin:WindowsBackupVfsPin|undefined,mutation:WindowsBackupMetadataProbe|undefined
  try{
    const before=await fs.readFile(f.file)
    db=new Database(f.file,{timeout:0,fileMustExist:true});await prepareWindowsBackupVfsConnection(db)
    if(cut==='after-pin'){pin=await pinWindowsBackupVfsSource(db,f.control);console.log(JSON.stringify({actualSourceVfsArtifact:pin.artifact}))}
    const opened=open(f,f.file,'attributes');assert.equal(opened.opened,true);mutation=opened.session!
    const result=mutation.attempt({operation:'set-sparse',enabled:true})
    if(result.succeeded){
      assert.ok(Number(mutation.snapshot().attributes)&SPARSE)
      if(cut==='before-pin')await assert.rejects(pinWindowsBackupVfsSource(db,f.control),/BACKUP_VFS_SOURCE_KIND_REFUSED/)
      else assert.throws(()=>pin!.recheck(),/BACKUP_VFS_SOURCE_KIND_REFUSED/)
      assert.deepEqual(await fs.readFile(f.file),before)
      observe(`default-vfs-sparse-${cut}`,{...result,classification:'detected-limited-source-evidence-refused'})
    }else observe(`default-vfs-sparse-${cut}`,{...result,classification:'blocked-by-OS'})
  }finally{pin?.close();db?.close();if(mutation){mutation.attempt({operation:'set-sparse',enabled:false});mutation.close()}await f.close()}
})
