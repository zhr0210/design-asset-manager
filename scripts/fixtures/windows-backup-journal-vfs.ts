import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import Database from 'better-sqlite3'
import {buildWindowsQualificationNative, type WindowsNativeQualificationArtifact} from './windows-native-qualification-build'
import {prepareWindowsBackupHelper,getPreparedWindowsBackupNativeLoader} from './windows-backup-helper-process'
import {withGuardedWindowsNativeArtifact,type WindowsNativeLoadReceipt} from './windows-backup-native-load'

const source = path.resolve('scripts/fixtures/windows-backup-journal-vfs.c')
const headers = ['sqlite3.h','sqlite3ext.h'].map(name => path.resolve('node_modules/better-sqlite3/deps/sqlite3',name))
const sha = (bytes:Buffer) => createHash('sha256').update(bytes).digest('hex')
let prepared: (WindowsNativeQualificationArtifact & {headersSha256:string}) | undefined
let preparation: Promise<void> | undefined

export async function prepareWindowsBackupJournalVfs(): Promise<void> {
  preparation ??= (async () => {
    await prepareWindowsBackupHelper()
    const bytes = await Promise.all(headers.map(file => fs.readFile(file)))
    const directory = await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-journal-headers-'))
    await Promise.all(bytes.map((value,index) => fs.writeFile(path.join(directory,path.basename(headers[index])),value,{flag:'wx'})))
    const artifact = await buildWindowsQualificationNative({sourcePath:source,outputName:'dam-journal.dll',includeDirectories:[directory]})
    prepared = {...artifact,headersSha256:sha(Buffer.concat(bytes))}
  })()
  try {await preparation} catch(error) {preparation=undefined;throw error}
}
export interface WindowsBackupJournalReceipt {
  created:number;reads:number;writes:number;syncs:number;closes:number;deleted:number;refused:number
  journalRetained:boolean;reason:string;productionQualified:false;directoryDurabilityQualified:false
  mainCloseUnconfirmed:boolean;sourceBytesLimit:number;journalBytesLimit:number;transactionLimit:number
}
export interface WindowsBackupJournalSource {
  readonly db:Database.Database
  readonly artifact:Readonly<{artifactSha256:string;sourceSha256:string;compilerSha256:string;headersSha256:string}>
  readonly bootstrapLoad:WindowsNativeLoadReceipt
  receipt():WindowsBackupJournalReceipt
  /** Deliberate test fault. Does not modify process-wide SQLite configuration. */
  faultDelete(enabled:boolean):void
  faultCreateCollision():void
  close():void
}

/** Own-process tracer only. SQLITE_USE_URI=1 must be set before this process
 * imports better-sqlite3. The named VFS is never made SQLite's default. */
export async function openWindowsBackupJournalSource(control:string,readonly=false,beforeOpen?:()=>Promise<void>):Promise<WindowsBackupJournalSource> {
  assert.equal(process.env.SQLITE_USE_URI,'1','Start an owned test process with SQLITE_USE_URI=1 before SQLite loads')
  const artifact=prepared
  if(!artifact)throw Error('JOURNAL_VFS_NOT_PRECOMPILED')
  const [sourceBytes,outputBytes,...headerBytes]=await Promise.all([fs.readFile(source),fs.readFile(artifact.path),...headers.map(file=>fs.readFile(file))])
  if(sha(sourceBytes)!==artifact.sourceSha256 || sha(outputBytes)!==artifact.artifactSha256 || sha(Buffer.concat(headerBytes))!==artifact.headersSha256)
    throw Error('JOURNAL_VFS_PRECOMPILED_INPUT_CHANGED')
  const bootstrap=new Database(':memory:')
  let db:Database.Database|undefined
  try {
    const native=getPreparedWindowsBackupNativeLoader()
    const guarded=await withGuardedWindowsNativeArtifact(artifact,{
      load:pin=>{native.verifyTransferredPins(pin.hostPins,artifact.artifactSha256);bootstrap.loadExtension(artifact.path)},
      closeTransferredHandles:handles=>native.closeTransferredHandles(handles)
    })
    const file=path.resolve(control,'library.sqlite')
    const name=String(bootstrap.prepare("SELECT dam_windows_backup_journal('register',?)").pluck().get(file))
    assert.match(name,/^dam-journal-[0-9a-fA-F]+$/u)
    await beforeOpen?.()
    const uri=pathToFileURL(file);uri.searchParams.set('vfs',name)
    db=new Database(uri.href,{readonly,fileMustExist:true,timeout:0})
    // This first source query occurs after the named VFS has bound main.
    if(db.pragma('journal_mode',{simple:true})!=='delete')throw Error('JOURNAL_VFS_DELETE_MODE_REFUSED')
    db.pragma('synchronous=FULL');if(readonly)db.pragma('query_only=ON')
    const owned=db
    let closed=false
    const receipt=()=>JSON.parse(String(bootstrap.prepare("SELECT dam_windows_backup_journal('receipt',NULL)").pluck().get())) as WindowsBackupJournalReceipt
    return {db:owned,artifact:{artifactSha256:artifact.artifactSha256,sourceSha256:artifact.sourceSha256,
      compilerSha256:artifact.compilerSha256,headersSha256:artifact.headersSha256},
    bootstrapLoad:guarded.receipt,
    receipt:()=>{assert.equal(closed,false,'Journal source already closed');return receipt()},
    faultDelete:enabled=>{assert.equal(closed,false);bootstrap.prepare("SELECT dam_windows_backup_journal('fault-delete',?)").get(Number(enabled))},
    faultCreateCollision:()=>{assert.equal(closed,false);bootstrap.prepare("SELECT dam_windows_backup_journal('fault-create-collision',1)").get()},
    close:()=>{if(!closed){if(owned.open)owned.close();if(receipt().mainCloseUnconfirmed)throw Error('JOURNAL_SOURCE_PHYSICAL_CLOSE_UNCONFIRMED_RETAINED');bootstrap.close();closed=true}}}
  }catch(error){if(db?.open)db.close();bootstrap.close();throw error}
}
