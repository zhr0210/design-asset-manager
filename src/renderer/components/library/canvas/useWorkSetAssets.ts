import {useEffect,useMemo,useState} from 'react'
import type {Asset} from '../../../stores/asset.store'
import {mapSearchAsset} from '../../../stores/asset.store'
import {requireWorkspaceClient} from '../../../workspace-client'
import type {WorkScope} from '../../../../shared/contracts/work-set.contract'
import {useHostAssetSearch} from './useHostAssetSearch'

const noChanges:readonly Asset[]=[]

/** Work-set lookup has its own scoped query; the canvas page is not the library. */
export function useWorkSetAssets(scope:WorkScope,query:string,memberIds:readonly string[],assets:Asset[],enabled=true){
 const key=JSON.stringify([scope.libraryIdentity,scope.generation]),members=JSON.stringify(memberIds)
 const search=useHostAssetSearch({state:enabled&&query.trim()?'ready':'closed',identity:scope.libraryIdentity,generation:scope.generation},query,'',[],noChanges)
 const [readback,setReadback]=useState<{key:string;assets:Asset[];error:string}>({key:'',assets:[],error:''})
 useEffect(()=>{
  let live=true
  const known=new Set(assets.map(a=>a.id)),missing=memberIds.filter(id=>!known.has(id))
  if(!missing.length){setReadback({key,assets:[],error:''});return}
  void(async()=>{
   const fetched:Asset[]=[]
   for(let offset=0;offset<missing.length;offset+=100){
    const rows=await requireWorkspaceClient().readSearchAssets({...scope,ids:missing.slice(offset,offset+100)})
    if(!live)return
    fetched.push(...rows.map(a=>mapSearchAsset(a,scope)))
   }
   if(live)setReadback({key,assets:fetched,error:''})
  })().catch(()=>{if(live)setReadback(old=>({key,assets:old.key===key?old.assets:[],error:'部分参考暂不可读；成员与草稿保留，请重开后核对。'}))})
  return()=>{live=false}
 },[key,members,assets])
 const all=useMemo(()=>[...new Map([...assets,...(readback.key===key?readback.assets:[]),...search.matches.map(m=>m.asset)].map(a=>[a.id,a])).values()],[assets,readback,key,search.matches])
 const candidates=query.trim()?search.matches.map(m=>m.asset):assets.slice(0,100)
 return {...search,assets:all,candidates:candidates.filter(a=>!memberIds.includes(a.id)),error:search.error||(readback.key===key?readback.error:'')}
}
