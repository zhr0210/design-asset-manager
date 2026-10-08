import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import path from 'node:path'

const run=promisify(execFile)
const query=String.raw`
$ErrorActionPreference='Stop'
$ownedId=[int]::Parse($env:DAM_OWNED_CODEC_PID)
$owned=Get-Process -Id $ownedId
# Open and retain the process handle; check creation identity before reading its memory.
$retainedHandle=$owned.Handle
$created=([DateTimeOffset]$owned.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds()
if ($created -lt [long]$env:DAM_CODEC_LAUNCH_START -or $created -gt [long]$env:DAM_CODEC_LAUNCH_END -or $owned.HasExited) { exit 1 }
$owned.Refresh()
$helper=Get-Process -Id $PID
$helper.Refresh()
[pscustomobject]@{pid=$owned.Id;created=$created;peak=$owned.PeakWorkingSet64;current=$owned.WorkingSet64;helperPeak=$helper.PeakWorkingSet64}|ConvertTo-Json -Compress
`
export interface OwnedWindowsLaunch {pid:number;startedAfter:number;startedBefore:number}
/** Covers the fixed helper's bounded serialization/exit after its last observation. */
export const WINDOWS_PEAK_FINISH_ALLOWANCE = 128*1024*1024
export function validateOwnedWindowsPeakRecord(data:any,launch:OwnedWindowsLaunch):{peak:number;helperPeak:number} {
 if(data.pid!==launch.pid||!Number.isSafeInteger(data.created)||data.created<launch.startedAfter||data.created>launch.startedBefore||
  ![data.peak,data.current,data.helperPeak].every(value=>Number.isSafeInteger(value)&&value>0)||data.peak<data.current)throw Error('VISUAL_CODEC_ESTIMATE_EXCEEDED')
 return{peak:data.peak,helperPeak:data.helperPeak}
}
/** The caller keeps its own child alive until this query has settled. No unrelated process inventory. */
export async function readOwnedWindowsProcessMemory(launch:OwnedWindowsLaunch):Promise<{rssBytes:number;peakRamBytes:number;helperPeak:number}> {
 if(process.platform!=='win32'||!Number.isSafeInteger(launch.pid)||launch.pid<1||
  !Number.isSafeInteger(launch.startedAfter)||!Number.isSafeInteger(launch.startedBefore)||launch.startedBefore<launch.startedAfter)throw Error('VISUAL_CODEC_ESTIMATE_EXCEEDED')
 try{
  const systemRoot=process.env.SystemRoot??'C:\\Windows'
  const {stdout}=await run(path.join(systemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-Command',query],{
   env:{SystemRoot:systemRoot,WINDIR:systemRoot,DAM_OWNED_CODEC_PID:String(launch.pid),DAM_CODEC_LAUNCH_START:String(launch.startedAfter),DAM_CODEC_LAUNCH_END:String(launch.startedBefore)},windowsHide:true,timeout:10000,maxBuffer:2048
  })
  const data=JSON.parse(stdout.trim())
  const validated=validateOwnedWindowsPeakRecord(data,launch)
  return{rssBytes:data.current,peakRamBytes:validated.peak,helperPeak:validated.helperPeak}
 }catch{throw Error('VISUAL_CODEC_ESTIMATE_EXCEEDED')}
}
export async function readOwnedWindowsProcessPeak(launch:OwnedWindowsLaunch):Promise<{peak:number;helperPeak:number}> {
 const value=await readOwnedWindowsProcessMemory(launch)
 return{peak:value.peakRamBytes,helperPeak:value.helperPeak}
}
