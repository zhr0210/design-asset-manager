import React,{useCallback,useEffect,useState} from 'react'
import {requireWorkspaceClient} from '../../workspace-client'
import type {RetrievalWorkspaceStatus,RetrievalModelAction,RetrievalInstallReview} from '../../../shared/contracts/retrieval-workspace.contract'

const gib=(bytes:number)=>(bytes/1024**3).toFixed(2)+' GiB'
const states:Record<string,string>={unconfigured:'尚未选择可信运行环境',inactive:'已释放空闲运行器',checking:'正在核对完整制品与环境',loading:'正在加载本地检索模型',ready:'本地图文检索就绪',stopping:'等待实际进程退出',unknown:'退出尚未确认，资源继续占用',failed:'本次操作未完成'}
const errors:Record<string,string>={RETRIEVAL_PYTHON_REQUIRED:'先选择已安装且可信的 Python 环境，需要 Torch、Transformers、Pillow、tokenizers 与 psutil。',
  RETRIEVAL_CAPABILITY_FAILED:'实际中英文图文检索验证未通过，候选没有启用；文字检索继续可用。',
  RETRIEVAL_RUNTIME_FAILED:'本地检索运行器未启动成功，请核对所选环境的依赖。模型文件保留。',
  RETRIEVAL_NOT_QUALIFIED:'请先真实验证并启用检索模型。',LOCAL_MODEL_CHANGED:'模型文件或运行环境已变化，请重新核对并验证。',
  MODEL_MIRROR_UNAVAILABLE:'境内镜像暂不可用，已下载字节保留，不转向国外源。',MODEL_MIRROR_FILE_UNAVAILABLE:'境内源缺少此固定版本的配套文件，已有版本保留。',
  AI_MEMORY_WAIT:'当前设备余量不足，先释放空闲模型或等待其他应用释放内存。',MODEL_FILE_INTEGRITY_FAILED:'完整性检查失败，此制品不可使用；已有可用版本保留。',
  RETRIEVAL_CANCELLED:'验证已取消，没有启用候选。',RETRIEVAL_PROCESS_EXIT_UNCONFIRMED:'运行器退出尚未确认，资源继续占用，不能重新加载。'}
