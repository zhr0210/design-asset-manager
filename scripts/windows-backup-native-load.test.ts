import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {test} from 'node:test'
import {spawnSync} from 'node:child_process'
import Database from 'better-sqlite3'
import {buildWindowsQualificationNative} from './fixtures/windows-native-qualification-build'
import {withGuardedWindowsNativeArtifact,WindowsNativeLoadRetainedError,type WindowsNativeLoadPin} from './fixtures/windows-backup-native-load'

const require=createRequire(import.meta.url)
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')
const build=(source:string,outputName:string,napi=false)=>buildWindowsQualificationNative({sourcePath:path.resolve(source),outputName,napi,
  libraries:['bcrypt.lib',...(napi?['psapi.lib']:[])],includeDirectories:napi?[]:[path.resolve('node_modules/better-sqlite3/deps/sqlite3')]})
const native=await build('scripts/fixtures/windows-backup-helper-supervisor.cpp','guarded-load-supervisor.node',true)
const dll=await build('scripts/fixtures/windows-backup-vfs-extension.c','guarded-load-vfs.dll')
const fresh=await build('scripts/fixtures/windows-backup-vfs-extension.c','guarded-load-fresh.dll')
interface NativeLoader {
  closeTransferredHandles(handles:readonly string[]):void
  verifyTransferredPins(pins:WindowsNativeLoadPin['hostPins'],sha256:string):{hostPinsMatched:true;leafSha256:string}
  verifyLoadedModulePath(expected:string):true
}
let loader:NativeLoader
const close=(handles:readonly string[])=>loader.closeTransferredHandles(handles)

await test('OS managed in-memory preparation bootstrap permits first NAPI load and independently verifies Host duplicates',async context=>{
  const guarded=await withGuardedWindowsNativeArtifact(native,{load:pin=>{
    loader=require(native.path)
    assert.deepEqual(loader.verifyTransferredPins(pin.hostPins,native.artifactSha256),{hostPinsMatched:true,leafSha256:native.artifactSha256})
    assert.equal(loader.verifyLoadedModulePath(native.path),true)
    return loader
  },closeTransferredHandles:handles=>loader?loader.closeTransferredHandles(handles):false})
  assert.equal(guarded.value,loader);assert.equal(guarded.receipt.artifactSha256,native.artifactSha256)
  assert.equal(guarded.receipt.hostHandlePins,true);assert.equal(guarded.receipt.hostPinsReleased,true);assert.equal(guarded.receipt.guardianPhysicalExit,true)
  assert.equal(guarded.receipt.guardianStartupHardLimited,false);assert.equal(guarded.receipt.productionBootstrapQualified,false)
  assert.equal(guarded.receipt.namespaceMetadataQualified,false);assert.equal(guarded.receipt.dependencyClosureQualified,false)
  assert.equal(guarded.receipt.signedDistributionQualified,false);context.diagnostic(JSON.stringify(guarded.receipt))
})

await test('SQLite first DLL load shares verified source handles and registers the exact entrypoint',async context=>{
  const db=new Database(':memory:')
  try{
    const guarded=await withGuardedWindowsNativeArtifact(dll,{load:pin=>{
      assert.equal(loader.verifyTransferredPins(pin.hostPins,dll.artifactSha256).hostPinsMatched,true)
      db.loadExtension(dll.path,'sqlite3_damvfspin_init')
      return db.prepare("SELECT name FROM pragma_function_list WHERE name='dam_windows_backup_vfs'").pluck().get()
    },closeTransferredHandles:close})
    assert.equal(guarded.value,'dam_windows_backup_vfs');context.diagnostic(JSON.stringify(guarded.receipt))
  }finally{db.close()}
})

await test('never-loaded owned DLL and its ancestry reject writes and replacement while loader still reads',async()=>{
  const db=new Database(':memory:')
  try{
    await withGuardedWindowsNativeArtifact(fresh,{afterPin:async()=>{
      await assert.rejects(fs.writeFile(fresh.path,'owned mutation'),/EPERM|EBUSY|EACCES/)
      await assert.rejects(fs.rename(fresh.path,fresh.path+'.owned-moved'),/EPERM|EBUSY|EACCES/)
      await assert.rejects(fs.rename(path.dirname(fresh.path),path.dirname(fresh.path)+'-owned-moved'),/EPERM|EBUSY|EACCES/)
    },load:pin=>{loader.verifyTransferredPins(pin.hostPins,fresh.artifactSha256);db.loadExtension(fresh.path,'sqlite3_damvfspin_init')},closeTransferredHandles:close})
    assert.equal(sha(await fs.readFile(fresh.path)),fresh.artifactSha256)
  }finally{db.close()}
})

