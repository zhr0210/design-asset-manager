import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {test} from 'node:test'
import Database from 'better-sqlite3'
import {loadWindowsBackupRuntime} from '../src/main/platform/windows-backup-native/runtime'
import {prepareWindowsBackupLifecycle,WindowsBackupPhysicalExitUnconfirmedError} from '../src/main/platform/windows-backup-lifecycle.internal'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'

await test('failed native pin plus unconfirmed close retains the shared reservation and poisons its Runtime',async()=>{
 const temporary=await fs.realpath(os.tmpdir()),control=await fs.realpath(await fs.mkdtemp(path.join(temporary,'dam-backup-source-settlement-')))
 const db=new Database(path.join(control,'library.sqlite')),admission=createVisualAdmission(),hold=admission.hold()
 db.exec('CREATE TABLE controlled(id INTEGER);INSERT INTO controlled VALUES(1);PRAGMA user_version=1')
 const original=db.prepare.bind(db)
 let pinReached=false,closeReached=false,launched=false
 let runtime:ReturnType<typeof loadWindowsBackupRuntime>|undefined
 try {
  db.prepare=((sql:string)=>{
   const statement=original(sql)
   if(sql!=='SELECT dam_windows_backup_source(?,?)')return statement
   return {pluck:()=>({get:(operation:string,parameter:string|null)=>{
    if(operation==='pin'){statement.pluck().get(operation,parameter);pinReached=true;throw Error('synthetic post-pin receipt failure')}
    if(operation==='close'){closeReached=true;throw Error('synthetic unconfirmed close')}
    return statement.pluck().get(operation,parameter)
   }})} as typeof statement
  }) as typeof db.prepare
  await assert.rejects(prepareWindowsBackupLifecycle({hold,imageBytes:db.serialize().length,signal:new AbortController().signal,
   createImage:()=>{runtime=loadWindowsBackupRuntime({bundleDirectory:path.resolve('build/windows-backup-runtime/win32-x64'),assertPermit:()=>{assert.ok(admission.inspect().materialBytes>0)}});runtime.bindSource(db,control);return db.serialize()},verifyImage:()=>{},runTarget:async()=>{launched=true}}),error=>error instanceof WindowsBackupPhysicalExitUnconfirmedError)
  assert.equal(pinReached,true);assert.equal(closeReached,true);assert.equal(launched,false)
  const charged=admission.inspect().materialBytes;assert.ok(charged>0)
  hold();admission.resume();assert.equal(admission.inspect().materialBytes,charged)
  assert.equal(runtime!.inspectReleased(),false)
 } finally {
  db.prepare=original as typeof db.prepare
  // Explicitly clean this owned injected failure. This is separate native
  // evidence; it never rewrites the original unresolved reservation as PASS.
  if(pinReached)assert.equal(db.prepare('SELECT dam_windows_backup_source(?,?)').pluck().get('close',null),1)
  db.close();hold()
  assert.equal(path.dirname(control),temporary);assert.ok(path.basename(control).startsWith('dam-backup-source-settlement-'))
  await fs.rm(control,{recursive:true})
 }
})
