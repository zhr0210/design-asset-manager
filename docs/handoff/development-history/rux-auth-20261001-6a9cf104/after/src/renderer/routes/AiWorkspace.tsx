import React from 'react'
import {Link,NavLink,useLocation} from 'react-router-dom'
import {AI_SECTION_ROUTES,appPath,getAppNavigationItem} from '../../shared/workflows/app-navigation.workflow'
import {PageHeader} from '../components/ui/WorkspacePrimitives'
import PiConnectionsPanel from '../components/asset/PiConnectionsPanel'
import TaskModelSettings from '../components/asset/TaskModelSettings'
import OcrEnvironmentSettings from '../components/asset/OcrEnvironmentSettings'
import BackgroundAnalysisPanel from '../components/asset/BackgroundAnalysisPanel'
import BackgroundOcrPanel from '../components/asset/BackgroundOcrPanel'
import AiServiceAcceptancePanel from '../components/asset/AiServiceAcceptancePanel'
import ModelLibraryPage from './ModelLibraryPage'
export default function AiWorkspace(){
 const location=useLocation(),id=getAppNavigationItem(location.pathname)?.id??'ai-console'
 return <div className="ui-page ui-tool-page ai-workspace"><PageHeader title="AI 与模型" description="连接账号、选择任务模型与管理本地环境；配置本身不执行分析。" actions={<Link className="ui-button ui-button-secondary" to="/library">返回素材工作区</Link>}/><nav className="ai-section-tabs" aria-label="AI 与模型分类">{AI_SECTION_ROUTES.map(route=><NavLink key={route} to={appPath(route)} className={({isActive})=>'ui-button '+(isActive?'ui-button-primary':'ui-button-ghost')}>{route==='ai-console'?'连接与账号':route==='model-library'?'本地模型与 OCR':getAppNavigationItem(appPath(route))!.sidebarLabel}</NavLink>)}</nav>
 {id==='ai-console'&&<PiConnectionsPanel initialConnectionRef={typeof location.state?.connectionRef==='string'?location.state.connectionRef:undefined}/>}
 {id==='ai-task-models'&&<TaskModelSettings/>}
 {id==='model-library'&&<><OcrEnvironmentSettings/><ModelLibraryPage/></>}
 {id==='ai-background'&&<><p>新素材计划与本次开库的执行许可分开；无生产资源资格时不自动运行。</p><BackgroundAnalysisPanel/><BackgroundOcrPanel/></>}
 {id==='ai-diagnostics'&&<><section className="ui-card"><h2>高级诊断</h2><p>这里只提供现行链路的检查。构建信息在帮助页；生成图片验收需要你另行审阅有限预算，不访问用户资料库。</p><Link className="ui-button ui-button-secondary" to="/about">查看当前构建</Link></section><details><summary>工程服务验收（生成图片）</summary><AiServiceAcceptancePanel/></details></>}
 </div>
}
