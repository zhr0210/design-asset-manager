import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
import {withGuardedWindowsNativeArtifact,WindowsNativeLoadRetainedError,type WindowsNativeLoadPin} from './windows-backup-native-load'
import type {WindowsNativeQualificationArtifact} from './windows-native-qualification-build'

// Runs only in the owned isolated Electron test Host. Process exit releases
// retained native handles; no ordinary preparation receipt is produced.
const artifact=JSON.parse(process.argv[3]) as WindowsNativeQualificationArtifact
const mode=process.argv[4]
assert.ok(mode==='never-settling-afterPin'||mode==='partial-close-then-throw')
if(mode==='never-settling-afterPin'){
  let called=false
  try{
    await withGuardedWindowsNativeArtifact(artifact,{afterPin:()=>new Promise<void>(()=>{}),load:()=>{called=true},timeoutMs:1500})
    throw Error('TIMEOUT_CUT_UNEXPECTED_SUCCESS')
  }catch(error){
    assert.ok(error instanceof WindowsNativeLoadRetainedError)
    assert.match(error.message,/CALLBACK_PENDING/)
    assert.equal(called,false)
    const guardianExit=await error.guardianPhysicalExit
    await assert.rejects(withGuardedWindowsNativeArtifact(artifact,{load:()=>{}}),/PREPARATION_RETAINED_UNKNOWN/)
    console.log(JSON.stringify({cut:mode,loadCalled:false,retained:true,callbackPending:true,guardianExit,nextPreparation:'REFUSED',release:'owned test Host physical exit only'}))
  }
}else{
  const require=createRequire(import.meta.url)
  let pin:WindowsNativeLoadPin|undefined,closedCount=0
  let loaded:{closeTransferredHandles(handles:readonly string[]):void;verifyTransferredPins(pins:WindowsNativeLoadPin['hostPins'],sha256:string):unknown;verifyLoadedModulePath(path:string):true}|undefined
  try{
    await withGuardedWindowsNativeArtifact(artifact,{load:ready=>{
      pin=ready;loaded=require(artifact.path)
      assert.ok(loaded);loaded.verifyTransferredPins(ready.hostPins,artifact.artifactSha256);loaded.verifyLoadedModulePath(artifact.path)
      return loaded
    },closeTransferredHandles:handles=>{
      assert.ok(loaded)
      // Actual successful CloseHandle in this Host, then an application-level
      // exception. This does not simulate a kernel CloseHandle failure.
      loaded.closeTransferredHandles(handles.slice(0,1));closedCount=1
      throw Error('OWNED_CALLBACK_AFTER_FIRST_SUCCESSFUL_CLOSE')
    }})
    throw Error('PARTIAL_CLOSE_CUT_UNEXPECTED_SUCCESS')
  }catch(error){
    assert.ok(error instanceof WindowsNativeLoadRetainedError);assert.ok(pin);assert.ok(loaded)
    assert.equal(closedCount,1);assert.deepEqual(error.knownHostHandles,[])
    assert.doesNotMatch(error.message,/RECLAIM_REQUESTED/)
    assert.equal(error.diagnostic?.cause,'OWNED_CALLBACK_AFTER_FIRST_SUCCESSFUL_CLOSE')
    assert.ok(error.diagnostic?.phases.includes('HOST_PIN_RELEASE_UNKNOWN'))
    const guardianExit=await error.guardianPhysicalExit
    // After the guardian physically exits, every unclosed Host duplicate still
    // identifies its original object. No stale-number reclaim was attempted.
    loaded.verifyTransferredPins(pin.hostPins.slice(1),artifact.artifactSha256)
    await assert.rejects(fs.rename(path.dirname(artifact.path),path.dirname(artifact.path)+'-owned-partial-retained'),/EPERM|EBUSY|EACCES/)
    await assert.rejects(withGuardedWindowsNativeArtifact(artifact,{load:()=>{}}),/PREPARATION_RETAINED_UNKNOWN/)
    console.log(JSON.stringify({cut:mode,successfulHostCloses:closedCount,remainingHostPins:pin.hostHandles.length-closedCount,
      remainingPinsIndependentlyVerified:true,guardianDidNotReclaimOldNumbers:true,retryHandleCount:error.knownHostHandles.length,
      retained:true,guardianExit,nextPreparation:'REFUSED',ancestorRename:'REFUSED',release:'owned test Host physical exit only'}))
  }
}
