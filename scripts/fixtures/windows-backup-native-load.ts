import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createHash} from 'node:crypto'
import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process'
import type {WindowsNativeQualificationArtifact} from './windows-native-qualification-build'

const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')
const guardianSource=path.resolve('scripts/fixtures/windows-backup-native-load-guardian.ps1')
const osRoot='C:\\Windows'
const guardianExecutable=path.join(osRoot,'System32/WindowsPowerShell/v1.0/powershell.exe')
// Keep the Windows command line short. The exact captured guardian source is
// sent as bounded base64 on stdin, parsed in memory, then dot-sourced in this
// command's scope. It is not an external pathname or user-provided script.
const memoryBootstrap="$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$s=[Console]::In.ReadLine();if($null-eq $s -or $s.Length-gt 131072){exit 91};$b=[Convert]::FromBase64String($s);if($b.Length-gt 65536){exit 92};. ([ScriptBlock]::Create([Text.Encoding]::UTF8.GetString($b)))"
const maxOutput=65536
let retainedUnknown=false

interface FileIdentity {volume:string;file:string;size:string;links:number;attributes:number}
export interface WindowsNativeLoadPin {
  readonly hostHandles:readonly string[]
  readonly hostPins:readonly {handle:string;directory:boolean;identity:Readonly<FileIdentity>}[]
  readonly artifact:Readonly<{name:string;sha256:string;identity:Readonly<FileIdentity>;ancestors:number}>
  readonly guardianPid:number
  readonly hostCreationTime:string
  readonly guardianPhysicalExit:Promise<{code:number|null;signal:NodeJS.Signals|null}>
}
export interface WindowsNativeLoadReceipt {
  protocol:1
  preparationOnly:true
  osBootstrapTrustedInstallationAssumed:true
  reflectionEmitInMemory:true
  guardianPhysicalExit:true
  guardianExitCode:0
  hostPinsReleased:true
  hostHandlePins:true
  guardianStartupHardLimited:false
  namespaceMetadataQualified:false
  dependencyClosureQualified:false
  signedDistributionQualified:false
  productionBootstrapQualified:false
  artifactSha256:string
  sourceSha256:string
  compilerSha256:string
  guardianScriptSha256:string
  memoryBootstrapSha256:string
  guardianExecutableSha256:string
  hostExecutableSha256:string
  hostPid:number
  hostCreationTime:string
  hostHandleCount:number
  sourceFile:Readonly<FileIdentity>
}
export class WindowsNativeLoadRetainedError extends Error {
  readonly retained=true
  constructor(message:string,readonly knownHostHandles:readonly string[],readonly guardianPhysicalExit:Promise<unknown>,readonly diagnostic?:Readonly<{phases:readonly string[];cause:string}>) {super(message);this.name='WindowsNativeLoadRetainedError'}
}
interface GuardianMessage {phase:string;[key:string]:unknown}
const decimal=(value:unknown):value is string=>typeof value==='string'&&/^[1-9][0-9]{0,19}$/.test(value)
function identity(value:unknown,directory:boolean):FileIdentity {
  const info=value as FileIdentity
  if(!info||!decimal(info.volume)||!decimal(info.file)||typeof info.size!=='string'||!/^\d{1,20}$/.test(info.size)||
    !Number.isInteger(info.links)||info.links<1||!Number.isInteger(info.attributes)||info.attributes<0||
    (info.attributes&0x400)!==0||((info.attributes&0x10)!==0)!==directory||(!directory&&info.links!==1))throw Error('NATIVE_LOAD_IDENTITY_REFUSED')
  return {volume:info.volume,file:info.file,size:info.size,links:info.links,attributes:info.attributes}
}
function validateReady(message:GuardianMessage,artifact:WindowsNativeQualificationArtifact,pid:number,guardianPhysicalExit:WindowsNativeLoadPin['guardianPhysicalExit']):WindowsNativeLoadPin {
  const input=message as any
  if(input.phase!=='PINNED'||input.noAddType!==true||input.hostHandlePins!==true||input.host?.pid!==process.pid||
    input.host?.parentPidMatched!==true||input.host?.executableMatched!==true||!decimal(input.host.creationTime)||
    !Array.isArray(input.artifacts)||input.artifacts.length!==1||!Array.isArray(input.hostHandles)||input.hostHandles.length<2||input.hostHandles.length>128||
    input.hostHandles.some((item:unknown)=>!decimal(item))||new Set(input.hostHandles).size!==input.hostHandles.length||
    !Array.isArray(input.hostPins)||input.hostPins.length!==input.hostHandles.length)throw Error('NATIVE_LOAD_GUARDIAN_READY_REFUSED')
  const item=input.artifacts[0]
  if(item.name!==path.basename(artifact.path)||item.sha256!==artifact.artifactSha256||item.finalPathMatches!==true||item.genericRead!==true||item.shareReadOnly!==true||item.noDeleteSharing!==true||
    !Number.isInteger(item.ancestors)||item.ancestors<1||item.ancestors>64)throw Error('NATIVE_LOAD_GUARDIAN_ARTIFACT_REFUSED')
  const pins=input.hostPins.map((pin:any,index:number)=>{
    if(pin.handle!==input.hostHandles[index]||typeof pin.directory!=='boolean')throw Error('NATIVE_LOAD_HOST_PINS_REFUSED')
    return Object.freeze({handle:pin.handle,directory:pin.directory,identity:Object.freeze(identity(pin.identity,pin.directory))})
  })
  const file=identity(item.identity,false),leaf=pins[pins.length-1]
  if(leaf.directory||(['volume','file','size','links','attributes'] as const).some(key=>leaf.identity[key]!==file[key]))throw Error('NATIVE_LOAD_HOST_LEAF_MISMATCH')
  return Object.freeze({hostHandles:Object.freeze([...input.hostHandles]),hostPins:Object.freeze(pins),artifact:Object.freeze({name:item.name,sha256:item.sha256,identity:Object.freeze(file),ancestors:item.ancestors}),guardianPid:pid,hostCreationTime:input.host.creationTime,guardianPhysicalExit})
}

