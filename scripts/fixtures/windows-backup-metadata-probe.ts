import assert from 'node:assert/strict'
import path from 'node:path'
import {createRequire} from 'node:module'
import {buildWindowsQualificationNative,type WindowsNativeQualificationArtifact} from './windows-native-qualification-build'
import {prepareWindowsBackupHelper,getPreparedWindowsBackupNativeLoader} from './windows-backup-helper-process'
import {withGuardedWindowsNativeArtifact,type WindowsNativeLoadReceipt} from './windows-backup-native-load'

export type WindowsBackupMetadataAccess='attributes'|'read'|'read-write'|'delete'
export interface WindowsBackupMetadataSnapshot {
  available:boolean
  win32Error:number
  access:WindowsBackupMetadataAccess
  desiredAccess:number
  shareMode:7
  sameHandle:true
  volume?:string
  file?:string
  size?:string
  links?:number
  attributes?:number
  directory?:boolean
  reparse?:boolean
  reparseTag?:number
  deletePending?:boolean
  creationTime?:string
  lastWriteTime?:string
  lastAccessTime?:string
  fullHash?:string|null
  hashUnavailable?:'DIRECTORY'|'NO_READ_DATA_ACCESS'|'SIZE_BOUND_REFUSED'
}
export type WindowsBackupMetadataOperation=
  | {operation:'set-attributes';attributes?:number}
  | {operation:'set-time'}
  | {operation:'set-sparse'|'set-compression';enabled?:boolean}
  | {operation:'zero-data';offset?:number;length?:number}
  | {operation:'write-data';offset?:number;bytes:Buffer}
  | {operation:'set-reparse'|'link'|'rename';destination:string}
  | {operation:'remove-reparse'|'delete'}
export interface WindowsBackupMetadataAttempt {
  operation:WindowsBackupMetadataOperation['operation']
  authority:'PATHNAME_CREATE_HARD_LINK'|'RETAINED_HANDLE'
  succeeded:boolean
  win32Error:number
  fsctlCode:number
  before:WindowsBackupMetadataSnapshot
  after:WindowsBackupMetadataSnapshot
  sameIdentity:boolean|null
  metadataChanged:boolean|null
  contentChanged:boolean|null
  productionQualified:false
}
interface Native {
  open(input:{root:string;target:string;access:WindowsBackupMetadataAccess;directory:boolean}):{
    opened:boolean;win32Error:number;desiredAccess:number;shareMode:7;access:WindowsBackupMetadataAccess;token?:object;snapshot?:WindowsBackupMetadataSnapshot
  }
  snapshot(token:object):WindowsBackupMetadataSnapshot
  attempt(token:object,input:WindowsBackupMetadataOperation):Omit<WindowsBackupMetadataAttempt,'sameIdentity'|'metadataChanged'|'contentChanged'>
  close(token:object):void
  verifyLoadedModulePath(expected:string):true
}
export interface WindowsBackupMetadataProbe {
  snapshot():WindowsBackupMetadataSnapshot
  attempt(input:WindowsBackupMetadataOperation):WindowsBackupMetadataAttempt
  close():void
}
export interface WindowsBackupMetadataProbeOpen {
  opened:boolean
  win32Error:number
  desiredAccess:number
  shareMode:7
  access:WindowsBackupMetadataAccess
  initial?:WindowsBackupMetadataSnapshot
  session?:WindowsBackupMetadataProbe
}
export class WindowsBackupMetadataCloseUnknownError extends Error {
  readonly retained=true
  readonly productionQualified=false
  constructor(cause:Error){super(cause.message,{cause});this.name='WindowsBackupMetadataCloseUnknownError'}
}
let loaded:Native|undefined
let preparation:Promise<Readonly<{artifact:WindowsNativeQualificationArtifact;loadReceipt:WindowsNativeLoadReceipt;productionQualified:false}>>|undefined

/** Explicit synthetic preparation, never inside a backup Runtime permit. No
 * installation or spawned competitor: all probes run in the owned test Host. */
export async function prepareWindowsBackupMetadataProbe():Promise<Readonly<{artifact:WindowsNativeQualificationArtifact;loadReceipt:WindowsNativeLoadReceipt;productionQualified:false}>> {
  preparation??=(async()=>{
    await prepareWindowsBackupHelper()
    const artifact=await buildWindowsQualificationNative({sourcePath:path.resolve('scripts/fixtures/windows-backup-metadata-probe.cpp'),outputName:'backup-metadata-probe.node',napi:true,libraries:['bcrypt.lib']})
    const loader=getPreparedWindowsBackupNativeLoader()
    const guarded=await withGuardedWindowsNativeArtifact(artifact,{
      load:pin=>{
        loader.verifyTransferredPins(pin.hostPins,artifact.artifactSha256)
        const module=createRequire(path.resolve('package.json'))(artifact.path) as Native
        assert.equal(module.verifyLoadedModulePath(artifact.path),true)
        return module
      },closeTransferredHandles:handles=>loader.closeTransferredHandles(handles)
    })
    loaded=guarded.value
    return Object.freeze({artifact:Object.freeze({...artifact}),loadReceipt:Object.freeze({...guarded.receipt}),productionQualified:false as const})
  })()
  try{return await preparation}catch(error){preparation=undefined;throw error}
}

/** A retained adversary handle with shareALL. Attribute-only probes deliberately
 * do not open an extra data-reader to manufacture hash evidence or alter sharing.
 * Absence of readable bytes is explicit UNKNOWN. Native code restricts every
 * target/destination to one exact, existing owned temporary NTFS root. */
export function openWindowsBackupMetadataProbe(input:{root:string;target:string;access:WindowsBackupMetadataAccess;directory?:boolean}):WindowsBackupMetadataProbeOpen {
  if(!loaded)throw Error('METADATA_PROBE_NOT_PREPARED')
  const native=loaded
  const result=native.open({...input,root:path.resolve(input.root),target:path.resolve(input.target),directory:input.directory??false})
  const out:WindowsBackupMetadataProbeOpen={opened:result.opened,win32Error:result.win32Error,desiredAccess:result.desiredAccess,shareMode:result.shareMode,access:result.access,initial:result.snapshot}
  if(!result.opened)return out
  assert.ok(result.token);const token=result.token;let closed=false
  const check=()=>{if(closed)throw Error('METADATA_SESSION_CLOSED')}
  out.session={
    snapshot:()=>{check();return native.snapshot(token)},
    attempt:operation=>{
      check();const result=native.attempt(token,operation),before=result.before,after=result.after
      const available=before.available&&after.available
      return {...result,
        sameIdentity:available?before.volume===after.volume&&before.file===after.file:null,
        metadataChanged:available?(['attributes','links','size','creationTime','lastWriteTime','lastAccessTime','reparseTag','deletePending'] as const).some(key=>before[key]!==after[key]):null,
        contentChanged:typeof before.fullHash==='string'&&typeof after.fullHash==='string'?before.fullHash!==after.fullHash:null
      }
    },
    close:()=>{
      check();closed=true
      try{native.close(token)}catch(error){
        if(error instanceof Error&&error.message.startsWith('METADATA_HANDLE_CLOSE_UNKNOWN'))throw new WindowsBackupMetadataCloseUnknownError(error)
        throw error
      }
    }
  }
  return out
}
