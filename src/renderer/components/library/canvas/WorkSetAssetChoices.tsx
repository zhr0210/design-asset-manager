import React from 'react'
import type {useWorkSetAssets} from './useWorkSetAssets'

export function WorkSetAssetChoices({search,pick}:{search:ReturnType<typeof useWorkSetAssets>;pick:(id:string)=>void}){
 return <>
  {search.busy&&<p role="status">正在查找库内参考…</p>}
  {search.error&&<p role="alert">{search.error}</p>}
  <div className="work-set-choices">{search.candidates.map(a=><button type="button" key={a.id} aria-label={`添加参考 ${a.title}`} onClick={()=>pick(a.id)}>+ {a.title}</button>)}</div>
  {search.hasMore&&<button type="button" disabled={search.busy} onClick={()=>void search.loadMore()}>加载更多工作集候选</button>}
 </>
}
