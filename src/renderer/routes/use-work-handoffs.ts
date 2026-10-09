import {useCallback,useEffect,useRef,useState} from 'react'
import type {WorkWindowApi,WorkWindowSnapshot,WorkResult} from '../../shared/contracts/work-set.contract'
import type {WorkHandoffKind,WorkHandoffReceipt,WorkHandoffRequest} from '../../shared/contracts/work-media.contract'
import {validateWorkHandoff} from '../../shared/contracts/work-media.contract'
export interface WorkHandoffState{phase:'preparing'|'ready'|'error';kind:WorkHandoffKind;receipt?:WorkHandoffReceipt;error?:string;token:string;member:string}
const scopeKey=(s:WorkWindowSnapshot)=>[s.token,s.scope.libraryIdentity,s.scope.generation,s.set.id].join('|')
const memberKey=(s:WorkWindowSnapshot,id:string)=>{const a=s.assets.find(a=>a.id===id);return a&&!s.set.unavailableIds?.includes(id)&&s.set.assetIds.includes(id)?[a.revision,a.thumbnailRef].join('|'):null}
const failed=(error:string):WorkResult<WorkHandoffReceipt>=>({success:false,error})
/** Only explicit preparation creates copies. All controls share one in-flight/cache authority. */
export function useWorkHandoffs(api:WorkWindowApi|undefined,snapshot:WorkWindowSnapshot|null,ids:readonly string[]){
 const current=useRef({snapshot,ids});current.current={snapshot,ids}
 const live=useRef(true),pending=useRef(new Map<string,Promise<WorkResult<WorkHandoffReceipt>>>()),cache=useRef(new Map<string,WorkHandoffReceipt>()),unknown=useRef(new Set<string>()),invalidations=useRef(new Map<string,number>())
 const states=useRef(new Map<string,WorkHandoffState>()),[,redraw]=useState(0),run=useRef<{stop:boolean;key:string}|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const previousMembers=useRef(new Map<string,string>()),lastKey=useRef('');const key=snapshot?scopeKey(snapshot):''
 if(lastKey.current!==key){lastKey.current=key;states.current.clear();cache.current.clear();unknown.current.clear();invalidations.current.clear();previousMembers.current.clear();if(run.current)run.current.stop=true}
 const members=new Map<string,string>()
 if(snapshot)for(const id of ids){const member=memberKey(snapshot,id);if(member!==null)members.set(id,member)}
 for(const [id,member]of previousMembers.current)if(members.get(id)!==member){
  invalidations.current.set(id,(invalidations.current.get(id)||0)+1);states.current.delete(id)
  for(const cacheKey of cache.current.keys())if(cacheKey.startsWith(key+'|'+id+'|'))cache.current.delete(cacheKey)
 }
 previousMembers.current=members
 const valid=(s:WorkWindowSnapshot,id:string,member:string)=>{const now=current.current;return live.current&&now.snapshot&&scopeKey(now.snapshot)===scopeKey(s)&&now.ids.includes(id)&&memberKey(now.snapshot,id)===member}
 const publish=(id:string,state:WorkHandoffState)=>{states.current.set(id,state);if(live.current)redraw(n=>n+1)}
 useEffect(()=>{live.current=true;return()=>{live.current=false;if(run.current)run.current.stop=true}},[])
 const get=useCallback((id:string)=>{const s=current.current.snapshot,state=states.current.get(id);return s&&state&&current.current.ids.includes(id)&&state.token===scopeKey(s)&&state.member===memberKey(s,id)?state:undefined},[])
 const invalidate=useCallback((id:string)=>{invalidations.current.set(id,(invalidations.current.get(id)||0)+1);states.current.delete(id);if(live.current)redraw(n=>n+1)},[])
 const handoff=useCallback((raw:WorkHandoffRequest):Promise<WorkResult<WorkHandoffReceipt>>=>{
  let request:WorkHandoffRequest;try{request=validateWorkHandoff(raw)}catch(error){return Promise.resolve(failed(error instanceof Error?error.message:'交付选项无效。'))}
  const s=current.current.snapshot,id=request.assetId
  if(!api||!s||request.libraryIdentity!==s.scope.libraryIdentity||request.generation!==s.scope.generation||request.setId!==s.set.id||!current.current.ids.includes(id))return Promise.resolve(failed('此参考已失效，请重新读取工作集。'))
  const member=memberKey(s,id);if(member===null)return Promise.resolve(failed('此参考暂不可用。'))
  const cacheKey=[scopeKey(s),id,member,request.kind,request.frameId||'',JSON.stringify(request.imageTransform||null)].join('|'),version=invalidations.current.get(id)||0
  const existing=pending.current.get(cacheKey);if(existing)return existing
  if(unknown.current.has(cacheKey))return Promise.resolve(failed('上一份交付结果尚未确认；请核对保留记录，不能自动重复创建。'))
  if(request.action==='prepare'){
   const receipt=cache.current.get(cacheKey)
   if(receipt){publish(id,{phase:'ready',kind:request.kind,receipt,token:scopeKey(s),member});return Promise.resolve({success:true,value:receipt})}
  }
  if([...pending.current.keys()].some(k=>k.startsWith(scopeKey(s)+'|')))return Promise.resolve(failed('另一份副本正在准备，请等待当前结果。'))
  publish(id,{phase:'preparing',kind:request.kind,token:scopeKey(s),member})
  const task=(async()=>{
   try{
    const reply=await api.fileHandoff({token:s.token,request})
    if(!valid(s,id,member)||(invalidations.current.get(id)||0)!==version)return failed('窗口或成员已变化；已执行的副本仍保留，请在交付记录中核对。')
    if(reply.success){cache.current.set(cacheKey,reply.value);if((invalidations.current.get(id)||0)===version)publish(id,{phase:'ready',kind:request.kind,receipt:reply.value,token:scopeKey(s),member})}
    else if((invalidations.current.get(id)||0)===version)publish(id,{phase:'error',kind:request.kind,error:reply.error,token:scopeKey(s),member})
    return reply
   }catch{
    const error='交付结果尚未确认；请核对保留记录，暂不重复创建。'
    unknown.current.add(cacheKey)
    if(valid(s,id,member)&&(invalidations.current.get(id)||0)===version)publish(id,{phase:'error',kind:request.kind,error,token:scopeKey(s),member})
    return failed(error)
   }finally{pending.current.delete(cacheKey)}
  })();pending.current.set(cacheKey,task);return task
 },[api])
 const prepare=useCallback(async(targets:readonly string[])=>{
  const s=current.current.snapshot
  if(!s||run.current)return
  if(!targets.length||targets.length>64||new Set(targets).size!==targets.length){setMessage('每批请选择1至64份可用参考。');return}
  if(targets.some(id=>!current.current.ids.includes(id)||memberKey(s,id)===null)){setMessage('选中的参考包含不可用成员，请重新选择。');return}
  const batch={stop:false,key:scopeKey(s)};run.current=batch;setBusy(true);setMessage('正在依次准备独立原件副本…')
  let completed=0,errors=0
  try{for(const id of targets){if(batch.stop||current.current.snapshot&&scopeKey(current.current.snapshot)!==batch.key)break
   const reply=await handoff({...s.scope,setId:s.set.id,assetId:id,kind:'original',action:'prepare'})
   if(reply.success)completed++;else errors++
  }}finally{
   if(run.current===batch)run.current=null
   if(live.current){setBusy(false);if(current.current.snapshot&&scopeKey(current.current.snapshot)===batch.key)setMessage(`${batch.stop?'已停止后续准备':'准备结束'}：${completed}份副本已完成${errors?`，${errors}份未完成`:''}。已完成副本保留。`)}
  }
 },[handoff])
 const stop=useCallback(()=>{if(run.current){run.current.stop=true;setMessage('正在等待当前副本结果；随后停止，已完成副本保留。')}},[])
 return{get,invalidate,handoff,prepare,stop,busy,message}
}
