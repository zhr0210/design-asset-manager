import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {openWindowsBackupJournalSource,prepareWindowsBackupJournalVfs} from './windows-backup-journal-vfs'

/** Parent-owned synthetic process crash cut, never launched by the product. */
async function main(){
  const configuration=JSON.parse(await fs.readFile(process.argv[2],'utf8')) as {root:string;control:string;cut:'before-commit'|'after-commit'}
  const root=await fs.realpath(configuration.root),temporary=await fs.realpath(os.tmpdir())
  assert.equal(path.dirname(root),temporary);assert.ok(path.basename(root).startsWith('dam-native-target-journal-'))
  assert.equal(path.resolve(process.argv[2]),path.join(root,'journal-crash.json'))
  assert.equal(configuration.control,path.join(root,'.dam'));assert.ok(configuration.cut==='before-commit'||configuration.cut==='after-commit')
  await prepareWindowsBackupJournalVfs()
  const source=await openWindowsBackupJournalSource(configuration.control),db=source.db
  db.pragma('cache_size=1');db.pragma('cache_spill=ON')
  db.exec("BEGIN IMMEDIATE;UPDATE synthetic SET value='after';CREATE TABLE committed(marker TEXT);INSERT INTO committed VALUES('same-transaction');PRAGMA user_version=2;CREATE TABLE owned_spill(payload BLOB)")
  const insert=db.prepare('INSERT INTO owned_spill VALUES(zeroblob(10000))')
  for(let n=0;n<50;n++)insert.run()
  if(configuration.cut==='before-commit'){
    process.stdout.write('CUT before-commit\n');await new Promise<void>(resolve=>process.stdin.once('data',()=>resolve()))
  }
  db.exec('COMMIT');process.stdout.write('CUT after-commit\n')
  // Real source reopening proves COMMIT, this line only selects the kill cut.
  await new Promise<void>(resolve=>process.stdin.once('data',()=>resolve()));source.close()
}
void main().catch(error=>{console.error(error);process.exitCode=1})
