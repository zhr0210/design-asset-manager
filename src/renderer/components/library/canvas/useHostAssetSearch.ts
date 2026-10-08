import { useEffect, useRef, useState } from 'react'
import { requireWorkspaceClient } from '../../../workspace-client'
import { mapSearchAsset, type Asset } from '../../../stores/asset.store'
import type { AssetSearchIndexStatus, AssetSearchRequest,AssetColorCoverage } from '../../../../shared/contracts/asset-search.contract'
import {refreshAssetDiscoveryMatch,type AssetDiscoveryMatch} from '../../../../shared/workflows/asset-discovery.workflow'
import type { ActiveLibraryHostProjection } from '../../../../shared/contracts/active-library.contract'
import type {AssetSemanticSearchRequest,AssetSemanticSearchPage,RetrievalCoverage} from '../../../../shared/contracts/retrieval-workspace.contract'
export interface SearchOptions {mode:'lexical'|'semantic'|'hybrid';folderId?:string;example?:{assetId?:string;grant?:string};color?:AssetSearchRequest['color'];fields?:AssetSearchRequest['fields']}

export function useHostAssetSearch(authority: ActiveLibraryHostProjection, query: string, site: string,
  tags: string[], sourceChange: readonly Asset[],options:SearchOptions={mode:'lexical'}) {
  const [matches,setMatches]=useState<AssetDiscoveryMatch<Asset>[]>([]),[index,setIndex]=useState<AssetSearchIndexStatus|null>(null)
  const [total,setTotal]=useState(0),[cursor,setCursor]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [coverage,setCoverage]=useState<RetrievalCoverage|null>(null),[notice,setNotice]=useState<string|null>(null),[lane,setLane]=useState('lexical-only')
  const [colors,setColors]=useState<AssetColorCoverage|null>(null),[hasUpdates,setHasUpdates]=useState(false)
  const matchesRef=useRef(matches);matchesRef.current=matches
  const [refresh,setRefresh]=useState(0), epoch=useRef(0), current=useRef<AssetSearchRequest|AssetSemanticSearchRequest|null>(null),canceled=useRef(-1),lastScope=useRef('')
  const accepted=useRef<AssetSearchRequest|AssetSemanticSearchRequest|null>(null)
  const queryTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const key=JSON.stringify([authority.identity,authority.generation,query,site,tags,options])
  const accept=(page:Awaited<ReturnType<ReturnType<typeof requireWorkspaceClient>['searchAssetsPage']>>|AssetSemanticSearchPage)=>{
    setIndex(page.index);setTotal(page.total);setCursor(page.nextCursor);setColors(page.colors??null)
    if('coverage' in page){setCoverage(page.coverage);setNotice(page.notice);setLane(page.mode)}else{setNotice(null);setLane('lexical-only')}
  }
  useEffect(()=>{
    const seq=++epoch.current
    if(authority.state!=='ready'||!authority.identity||!authority.generation){current.current=null;accepted.current=null;setMatches([]);setCursor(null);setIndex(null);setCoverage(null);setColors(null);setNotice(null);setTotal(0);setError('');setBusy(false);return}
    const scopeKey=JSON.stringify([authority.identity,authority.generation])
    if(lastScope.current!==scopeKey){lastScope.current=scopeKey;accepted.current=null;setMatches([]);setCursor(null);setColors(null);setCoverage(null);setIndex(null);setTotal(0)}
    const lexical:AssetSearchRequest={libraryIdentity:authority.identity,generation:authority.generation,query,
      sourceSiteId:site||undefined,folderId:options.folderId,tagQueries:tags,tagScope:'includes-pending',color:options.color,fields:options.fields,limit:80}
    const request:AssetSearchRequest|AssetSemanticSearchRequest=options.example||options.mode!=='lexical'&&query.trim()?{...lexical,
      mode:options.example?'image':options.mode as 'semantic'|'hybrid',queryId:crypto.randomUUID(),imageAssetId:options.example?.assetId,externalGrant:options.example?.grant}:lexical
    current.current=request;setBusy(true);setError('');setNotice(null);setHasUpdates(false)
    const timer=setTimeout(()=>{
      queryTimer.current=null
      if(seq!==epoch.current||canceled.current===seq)return
      void ('mode' in request?requireWorkspaceClient().retrieval.query(request):requireWorkspaceClient().searchAssetsPage(request)).then(page=>{
        if(seq!==epoch.current||canceled.current===seq)return
        accepted.current=request
        setMatches(page.matches.map(m=>({asset:mapSearchAsset(m.asset,request),explanation:m.explanation})))
        accept(page)
      },e=>{if(seq===epoch.current&&canceled.current!==seq)setError(searchError(e))})
        .finally(()=>{if(seq===epoch.current){setBusy(false);if(canceled.current===seq)setNotice('查询已取消；已有结果保留。')}})
    },180)
    queryTimer.current=timer
    return()=>{clearTimeout(timer);if(queryTimer.current===timer)queryTimer.current=null;const active=current.current
      if(active&&'mode' in active&&active.queryId)void requireWorkspaceClient().retrieval.cancel(active,active.queryId).catch(()=>{});epoch.current++}
  },[key,authority.state,refresh])
  // Result membership/rank is a query snapshot. Source notifications refresh
  // only the rows already displayed; they never run another embedding query or
  // throw away a user's later pages. Library revocation still clears everything.
  useEffect(()=>{
    const request=accepted.current,seq=epoch.current,ids=matchesRef.current.map(m=>m.asset.id)
    if(!request||!ids.length)return
    let valid=true
    void(async()=>{
      const fresh=new Map<string,Asset>()
      for(let start=0;start<ids.length;start+=100){
        const rows=await requireWorkspaceClient().readSearchAssets({libraryIdentity:request.libraryIdentity,generation:request.generation,ids:ids.slice(start,start+100)})
        if(!valid||seq!==epoch.current||accepted.current!==request)return
        for(const row of rows)fresh.set(row.id,mapSearchAsset(row,request))
      }
      if(!valid||seq!==epoch.current||accepted.current!==request)return
      setMatches(old=>old.flatMap(match=>{
        if(!ids.includes(match.asset.id))return[match]
        const asset=fresh.get(match.asset.id)
        if(!asset||asset.revision!==match.asset.revision||asset.thumbnailPath!==match.asset.thumbnailPath)return[]
        const current=refreshAssetDiscoveryMatch(match,asset,request);return current?[current]:[]
      }))
      setHasUpdates(true)
    })().catch(()=>{if(valid&&seq===epoch.current)setError('当前结果刷新未完成，分页与已有内容保留。可重新查询。')})
    return()=>{valid=false}
  },[sourceChange])
  const loadMore=async()=>{
    if(busy||!cursor||!accepted.current)return
    const seq=++epoch.current,request=accepted.current
    current.current=request
    setBusy(true);setError('')
    try{
      const page=await ('mode' in request?requireWorkspaceClient().retrieval.query({...request,cursor}):requireWorkspaceClient().searchAssetsPage({...request,cursor}))
      if(seq!==epoch.current||canceled.current===seq)return
      setMatches(old=>[...new Map([...old,...page.matches.map(m=>({asset:mapSearchAsset(m.asset,request),explanation:m.explanation}))].map(m=>[m.asset.id,m])).values()])
      accept(page)
    }catch{if(seq===epoch.current)setError('查询快照已变化或到期，请重新读取结果。')}
    finally{if(seq===epoch.current){setBusy(false);if(canceled.current===seq)setNotice('查询已取消；已有结果保留。')}}
  }
  const rebuild=async()=>{
    if(busy||authority.state!=='ready')return
    const seq=epoch.current;setBusy(true);setError('')
    try{const state=await requireWorkspaceClient().rebuildSearchIndex();if(seq!==epoch.current)return;setIndex(state);setRefresh(v=>v+1)}
    catch{if(seq===epoch.current)setError('文字索引重建未完成，已有结果与素材保留。请重新读取状态。')}
    finally{if(seq===epoch.current)setBusy(false)}
  }
  const cancel=()=>{const request=current.current;if(!request||!('mode' in request)||!request.queryId)return
    const seq=epoch.current;canceled.current=seq
    if(queryTimer.current!==null){clearTimeout(queryTimer.current);queryTimer.current=null;setBusy(false);setNotice('查询已取消；已有结果保留。');return}
    setNotice('正在取消查询；已有结果保留，执行占用会在实际结束后释放。')
    void requireWorkspaceClient().retrieval.cancel(request,request.queryId).catch(e=>{if(seq===epoch.current)setError(searchError(e))})}
  return {matches,index,total,busy,error,coverage,colors,hasUpdates,notice,lane,hasMore:Boolean(cursor),loadMore,rebuild,cancel,reload:()=>setRefresh(v=>v+1)}
}
function searchError(error:unknown){const message=error instanceof Error?error.message:String(error)
  const reasons:Record<string,string>={RETRIEVAL_QUERY_TOO_LONG:'这次查询超过模型的64个词元限制。内容没有被截短，请缩短查询后再试。',
    RETRIEVAL_NOT_QUALIFIED:'图文模型尚未取得当前运行资格，文字检索仍可用。请在“AI 与模型”验证。',
    RETRIEVAL_QUERY_IMAGE_EXPIRED:'示例图授权已到期或资料库已切换，请重新选择一张图片。',
    RETRIEVAL_IMAGE_UNSUPPORTED:'此图片格式、尺寸或帧数不在当前单图范围内，没有取部分内容替代。',
    RETRIEVAL_SPACE_CHANGED:'检索模型与当前空间不一致，旧结果保留。请核对图文覆盖或选择已准备的空间。',
    LOCAL_MODEL_CHANGED:'检索文件或运行环境已变化，旧向量保留；需要重新验证当前环境。',
    AI_MEMORY_WAIT:'当前设备余量不足，等待其他任务释放资源后可重新查询。'}
  return Object.entries(reasons).find(([code])=>message.includes(code))?.[1]??'索引查询暂未完成，已有结果保留。可重新查询或核对检索覆盖。'
}
