import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {build} from 'esbuild'
import Database from 'better-sqlite3'
import {openWindowsBackupJournalSource,prepareWindowsBackupJournalVfs,type WindowsBackupJournalSource} from './fixtures/windows-backup-journal-vfs'
import {inspectPreparedWindowsBackupHelper} from './fixtures/windows-backup-helper-process'

async function fixture(){
  const temporary=await fs.realpath(os.tmpdir())
  const root=await fs.realpath(await fs.mkdtemp(path.join(temporary,'dam-native-target-journal-')))
  const control=path.join(root,'.dam');await fs.mkdir(control)
  const file=path.join(control,'library.sqlite'),db=new Database(file,{timeout:0})
  db.pragma('journal_mode=DELETE');db.pragma('synchronous=FULL');db.pragma('user_version=1')
  db.exec("CREATE TABLE synthetic(id INTEGER PRIMARY KEY,value TEXT);INSERT INTO synthetic VALUES(1,'before')")
  db.close()
  return {root,control,file,temporary,close:async()=>{
    assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),temporary);assert.ok(path.basename(root).startsWith('dam-native-target-journal-'))
    await fs.rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100})
  }}
}
assert.equal(process.env.SQLITE_USE_URI,'1','This test requires SQLITE_USE_URI=1 in the owned Electron process startup environment')
await prepareWindowsBackupJournalVfs()

await test('named VFS commits on actual better-sqlite3 connection with handle-owned journal lifecycle',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    source=await openWindowsBackupJournalSource(f.control)
    assert.equal(source.bootstrapLoad.guardianPhysicalExit,true);assert.equal(source.bootstrapLoad.hostPinsReleased,true)
    assert.equal(source.bootstrapLoad.productionBootstrapQualified,false)
    const helper=inspectPreparedWindowsBackupHelper()
    console.log(JSON.stringify({journalArtifact:source.artifact,nativeLoad:source.bootstrapLoad,supervisor:{artifactSha256:helper.supervisor.artifactSha256,
      sourceSha256:helper.supervisor.sourceSha256,compilerSha256:helper.supervisor.compilerSha256}}))
    source.db.transaction(()=>{
      source!.db.exec("CREATE TABLE committed(marker TEXT);INSERT INTO committed VALUES('same-transaction');UPDATE synthetic SET value='after';PRAGMA user_version=2")
      assert.equal(source!.receipt().journalRetained,true)
    })()
    const r=source.receipt();assert.equal(r.created,1);assert.ok(r.writes>0);assert.ok(r.syncs>0);assert.equal(r.closes,1);assert.equal(r.deleted,1)
    assert.equal(r.journalRetained,false);assert.equal(r.productionQualified,false);assert.equal(r.directoryDurabilityQualified,false)
    await assert.rejects(fs.stat(f.file+'-journal'),/ENOENT/)
    source.close();source=await openWindowsBackupJournalSource(f.control,true)
    assert.equal(source.db.prepare('SELECT value FROM synthetic').pluck().get(),'after')
    assert.equal(source.db.prepare('SELECT marker FROM committed').pluck().get(),'same-transaction')
    assert.equal(source.db.pragma('user_version',{simple:true}),2)
  }finally{source?.close();await f.close()}
})

await test('rollback uses retained journal bytes and deletes the same object',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    const before=await fs.readFile(f.file);source=await openWindowsBackupJournalSource(f.control)
    assert.throws(()=>source!.db.transaction(()=>{source!.db.exec("CREATE TABLE rolled_back(marker TEXT);UPDATE synthetic SET value='temporary'");throw Error('owned rollback')})(),/owned rollback/)
    assert.equal(source.db.prepare('SELECT value FROM synthetic').pluck().get(),'before')
    assert.equal(source.db.prepare("SELECT name FROM sqlite_schema WHERE name='rolled_back'").get(),undefined)
    assert.deepEqual(await fs.readFile(f.file),before)
    const r=source.receipt();assert.equal(r.created,1);assert.equal(r.deleted,1);assert.equal(r.journalRetained,false)
  }finally{source?.close();await f.close()}
})

