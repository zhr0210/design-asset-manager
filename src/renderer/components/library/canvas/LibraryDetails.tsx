import { requireWorkspaceClient } from '../../../workspace-client'
import TagDecisionControls from '../../asset/TagDecisionControls'
import {currentTagSuggestions} from '../../../../shared/workflows/ai-folders.workflow'
import {projectAssetDetailDisplay} from '../../../../shared/workflows/asset-display.workflow'
import {DedicatedOcrPanel} from './DedicatedOcrPanel'
import type {OrganizationScope,MeasuredPreviewColors} from '../../../../shared/contracts/library-organization.contract'
import type {OrganizationIntent} from './OrganizationModal'
import React, {useState,useEffect} from 'react'
import {X, Maximize2, Sparkles, Copy, Plus} from 'lucide-react'
import type {Asset} from '../../../stores/asset.store'
import {LibraryMedia} from './LibraryMedia'
import {createVisualAnalysisSnapshot} from '../../../../shared/workflows/visual-analysis-snapshot.workflow'
import {ColorMenu, type ColorEvent} from '../../gallery/ColorTools'
import {workspaceMutationErrorMessage} from '../../../../shared/client/workspace-connection-error'
/** The approved inspector presentation. Editing/AI execution remain supplied by the host route. */
export function LibraryDetails({ocrAssetIds,analysis,tools,asset,close,preview,editor,focus=false,addWork,organize,libraryScope,addWorkColor}:{ocrAssetIds?:string[];analysis?:React.ReactNode;tools?:React.ReactNode;asset:Asset;close?:()=>void;preview?:()=>void;editor?:React.ReactNode;focus?:boolean;addWork?:()=>void;organize?:(intent:OrganizationIntent)=>void;libraryScope?:OrganizationScope;addWorkColor?:(hex:string)=>void}) {
 const display=projectAssetDetailDisplay(asset)
 const tagSummary=currentTagSuggestions(asset),tagEvidenceId=asset.tagAnalysis===undefined?asset.visualAi?.evidenceId:asset.tagAnalysis?.originalVisualEvidenceId
 const [prompt,setPrompt]=useState(false),[status,setStatus]=useState(''),[color,setColor]=useState<{value:string;x:number;y:number}|null>(null)
 const [measured,setMeasured]=useState<MeasuredPreviewColors|null>(null),[colorError,setColorError]=useState(false),[colorRetry,setColorRetry]=useState(0)
 useEffect(()=>{let cancelled=false;setMeasured(null);setColorError(false);if(!libraryScope)return;const api=requireWorkspaceClient()?.library;if(!api?.previewColors){setColorError(true);return}api.previewColors({...libraryScope,assetId:asset.id}).then((r:any)=>{if(cancelled)return;if(r?.success)setMeasured(r.value);else setColorError(true)}).catch(()=>{if(!cancelled)setColorError(true)});return()=>{cancelled=true}},[asset.id,libraryScope?.libraryIdentity,libraryScope?.generation,colorRetry])
 const [confirming,setConfirming]=useState(false)
 const confirm=async(tag:string)=>{
  if(!libraryScope||!tagEvidenceId||confirming)return
  setConfirming(true);setStatus('')
  try {const r=await requireWorkspaceClient().visualAi.confirmTag({...libraryScope,assetId:asset.id,evidenceId:tagEvidenceId,tag});setStatus(r?.ok?'标签已确认':r?.error||'标签未能确认，请重试。')}catch(error){setStatus(workspaceMutationErrorMessage(error,'标签未能确认，请重试。'))}finally{setConfirming(false)}
 }
 const storedPalette=createVisualAnalysisSnapshot({colorPaletteJson:asset.color_palette_json,ocrText:asset.aiOcrText,ocrSource:asset.aiOcrSource,ocrUpdatedAt:asset.aiOcrUpdatedAt}).imageSwatchesForDisplay
 const palette=measured?measured.colors.map(c=>({...c,percentageLabel:c.percentage+'%'})):storedPalette
 const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text);setStatus('已复制')}catch{setStatus('复制失败，请重试')}}
 const menu=(e:ColorEvent,value:string)=>{e.preventDefault();e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setColor({value,x:'clientX'in e?e.clientX:r.left,y:'clientY'in e?e.clientY:r.bottom})}
 return <div className="gallery-details" role="region" aria-label="素材详细分析" data-inspector-panel="true" onKeyDown={e=>{const target=e.target as HTMLElement;if(e.defaultPrevented||e.key!=='Escape'||!e.currentTarget.contains(document.activeElement)||target.closest('input,textarea,select,video,[contenteditable=true],[role=dialog],[role=menu]'))return;e.preventDefault();e.stopPropagation();close?.()}}>
  {!focus&&<header><span>素材详情</span><button className="icon" aria-label="关闭素材详情" onClick={close}><X size={18}/></button></header>}
  <div className="inspector-scroll" data-inspector-scroll="true">
   {!focus&&<button className="inspector-preview" aria-label="专注查看" onClick={preview}><LibraryMedia asset={asset}/><span><Maximize2 size={14}/>专注查看</span></button>}
   <section className="detail-section immediate-palette" aria-label="配色与占比"><h3>配色与占比 {palette.length>0&&<span className="sample">{measured?'预览测量':'已记录'}</span>}</h3>{palette.length?<><div className="palette">{palette.map(c=><button key={c.hex} style={{background:c.hex,flex:c.percentage}} title={`${c.hex} · ${c.percentageLabel}`} aria-label={`复制颜色 ${c.hex}`} aria-haspopup="menu" onClick={()=>void copy(c.hex)} onContextMenu={e=>menu(e,c.hex)} onKeyDown={e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')menu(e,c.hex)}}/>)}</div></>:<p className="subtle">{colorError?'配色暂不可用':measured?'图片没有可测量的不透明颜色':'正在读取配色…'}{colorError&&<button onClick={()=>setColorRetry(v=>v+1)}>重试取色</button>}</p>}</section>
   {!focus&&editor&&<section className="detail-section metadata-section" aria-label="素材信息"><div className="host-editor">{editor}</div></section>}
   {(focus||!editor)&&<><dl className="asset-summary-metadata"><dt>来源</dt><dd>{display.sourceSiteLabel}</dd><dt>尺寸</dt><dd>{display.imageSpecLabel}</dd><dt>文件大小</dt><dd>{display.fileSizeLabel}</dd><dt>收录日期</dt><dd>{display.createdDateLabel}</dd></dl>
   <section className="detail-section"><h3><Sparkles size={15}/>素材理解</h3><p>{asset.aiCaption||'尚未生成画面描述'}</p><div className="tags">{asset.tags.map(t=><span className="detail-tag" key={t}>{t}</span>)}</div></section></>}
   {asset.visualAi&&<section className="detail-section ai-understanding"><small className="subtle ai-provenance">{asset.visualAi.model} · {new Date(asset.visualAi.createdAt).toLocaleString()} · 受控预览分析</small>{asset.visualAi.caption!==asset.aiCaption&&<div><h3>AI 画面描述</h3><p>{asset.visualAi.caption}</p></div>}</section>}
   <section className="ai-suggestions">{Boolean(tagSummary?.pendingTags.length)&&<div className="ai-suggestion-list"><small className="subtle">AI 建议 · {tagSummary?.model}</small>{asset.tagAnalysis&&libraryScope?<TagDecisionControls scope={{...libraryScope,assetId:asset.id}} summary={asset.tagAnalysis}/>:<div className="tags">{tagSummary!.pendingTags.map(tag=><button className="detail-tag" key={tag} disabled={confirming||!libraryScope} aria-label={`确认 AI 标签 ${tag}`} onClick={()=>void confirm(tag)}><Sparkles size={12}/>{tag}</button>)}</div>}</div>}</section>
   {analysis&&<details className="detail-section inspector-ai-tools"><summary>AI 分析与提示词反推</summary>{analysis}</details>}
   <section className="detail-section"><h3>提示词反推</h3><p className="subtle">提供创作方向，不等同于原始提示词。</p>{prompt&&asset.aiPrompt?<><textarea aria-label="反推提示词" readOnly value={asset.aiPrompt}/><button onClick={()=>void copy(asset.aiPrompt)}><Copy size={14}/>复制提示词</button></>:<button className="wide" disabled={!asset.aiPrompt} onClick={()=>setPrompt(true)}><Sparkles size={14}/>{asset.aiPrompt?'展开反推提示词':'尚无反推结果'}</button>}</section>
   {libraryScope?<DedicatedOcrPanel key={asset.id} asset={asset} scope={{...libraryScope,assetId:asset.id}} assetIds={ocrAssetIds}/>:asset.aiOcrText&&<section className="detail-section"><h3>画面文字</h3><p>{asset.aiOcrText}</p></section>}
   {organize&&<button className="wide" onClick={()=>organize({kind:'assign',assetIds:[asset.id]})}><Plus size={14}/>加入文件夹</button>}
   {addWork&&<button className="wide" onClick={addWork}><Plus size={14}/>加入工作窗口</button>}
   {focus&&editor&&<div className="detail-section">{editor}</div>}
   {tools&&<div className="detail-section">{tools}</div>}
   {status&&<p role="status" className="color-hint">{status}</p>}
  </div>
  {color&&<ColorMenu color={color.value} x={color.x} y={color.y} close={()=>setColor(null)} copy={()=>{void copy(color.value);setColor(null)}} collect={()=>{organize?.({kind:'color',hex:color.value,sourceAssetId:asset.id});setColor(null)}} addWindow={()=>{addWorkColor?.(color.value);setColor(null)}}/>}
 </div>
}
