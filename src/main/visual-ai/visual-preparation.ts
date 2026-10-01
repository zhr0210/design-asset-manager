import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {VISUAL_CODEC_WORKER_SOURCE} from './visual-codec.worker'

const localRequire=createRequire(typeof __filename==='string'?__filename:import.meta.url)
export interface VisualCodecResult {jpeg:Uint8Array;pixels:number;additionalRss:number}
/** Promise settles only once this owned process has exited and all stdout has drained. */
export function prepareVisualJpeg(bytes:Uint8Array,signal:AbortSignal):Promise<VisualCodecResult>{
 if(process.platform!=='darwin'||process.arch!=='arm64')return Promise.reject(Error('VISUAL_CODEC_UNQUALIFIED'))
 if(signal.aborted)return Promise.reject(Error('VISUAL_PREPARATION_CANCELLED'))
 if(bytes.length<1||bytes.length>32*1024*1024)return Promise.reject(Error('VISUAL_SOURCE_TOO_LARGE'))
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['-e',VISUAL_CODEC_WORKER_SOURCE,String(bytes.length),localRequire.resolve('sharp')],{
   env:{ELECTRON_RUN_AS_NODE:'1'},stdio:['pipe','pipe','ignore','pipe']
  })
  let chunks:Buffer[]=[],size=0,stats='',failure='',killTimer:ReturnType<typeof setTimeout>|undefined
  const stop=(code:string)=>{if(!failure)failure=code;child.kill('SIGTERM');killTimer??=setTimeout(()=>child.kill('SIGKILL'),3000)}
  const abort=()=>stop('VISUAL_PREPARATION_CANCELLED'),timer=setTimeout(()=>stop('VISUAL_PREPARATION_TIMEOUT'),30000)
  signal.addEventListener('abort',abort,{once:true})
  child.stdout!.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>4*1024*1024){stop('VISUAL_OUTPUT_TOO_LARGE');chunks=[]}else if(!failure)chunks.push(chunk)})
  child.stdio[3]!.on('data',(chunk:Buffer)=>{if(stats.length+chunk.length>1024)stop('VISUAL_CODEC_INVALID');else stats+=chunk.toString('utf8')})
  child.stdin!.on('error',()=>stop('VISUAL_CODEC_INPUT_FAILED'))
  child.on('error',()=>{failure='VISUAL_CODEC_UNAVAILABLE'})
  child.on('close',code=>{
   clearTimeout(timer);if(killTimer)clearTimeout(killTimer);signal.removeEventListener('abort',abort)
   try{
    if(code===3){let info;try{info=JSON.parse(stats)}catch{}if(info?.error==='VISUAL_CODEC_UNQUALIFIED')throw Error('VISUAL_CODEC_UNQUALIFIED')}
    if(code!==0||failure||signal.aborted)throw Error(failure||'VISUAL_CODEC_FAILED')
    const m=JSON.parse(stats)
    if(m.sharp!=='0.34.5'||m.vips!=='8.17.3'||process.platform!=='darwin'||process.arch!=='arm64'||!Number.isFinite(m.additionalRss)||m.additionalRss<0||!Number.isSafeInteger(m.pixels)||m.pixels<1||m.pixels>50_000_000)throw Error('VISUAL_CODEC_UNQUALIFIED')
    if(m.additionalRss>bytes.length+4*m.pixels+256*1024*1024)throw Error('VISUAL_CODEC_ESTIMATE_EXCEEDED')
    if(size===0)throw Error('VISUAL_CODEC_INVALID')
    resolve({jpeg:Buffer.concat(chunks),pixels:m.pixels,additionalRss:m.additionalRss})
   }catch(error){reject(error)}finally{chunks=[]}
  })
  child.stdin!.end(bytes)
 })
}
