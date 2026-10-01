import React,{useEffect,useState} from 'react'
export default function OcrEnvironmentSettings(){
 const [status,setStatus]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const read=async()=>{try{const r=await(window as any).electronAPI.assetOcr.status();if(r.ok)setStatus(r.value);else setError(r.error)}catch{setError('OCR 环境状态暂不可读。')}}
 useEffect(()=>{void read()},[])
 return <section className="ui-card" aria-label="本地 OCR 环境"><h2>OCR 环境</h2><p>选择已有可信本地环境；本操作不下载或安装模型，不扫描资料库。识别与后台执行许可仍需另外确认。</p><p>{status?.state??'尚未读取'}；后台执行仍需资源资格。</p><button className="ui-button ui-button-secondary" disabled={busy} onClick={()=>{setBusy(true);setError('');void(window as any).electronAPI.assetOcr.configure().then((r:any)=>{if(r.ok)setStatus(r.value);else setError(r.error)}).catch(()=>setError('未能选择环境。')).finally(()=>setBusy(false))}}>选择可信本地 OCR 环境</button>{error&&<p role="alert">{error}</p>}</section>
}
