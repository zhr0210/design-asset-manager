import React,{useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {X,ArrowLeft,ArrowRight} from 'lucide-react'
import {useUIStore} from '../../../stores/ui.store'
import type {Asset} from '../../../stores/asset.store'
import type {SavedWorkSet,WorkSetValue} from '../../../../shared/contracts/work-set.contract'
import type {WorkspaceDraftScope} from '../../../../shared/contracts/workspace-draft.contract'
import type {WorkSetModel} from './useWorkSets'
import {holdWorkspaceDraft,removeWorkspaceDraft,currentWorkspaceDraft,flushWorkspaceDrafts,suspendRecoveredWorkspaceDraft} from '../../../workspace-drafts'
import {Button} from '../../ui/WorkspacePrimitives'
import {useWorkSetAssets} from './useWorkSetAssets'
import {WorkSetAssetChoices} from './WorkSetAssetChoices'
export type WorkSetIntent={kind:'new'}|{kind:'edit';id:string}|{kind:'add';assetIds?:string[];colors?:string[];targetId?:string}
type WorkSetDraftBase={revision:number;value:WorkSetValue|null}
const baseline=(set?:SavedWorkSet):WorkSetValue=>({name:set?.name||'',note:set?.note||'',assetIds:set?.assetIds||[],colors:set?.colors||[],columns:set?.columns||2})
export function WorkSetModal({model,intent,assets,close}:{model:WorkSetModel;intent:WorkSetIntent;assets:Asset[];close:()=>void}){
 const theme=useUIStore(s=>s.theme),dialog=useRef<HTMLDialogElement>(null),saveAsSource=useRef<WorkspaceDraftScope>(),sets=model.catalog?.sets||[]
 const initialId=intent.kind==='edit'?intent.id:intent.kind==='add'?intent.targetId||'':''
 const recovery=currentWorkspaceDraft({...model.scope,kind:'work-set',entityId:initialId||'work-set:new'})
 const openingSet=sets.find(s=>s.id===initialId)
 const make=(set?:WorkSetValue):WorkSetValue=>({name:set?.name||'',note:set?.note||'',assetIds:[...new Set([...(set?.assetIds||[]),...(intent.kind==='add'?intent.assetIds||[]:[])])],colors:[...new Set([...(set?.colors||[]),...(intent.kind==='add'?intent.colors||[]:[])])],columns:set?.columns||2})
 const [target,setTarget]=useState(initialId),[base,setBase]=useState<SavedWorkSet|undefined>(()=>{const set=sets.find(s=>s.id===initialId);return set&&recovery?{...set,revision:(recovery.base as {revision:number}).revision}:set}),[value,setValue]=useState<WorkSetValue>(()=>make(recovery ? recovery.value as WorkSetValue : sets.find(s=>s.id===initialId))),[query,setQuery]=useState(''),[error,setError]=useState(''),[upgrade,setUpgrade]=useState(false),[deleting,setDeleting]=useState(false)
 const [draftBase,setDraftBase]=useState<WorkSetDraftBase>(()=>recovery?recovery.base as WorkSetDraftBase:{revision:openingSet?.revision||0,value:openingSet?baseline(openingSet):null})
 const [retainedRecovery,setRetainedRecovery]=useState(Boolean(recovery))
 const [pendingTarget,setPendingTarget]=useState<string|null>(null)
 const references=useWorkSetAssets(model.scope,query,value.assetIds,assets,!deleting)
 useEffect(()=>{const previous=document.activeElement as HTMLElement;dialog.current?.showModal();return()=>previous?.focus({preventScroll:true})},[])
 const draftScope={...model.scope,kind:'work-set' as const,entityId:target||'work-set:new'}
 const missingTarget=Boolean(target&&(!base||model.catalog&&!sets.some(set=>set.id===target)))
 const savedTarget=sets.find(set=>set.id===target),conflict=Boolean(savedTarget&&savedTarget.revision!==draftBase.revision)
 const dirty=JSON.stringify(value)!==JSON.stringify(draftBase.value||baseline())
 useEffect(()=>{if(dirty||retainedRecovery)holdWorkspaceDraft(draftScope,value,draftBase);else removeWorkspaceDraft(draftScope)},[value,target,draftBase,retainedRecovery,model.scope.libraryIdentity,model.scope.generation])
 const clearDrafts=()=>{removeWorkspaceDraft(draftScope);if(saveAsSource.current)removeWorkspaceDraft(saveAsSource.current);saveAsSource.current=undefined}
 const cancel=()=>{clearDrafts();close()}
 const leave=async()=>{try{await flushWorkspaceDrafts();suspendRecoveredWorkspaceDraft(draftScope);if(saveAsSource.current)suspendRecoveredWorkspaceDraft(saveAsSource.current);close()}catch(e){setError(e instanceof Error?e.message:'草稿暂存失败，当前输入保留。')}}
 const chooseTarget=(id:string)=>{clearDrafts();const set=sets.find(s=>s.id===id),saved=currentWorkspaceDraft({...draftScope,entityId:id||'work-set:new'});setTarget(id);setRetainedRecovery(Boolean(saved));setBase(set&&saved?{...set,revision:(saved.base as {revision:number}).revision}:set);setDraftBase(saved?saved.base as WorkSetDraftBase:{revision:set?.revision||0,value:set?baseline(set):null});setValue(make(saved?saved.value as WorkSetValue:set));setDeleting(false);setError('')}
 const choose=(id:string)=>{if(id===target)return;if(dirty||retainedRecovery){setPendingTarget(id);return}chooseTarget(id)}
 const saveAs=()=>{saveAsSource.current=draftScope;setBase(undefined);setDraftBase({revision:0,value:null});setTarget('');setValue(v=>({...v,name:(v.name+' 副本').slice(0,80)}));setDeleting(false);setError('')}
 const toggle=(id:string)=>setValue(v=>({...v,assetIds:v.assetIds.includes(id)?v.assetIds.filter(x=>x!==id):[...v.assetIds,id]}))
 const move=(id:string,delta:number)=>setValue(v=>{const ids=[...v.assetIds],at=ids.indexOf(id),to=at+delta;if(to<0||to>=ids.length)return v;[ids[at],ids[to]]=[ids[to],ids[at]];return{...v,assetIds:ids}})
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setError('');try{if(missingTarget)throw Error('原工作集已不存在或暂不可用，请另存工作集或取消放弃草稿。');await model.write(deleting&&base?{kind:'delete',id:base.id,expectedRevision:base.revision}:base?{kind:'save',id:base.id,expectedRevision:base.revision,value}:{kind:'create',value},upgrade);clearDrafts();close()}catch(e){setError(e instanceof Error?e.message:'保存失败，输入仍保留。')}}
 return createPortal(<div className={`gallery-design minimal-prototype organization-dialog-root ${theme==='dark'?'dark':''}`}><dialog ref={dialog} className="organization-modal work-set-modal glass" aria-label={intent.kind==='edit'?'编辑工作集':'加入工作集'} onCancel={e=>{e.preventDefault();if(pendingTarget!==null)setPendingTarget(null);else if(!model.busy)void leave()}}>{pendingTarget!==null?<div className="file-picker" role="alertdialog" aria-label="切换工作集"><h2>切换工作集</h2><p>切换会放弃当前工作集的未保存编辑。已保存的工作集与素材保持原样。</p><footer><Button onClick={()=>setPendingTarget(null)}>继续编辑</Button><Button variant="primary" onClick={()=>{chooseTarget(pendingTarget);setPendingTarget(null)}}>放弃草稿并切换</Button></footer></div>:<form onSubmit={submit}><header><h2>{intent.kind==='edit'?'编辑工作集':'加入工作集'}</h2><button className="icon" type="button" aria-label="关闭并保留工作集草稿" onClick={()=>void leave()} disabled={model.busy}><X/></button></header><fieldset disabled={model.busy||model.loading}>
 {intent.kind==='add'&&<label>工作集<select aria-label="目标工作集" value={target} onChange={e=>choose(e.target.value)}><option value="">新建工作集</option>{sets.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
 {!deleting&&<><label>名称<input autoFocus required maxLength={80} aria-label="工作集名称" value={value.name} onChange={e=>setValue(v=>({...v,name:e.target.value}))}/></label><label>工作备注<textarea aria-label="工作集备注" maxLength={16000} value={value.note} onChange={e=>setValue(v=>({...v,note:e.target.value}))}/></label><label>参考排列<select aria-label="工作集列数" value={value.columns} onChange={e=>setValue(v=>({...v,columns:Number(e.target.value)}))}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}列</option>)}</select></label>
 <div className="work-set-members" aria-label="工作集成员">{value.assetIds.map((id,i)=><div key={id}><span>{references.assets.find(a=>a.id===id)?.title||'暂不可用的参考'}</span><button type="button" aria-label={`前移参考 ${i+1}`} disabled={i===0} onClick={()=>move(id,-1)}><ArrowLeft size={12}/></button><button type="button" aria-label={`后移参考 ${i+1}`} disabled={i===value.assetIds.length-1} onClick={()=>move(id,1)}><ArrowRight size={12}/></button><button type="button" aria-label={`移除参考 ${i+1}`} onClick={()=>toggle(id)}><X size={12}/></button></div>)}</div>
 <label>添加已有素材<input aria-label="搜索工作集候选素材" value={query} onChange={e=>setQuery(e.target.value)} placeholder="按名称查找素材"/></label><WorkSetAssetChoices search={references} pick={toggle}/>
 {value.colors.length>0&&<div className="saved-swatches">{value.colors.map(c=><div key={c}><span style={{background:c}} className="swatch"/><span>{c}</span><button type="button" aria-label={`移除工作集颜色 ${c}`} onClick={()=>setValue(v=>({...v,colors:v.colors.filter(x=>x!==c)}))}><X size={12}/></button></div>)}</div>}</>}
 {deleting&&<p>只删除工作集记录及其窗口布局，素材和原件保留；对应窗口会关闭。</p>}
 {model.catalog?.requiresUpgrade&&<label className="organization-upgrade"><input type="checkbox" checked={upgrade} onChange={e=>setUpgrade(e.target.checked)}/>首次保存升级到 v7，旧版应用将无法打开此库；原件保留。我了解并同意。</label>}
 </fieldset>{missingTarget&&<p role="status">原工作集已不存在或暂不可用，当前输入仍保留。可以另存工作集，或取消放弃这份草稿。</p>}{error&&<p role="alert">{error}</p>}<footer>{target&&!deleting&&<button type="button" disabled={model.busy} onClick={saveAs}>另存工作集</button>}{base&&!missingTarget&&!deleting&&<button type="button" disabled={model.busy} onClick={()=>setDeleting(true)}>删除工作集</button>}{conflict&&savedTarget&&<div role="status"><p>工作集已在另一界面变化。当前输入及原保存基准保留。</p><details><summary>核对当前已保存的工作集</summary><p>{savedTarget.name} · {savedTarget.assetIds.length} 份参考 · {savedTarget.colors.join('、')}</p><pre>{savedTarget.note||'尚无工作备注'}</pre></details><button type="button" disabled={model.busy} onClick={()=>{setBase(savedTarget);setDraftBase({revision:savedTarget.revision,value:baseline(savedTarget)});setError('')}}>核对后采用当前工作集为基准</button></div>}{error&&base&&<button type="button" disabled={model.busy} onClick={()=>{void model.refresh()}}>刷新已保存工作集</button>}<button type="button" disabled={model.busy} onClick={cancel}>取消</button><button type="submit" disabled={model.busy||model.loading||!model.catalog||missingTarget||Boolean(model.catalog.requiresUpgrade&&!upgrade)}>{model.busy?'正在保存…':deleting?'确认删除工作集':'保存工作集'}</button></footer></form>}</dialog></div>,document.body)
}