await test('changed expected SHA refuses before load and releases all preparation pins',async()=>{
  let called=false
  await assert.rejects(withGuardedWindowsNativeArtifact({...dll,artifactSha256:'0'.repeat(64)},{load:()=>{called=true}}),/GUARDIAN_SHA_REFUSED/)
  assert.equal(called,false)
})

await test('same-byte hardlink is refused before any native load',async()=>{
  const link=dll.path+'.owned-link';let called=false
  await fs.link(dll.path,link)
  try{await assert.rejects(withGuardedWindowsNativeArtifact(dll,{load:()=>{called=true}}),/GUARDIAN_LINKS_REFUSED/);assert.equal(called,false)}finally{await fs.unlink(link)}
})

await test('same-byte ancestry junction is refused before load and restored without touching outside data',async()=>{
  const directory=path.dirname(dll.path),saved=directory+'-owned-junction-cut';let called=false,moved=false,junction=false
  try{
    await fs.rename(directory,saved);moved=true
    await fs.symlink(saved,directory,'junction');junction=true
    await assert.rejects(withGuardedWindowsNativeArtifact(dll,{load:()=>{called=true}}),/GUARDIAN_REPARSE_REFUSED|GUARDIAN_NT_OPEN_REFUSED/);assert.equal(called,false)
  }finally{
    if(junction){
      // Remove only the checked Windows directory junction, never its target.
      assert.equal((await fs.lstat(directory)).isSymbolicLink(),true)
      assert.equal(path.resolve(await fs.readlink(directory)),path.resolve(saved))
      await fs.rmdir(directory)
    }
    if(moved)await fs.rename(saved,directory)
  }
})

await test('actual guardian death leaves Host file pins intact through native load, then fails the preparation receipt',async context=>{
  const killed=await build('scripts/fixtures/windows-backup-vfs-extension.c','guarded-death-vfs.dll')
  const db=new Database(':memory:');let actualExit:unknown,loaded=false
  try{
    await assert.rejects(withGuardedWindowsNativeArtifact(killed,{afterPin:async pin=>{
      process.kill(pin.guardianPid);actualExit=await pin.guardianPhysicalExit
      await assert.rejects(fs.writeFile(killed.path,'owned mutation after guardian death'),/EPERM|EBUSY|EACCES/)
      await assert.rejects(fs.rename(path.dirname(killed.path),path.dirname(killed.path)+'-owned-moved'),/EPERM|EBUSY|EACCES/)
    },load:pin=>{loader.verifyTransferredPins(pin.hostPins,killed.artifactSha256);db.loadExtension(killed.path,'sqlite3_damvfspin_init');loaded=true},closeTransferredHandles:close}),/GUARDIAN_FINISH_REFUSED/)
    assert.equal(loaded,true);context.diagnostic(JSON.stringify({guardianActualExit:actualExit,hostPinsPersisted:true,receipt:'REFUSED'}))
    const saved=path.dirname(killed.path)+'-owned-released';await fs.rename(path.dirname(killed.path),saved);await fs.rename(saved,path.dirname(killed.path))
  }finally{db.close()}
})

await test('wrong Host duplicate identity and actual native module path both refuse without closing unrelated handles',async()=>{
  await assert.rejects(withGuardedWindowsNativeArtifact(dll,{load:pin=>{
    const altered=pin.hostPins.map((value,index)=>index+1===pin.hostPins.length?{...value,identity:{...value.identity,file:(BigInt(value.identity.file)+1n).toString()}}:value)
    loader.verifyTransferredPins(altered,dll.artifactSha256)
  },closeTransferredHandles:close}),/LOAD_PIN_IDENTITY_MISMATCH/)
  assert.throws(()=>loader.verifyLoadedModulePath(dll.path),/LOAD_MODULE_PATH_MISMATCH/)
})

await test('explicit unavailable closer makes no Host attempt and allows one guardian reclaim',async()=>{
  await assert.rejects(withGuardedWindowsNativeArtifact(dll,{load:()=>{throw Error('OWNED_LOAD_REFUSED')},closeTransferredHandles:()=>false}),/OWNED_LOAD_REFUSED/)
})