for(const slot of ['-journal','-wal','-shm'])for(const content of ['','owned residual'])await test(`preexisting ${slot} ${content?'nonempty':'zero byte'} is refused before source query without deletion`,async()=>{
  const f=await fixture()
  try{
    const before=await fs.readFile(f.file);await fs.writeFile(f.file+slot,content,{flag:'wx'})
    await assert.rejects(openWindowsBackupJournalSource(f.control),/JOURNAL_REGISTER_SOURCE_REFUSED/)
    assert.deepEqual(await fs.readFile(f.file),before);assert.equal(await fs.readFile(f.file+slot,'utf8'),content)
  }finally{await f.close()}
})

await test('preexisting journal hardlink is refused and independent sentinel remains byte-identical',async()=>{
  const f=await fixture()
  try{
    const sentinel=path.join(f.root,'sentinel.txt');await fs.writeFile(sentinel,'owned external sentinel',{flag:'wx'});await fs.link(sentinel,f.file+'-journal')
    const before=await fs.readFile(f.file)
    await assert.rejects(openWindowsBackupJournalSource(f.control),/JOURNAL_REGISTER_SOURCE_REFUSED/)
    assert.equal(await fs.readFile(sentinel,'utf8'),'owned external sentinel');assert.deepEqual(await fs.readFile(f.file),before)
    assert.equal((await fs.stat(sentinel)).nlink,2)
  }finally{await f.close()}
})

await test('preexisting journal directory junction is refused with no writes to its target',async()=>{
  const f=await fixture()
  try{
    const outside=path.join(f.root,'outside');await fs.mkdir(outside);const sentinel=path.join(outside,'sentinel.txt')
    await fs.writeFile(sentinel,'owned junction sentinel',{flag:'wx'});await fs.symlink(outside,f.file+'-journal','junction')
    const before=await fs.readFile(f.file)
    await assert.rejects(openWindowsBackupJournalSource(f.control),/JOURNAL_REGISTER_SOURCE_REFUSED/)
    assert.equal(await fs.readFile(sentinel,'utf8'),'owned junction sentinel');assert.deepEqual(await fs.readFile(f.file),before)
    await fs.unlink(f.file+'-journal')
  }finally{await f.close()}
})

await test('journal cannot be replaced or deleted while SQLite holds its write transaction',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    source=await openWindowsBackupJournalSource(f.control);source.db.exec("BEGIN;UPDATE synthetic SET value='held'")
    assert.equal(source.receipt().journalRetained,true)
    await assert.rejects(fs.rename(f.file+'-journal',path.join(f.control,'replacement')),/EBUSY|EPERM|EACCES/)
    await assert.rejects(fs.unlink(f.file+'-journal'),/EBUSY|EPERM|EACCES/)
    await assert.rejects(fs.writeFile(f.file+'-journal','replacement'),/EBUSY|EPERM|EACCES/)
    source.db.exec('COMMIT');assert.equal(source.receipt().deleted,1)
  }finally{if(source?.db.inTransaction)source.db.exec('ROLLBACK');source?.close();await f.close()}
})

await test('delete refusal retains exact journal after xClose and does not claim successful COMMIT',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    source=await openWindowsBackupJournalSource(f.control);source.faultDelete(true)
    source.db.exec("BEGIN;UPDATE synthetic SET value='write-before-delete'")
    assert.throws(()=>source!.db.exec('COMMIT'),/disk I\/O error/)
    const r=source.receipt();assert.equal(r.closes,1);assert.equal(r.deleted,0);assert.equal(r.journalRetained,true);assert.equal(r.reason,'JOURNAL_HANDLE_DELETE_REFUSED')
    await assert.rejects(fs.rename(f.file+'-journal',path.join(f.control,'replacement')),/EBUSY|EPERM|EACCES/)
    assert.ok((await fs.stat(f.file+'-journal')).size>0)
    // Faulted connection is closed without reusing the leftover slot. Test owns
    // the fixture; a subsequent qualification must refuse, never recover it.
    source.close();source=undefined
    const before=await fs.readFile(f.file),journal=await fs.readFile(f.file+'-journal')
    await assert.rejects(openWindowsBackupJournalSource(f.control,true),/JOURNAL_REGISTER_SOURCE_REFUSED/)
    assert.deepEqual(await fs.readFile(f.file),before);assert.deepEqual(await fs.readFile(f.file+'-journal'),journal)
  }finally{source?.close();await f.close()}
})

