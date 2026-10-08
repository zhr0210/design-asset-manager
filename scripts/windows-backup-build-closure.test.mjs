import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import {windowsBackupBuildClosure} from './windows-backup-build-closure.mjs'

const actual=await windowsBackupBuildClosure()
const temporary=await fs.realpath(os.tmpdir())
const owned=await fs.realpath(await fs.mkdtemp(path.join(temporary,'dam-backup-build-closure-')))
try {
 const inputs=[...Object.keys(actual.files),'src/main/platform/windows-backup-native/source-identity.ts','node_modules/better-sqlite3/build/Release/better_sqlite3.node']
 for(const name of inputs){const to=path.join(owned,name);await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(name,to)}
 await test('build checks the exact current native source, SQLite and minimal package closure',async()=>{
  assert.deepEqual(await windowsBackupBuildClosure(owned),actual)
 })
 for(const [label,file,reason] of [
  ['changed compiled target',`build/windows-backup-runtime/win32-x64/${actual.directory}/target.exe`,/ARTIFACT_DRIFT/],
  ['changed packaged target',`build/windows-backup-runtime/package/win32-x64/${actual.directory}/target.exe`,/ARTIFACT_DRIFT/],
  ['unbuilt native source','src/main/platform/windows-backup-native/target.cs',/SOURCE_DRIFT/],
  ['different SQLite native','node_modules/better-sqlite3/build/Release/better_sqlite3.node',/SQLITE_DRIFT/]
 ])await test(`build refuses ${label}`,async()=>{
  const target=path.join(owned,file),before=await fs.readFile(target)
  try{await fs.writeFile(target,Buffer.concat([before,Buffer.from('synthetic drift')]));await assert.rejects(windowsBackupBuildClosure(owned),reason)}
  finally{await fs.writeFile(target,before)}
 })
 await test('build refuses a stale extra bundle in installer resources',async()=>{
  const stale=path.join(owned,'build/windows-backup-runtime/package/win32-x64/bundle-stale')
  await fs.mkdir(stale)
  try{await assert.rejects(windowsBackupBuildClosure(owned),/PACKAGE_CLOSURE_REFUSED/)}finally{await fs.rmdir(stale)}
 })
} finally {
 assert.equal(path.dirname(owned),temporary);assert.ok(path.basename(owned).startsWith('dam-backup-build-closure-'))
 await fs.rm(owned,{recursive:true})
}
