import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import type {WindowsBackupSourceEvidence} from '../../src/main/platform/windows-backup-source.internal'
import {launchWindowsBackupHelper} from './windows-backup-helper-process'

// Test-owned tracer only; no production caller or resource-admission grant.
export async function runNativeBackupTracer(input:{directory:string;destination?:string;mode:string;image:Buffer;afterReady?:()=>Promise<void>;onSource?:(source:WindowsBackupSourceEvidence)=>string;whileHeld?:(hash:string,recheckSource:()=>Promise<WindowsBackupSourceEvidence>)=>Promise<number>;timeoutMs?:number}) {
 const {directory,mode,image}=input
 const owned=(value:string)=>{
  const relative=path.relative(os.tmpdir(),path.resolve(value))
  assert.ok(!path.isAbsolute(relative)&&!relative.startsWith('..'+path.sep)&&relative.split(path.sep)[0].startsWith('dam-native-target-'))
 }
 owned(directory);if(input.destination)owned(input.destination)
 assert.ok(image.length<=1024*1024,'tracer image bound must precede pipe allocation')
 const timeoutMs=input.timeoutMs??20000;assert.ok(Number.isSafeInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=20000)
 const {child,completion}=await launchWindowsBackupHelper({env:{SystemRoot:process.env.SystemRoot??'C:\\Windows',WINDIR:process.env.SystemRoot??'C:\\Windows',TEMP:os.tmpdir(),TMP:os.tmpdir(),DAM_NATIVE_TARGET_DIRECTORY:directory,DAM_NATIVE_TARGET_DESTINATION:input.destination??directory,DAM_NATIVE_TARGET_MODE:mode}})
 let stdout='',stderr='',callback:Promise<void>|undefined,callbackError:unknown,callbackSettled=false,timedOut=false,pinned=false,sourceLines=0
 let sourceResolve:((source:WindowsBackupSourceEvidence)=>void)|undefined,sourceReject:((error:Error)=>void)|undefined
 const recheckSource=()=>new Promise<WindowsBackupSourceEvidence>((resolve,reject)=>{
  if(mode!=='source-hold'||sourceResolve){reject(Error('TRACER_SOURCE_RECHECK_REFUSED'));return}
  sourceResolve=resolve;sourceReject=reject;child.stdin.write(Buffer.from([2]))
 })
 child.stdin.on('error',error=>{callbackError??=error})
 child.stdout.on('data',chunk=>{
  stdout+=chunk
  if(stdout.length>16384){child.kill();return}
  const source=stdout.match(/PINNED (\{[^\r\n]+\})\r?\n/)
  if(source&&!pinned){
   pinned=true
   try{
    assert.ok(input.onSource,'source-hold requires captured operation binding')
    const binding=Buffer.from(input.onSource(JSON.parse(source[1])),'utf8');assert.ok(binding.length>0&&binding.length<=4096)
    const length=Buffer.alloc(4);length.writeInt32LE(binding.length);child.stdin.write(length);child.stdin.write(binding)
   }catch(error){callbackError=error;child.kill();child.stdin.destroy()}
  }
  const observations=[...stdout.matchAll(/SOURCE (\{[^\r\n]+\})\r?\n/g)]
  if(observations.length>sourceLines){sourceLines=observations.length;const resolve=sourceResolve;sourceResolve=undefined;sourceReject=undefined;resolve?.(JSON.parse(observations[observations.length-1][1]))}
  const held=stdout.match(/HELD ([a-f0-9]{64})\r?\n/)
  if(!callback&&(input.afterReady&&/READY\r?\n/.test(stdout)||input.whileHeld&&held)){
   callback=Promise.resolve().then(async()=>{
    const byte=held&&input.whileHeld?await input.whileHeld(held[1],recheckSource):(await input.afterReady!(),1)
    child.stdin.end(Buffer.from([byte]))
   }).catch(error=>{callbackError=error;child.kill();child.stdin.destroy()}).finally(()=>{callbackSettled=true})
  }
 })
 child.stderr.on('data',chunk=>{stderr+=chunk;if(stderr.length>8192)child.kill()})
 let childError: unknown
 const closed=new Promise<number|null>(resolve=>{child.on('error',error=>{childError=error});child.on('close',code=>{sourceReject?.(Error('TRACER_SOURCE_CLOSED'));sourceResolve=undefined;sourceReject=undefined;resolve(code)})})
 const timeout=setTimeout(()=>{timedOut=true;child.kill();child.stdin.destroy()},timeoutMs)
 if(mode==='mutate'||mode==='remove')child.stdin.end()
 else{const length=Buffer.alloc(4);length.writeInt32LE(image.length);child.stdin.write(length);child.stdin.write(image);if(!input.afterReady&&!input.whileHeld)child.stdin.end()}
 try{
  const code=await closed
  const resource=await completion.catch(()=>{if(timedOut||callbackError) return undefined;throw Error('TRACER_RESOURCE_RECEIPT_REFUSED '+stderr)})
  // Physical close is authoritative. A user hook can remain pending forever;
  // never await that hook after the owned child has already exited.
  if(timedOut)throw Error('TRACER_CHILD_TIMEOUT_AFTER_CLOSE')
  if(childError)throw childError
  if(callback&&!callbackSettled)throw Error('TRACER_CALLBACK_PENDING_AFTER_CLOSE')
  if(callbackError)throw callbackError
  assert.equal(code,0,stderr);assert.equal(stderr,'')
  const result=JSON.parse(stdout.replace(/READY\r?\n/,'').replace(/HELD [a-f0-9]{64}\r?\n/,'').replace(/(?:PINNED|SOURCE) \{[^\r\n]+\}\r?\n/g,'').trim())
  return typeof result==='boolean'?result:{...result,Resource:resource}
 }finally{clearTimeout(timeout)}
}