await test('late journal slot after registration is refused at main xOpen before source schema reads',async()=>{
  const f=await fixture()
  try{
    const before=await fs.readFile(f.file)
    await assert.rejects(openWindowsBackupJournalSource(f.control,false,async()=>{
      await fs.writeFile(f.file+'-journal','owned late collision',{flag:'wx'})
      await assert.rejects(fs.rename(f.control,path.join(f.root,'replaced-control')),/EBUSY|EPERM|EACCES/)
      await assert.rejects(fs.rename(f.file,path.join(f.control,'replaced.sqlite')),/EBUSY|EPERM|EACCES/)
    }),/unable to open database file/)
    assert.deepEqual(await fs.readFile(f.file),before);assert.equal(await fs.readFile(f.file+'-journal','utf8'),'owned late collision')
  }finally{await f.close()}
})

await test('RW main open cannot silently qualify a win32 readonly fallback',async()=>{
  const f=await fixture()
  try{
    const before=await fs.readFile(f.file);await fs.chmod(f.file,0o444)
    await assert.rejects(openWindowsBackupJournalSource(f.control),/unable to open database file/)
    assert.deepEqual(await fs.readFile(f.file),before)
    const readonly=await openWindowsBackupJournalSource(f.control,true)
    try{assert.equal(readonly.db.prepare('SELECT value FROM synthetic').pluck().get(),'before');assert.equal(readonly.receipt().created,0)}finally{readonly.close()}
  }finally{await fs.chmod(f.file,0o666);await f.close()}
})

await test('native late slot collision cannot be overwritten by journal FILE_CREATE',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    const before=await fs.readFile(f.file);source=await openWindowsBackupJournalSource(f.control);source.faultCreateCollision()
    assert.throws(()=>source!.db.exec("UPDATE synthetic SET value='must not overwrite collision'"),/unable to open database file/)
    const r=source.receipt();assert.equal(r.reason,'JOURNAL_CREATE_NEW_REFUSED');assert.equal(r.created,0);assert.equal(r.deleted,0);assert.equal(r.journalRetained,false)
    assert.deepEqual(await fs.readFile(f.file),before);assert.equal(await fs.readFile(f.file+'-journal','utf8'),'owned collision')
  }finally{source?.close();await f.close()}
})

await test('busy iterator close retains guardian and is retryable after the iterator settles',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    source=await openWindowsBackupJournalSource(f.control)
    const iterator=source.db.prepare('SELECT value FROM synthetic').iterate();assert.equal(iterator.next().done,false)
    assert.throws(()=>source!.close(),/busy/)
    assert.equal(source.db.open,true);assert.equal(source.receipt().journalRetained,false)
    await assert.rejects(fs.rename(f.control,path.join(f.root,'replaced-control')),/EBUSY|EPERM|EACCES/)
    iterator.return?.();source.close();source.close()
    await fs.rename(f.control,path.join(f.root,'released-control'));await fs.rename(path.join(f.root,'released-control'),f.control)
  }finally{source?.close();await f.close()}
})

for(const mode of ['MEMORY','OFF'])await test(`switching journal mode to ${mode} cannot bypass owned journal writes`,async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    const before=await fs.readFile(f.file);source=await openWindowsBackupJournalSource(f.control)
    // Default SQLite DEFENSIVE already refuses OFF. This test deliberately
    // uses the fixture-owned connection's exposed unsafe switch so the VFS
    // itself must still prevent a real no-journal write.
    if(mode==='OFF')source.db.unsafeMode(true)
    assert.equal(source.db.pragma(`journal_mode=${mode}`,{simple:true}),mode.toLowerCase())
    assert.throws(()=>source!.db.exec("UPDATE synthetic SET value='must not bypass journal'"),/disk I\/O error/)
    assert.equal(source.receipt().reason,'SOURCE_WRITE_WITHOUT_OWNED_JOURNAL_REFUSED')
    assert.deepEqual(await fs.readFile(f.file),before);assert.equal(source.receipt().created,0)
  }finally{source?.close();await f.close()}
})