await test('numeric libuv EXLOCK blocks first loader access instead of solving the verify-to-load gap',async()=>{
  const negative=await build('scripts/fixtures/windows-backup-helper-supervisor.cpp','exlock-negative-supervisor.node',true)
  const handle=await fs.open(negative.path,0x10000000)
  try{assert.equal(sha(await handle.readFile()),negative.artifactSha256);assert.throws(()=>require(negative.path),/being used by another process/)}finally{await handle.close()}
  assert.equal(typeof require(negative.path).verifyTransferredPins,'function')
})

await test('never-settling preparation hook times out without loading or releasing its Host pins',async context=>{
  const result=spawnSync(process.execPath,[path.resolve('scripts/run-ts-test.mjs'),path.resolve('scripts/fixtures/windows-native-load-timeout.ts'),JSON.stringify(dll),'never-settling-afterPin'],{
    cwd:process.cwd(),env:{SystemRoot:process.env.SystemRoot??'C:\\Windows',WINDIR:process.env.WINDIR??'C:\\Windows',TEMP:process.env.TEMP,TMP:process.env.TMP,ELECTRON_RUN_AS_NODE:'1'},windowsHide:true,encoding:'utf8',timeout:15000})
  assert.equal(result.error,undefined);assert.equal(result.status,0);assert.equal(result.signal,null)
  const evidence=JSON.parse(result.stdout.trim());assert.equal(evidence.loadCalled,false);assert.equal(evidence.retained,true);assert.equal(evidence.callbackPending,true)
  context.diagnostic(JSON.stringify(evidence))
})

await test('one actual Host handle close followed by callback exception never retries the old table',async context=>{
  const result=spawnSync(process.execPath,[path.resolve('scripts/run-ts-test.mjs'),path.resolve('scripts/fixtures/windows-native-load-timeout.ts'),JSON.stringify(native),'partial-close-then-throw'],{
    cwd:process.cwd(),env:{SystemRoot:process.env.SystemRoot??'C:\\Windows',WINDIR:process.env.WINDIR??'C:\\Windows',TEMP:process.env.TEMP,TMP:process.env.TMP,ELECTRON_RUN_AS_NODE:'1'},windowsHide:true,encoding:'utf8',timeout:15000})
  assert.equal(result.error,undefined);assert.equal(result.status,0);assert.equal(result.signal,null)
  const evidence=JSON.parse(result.stdout.trim());assert.equal(evidence.successfulHostCloses,1);assert.equal(evidence.remainingPinsIndependentlyVerified,true)
  assert.equal(evidence.guardianDidNotReclaimOldNumbers,true);assert.equal(evidence.retryHandleCount,0);assert.equal(evidence.retained,true)
  // spawnSync proves the owned child Host has physically exited. Its retained
  // ancestor pins now release, independently of its earlier UNKNOWN state.
  const directory=path.dirname(native.path),released=directory+'-owned-partial-released'
  await fs.rename(directory,released);await fs.rename(released,directory)
  context.diagnostic(JSON.stringify({...evidence,postHostPhysicalExitAncestorRename:'PASS'}))
})

await test('missing native closer after actual guardian death retains pins and blocks later preparation',async context=>{
  const owned=await build('scripts/fixtures/windows-backup-vfs-extension.c','guarded-unknown-vfs.dll')
  let observed:WindowsNativeLoadPin|undefined,error:WindowsNativeLoadRetainedError|undefined
  try{
    await assert.rejects(withGuardedWindowsNativeArtifact(owned,{afterPin:async pin=>{observed=pin;process.kill(pin.guardianPid);await pin.guardianPhysicalExit},load:()=>{throw Error('OWNED_NO_NATIVE_CLOSER')}}),value=>{
      assert.ok(value instanceof WindowsNativeLoadRetainedError);error=value;return /HOST_PINS_OR_PHYSICAL_EXIT_UNKNOWN/.test(value.message)
    })
    assert.ok(observed);assert.ok(error);assert.equal(error.retained,true)
    await assert.rejects(fs.rename(path.dirname(owned.path),path.dirname(owned.path)+'-owned-retained'),/EPERM|EBUSY|EACCES/)
    await assert.rejects(withGuardedWindowsNativeArtifact(owned,{load:()=>{}}),/PREPARATION_RETAINED_UNKNOWN/)
    context.diagnostic(JSON.stringify({retained:true,knownHandleCount:error.knownHostHandles.length,nextPreparation:'REFUSED'}))
  }finally{
    // Explicit test-only cleanup after independent same-object validation. The
    // fixture remains fail-closed; this intervention does not grant a receipt.
    if(observed){loader.verifyTransferredPins(observed.hostPins,owned.artifactSha256);loader.closeTransferredHandles(observed.hostHandles)}
  }
})
