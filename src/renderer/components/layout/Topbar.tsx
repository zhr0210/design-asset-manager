import React from 'react'
import { useLocation } from 'react-router-dom'
import { Database, ShieldCheck, Zap } from 'lucide-react'
import { useDownloadStore } from '../../stores/download.store'
import { projectDownloadTaskSummaryDisplay } from '../../../shared/workflows/download-status.workflow'

const pageTitles: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/sites': '网站账号管理',
  '/browser': '素材浏览器',
  '/search': '全网素材检索',
  '/downloads': '下载队列',
  '/library': '本地素材库',
  '/tag-manager': '标签管理中心',
  '/ai-console': 'AI 控制台',
  '/settings': '系统偏好设置'
}

export default function Topbar() {
  const location = useLocation()
  const tasks = useDownloadStore((s) => s.tasks)
  const downloadSummary = projectDownloadTaskSummaryDisplay(tasks)
  const title = pageTitles[location.pathname] || '设计素材管理器'

  return (
    <header className="flex h-16 shrink-0 select-none items-center justify-between border-b border-slate-200 bg-white px-8 transition-colors dark:border-slate-800 dark:bg-slate-950">
      <h1 className="min-w-0 truncate text-[15.5px] font-bold tracking-tight text-slate-800 dark:text-slate-100">{title}</h1>

      <div className="ml-6 flex shrink-0 items-center gap-3">
        {downloadSummary.isDownloading && (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-600 dark:border-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Zap className="h-3.5 w-3.5 fill-emerald-600/10 dark:fill-emerald-400/10" />
            <span className="text-[11.5px] font-bold tracking-wide">{downloadSummary.topbarLabel}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-slate-500 transition-colors hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
          <Database className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold tracking-wide">SQLite 正常</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-indigo-600 dark:border-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold tracking-wide">安全加密</span>
        </div>
      </div>
    </header>
  )
}
