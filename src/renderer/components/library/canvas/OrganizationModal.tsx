import {createPortal} from 'react-dom'
import {useUIStore} from '../../../stores/ui.store'
import React,{useEffect,useRef,useState} from 'react'
import {X} from 'lucide-react'
import type {FolderKind,OrganizationCommand,LibraryFolder} from '../../../../shared/contracts/library-organization.contract'
import type {OrganizationModel} from './useLibraryOrganization'
import {useTransientWorkspaceEdit} from '../../../workspace-edit-guards'
import {useAssetStore} from '../../../stores/asset.store'
export type OrganizationIntent={kind:'create';folderKind:FolderKind;parentId:string|null}|{kind:'edit';folderId:string}|{kind:'assign';assetIds:string[]}|{kind:'color';hex?:string;sourceAssetId:string|null;folderId?:string}
export function folderLabel(folder:LibraryFolder,folders:LibraryFolder[]){const names=[folder.name];let id=folder.parentId;const seen=new Set<string>([folder.id]);while(id&&!seen.has(id)){seen.add(id);const p=folders.find(f=>f.id===id);if(!p)break;names.unshift(p.name);id=p.parentId}return names.join(' / ')}
export function OrganizationModal({model,intent,close}:{model:OrganizationModel;intent:OrganizationIntent;close:()=>void}) {
 const theme=useUIStore(s=>s.theme)
 const assets=useAssetStore(s=>s.assets)
 const [opening,setOpening]=useState(model.snapshot)
 const latest=model.snapshot,conflict=Boolean(latest&&opening&&latest.revision!==opening.revision)
 const dialog=useRef<HTMLDialogElement>(null),folders=opening?.folders||[],folder=intent.kind==='edit'?folders.find(f=>f.id===intent.folderId):undefined
 const kind:FolderKind=intent.kind==='create'?intent.folderKind:folder?.kind||(intent.kind==='color'?'palette':'assets')
 const [name,setName]=useState(folder?.name||''),[parentId,setParent]=useState(folder?.parentId||(intent.kind==='create'?intent.parentId:null)),[target,setTarget]=useState(intent.kind==='color'&&intent.folderId?intent.folderId:''),[hex,setHex]=useState(intent.kind==='color'?intent.hex||'#808080':'#808080'),[upgrade,setUpgrade]=useState(false),[error,setError]=useState(''),[deleting,setDeleting]=useState(false)
 useTransientWorkspaceEdit(name!==(folder?.name||'')||parentId!==(folder?.parentId||(intent.kind==='create'?intent.parentId:null))||Boolean(target)||intent.kind==='assign'||intent.kind==='color'||deleting)
 useEffect(()=>{const previous=document.activeElement as HTMLElement;dialog.current?.showModal();return()=>previous?.focus({preventScroll:true})},[])
 const title=intent.kind==='create'?(kind==='palette'?'新建色板文件夹':'新建文件夹'):intent.kind==='edit'?'编辑文件夹':intent.kind==='assign'?'加入文件夹':'收藏颜色'
 const isDescendant=(f:LibraryFolder)=>{let id:string|null=f.id;const seen=new Set<string>();while(id&&!seen.has(id)){if(id===folder?.id)return true;seen.add(id);id=folders.find(x=>x.id===id)?.parentId||null}return false}
 const eligible=folders.filter(f=>f.kind===kind&&!isDescendant(f))
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setError('');let command:OrganizationCommand
  if(conflict){setError('请先核对并明确采用当前整理结果为基准。你的输入仍保留。');return}
  if(target&&!eligible.some(value=>value.id===target)){setError('目标文件夹已不可用，请重新选择；你的输入仍保留。');return}
  if(deleting&&folder)command={kind:'delete',folderId:folder.id}
  else if(intent.kind==='edit'&&folder)command={kind:'update',folderId:folder.id,name,parentId}
  else if(intent.kind==='assign')command=target?{kind:'add-assets',folderId:target,assetIds:intent.assetIds}:{kind:'create',folderKind:'assets',name,parentId,assetIds:intent.assetIds}
  else if(intent.kind==='color')command=target?{kind:'add-color',folderId:target,hex,sourceAssetId:intent.sourceAssetId}:{kind:'create',folderKind:'palette',name,parentId,color:{hex,sourceAssetId:intent.sourceAssetId}}
  else if(intent.kind==='create')command={kind:'create',folderKind:kind,name,parentId}
  else {setError('文件夹已不存在，请关闭后刷新。');return}
  try{await model.write(command,upgrade,opening?.revision);close()}catch(e){setError(e instanceof Error?e.message:'保存失败，请重试。')}
 }
 return createPortal(<div className={`gallery-design minimal-prototype organization-dialog-root ${theme==='dark'?'dark':''}`}><dialog ref={dialog} className="organization-modal glass" aria-label={title} onCancel={e=>{e.preventDefault();if(!model.busy)close()}}><form onSubmit={submit}><header><h2>{title}</h2><button type="button" className="icon" aria-label="关闭文件夹操作" disabled={model.busy} onClick={close}><X/></button></header>
  <fieldset disabled={model.busy||model.loading}>
  {(intent.kind==='assign'||intent.kind==='color')&&<label>保存到<select aria-label="目标文件夹" value={target} onChange={e=>setTarget(e.target.value)}><option value="">新建{kind==='palette'?'色板':''}文件夹</option>{eligible.map(f=><option key={f.id} value={f.id}>{folderLabel(f,folders)}</option>)}</select></label>}
  {!target&&!deleting&&<><label>名称<input autoFocus aria-label="文件夹名称" required value={name} maxLength={80} onChange={e=>setName(e.target.value)}/></label><label>位置<select aria-label="上级文件夹" value={parentId||''} onChange={e=>setParent(e.target.value||null)}><option value="">文件夹首页</option>{eligible.map(f=><option key={f.id} value={f.id}>{folderLabel(f,folders)}</option>)}</select></label></>}
  {intent.kind==='color'&&!deleting&&<label>颜色<div className="organization-color"><input type="color" aria-label="选择颜色" value={/^#[0-9a-f]{6}$/i.test(hex)?hex:'#808080'} onChange={e=>setHex(e.target.value)}/><input aria-label="颜色代码" pattern="#[0-9A-Fa-f]{6}" required value={hex} onChange={e=>setHex(e.target.value)} maxLength={7}/></div></label>}
  {deleting&&<p>只删除此文件夹及其成员引用/收藏颜色，素材和原图不删除。有子文件夹时需先移走子文件夹。</p>}
  {model.snapshot?.requiresUpgrade&&<label className="organization-upgrade"><input type="checkbox" checked={upgrade} onChange={e=>setUpgrade(e.target.checked)}/>首次保存将素材库升级至 v6，旧版应用将无法打开；原件保留。我了解并同意升级。</label>}
  </fieldset>
  {conflict&&latest&&<div className="organization-conflict" role="status">
   <p>文件夹整理已在另一界面修改。你的输入仍保留，请核对后再保存。</p>
   <details><summary>核对当前已保存的整理结果</summary>{latest.folders.length?<ul>{latest.folders.map(value=><li key={value.id}><strong>{folderLabel(value,latest.folders)}</strong><p>{value.kind==='palette'?`色板 · ${value.colors.length} 个颜色：${value.colors.map(item=>item.hex).join('、')||'暂无颜色'}`:`文件夹 · ${value.assetIds.length} 项素材：${value.assetIds.map(id=>assets.find(asset=>asset.id===id)?.title||'暂不可用的素材').join('、')||'暂无素材'}`}</p></li>)}</ul>:<p>当前没有文件夹或色板。</p>}</details>
   <button type="button" disabled={model.busy||model.loading} onClick={()=>{setOpening(latest);setError('')}}>核对后采用当前整理结果为基准</button>
  </div>}
  {(error||model.error)&&<div role="alert"><p>{error||model.error}</p><button type="button" disabled={model.busy} onClick={()=>{setError('');void model.refresh()}}>刷新文件夹后重试</button></div>}
  <footer>{intent.kind==='edit'&&!deleting&&<button type="button" disabled={model.busy} onClick={()=>setDeleting(true)}>删除文件夹</button>}{deleting&&<button type="button" disabled={model.busy} onClick={()=>setDeleting(false)}>返回编辑</button>}<button type="button" disabled={model.busy} onClick={close}>取消</button><button type="submit" disabled={model.busy||model.loading||!model.snapshot||Boolean(model.snapshot.requiresUpgrade&&!upgrade)}>{model.busy?'正在保存…':deleting?'确认删除文件夹':intent.kind==='assign'?'加入文件夹':intent.kind==='color'?'保存颜色':'保存文件夹'}</button></footer>
 </form></dialog></div>,document.body)
}
