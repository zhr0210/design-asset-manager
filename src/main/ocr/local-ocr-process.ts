import {spawn} from 'node:child_process'
import {isAbsolute} from 'node:path'
import {validateOcrObservation,type OcrObservation} from '../../shared/contracts/asset-ocr.contract'

type Input={python:string;runner:string;preview:Uint8Array;signal:AbortSignal;timeoutMs?:number;modelSha256?:OcrObservation['modelSha256'];measured?:(peakRamBytes:number)=>void}
/** Internal resource evidence, never serialized over IPC. A rejected request is not release proof. */
export class OcrProcessUnconfirmedError extends Error {
 constructor(readonly released:Promise<void>){super('OCR_PROCESS_EXIT_UNCONFIRMED')}
}

/** Only the held ChildProcess handle may be signalled. Injection is for isolated lifecycle tests. */
export function createLocalOcrRunner(deps:{spawn?:typeof spawn;graceMs?:number;closeMs?:number}={}){
 const blocked=new Set<OcrProcessUnconfirmedError>()
 const graceMs=deps.graceMs??250,closeMs=deps.closeMs??2000
 return function run(input:Input):Promise<OcrObservation>{
  if(blocked.size)return Promise.reject(new OcrProcessUnconfirmedError(Promise.all([...blocked].map(error=>error.released)).then(()=>{})))
  if(input.signal.aborted)return Promise.reject(Error('OCR_CANCELLED'))
  if(!isAbsolute(input.python)||!isAbsolute(input.runner)||!input.preview.length||input.preview.length>16*1024*1024)return Promise.reject(Error('OCR_INPUT_INVALID'))
  return new Promise((resolve,reject)=>{
   let settled=false,closed=false,exited=false,failure:string|undefined,size=0,stderrSize=0
   let deadline:ReturnType<typeof setTimeout>|undefined,escalation:ReturnType<typeof setTimeout>|undefined,closeDeadline:ReturnType<typeof setTimeout>|undefined
   let release!:()=>void
   const released=new Promise<void>(r=>{release=r}),chunks:Buffer[]=[]
   const child=(deps.spawn??spawn)(input.python,['-I','-B',input.runner,...(input.modelSha256?['--expected-models',JSON.stringify(input.modelSha256)]:[])],{shell:false,windowsHide:true,stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,SYSTEMROOT:process.env.SYSTEMROOT,LANG:'en_US.UTF-8',OMP_NUM_THREADS:'2'}})
   const cleanup=()=>{clearTimeout(deadline);clearTimeout(escalation);clearTimeout(closeDeadline);input.signal.removeEventListener('abort',abort);chunks.length=0}
   const finish=(error?:Error,value?:OcrObservation)=>{if(settled)return;settled=true;cleanup();if(error)reject(error);else resolve(value!)}
   const signal=(name:NodeJS.Signals)=>{if(!closed&&!exited&&child.pid){try{child.kill(name)}catch{/* Delivery is not exit evidence. The close deadline still applies. */}}}
   const awaitClose=()=>{
    if(closeDeadline)return
    closeDeadline=setTimeout(()=>{
     if(closed)return
     // Bound the transport lifetime as well. Destruction does not prove physical exit.
     child.stdin.destroy();child.stdout.destroy();child.stderr.destroy()
     const unknown=new OcrProcessUnconfirmedError(released);blocked.add(unknown)
     void released.then(()=>{blocked.delete(unknown)})
     finish(unknown)
    },graceMs+closeMs)
   }
   const fail=(code:string)=>{
    if(settled||closed||failure)return
    failure=code;chunks.length=0;clearTimeout(deadline)
    signal('SIGTERM');escalation=setTimeout(()=>signal('SIGKILL'),graceMs);awaitClose()
   }
   const abort=()=>fail('OCR_CANCELLED')
   // All listeners exist before observing abort or writing input.
   child.on('error',()=>{
    if(!child.pid){closed=true;release();finish(Error('OCR_RUNTIME_UNAVAILABLE'))}
    else fail('OCR_RUNTIME_UNAVAILABLE')
   })
   child.on('exit',()=>{exited=true;clearTimeout(escalation);awaitClose()})
   child.stderr.on('error',()=>fail('OCR_STREAM_FAILED'))
   child.stdout.on('error',()=>fail('OCR_STREAM_FAILED'))
   child.stdin.on('error',()=>fail('OCR_STREAM_FAILED'))
   child.stderr.on('data',(chunk:Buffer)=>{stderrSize+=chunk.length;if(stderrSize>1024*1024)fail('OCR_OUTPUT_TOO_LARGE')})
   child.stdout.on('data',(chunk:Buffer)=>{if(failure||settled)return;size+=chunk.length;if(size>1024*1024){fail('OCR_OUTPUT_TOO_LARGE');return}chunks.push(chunk)})
   child.on('close',code=>{
    closed=true;exited=true;release()
    if(settled)return
    if(failure){finish(Error(failure));return}
    try{
     const message=JSON.parse(Buffer.concat(chunks).toString('utf8'))
     if(code!==0||message?.ok!==true){const errors=new Set(['OCR_DEPENDENCY_MISSING','OCR_MODEL_MISSING','OCR_RUNTIME_VERSION_UNSUPPORTED','OCR_INPUT_INVALID','OCR_MODEL_CHANGED']);finish(Error(errors.has(message?.error)?message.error:'OCR_EXECUTION_FAILED'));return}
     const result=validateOcrObservation(message.value)
     if(input.measured){if(!Number.isSafeInteger(message.peakRamBytes)||message.peakRamBytes<=0)throw Error('OCR_RESOURCE_OBSERVATION_INVALID');input.measured(message.peakRamBytes)}
     finish(undefined,result)
    }catch{finish(Error('OCR_RESULT_INVALID'))}
   })
   deadline=setTimeout(()=>fail('OCR_TIMEOUT'),Math.min(120000,Math.max(1,input.timeoutMs??60000)))
   input.signal.addEventListener('abort',abort,{once:true})
   if(input.signal.aborted){abort();return}
   try{child.stdin.end(Buffer.from(input.preview))}catch{fail('OCR_STREAM_FAILED')}
  })
 }
}
/** Main-selected paths only, never Renderer-selected executables. Shared quarantine across runtime handles. */
export const runLocalOcr=createLocalOcrRunner()