/** Test preparation only. The OS-installed PowerShell/CLR bootstrap is an
 * explicit trust precondition. Its captured script uses in-memory Reflection
 * Emit, never a freshly compiled DLL. Host duplicates retain the file pins if
 * the guardian disappears. This does not qualify all namespace metadata, DLL
 * dependencies, distribution signing, or production resource admission. */
export async function withGuardedWindowsNativeArtifact<T>(artifact:WindowsNativeQualificationArtifact,input:{
  load:(pin:WindowsNativeLoadPin)=>T
  afterPin?:(pin:WindowsNativeLoadPin)=>void|Promise<void>
  /** Qualification fault cuts may shorten, never extend, the 30s ceiling. */
  timeoutMs?:number
  /** Private release diagnosis only: synchronously retain a queried handle to
   * this exact newly spawned child. It grants no permission to alter the child
   * or its files. Exceptions still take the ordinary guarded cleanup path;
   * a thenable is UNKNOWN and can never extend release or Runtime admission. */
  observeOwnedGuardian?:(pid:number)=>void
  /** Owned retained-pipe handle values only; called before requesting guardian
   * reclamation. Never repeat it after an uncertain partial cross-process close. */
  closeTransferredHandles?:(handles:readonly string[])=>void|false
}):Promise<{value:T;receipt:WindowsNativeLoadReceipt}> {
  assert.equal(process.platform,'win32');assert.equal(process.arch,'x64')
  const timeoutMs=input.timeoutMs??30000
  if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw Error('NATIVE_LOAD_TIMEOUT_BOUND_REFUSED')
  if(retainedUnknown)throw Error('NATIVE_LOAD_PREPARATION_RETAINED_UNKNOWN')
  if((process.env.SystemRoot??osRoot).toLowerCase()!==osRoot.toLowerCase())throw Error('NATIVE_LOAD_OS_ROOT_REFUSED')
  const artifactPath=path.resolve(artifact.path),temporary=path.resolve(os.tmpdir())+path.sep
  if(!artifactPath.toLowerCase().startsWith((temporary+'dam-native-qualification-build-').toLowerCase())||artifactPath.includes('\0')||
    !/^[a-f0-9]{64}$/.test(artifact.artifactSha256)||!/^[a-f0-9]{64}$/.test(artifact.sourceSha256)||!/^[a-f0-9]{64}$/.test(artifact.compilerSha256))throw Error('NATIVE_LOAD_ARTIFACT_SCOPE_REFUSED')
  const [script,bootstrapBytes,hostBytes]=await Promise.all([fs.readFile(guardianSource),fs.readFile(guardianExecutable),fs.readFile(process.execPath)])
  if(script.length>65536)throw Error('NATIVE_LOAD_GUARDIAN_SOURCE_BOUND_REFUSED')
  // The installed OS executable is the explicit bootstrap root. A file hash is
  // evidence of this installation, not a claim of signed-loader qualification.
  const child:ChildProcessWithoutNullStreams=spawn(guardianExecutable,['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(memoryBootstrap,'utf16le').toString('base64')],{
    cwd:path.join(osRoot,'System32'),windowsHide:true,env:{SystemRoot:osRoot,WINDIR:osRoot,TEMP:os.tmpdir(),TMP:os.tmpdir(),PSModulePath:path.join(osRoot,'System32/WindowsPowerShell/v1.0/Modules')},stdio:['pipe','pipe','pipe']})
  const messages:GuardianMessage[]=[]
  let stderr='',stdout='',outputBytes=0,settled=false,childFailure:Error|undefined
  let resolveReady!:(value:GuardianMessage)=>void,rejectReady!:(error:Error)=>void
  const first=new Promise<GuardianMessage>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject})
  void first.catch(()=>{})
  const completion=new Promise<{code:number|null;signal:NodeJS.Signals|null}>(resolve=>child.once('close',(code,signal)=>{settled=true;resolve({code,signal});if(!messages.length)rejectReady(childFailure??Error('NATIVE_LOAD_GUARDIAN_EXIT_BEFORE_READY'))}))
  const fail=(reason:Error)=>{childFailure??=reason;rejectReady(reason);child.kill()}
  child.once('error',fail)
  child.stdin.on('error',error=>{childFailure??=error})
  child.stderr.on('data',(bytes:Buffer)=>{outputBytes+=bytes.length;if(outputBytes>maxOutput)fail(Error('NATIVE_LOAD_GUARDIAN_OUTPUT_LIMIT'));else stderr+=bytes.toString('utf8')})
  child.stdout.on('data',(bytes:Buffer)=>{
    outputBytes+=bytes.length;if(outputBytes>maxOutput){fail(Error('NATIVE_LOAD_GUARDIAN_OUTPUT_LIMIT'));return}
    stdout+=bytes.toString('utf8')
    for(let newline;(newline=stdout.indexOf('\n'))>=0;){
      const line=stdout.slice(0,newline).trim();stdout=stdout.slice(newline+1)
      try{const value=JSON.parse(line) as GuardianMessage;if(!value||typeof value.phase!=='string')throw Error('NATIVE_LOAD_GUARDIAN_MESSAGE_REFUSED');messages.push(value);if(messages.length===1)resolveReady(value)}catch(error){fail(error as Error)}
    }
  })
  let rejectDeadline!:(error:Error)=>void
  const deadline=new Promise<never>((_resolve,reject)=>{rejectDeadline=reject});void deadline.catch(()=>{})
  const timeout=setTimeout(()=>{const error=Error('NATIVE_LOAD_GUARDIAN_TIMEOUT');rejectDeadline(error);fail(error)},timeoutMs)
  const request=JSON.stringify({protocol:1,artifacts:[{path:artifactPath,sha256:artifact.artifactSha256}],hostPid:process.pid,hostExecutable:process.execPath})
  if(request.length>32768){clearTimeout(timeout);fail(Error('NATIVE_LOAD_REQUEST_LIMIT'));await completion;throw Error('NATIVE_LOAD_REQUEST_LIMIT')}
  let pin:WindowsNativeLoadPin|undefined,value!:T,originalFailure:unknown,hostClosed=false,reclaimRequested=false,cleanupUnknown=false,hookPending=false,asyncLoadUnknown=false
  try{
    if(input.observeOwnedGuardian){
      if(!child.pid)throw Error('NATIVE_LOAD_GUARDIAN_PID_MISSING')
      const observation=input.observeOwnedGuardian(child.pid) as unknown
      if(observation&&typeof (observation as {then?:unknown}).then==='function'){
        hookPending=true;void Promise.resolve(observation).catch(()=>{})
        throw Error('NATIVE_LOAD_ASYNC_OBSERVER_REFUSED')
      }
    }
    child.stdin.write(script.toString('base64')+'\n'+request+'\n')
    const ready=await Promise.race([first,deadline])
    if(ready.phase==='REFUSED')throw Error('NATIVE_LOAD_GUARDIAN_REFUSED:'+String(ready.reason??'UNKNOWN'))
    if(!child.pid)throw Error('NATIVE_LOAD_GUARDIAN_PID_MISSING')
    pin=validateReady(ready,artifact,child.pid,completion)
    if(input.afterPin){
      hookPending=true
      const hook=Promise.resolve().then(()=>input.afterPin!(pin!)).finally(()=>{hookPending=false});void hook.catch(()=>{})
      await Promise.race([hook,deadline])
    }
    value=input.load(pin)
    if(value&&typeof (value as {then?:unknown}).then==='function'){asyncLoadUnknown=true;void Promise.resolve(value).catch(()=>{});throw Error('NATIVE_LOAD_ASYNC_LOAD_REFUSED')}
  }catch(error){originalFailure=error}
  if(pin&&input.closeTransferredHandles&&!hookPending&&!asyncLoadUnknown){
    try{hostClosed=input.closeTransferredHandles(pin.hostHandles)!==false}catch(error){originalFailure??=error;retainedUnknown=true;cleanupUnknown=true}
  }
  if(!settled){
    // A live guardian can reclaim when first-load failed and no native closer
    // exists. No Host closer is called after this request: partial reclamation
    // followed by death leaves unknown numeric handles, never a retryable list.
    reclaimRequested=!!pin&&!hostClosed&&!cleanupUnknown&&!hookPending&&!asyncLoadUnknown
    child.stdin.end(cleanupUnknown||hookPending||asyncLoadUnknown?'ABANDON_UNKNOWN\n':hostClosed?'HOST_CLOSED\n':'RECLAIM\n')
  }
  const closed=await Promise.race([completion,new Promise<undefined>(resolve=>{const guard=setTimeout(()=>resolve(undefined),5000);void completion.then(()=>clearTimeout(guard))})])
  clearTimeout(timeout)
  const releaseReady=messages.some(item=>item.phase==='RELEASE_READY'&&item.sameHandleRecheck===true&&item.hostPinsReleased===true)
  const pinsClosed=hostClosed||messages.some(item=>item.phase==='HOST_PINS_CLOSED')
  const uncertainTransfer=!pin&&messages.some(item=>item.phase==='HOST_PIN_RELEASE_UNKNOWN')
  if(!closed||(!pinsClosed&&!!child.pid)||uncertainTransfer||cleanupUnknown||hookPending||asyncLoadUnknown){
    retainedUnknown=true
    throw new WindowsNativeLoadRetainedError('NATIVE_LOAD_HOST_PINS_OR_PHYSICAL_EXIT_UNKNOWN'+(reclaimRequested?'_RECLAIM_REQUESTED':'')+(hookPending?'_CALLBACK_PENDING':'')+(asyncLoadUnknown?'_ASYNC_LOAD_PENDING':''),reclaimRequested||cleanupUnknown||hookPending||asyncLoadUnknown?[]:pin?.hostHandles??[],completion,{phases:messages.map(item=>item.phase),cause:originalFailure instanceof Error?originalFailure.message:String(originalFailure??'UNKNOWN')})
  }
  if(originalFailure)throw originalFailure
  if(!pin||closed.code!==0||closed.signal!==null||stderr||childFailure||!releaseReady)throw Error('NATIVE_LOAD_GUARDIAN_FINISH_REFUSED')
  return {value,receipt:{protocol:1,preparationOnly:true,osBootstrapTrustedInstallationAssumed:true,reflectionEmitInMemory:true,guardianPhysicalExit:true,guardianExitCode:0,hostPinsReleased:true,hostHandlePins:true,
    guardianStartupHardLimited:false,namespaceMetadataQualified:false,dependencyClosureQualified:false,signedDistributionQualified:false,productionBootstrapQualified:false,
    artifactSha256:artifact.artifactSha256,sourceSha256:artifact.sourceSha256,compilerSha256:artifact.compilerSha256,guardianScriptSha256:sha(script),memoryBootstrapSha256:sha(Buffer.from(memoryBootstrap)),guardianExecutableSha256:sha(bootstrapBytes),hostExecutableSha256:sha(hostBytes),hostPid:process.pid,hostCreationTime:pin.hostCreationTime,hostHandleCount:pin.hostHandles.length,sourceFile:pin.artifact.identity}}
}
