import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Compass,
  Cpu,
  DownloadCloud,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  Tag
} from 'lucide-react'
import { useDownloadStore } from '../../stores/download.store'
import { useUIStore } from '../../stores/ui.store'

const navItems = [
  { to: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { to: '/sites', label: '网站账号', icon: Globe },
  { to: '/browser', label: '素材浏览器', icon: Compass },
  { to: '/search', label: '传统搜索', icon: Search },
  { to: '/downloads', label: '下载队列', icon: DownloadCloud, hasBadge: true },
  { to: '/library', label: '本地素材库', icon: ImageIcon },
  { to: '/tag-manager', label: '标签管理', icon: Tag },
  { to: '/ai-console', label: 'AI 控制台', icon: Cpu },
  { to: '/settings', label: '设置', icon: Settings }
]

export default function Sidebar() {
  const [isHovered, setIsHovered] = useState(false)
  const tasks = useDownloadStore((s) => s.tasks)
  const downloadingCount = tasks.filter((task) => task.status === 'downloading' || task.status === 'waiting').length
  const { theme, toggleTheme } = useUIStore()

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed bottom-0 left-0 top-0 z-50 flex h-full w-64 shrink-0 select-none flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 ${
        isHovered ? 'translate-x-0 shadow-2xl shadow-slate-900/15' : '-translate-x-[calc(100%-12px)]'
      }`}
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-100 px-6 dark:border-slate-900">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white shadow-md shadow-brand-500/20">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold leading-tight text-slate-800 dark:text-slate-200">Design Asset</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Manager</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {navItems.map((item) => {
          const Icon = item.icon
          const badge = item.hasBadge && downloadingCount > 0 ? downloadingCount : undefined
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `flex min-h-[40px] items-center justify-between rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-premium ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-slate-200'
                }`
              }
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="h-4.5 w-4.5 shrink-0 stroke-[2]" />
                <span className="truncate">{item.label}</span>
              </div>
              {badge !== undefined && <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10.5px] font-bold text-white">{badge}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="flex shrink-0 justify-center border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-900 dark:bg-slate-950/20">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'light' ? '切换至深色模式' : '切换至浅色模式'}
          className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm outline-none transition-premium hover:border-brand-200 hover:bg-slate-50 hover:text-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-brand-900 dark:hover:bg-slate-850 dark:hover:text-brand-400"
        >
          {theme === 'light' ? <Moon className="h-4.5 w-4.5 stroke-[2]" /> : <Sun className="h-4.5 w-4.5 stroke-[2] text-amber-500" />}
        </button>
      </div>

      <div className={`pointer-events-none absolute bottom-0 right-0 top-0 flex w-3 items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
        <div className="h-16 w-[3px] rounded-full bg-brand-500/80 shadow-[0_0_8px_rgba(99,102,241,0.55)]" />
      </div>
    </aside>
  )
}
