import React from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Inbox, Folder, PanelsTopLeft, Trash2, Settings2, Sparkles, Download, Moon, Sun } from 'lucide-react'
import { appPath } from '../../../shared/workflows/app-navigation.workflow'
import { useUIStore } from '../../stores/ui.store'
import GlobalNavigationMenu from './GlobalNavigationMenu'

type Destination = 'all' | 'folders' | 'work' | 'trash'
const destinations: { id: Destination; name: string; Icon: typeof Inbox }[] = [
  { id:'all', name:'全部', Icon:Inbox }, { id:'folders', name:'文件夹', Icon:Folder },
  { id:'work', name:'工作模式', Icon:PanelsTopLeft }, { id:'trash', name:'回收站', Icon:Trash2 }
]
export default function WorkspaceRail({ destination, onDestination, onManage }: {
  destination?: Destination; onDestination?(value: Destination): void; onManage?(): void
}) {
  const navigate = useNavigate(), location = useLocation()
  const { theme, toggleTheme } = useUIStore()
  const open = (value: Destination) => onDestination ? onDestination(value) : navigate('/library', { state:{ libraryDestination:value } })
  return <aside className="app-navigation icon-rail" aria-label="主导航" data-testid="library-sidebar">
    <a href="#" className="rail-brand" aria-label="资料库管理" onClick={event => {
      event.preventDefault(); if (onManage) onManage(); else navigate('/library', { state:{ libraryManage:true } })
    }}><span className="brand-symbol"><PanelsTopLeft size={21} /></span></a>
    <nav aria-label="工作区导航">{destinations.map(({ id, name, Icon }) =>
      <button key={id} type="button" title={name} aria-label={name} aria-pressed={destination===id}
        className={destination===id?'active':''} onClick={()=>open(id)}><Icon size={22} /><span className="rail-tooltip">{name}</span></button>
    )}</nav>
    <div className="rail-bottom">
      <NavLink to={appPath('ai-console')} title="AI 与模型" aria-label="AI 与模型" className={'rail-link '+(location.pathname.startsWith('/ai/')?'active':'')}><Sparkles /><span className="rail-tooltip">AI 与模型</span></NavLink>
      <NavLink to={appPath('downloads')} title="任务中心" aria-label="任务中心" className={({isActive})=>'rail-link '+(isActive?'active':'')}><Download /><span className="rail-tooltip">任务中心</span></NavLink>
      <NavLink to={appPath('settings')} title="设置" aria-label="打开设置" className={({isActive})=>'rail-link '+(isActive?'active':'')}><Settings2 /><span className="rail-tooltip">设置</span></NavLink>
      <GlobalNavigationMenu />
      <button type="button" aria-label="切换明暗外观" title="切换明暗外观" onClick={toggleTheme}>{theme==='dark'?<Sun />:<Moon />}<span className="rail-tooltip">切换明暗外观</span></button>
    </div>
  </aside>
}
