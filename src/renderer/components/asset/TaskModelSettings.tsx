import { requireWorkspaceClient } from '../../workspace-client'
import React,{useEffect,useRef,useState} from 'react'
import type {AiBackendConfig} from '../../../shared/types/ai-backend.types'
import {backendInferenceAdmission} from '../../../shared/constants/pi-provider-admission'
import { useTransientWorkspaceEdit } from '../../workspace-edit-guards'
import { Notice } from '../ui/WorkspacePrimitives'
import {workspaceMutationErrorMessage} from '../../../shared/client/workspace-connection-error'
type TaskChoices=Record<string,{backendId:string;model:string}>
const tasks=[['analyze','视觉分析与标签'],['reverse','提示词反推'],['tags','独立标签']] as const
export default function TaskModelSettings(){
 const [backends,setBackends]=useState<AiBackendConfig[]>([]),[choices,setChoices]=useState<Record<string,{backendId:string;model:string}>>({}),[templates,setTemplates]=useState<Array<{id:string;name:string;content:string}>>([]),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false)
 const baseline=useRef<Record<string,{backendId:string;model:string}>|null>(null)
 const [reviewed,setReviewed]=useState<TaskChoices|null>(null)
 const [latest,setLatest]=useState<TaskChoices|null|undefined>(undefined)
 const conflict=latest!==undefined&&JSON.stringify(latest)!==JSON.stringify(reviewed)
 const reread=useRef<()=>Promise<void>>(async()=>{})
 const readSequence=useRef(0)
 const current=useRef(choices),saving=useRef(busy);current.current=choices;saving.current=busy
 useTransientWorkspaceEdit(JSON.stringify(choices)!==JSON.stringify(baseline.current??{}))
 useEffect(()=>{
  let alive=true,requiredRead:Promise<void>|undefined,requiredSequence=0
  const api=requireWorkspaceClient()
  const sync=async(required=false):Promise<void>=>{
   if(!required)while(requiredRead&&requiredSequence===readSequence.current){try{await requiredRead}catch{/* The required caller receives its failure. */}}
   const request=++readSequence.current
   const read=async()=>{
    const [list,settings]=await Promise.all([api.aiBackendList(),api.settingsLoad()])
    if(!alive)return
    if(request!==readSequence.current){if(required)throw Error('TASK_SETTINGS_READ_SUPERSEDED');return}
    setBackends(list);setTemplates(settings.promptReverseTemplates??[]);setLatest(settings.aiTaskModels??null)
    if(!saving.current&&JSON.stringify(current.current)===JSON.stringify(baseline.current??{})){baseline.current=settings.aiTaskModels??null;setReviewed(baseline.current);setChoices(settings.aiTaskModels??{})}
   }
   if(!required)return read()
   const operation=read().finally(()=>{if(requiredRead===operation)requiredRead=undefined})
   requiredRead=operation;requiredSequence=request;return operation
  }
  reread.current=sync
  const read=()=>{void sync().catch(()=>{if(alive)setFeedback('配置暂不可读，当前输入仍保留。')})}
  read();const stop=api.onSettingsChanged(read),stopReconcile=api.onReconcile(()=>sync(true))
  return()=>{alive=false;++readSequence.current;stop();stopReconcile()}
 },[])
 const save=async()=>{if(saving.current||conflict||latest===undefined)return;const submitted=structuredClone(choices),expected=structuredClone(baseline.current);saving.current=true;++readSequence.current;setBusy(true);setFeedback('');try{const api=requireWorkspaceClient();await api.settingsSave({aiTaskModels:submitted},{aiTaskModels:expected});++readSequence.current;baseline.current=submitted;setReviewed(submitted);setLatest(previous=>JSON.stringify(previous)===JSON.stringify(expected)?submitted:previous);setFeedback(JSON.stringify(current.current)!==JSON.stringify(submitted)?'任务默认模型已保存；后续输入仍保留，尚未保存。':'任务默认模型已保存；不会自动发送素材。')}catch(error){setFeedback(workspaceMutationErrorMessage(error,'未能保存，输入仍保留。任务设置可能已在另一界面变化，请重新核对。'))}finally{saving.current=false;setBusy(false)}}
 return <section className="ui-card" aria-label="任务默认模型"><h2>任务用哪个模型</h2><p>这里只设置默认选择，素材执行仍需独立确认。OCR 使用本地 OCR 环境，不走这些模型连接。</p>
 <button className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void reread.current().catch(()=>setFeedback('配置暂不可读，当前输入仍保留。'))}>重新读取任务默认模型</button>
 {conflict&&<Notice><p>任务设置已在另一界面修改。你的选择仍保留，请核对后再保存。</p><details><summary>核对当前已保存的任务默认模型</summary><dl>{tasks.map(([id,label])=><React.Fragment key={id}><dt>{label}</dt><dd>{latest?.[id]?`${backends.find(b=>b.id===latest[id].backendId)?.name||'服务暂不可用'} · ${latest[id].model}`:'未分配'}</dd></React.Fragment>)}</dl></details><button className="ui-button ui-button-secondary" disabled={busy} onClick={()=>{baseline.current=structuredClone(latest??null);setReviewed(baseline.current);setFeedback('已采用当前任务设置为基准。你的选择仍保留，尚未保存。')}}>核对后采用当前任务设置为基准</button></Notice>}
 {tasks.map(([id,label])=><div key={id} className="pi-connection-grid"><label>{label}<select aria-label={label+'连接'} value={choices[id]?.backendId??''} onChange={event=>{const value=event.target.value,b=backends.find(v=>v.id===value);if(b)setChoices(v=>({...v,[id]:{backendId:b.id,model:b.defaultModel??''}}));else if(!value)setChoices(v=>{const next={...v};delete next[id];return next})}}><option value="">未分配</option>{backends.filter(b=>b.enabled&&backendInferenceAdmission(b).allowed).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>模型名称<input aria-label={label+'模型'} value={choices[id]?.model??''} onChange={event=>setChoices(v=>({...v,[id]:{backendId:v[id]?.backendId??'',model:event.target.value}}))}/></label></div>)}<button className="ui-button ui-button-primary" disabled={busy||conflict||latest===undefined||Object.values(choices).some(v=>!v.backendId||!v.model.trim())} onClick={()=>void save()}>保存任务默认模型</button>{feedback&&<p role="status">{feedback}</p>}<details><summary>保留的旧提示模板</summary><p>这些旧记录完整保留，不代表当前统一分析配方使用它们。</p>{templates.length?templates.map(t=><details key={t.id}><summary>{t.name}</summary><pre>{t.content}</pre></details>):<p>没有旧模板。</p>}</details></section>
}
