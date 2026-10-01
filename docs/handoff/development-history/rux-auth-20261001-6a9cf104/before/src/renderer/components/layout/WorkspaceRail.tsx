import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { NavLink } from 'react-router-dom'
import { ArchiveRestore, Boxes, FolderOpen, Layers3, Settings2, Tags } from 'lucide-react'

const destinations = [
  { path: '/library', label: '我的素材', name: '素材工作区', icon: FolderOpen },
  { path: '/connected-libraries', label: 'Eagle 连接库', name: 'Eagle 连接库', icon: Boxes },
  { path: '/legacy-library', label: '找回旧素材', name: '找回旧素材', icon: ArchiveRestore },
  { path: '/tag-manager', label: '标签', name: '标签管理', icon: Tags }
]

export default function WorkspaceRail() {
  const reduced = useReducedMotion()
  return <nav className="workspace-rail" aria-label="工作区导航">
    <NavLink to="/library" className="workspace-brand" aria-label="Design Asset Manager 首页">
      <span className="workspace-brand-mark"><Layers3 size={23} strokeWidth={1.5} /></span>
      <span className="workspace-brand-name">Design Asset<br />Manager<span className="workspace-brand-caption">你的创作素材空间</span></span>
    </NavLink>
    <div className="workspace-rail-heading">资料库</div>
    {destinations.map(({ path, label, name, icon: Icon }) => <NavLink key={path} to={path} data-library-dock-button={path === '/library' ? 'true' : undefined} className="workspace-rail-link" aria-label={name} title={name}>
      {({ isActive }) => <>{isActive && <motion.span className="workspace-nav-highlight" layoutId="workspace-navigation" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }} />}<Icon aria-hidden="true" /><span>{label}</span></>}
    </NavLink>)}
    <div className="flex-1" />
    <div className="workspace-rail-footer"><NavLink to="/settings" className="workspace-rail-link" aria-label="设置" title="设置"><Settings2 aria-hidden="true" /><span>设置</span></NavLink></div>
  </nav>
}
