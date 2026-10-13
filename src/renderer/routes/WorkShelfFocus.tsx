import React,{useEffect,useMemo,useRef,useState} from 'react'
import type {WorkWindowApi,WorkWindowSnapshot} from '../../shared/contracts/work-set.contract'
import type {ActiveLibraryAssetProjection} from '../../shared/contracts/active-library.contract'
import type {VisualAiApi,VisualAiResponse} from '../../shared/contracts/visual-ai.contract'
import type {OcrApi,OcrResponse} from '../../shared/contracts/asset-ocr.contract'
import type {MeasuredPreviewColors} from '../../shared/contracts/library-organization.contract'
import type {Asset} from '../stores/asset.store'
import {FocusView} from '../components/gallery/FocusView'
import {LibraryDetails} from '../components/library/canvas/LibraryDetails'
import {DedicatedOcrPanel} from '../components/library/canvas/DedicatedOcrPanel'
import VisualAiPanel from '../components/asset/VisualAiPanel'
import {createNotebookSession} from '../components/library/canvas/notebook-session'
import {connectTransitionParticipant} from '../workspace-transition-participant'
import './work-shelf-focus.css'

const assetView=(a:ActiveLibraryAssetProjection):Asset=>({...a,width:a.width??0,height:a.height??0,fileSize:a.fileSize??0,fileType:a.fileType??'',tags:[...a.tags],tagAliases:a.tagAliases?[...a.tagAliases]:undefined,filePath:'',thumbnailPath:'',sourcePageUrl:'',originalUrl:'',aiTagStatus:'',aiTaggedAt:'',aiPromptStatus:'',aiPrompt:a.visualAi?.prompt??'',aiCaptionIsUserEdited:a.aiCaptionIsUserEdited?1:0,aiAnalysisStatus:'',aiAnalysisJson:'',lastTagUpdatedAt:''})
export function WorkShelfFocus({snapshot,api}:{snapshot:WorkWindowSnapshot;api:WorkWindowApi}) {
 const [dark,setDark]=useState(()=>matchMedia('(prefers-color-scheme: dark)').matches)
 useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)'),changed=()=>setDark(media.matches);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed)},[])
 const [id,setId]=useState(snapshot.focusAssetId??snapshot.set.assetIds[0]),[asset,setAsset]=useState<Asset|null>(()=>{const first=snapshot.assets.find(a=>a.id===(snapshot.focusAssetId??snapshot.set.assetIds[0]));return first?assetView(first):null}),[palette,setPalette]=useState<MeasuredPreviewColors>(),[error,setError]=useState(''),[promptDraft,setPromptDraft]=useState('')
 const switchSerial=useRef(0),prepared=useRef(new Map<string,Promise<{asset:Asset;image:HTMLImageElement}>>()),previewDimensions=useRef(new Map<string,{w:number;h:number}>())
 const snapshotRef=useRef(snapshot);snapshotRef.current=snapshot
 const state=useRef({busy:false});const [refresh,setRefresh]=useState(0)

 const src=(assetId:string)=>`dam-preview://preview/${[snapshot.scope.libraryIdentity,snapshot.scope.generation,assetId].map(encodeURIComponent).join('/')}`
 const member=useMemo(()=>async<T,>(operation:string,input?:unknown):Promise<T>=>{
   const reply=await api.member?.({token:snapshot.token,assetId:id,operation,input});if(!reply?.success)throw Error(reply?.error??'当前窗口未提供此操作。');return reply.value as T
 },[api,snapshot.token,id])
 useEffect(()=>{let live=true;setError('');void member<ActiveLibraryAssetProjection>('details').then(a=>{if(live)setAsset(assetView(a))}).catch(e=>{if(live)setError(e.message)});void member<MeasuredPreviewColors>('colors').then(p=>{if(live)setPalette(p)}).catch(()=>{});return()=>{live=false}},[member,refresh,snapshot.set.revision])
 const visual=useMemo<VisualAiApi>(()=>{
   const reply=async<T,>(op:string,input?:unknown):Promise<VisualAiResponse<T>>=>{try{return{ok:true,value:await member<T>(op,input)}}catch(e){return{ok:false,error:e instanceof Error?e.message:'操作未完成'}}}
   return{backends:()=>reply('ai-backends'),prepare:q=>reply('ai-prepare',{backendId:q.backendId,model:q.model,purpose:q.purpose}),discardReview:receipt=>reply('ai-discard',{receipt}),run:receipt=>reply('ai-run',{receipt}),inspect:id=>reply('ai-inspect',{id}),cancel:id=>reply('ai-cancel',{id}),results:()=>reply('ai-results'),confirmTag:q=>reply('ai-confirm-tag',{evidenceId:q.evidenceId,tag:q.tag})}
 },[member])
 const ocr=useMemo<OcrApi>(()=>{
   const reply=async<T,>(op:string,input?:unknown):Promise<OcrResponse<T>>=>{try{return{ok:true,value:await member<T>(op,input)}}catch(e){return{ok:false,error:e instanceof Error?e.message:'操作未完成'}}}
   return{status:()=>reply('ocr-status'),configure:async()=>{await api.act({token:snapshot.token,kind:'configure-ai'});return{ok:false,error:'请在已打开的AI与模型界面选择本地OCR环境。'}},deactivate:async()=>({ok:false,error:'请从主应用管理OCR环境。'}),read:()=>reply('ocr-read'),prepare:()=>reply('ocr-prepare'),run:receipt=>reply('ocr-run',{receipt}),cancel:()=>reply('ocr-cancel'),correct:q=>reply('ocr-correct',{sessionToken:q.sessionToken,expectedRevision:q.expectedRevision,evidenceId:q.evidenceId,text:q.text}),onChanged:()=>()=>{},onRuntimeChanged:()=>()=>{}}
 },[member])
 const notebook=useMemo(()=>{
   const session=createNotebookSession(snapshot.scope,()=>({notebookRead:q=>api.notebookRead({token:snapshot.token,assetId:q.assetId}),notebookSave:q=>api.notebookSave({token:snapshot.token,request:q})}))
   const dirty=()=>void api.act({token:snapshot.token,kind:'notes-dirty',dirty:session.hasUnsaved()})
   return{...session,hold:(books:Parameters<typeof session.hold>[0])=>{session.hold(books);dirty()},setTransient:(pending:boolean)=>{session.setTransient?.(pending);dirty()},save:async(...args:Parameters<typeof session.save>)=>{state.current.busy=true;try{await session.save(...args)}finally{state.current.busy=false;dirty()}}}
 },[snapshot.token,api])
 useEffect(()=>()=>notebook.dispose(),[notebook])
 useEffect(()=>connectTransitionParticipant(()=>notebook.hasTransient()||state.current.busy,async()=>{
   if(notebook.hasTransient())throw Error('标注尚未结束')
   const books=notebook.load();for(const assetId of Object.keys(books))if(notebook.dirty(assetId))await notebook.save(books,assetId,false)
 }),[notebook])
 const close=async()=>{
   if(notebook.hasTransient()||state.current.busy){setError('请结束当前标注或等待保存。');return}
   try{const books=notebook.load();for(const assetId of Object.keys(books))if(notebook.dirty(assetId))await notebook.save(books,assetId,false)
     const reply=await api.act({token:snapshot.token,kind:'close-focus'});if(!reply.success)setError(reply.error)
   }catch(e){setError(e instanceof Error?e.message:'笔记未保存，预览保持。')}
 }
 const prepareImage=(nextId:string)=>{
   const current=snapshotRef.current,projection=current.assets.find(a=>a.id===nextId)
   if(!projection||current.set.unavailableIds.includes(nextId))return Promise.reject(Error('素材当前不可用，现有预览保留。'))
   const key=JSON.stringify([current.scope,nextId,projection.revision,projection.thumbnailRef])
   const existing=prepared.current.get(key);if(existing)return existing
   const task=(async()=>{
     const reply=await api.member?.({token:current.token,assetId:nextId,operation:'details'})
     if(!reply?.success)throw Error(reply?.error??'素材信息暂不可用，现有预览保留。')
     const image=new Image();image.src=src(nextId);await image.decode()
     previewDimensions.current.set(nextId,{w:image.naturalWidth,h:image.naturalHeight})
     return{asset:assetView(reply.value as ActiveLibraryAssetProjection),image}
   })()
   prepared.current.set(key,task)
   while(prepared.current.size>6)prepared.current.delete(prepared.current.keys().next().value!)
   void task.catch(()=>{if(prepared.current.get(key)===task)prepared.current.delete(key)})
   return task
 }
 const changeImage=async(nextId:string)=>{
   if(nextId===id)return
   const serial=++switchSerial.current
   try{
     const ready=await prepareImage(nextId)
     if(serial!==switchSerial.current)return
     const current=snapshotRef.current
     if(!current.set.assetIds.includes(nextId)||current.set.unavailableIds.includes(nextId))throw Error('素材引用已失效，现有预览保留。')
     setAsset(ready.asset);setPalette(undefined);setError('');setPromptDraft('');setId(nextId)
   }catch(e){if(serial===switchSerial.current)setError(e instanceof Error?e.message:'预览未完成，现有画面保留。')}
 }
 useEffect(()=>{const target=snapshot.focusAssetId;if(target&&target!==id)void changeImage(target)},[snapshot.focusAssetId,snapshot.focusRequest])
 useEffect(()=>{const available=snapshot.set.assetIds.filter(i=>!snapshot.set.unavailableIds.includes(i)),at=available.indexOf(id);for(const next of [id,available[at-1],available[at+1]])if(next)void prepareImage(next).catch(()=>{});return()=>{switchSerial.current++}},[id,snapshot.scope.generation,snapshot.set.revision])
 const images=snapshot.set.assetIds.filter(i=>!snapshot.set.unavailableIds.includes(i)).flatMap(i=>{const a=snapshot.assets.find(a=>a.id===i);return a?[{id:i,title:a.title,src:src(i),kind:'image' as const,pixelLabel:'预览像素 1:1'}]:[]})
 return <main className={`gallery-design minimal-prototype native-work-surface work-shelf-focus ${dark?'dark':''}`} data-native-backdrop>
  {error&&<div className="work-focus-error" role="alert">{error}<button onClick={()=>{setError('');setRefresh(v=>v+1)}}>重试读取</button></div>}
  {asset?<FocusView asset={{id,title:asset.title,src:src(id),kind:'image',pixelLabel:'预览像素 1:1',previewWidth:previewDimensions.current.get(id)?.w,previewHeight:previewDimensions.current.get(id)?.h}} items={images} change={next=>void changeImage(next)} close={()=>void close()} autoSave shelfPresentation notebook={notebook} video={null}
   details={<LibraryDetails asset={asset} focus memberPalette={palette} addWorkColor={color=>{void member('add-color',{color}).catch(e=>setError(e.message))}}
    analysis={<VisualAiPanel memberApi={visual} libraryTools={false} scope={snapshot.scope} assetIds={[id]} promptDraft={promptDraft} onUsePrompt={setPromptDraft} onChanged={()=>setRefresh(v=>v+1)} onConfigure={()=>{void api.act({token:snapshot.token,kind:'configure-ai'})}}/>}
    ocrPanel={<DedicatedOcrPanel memberApi={ocr} asset={asset} scope={{...snapshot.scope,assetId:id}}/>}/>}/>:<div role="status">正在读取专注预览…</div>}
 </main>
}
