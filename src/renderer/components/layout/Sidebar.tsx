import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Globe,
  Search,
  DownloadCloud,
  Image as ImageIcon,
  Settings,
  Sparkles,
  Compass
} from 'lucide-react'
import { useDownloadStore } from '../../stores/download.store'

export default function Sidebar() {
  const tasks = useDownloadStore((s) => s.tasks)
  const downloadingCount = tasks.filter((t) => t.status === 'downloading' || t.status === 'waiting').length

  const navItems = [
    { to: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
    { to: '/sites', label: '网站账号', icon: Globe },
    { to: '/browser', label: '素材浏览器', icon: Compass },
    { to: '/search', label: '传统搜索', icon: Search },
    {
      to: '/downloads',
      label: '下载队列',
      icon: DownloadCloud,
      badge: downloadingCount > 0 ? downloadingCount : undefined
    },
    { to: '/library', label: '本地素材库', icon: ImageIcon },
    { to: '/settings', label: '设置', icon: Settings }
  ]

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 border-b border-slate-100 flex items-center px-6 gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <Sparkles className="w-4.5 h-4.5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 text-[14px] leading-tight">Design Asset</span>
          <span className="text-slate-400 text-[11px] font-medium tracking-wide uppercase">Manager</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-premium ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4.5 h-4.5 stroke-[2]" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-[10.5px] font-bold rounded-full bg-brand-500 text-white animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Workspace Footer Profile */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 p-2 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow">
            DF
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[12.5px] font-semibold text-slate-700 truncate">Designer Flow</span>
            <span className="text-[10.5px] text-slate-400 font-medium truncate">~/DesignAsset/...</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
