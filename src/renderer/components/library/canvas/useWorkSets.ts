import { requireWorkspaceClient } from '../../../workspace-client'
import {useUIStore} from '../../../stores/ui.store'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {ActiveLibraryHostProjection} from '../../../../shared/contracts/active-library.contract'
import type {WorkSetCatalog,WorkSetWrite} from '../../../../shared/contracts/work-set.contract'
export interface WorkSetModel{scope:{libraryIdentity:string;generation:string};catalog:WorkSetCatalog|null;loading:boolean;busy:boolean;error:string;refresh:()=>Promise<void>;write:(command:WorkSetWrite['command'],upgrade?:boolean)=>Promise<WorkSetCatalog>;open:(id:string)=>Promise<void>;restore:()=>Promise<void>;recover:()=>Promise<void>;hideLibrary:()=>Promise<void>}
export function useWorkSets(authority:ActiveLibraryHostProjection,assetsEpoch:unknown):WorkSetModel{
 const theme=useUIStore(s=>s.theme)
 const key=authority.state==='ready'?JSON.stringify([authority.identity,authority.generation]):'',current=useRef(key);current.current=key
 const epoch=useRef(0),lifetime=useRef(0),catalogRef=useRef<WorkSetCatalog|null>(null),busyRef=useRef(false)
 const [view,setView]=useState<{key:string;catalog:WorkSetCatalog|null;loading:boolean;error:string}>({key:'',catalog:null,loading:false,error:''}),[busy,setBusy]=useState(false)
 const scope={libraryIdentity:authority.identity!,generation:authority.generation!}
 const refresh=useCallback(async()=>{const seq=++epoch.current;if(!key){catalogRef.current=null;setView({key,catalog:null,loading:false,error:''});return}setView(v=>({key,catalog:v.key===key?v.catalog:null,loading:true,error:''}));try{const api=requireWorkspaceClient()?.workSets;if(!api)throw Error('工作集服务不可用。');const r=await api.read({libraryIdentity:authority.identity!,generation:authority.generation!});if(current.current!==key||epoch.current!==seq)return;if(!r.success)throw Error(r.error);catalogRef.current=r.value;setView({key,catalog:r.value,loading:false,error:''})}catch(e){if(current.current===key&&epoch.current===seq)setView(v=>({...v,loading:false,error:e instanceof Error?e.message:'无法读取工作集。'}))}},[key])
 useEffect(()=>{lifetime.current++;busyRef.current=false;setBusy(false);catalogRef.current=null;return()=>{lifetime.current++;epoch.current++}},[key])
 useEffect(()=>{void refresh()},[refresh,assetsEpoch])
 useEffect(()=>{const api=requireWorkspaceClient()?.workSets;return api?.onChanged(()=>{void refresh()})},[refresh])
 const action=async(operation:(api:any)=>Promise<any>)=>{if(!key||busyRef.current)throw Error('请等待当前操作完成。');const version=lifetime.current;busyRef.current=true;setBusy(true);try{const api=requireWorkspaceClient()?.workSets;if(!api)throw Error('工作集服务不可用。');const r=await operation(api);if(current.current!==key||lifetime.current!==version)throw Error('素材库已切换。');if(!r.success)throw Error(r.error);await refresh();return r.value}catch(e){if(current.current===key&&lifetime.current===version)setView(v=>({...v,error:e instanceof Error?e.message:'工作集操作失败。'}));throw e}finally{if(lifetime.current===version){busyRef.current=false;setBusy(false)}}}
 return{scope,catalog:view.key===key?view.catalog:null,loading:view.key!==key||view.loading,busy,error:view.key===key?view.error:'',refresh,write:async(command,upgrade=false)=>{const c=catalogRef.current;if(!c)throw Error('请先读取工作集。');return action(api=>api.write({...scope,sessionToken:c.sessionToken,allowUpgrade:upgrade,command}))},open:id=>action(api=>api.open({...scope,id,theme})),restore:()=>action(api=>api.restore({...scope,theme})),recover:()=>action(api=>api.recover()),hideLibrary:()=>action(api=>api.hideLibrary())}
}
