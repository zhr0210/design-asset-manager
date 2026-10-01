import React,{useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {PageHeader} from '../components/ui/WorkspacePrimitives'
export default function AboutPage(){
 const [identity,setIdentity]=useState<any>(null),[error,setError]=useState(false)
 useEffect(()=>{let alive=true;void (window as any).electronAPI.buildIdentity().then((value:any)=>{if(alive)setIdentity(value)}).catch(()=>{if(alive)setError(true)});return()=>{alive=false}},[])
 return <div className="ui-page ui-tool-page"><PageHeader title="帮助与关于" description="核对当前运行的构建；构建信息不包含账号或资料库内容。" actions={<Link className="ui-button ui-button-secondary" to="/library">返回素材工作区</Link>}/><section className="ui-card" aria-label="当前构建"><h2>当前构建</h2>{error?<p role="alert">构建信息暂不可读。</p>:identity?<dl><dt>构建编号</dt><dd>{identity.buildId}</dd><dt>构建时间</dt><dd>{identity.builtAt}</dd><dt>运行环境</dt><dd>{identity.platform} / {identity.arch} · {identity.profileKind==='synthetic-isolated'?'受控测试':'普通运行'}</dd></dl>:<p role="status">正在读取构建信息…</p>}</section><section className="ui-card"><h2>开始使用</h2><p>素材浏览与整理需要打开资料库；账号配置无需开库。账号登录不授权上传素材，模型验证和分析需单独确认。</p><Link className="ui-button ui-button-secondary" to="/ai-console">管理 AI 与模型</Link></section></div>
}