const message=(e:unknown)=>{const code=e instanceof Error?e.message:String(e);return Object.entries(errors).find(([key])=>code.includes(key))?.[1]??'操作未完成，文件和文字检索保留。请核对状态后重试。'}
export default function RetrievalModelSettings(){
  const [status,setStatus]=useState<RetrievalWorkspaceStatus|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState<RetrievalInstallReview|null>(null)
  const read=useCallback(async()=>setStatus(await requireWorkspaceClient().retrievalModels.read() as RetrievalWorkspaceStatus),[])
  useEffect(()=>{let live=true;const refresh=()=>void requireWorkspaceClient().retrievalModels.read().then(value=>{if(live)setStatus(value as RetrievalWorkspaceStatus)}).catch(()=>{})
    refresh();const timer=setInterval(refresh,2000);return()=>{live=false;clearInterval(timer)}},[])
  const act=async(action:RetrievalModelAction)=>{setBusy(true);setError('');try{const value=await requireWorkspaceClient().retrievalModels.action(action)
    if(action.kind==='review-install')setReview(value as RetrievalInstallReview)
    else if(action.kind==='confirm-install')setReview(null)
    await read()
  }catch(e){setError(message(e))}finally{setBusy(false)}}
  const runtime=status?.runtime
  return <section className="ui-card" aria-label="本地图文检索模型">
    <h2>中英文语义检索与以图找</h2>
    <p>独立的 SigLIP2 图文模型在本机理解查询和画面。通过 ModelScope 境内源获取，不上传素材；准备期间文字检索继续可用。</p>
    <p role="status">{states[runtime?.state??'unconfigured']}{runtime?.peakRamBytes!=null?` · 工作集峰值 ${gib(runtime.peakRamBytes)}`:''}{runtime?.loadMs!=null?` · 加载 ${(runtime.loadMs/1000).toFixed(1)} 秒`:''}</p>
    <div className="ui-button-row">
      <button className="ui-button ui-button-secondary" disabled={busy||status?.tasks.some(v=>v.state==='running')} onClick={()=>void act({kind:'review-install'})}>获取境内检索模型</button>
      <button className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void act({kind:'select-runtime'})}>{runtime?.pythonSelected?'更换检索运行环境':'选择可信检索运行环境'}</button>
      <button className="ui-button ui-button-ghost" onClick={()=>void read().catch(e=>setError(message(e)))}>重新读取检索状态</button>
      <button className="ui-button ui-button-ghost" disabled={runtime?.state!=='ready'||busy} onClick={()=>void act({kind:'release-idle'})}>释放空闲检索模型</button>
      {busy&&['checking','loading','ready'].includes(runtime?.state??'')&&<button className="ui-button ui-button-secondary" onClick={()=>void requireWorkspaceClient().retrievalModels.action({kind:'cancel-validation'}).then(read)}>取消检索验证</button>}
    </div>
    {(error||runtime?.error)&&<p role="alert">{error||message(runtime?.error)}{runtime?.error&&` · ${runtime.error}`}</p>}
    {review&&<section className="ui-card" aria-label="检索模型下载确认">
      <h3>{review.name}</h3><p>ModelScope · {review.repository} · Apache-2.0 · {gib(review.bytes)}。磁盘可用 {gib(review.freeDiskBytes)}；CPU 加载与执行预算 {gib(review.reserveRamBytes)}。</p>
      <p>固定版本 {review.revision.slice(0,12)}；逐文件完整哈希核验。下载不自动启用，不执行模型仓库代码。首次图文验证需使用已安装的可信 Python。</p>
      <div className="ui-button-row"><button className="ui-button ui-button-primary" disabled={busy} onClick={()=>void act({kind:'confirm-install',receipt:review.receipt})}>确认下载检索模型</button><button className="ui-button ui-button-ghost" disabled={busy} onClick={()=>setReview(null)}>取消下载确认</button></div>
    </section>}
    {status?.tasks.filter(v=>v.state!=='abandoned').map(task=><article className="ui-card" key={task.id}>
      <p role="status">检索模型下载 · {({running:'传输中',paused:'已暂停',interrupted:'应用中断，等待明确恢复',failed:'传输未完成',complete:'完整核验入库，尚未自动启用',abandoned:'已放弃'})[task.state]} · {gib(task.completedBytes)} / {gib(task.totalBytes)}</p>
      {task.error&&<p>{message(task.error)} · {task.error}</p>}
      <div className="ui-button-row">{task.state==='running'?<button className="ui-button ui-button-secondary" onClick={()=>void act({kind:'pause',taskId:task.id})}>暂停检索模型下载</button>:['paused','interrupted','failed'].includes(task.state)&&<>
        <button className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void act({kind:'resume',taskId:task.id})}>恢复检索模型下载</button><button className="ui-button ui-button-ghost" disabled={busy} onClick={()=>void act({kind:'abandon',taskId:task.id})}>放弃本次检索下载</button></>}</div>
    </article>)}
    {status?.models.map(model=><article className="ui-card" key={model.id}>
      <h3>{model.name}</h3><p>境内受管下载 · {gib(model.bytes)} · {model.revision.slice(0,12)} · Apache-2.0 · {model.qualified?'此版本已通过真实图文验证':'尚未取得检索资格'}</p>
      {model.qualification&&<p>768 维 · L2 / cosine · {model.qualification.languages.map(v=>`${v.language==='zh'?'中文':v.language==='en'?'英文':'中英混合'} ${v.correct}/${v.total}`).join(' · ')}。已验证且文件/环境未变化时可离线使用。</p>}
      {model.qualification?.additionalChecks?.some(v=>v.correct<v.total)&&<p>主体图文找回通过；纯色中文查询有弱项，颜色精确筛选仍以预览测色为准。语义相似度不表示正确率。</p>}
      <div className="ui-button-row"><button className="ui-button ui-button-primary" disabled={busy||!runtime?.pythonSelected||!model.trusted} onClick={()=>void act({kind:'verify-use',modelId:model.id})}>验证并使用图文检索模型</button>
        <button className="ui-button ui-button-ghost" disabled={busy} onClick={()=>void act({kind:model.trusted?'revoke':'restore',modelId:model.id})}>{model.trusted?'撤销检索模型信任':'重新信任检索模型'}</button></div>
    </article>)}
  </section>
}
