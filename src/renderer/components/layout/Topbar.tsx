import React from 'react'
import { useLocation } from 'react-router-dom'
import { Database, Network, ShieldCheck, Zap } from 'lucide-react'
import { useDownloadStore } from '../../stores/download.store'

export default function Topbar() {
  const location = useLocation()
  const tasks = useDownloadStore((s) => s.tasks)
  const isDownloading = tasks.some((t) => t.status === 'downloading')

  // Find page title
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return '我的仪表盘'
      case '/sites':
        return '网站账号管理器'
      case '/search':
        return '全网素材检索'
      case '/downloads':
        return '并发下载队列'
      case '/library':
        return '本地灵感素材库'
      case '/settings':
        return '系统偏好设置'
      default:
        return '设计素材管理器'
    }
  }

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 select-none">
      {/* Title */}
      <h1 className="text-[15.5px] font-bold text-slate-800 tracking-tight">
        {getPageTitle()}
      </h1>

      {/* Systems Status Badges */}
      <div className="flex items-center gap-4">
        {/* Speed Indicator */}
        {isDownloading && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 animate-pulse">
            <Zap className="w-3.5 h-3.5 fill-emerald-600/10" />
            <span className="text-[11.5px] font-bold tracking-wide">3.8 MB/s</span>
          </div>
        )}

        {/* Database Status */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
          <Database className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold tracking-wide">SQLite 正常</span>
        </div>

        {/* Safe Storage Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold tracking-wide">安全加密</span>
        </div>
      </div>
    </header>
  )
}
