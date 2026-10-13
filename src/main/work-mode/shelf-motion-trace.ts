import {writeFile,rename} from 'node:fs/promises'
import {join} from 'node:path'
import {DAM_BUILD_IDENTITY} from '../../shared/build-identity.generated'
const keys=['phase','motionId','gestureId','transitionId','nativeAt','eventAt','status','reason','x','y','width','height','docked','presentation','edge','progress','deltaX','screenMinX','screenMaxX','frameSource','duration','timing','targetX','targetY','targetWidth','targetHeight'] as const
/** Diagnostic I/O never runs synchronously in a pointer/pipe callback. */
export function createShelfMotionTrace(root:string){
 const records:Record<string,unknown>[]=[];let timer:ReturnType<typeof setTimeout>|undefined,running:Promise<void>|undefined,dirty=false
 const flush=async()=>{
  clearTimeout(timer);timer=undefined
  if(running){await running;if(dirty)return flush();return}
  if(!dirty)return
  dirty=false;const snapshot=JSON.stringify(records)
  running=(async()=>{const temporary=join(root,'motion-trace.next.json');await writeFile(temporary,snapshot,{mode:0o600});await rename(temporary,join(root,'motion-trace.json'))})().catch(()=>{}).finally(()=>{running=undefined})
  await running;if(dirty)return flush()
 }
 return{record(value:Record<string,unknown>){
  const row:Record<string,unknown>={traceVersion:2,at:Date.now(),hostAt:Number(process.hrtime.bigint())/1e6,buildId:DAM_BUILD_IDENTITY.buildId}
  for(const key of keys){const v=value[key];if(typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean')row[key]=v;else if(typeof v==='string')row[key]=v.slice(0,80)}
  const sample=String(row.phase).endsWith('dragged'),last=records.at(-1)
  if(sample&&last&&last.phase===row.phase&&Number(row.hostAt)-Number(last.hostAt)<16)records[records.length-1]=row
  else records.push(row)
  while(records.length>2048){const sampleAt=records.findIndex(r=>String(r.phase).endsWith('dragged'));records.splice(sampleAt>=0?sampleAt:0,1)}
  dirty=true;if(!timer){timer=setTimeout(()=>{void flush()},100);timer.unref()}
 },flush}
}