await test('source growth beyond the 1 MiB image plus 4 MiB growth scope refuses and rolls back through owned journal',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    const before=await fs.readFile(f.file);source=await openWindowsBackupJournalSource(f.control)
    assert.throws(()=>source!.db.transaction(()=>{source!.db.exec('CREATE TABLE excessive(payload BLOB);INSERT INTO excessive VALUES(zeroblob(6000000))')})(),/database or disk is full/)
    assert.equal(source.receipt().reason,'SOURCE_BOUND_REFUSED');assert.equal(source.receipt().journalRetained,false)
    assert.equal(source.db.prepare("SELECT name FROM sqlite_schema WHERE name='excessive'").get(),undefined)
    assert.deepEqual(await fs.readFile(f.file),before)
  }finally{source?.close();await f.close()}
})

await test('session transaction bound refuses the 129th journal without changing its current source',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    source=await openWindowsBackupJournalSource(f.control)
    for(let n=0;n<128;n++)source.db.prepare('UPDATE synthetic SET value=?').run(`owned-${n}`)
    const before=await fs.readFile(f.file)
    assert.throws(()=>source!.db.exec("UPDATE synthetic SET value='beyond bound'"),/database or disk is full/)
    const r=source.receipt();assert.equal(r.created,128);assert.equal(r.deleted,128);assert.equal(r.reason,'JOURNAL_TRANSACTION_BOUND_REFUSED')
    assert.equal(r.transactionLimit,128);assert.equal(r.sourceBytesLimit,5*1024*1024);assert.equal(r.journalBytesLimit,2*1024*1024)
    assert.deepEqual(await fs.readFile(f.file),before)
  }finally{source?.close();await f.close()}
})

await test('late journal hardlink is blocked or refuses COMMIT before changing the source',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    const before=await fs.readFile(f.file);source=await openWindowsBackupJournalSource(f.control)
    source.db.exec("BEGIN;UPDATE synthetic SET value='late alias must not commit'")
    const alias=path.join(f.root,'journal-alias')
    let linked=false
    try{await fs.link(f.file+'-journal',alias);linked=true}catch(error){assert.match(String(error),/EBUSY|EPERM|EACCES/)}
    if(linked){
      assert.equal((await fs.stat(alias)).nlink,2)
      assert.throws(()=>source!.db.exec('COMMIT'),/disk I\/O error/)
      assert.ok(source.receipt().refused>0);assert.equal(source.receipt().deleted,0)
    }else source.db.exec('ROLLBACK')
    source.close();source=undefined;assert.deepEqual(await fs.readFile(f.file),before)
    console.log(JSON.stringify({lateJournalHardlink:linked?'detected-and-commit-refused':'blocked-by-sharing'}))
  }finally{source?.close();await f.close()}
})

await test('late main source hardlink refuses COMMIT before any qualified source write',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    const before=await fs.readFile(f.file);source=await openWindowsBackupJournalSource(f.control)
    source.db.exec("BEGIN;UPDATE synthetic SET value='late main alias must not commit'")
    const alias=path.join(f.root,'source-alias');await fs.link(f.file,alias);assert.equal((await fs.stat(alias)).nlink,2)
    assert.throws(()=>source!.db.exec('COMMIT'),/disk I\/O error/)
    assert.ok(source.receipt().refused>0);assert.equal(source.receipt().deleted,0)
    source.close();source=undefined
    assert.deepEqual(await fs.readFile(f.file),before);assert.deepEqual(await fs.readFile(alias),before)
  }finally{source?.close();await f.close()}
})

