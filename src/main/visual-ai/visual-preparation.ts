import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {VISUAL_CODEC_WORKER_SOURCE} from './visual-codec.worker'
import {requireVisualCodecQualification,isVisualCodecRuntimeQualified} from './visual-codec-qualification.internal'
import {readOwnedWindowsProcessPeak,WINDOWS_PEAK_FINISH_ALLOWANCE} from '../platform/windows-process-memory.internal'
import type {Writable} from 'node:stream'

const localRequire=createRequire(typeof __filename==='string'?__filename:import.meta.url)
export interface VisualCodecResult {jpeg:Uint8Array;pixels:number;additionalRss:number}
/** Promise settles only once this owned process has exited and all stdout has drained. */
export async function prepareVisualJpeg(bytes:Uint8Array,signal:AbortSignal):Promise<VisualCodecResult>{
 if(signal.aborted)throw Error('VISUAL_PREPARATION_CANCELLED')
 if(bytes.length<1||bytes.length>32*1024*1024)throw Error('VISUAL_SOURCE_TOO_LARGE')
 await requireVisualCodecQualification()
 if(signal.aborted)throw Error('VISUAL_PREPARATION_CANCELLED')
 return new Promise((resolve,reject)=>{
  const startedAfter=Date.now()
  const child=spawn(process.execPath,['-e',VISUAL_CODEC_WORKER_SOURCE,String(bytes.length),localRequire.resolve('sharp')],{
   env:{ELECTRON_RUN_AS_NODE:'1',...(process.platform==='win32'?{SystemRoot:process.env.SystemRoot??'C:\\Windows'}:{})},stdio:['pipe','pipe','ignore','pipe','pipe'],windowsHide:true
  })
  const startedBefore=Date.now()
  let chunks:Buffer[]=[],size=0,stats='',failure='',killTimer:ReturnType<typeof setTimeout>|undefined
  let sampling:Promise<void>=Promise.resolve(),sampled=false,closed=false,windowsAdditionalRss:number|undefined
  const stop=(code:string)=>{if(!failure)failure=code;if(closed)return;child.kill('SIGTERM');killTimer??=setTimeout(()=>child.kill('SIGKILL'),3000)}
  const abort=()=>stop('VISUAL_PREPARATION_CANCELLED'),timer=setTimeout(()=>stop('VISUAL_PREPARATION_TIMEOUT'),30000)
  signal.addEventListener('abort',abort,{once:true})
  child.stdout!.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>4*1024*1024){stop('VISUAL_OUTPUT_TOO_LARGE');chunks=[]}else if(!failure)chunks.push(chunk)})
  child.stdio[3]!.on('data',(chunk:Buffer)=>{
   if(stats.length+chunk.length>1024){stop('VISUAL_CODEC_INVALID');return}
   stats+=chunk.toString('utf8')
   if(process.platform==='win32'&&stats.includes('\n')&&!sampled){
    sampled=true
    sampling=(async()=>{
     const measured=JSON.parse(stats),peak=await readOwnedWindowsProcessPeak({pid:child.pid!,startedAfter,startedBefore})
     if(!Number.isSafeInteger(measured.baseline)||measured.baseline<1||peak.peak<measured.baseline)throw Error('VISUAL_CODEC_ESTIMATE_EXCEEDED')
     windowsAdditionalRss=peak.peak-measured.baseline+peak.helperPeak+WINDOWS_PEAK_FINISH_ALLOWANCE
     if(!failure&&!signal.aborted&&!closed)(child.stdio[4] as Writable).end(Buffer.from([1]))
    })().catch(()=>stop('VISUAL_CODEC_ESTIMATE_EXCEEDED'))
   }
  })
  child.stdio[4]!.on('error',()=>stop('VISUAL_CODEC_FAILED'))
  child.stdin!.on('error',()=>stop('VISUAL_CODEC_INPUT_FAILED'))
  child.on('error',()=>{failure='VISUAL_CODEC_UNAVAILABLE'})
  child.on('close',async code=>{
   closed=true
   clearTimeout(timer);if(killTimer)clearTimeout(killTimer);signal.removeEventListener('abort',abort)
   await sampling
   try{
    if(code===3){let info;try{info=JSON.parse(stats)}catch{}if(info?.error==='VISUAL_CODEC_UNQUALIFIED')throw Error('VISUAL_CODEC_UNQUALIFIED')}
    if(code!==0||failure||signal.aborted)throw Error(failure||'VISUAL_CODEC_FAILED')
    const m=JSON.parse(stats)
    if(!isVisualCodecRuntimeQualified({platform:process.platform,arch:process.arch,node:process.versions.node,electron:process.versions.electron,modules:process.versions.modules,sharp:m.sharp,vips:m.vips}))throw Error('VISUAL_CODEC_UNQUALIFIED')
    if(process.platform==='win32')m.additionalRss=windowsAdditionalRss
    // Invalid resource evidence is unsafe, rather than a capability refusal.
    if(!Number.isFinite(m.additionalRss)||m.additionalRss<0||!Number.isSafeInteger(m.pixels)||m.pixels<1||m.pixels>50_000_000)throw Error('VISUAL_CODEC_ESTIMATE_EXCEEDED')
    if(m.additionalRss>bytes.length+4*m.pixels+256*1024*1024)throw Error('VISUAL_CODEC_ESTIMATE_EXCEEDED')
    if(size===0)throw Error('VISUAL_CODEC_INVALID')
    resolve({jpeg:Buffer.concat(chunks),pixels:m.pixels,additionalRss:m.additionalRss})
   }catch(error){reject(error)}finally{chunks=[]}
  })
  child.stdin!.end(bytes)
 })
}