async function killAtCommitCut(f:Awaited<ReturnType<typeof fixture>>,cut:'before-commit'|'after-commit'){
  assert.ok(process.versions.electron)
  const require=createRequire(path.join(process.cwd(),'package.json')),outfile=path.join(f.root,'journal-crash.cjs')
  const built=await build({entryPoints:[path.resolve('scripts/fixtures/windows-backup-journal-crash.ts')],bundle:true,platform:'node',format:'cjs',target:'node20',write:false,packages:'external',logLevel:'silent',
    plugins:[{name:'existing-sqlite-binding',setup(builder){builder.onResolve({filter:/^better-sqlite3$/u},()=>({path:require.resolve('better-sqlite3'),external:true}))}}]})
  assert.equal(built.outputFiles.length,1);await fs.writeFile(outfile,built.outputFiles[0].contents,{flag:'wx'})
  const configuration=path.join(f.root,'journal-crash.json');await fs.writeFile(configuration,JSON.stringify({root:f.root,control:f.control,cut}),{flag:'wx'})
  const child=spawn(process.execPath,[outfile,configuration],{cwd:process.cwd(),env:{...process.env,ELECTRON_RUN_AS_NODE:'1',SQLITE_USE_URI:'1'},stdio:['pipe','pipe','pipe'],windowsHide:true,shell:false})
  assert.ok(child.pid);let stdout='',stderr='',closed=false
  let resolveCut!:()=>void,rejectCut!:(error:Error)=>void
  const observed=new Promise<void>((resolve,reject)=>{resolveCut=resolve;rejectCut=reject})
  child.stdout!.on('data',chunk=>{stdout+=String(chunk);if(stdout.length>8192){rejectCut(Error('JOURNAL_CRASH_OUTPUT_LIMIT'));return}if(stdout.includes(`CUT ${cut}\n`))resolveCut()})
  child.stderr!.on('data',chunk=>{stderr+=String(chunk);if(stderr.length>8192)rejectCut(Error('JOURNAL_CRASH_ERROR_LIMIT'))})
  child.once('error',rejectCut)
  const exited=new Promise<number|null>(resolve=>child.once('close',code=>{closed=true;rejectCut(Error(`JOURNAL_CRASH_EARLY_EXIT ${code}: ${stderr}`));resolve(code)}))
  const timer=setTimeout(()=>rejectCut(Error('JOURNAL_CRASH_CUT_TIMEOUT')),30000)
  try{
    await observed
    assert.equal(child.kill('SIGKILL'),true,'kill only the parent-owned Electron child')
    const code=await exited
    console.log(JSON.stringify({ownedJournalCrash:{cut,pid:child.pid,exitCode:code,actualKill:true}}))
  }finally{clearTimeout(timer);if(!closed){child.kill('SIGKILL');await exited}}
}

await test('real COMMIT-before kill leaves hot journal and readonly qualification refuses without recovery',async()=>{
  const f=await fixture()
  try{
    await killAtCommitCut(f,'before-commit')
    const main=await fs.readFile(f.file),journal=await fs.readFile(f.file+'-journal')
    assert.deepEqual(journal.subarray(0,8),Buffer.from([0xd9,0xd5,0x05,0xf9,0x20,0xa1,0x63,0xd7]),'actual spilled rollback journal is hot')
    await assert.rejects(openWindowsBackupJournalSource(f.control,true),/JOURNAL_REGISTER_SOURCE_REFUSED/)
    assert.deepEqual(await fs.readFile(f.file),main);assert.deepEqual(await fs.readFile(f.file+'-journal'),journal)
  }finally{await f.close()}
})

await test('real COMMIT-after kill reopens readonly actual result and same-transaction marker without journal',async()=>{
  const f=await fixture();let source:WindowsBackupJournalSource|undefined
  try{
    await killAtCommitCut(f,'after-commit');await assert.rejects(fs.stat(f.file+'-journal'),/ENOENT/)
    source=await openWindowsBackupJournalSource(f.control,true)
    assert.equal(source.db.prepare('SELECT value FROM synthetic').pluck().get(),'after')
    assert.equal(source.db.prepare('SELECT marker FROM committed').pluck().get(),'same-transaction')
    assert.equal(source.db.pragma('user_version',{simple:true}),2)
    assert.equal(source.db.prepare('SELECT COUNT(*) FROM owned_spill').pluck().get(),50)
    const r=source.receipt();assert.equal(r.created,0);assert.equal(r.writes,0);assert.equal(r.deleted,0)
  }finally{source?.close();await f.close()}
})
