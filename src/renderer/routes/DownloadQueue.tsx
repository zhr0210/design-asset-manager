import React from 'react'
import {
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { useDownloadStore } from '../stores/download.store'

export default function DownloadQueue() {
  const { tasks, retryTask, clearCompleted } = useDownloadStore()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
      case 'failed':
        return <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
      case 'downloading':
        return <Loader2 className="w-4.5 h-4.5 text-brand-500 animate-spin" />
      default:
        return <ClockIcon className="w-4.5 h-4.5 text-slate-400" />
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">已完成</span>
      case 'failed':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold border border-rose-100">失败</span>
      case 'downloading':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold border border-indigo-100">下载中</span>
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold border border-slate-200">排队等待</span>
    }
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col select-none">
      {/* Header controls bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-slate-400 text-[12px] font-medium">查看您已提交的图片资源并发抓取下载任务进程状态。</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearCompleted}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-semibold text-[12.5px] transition-premium flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>清空已完成</span>
          </button>
        </div>
      </div>

      {/* Task list container */}
      <div className="flex-1 flex flex-col">
        {tasks.length > 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-premium overflow-hidden divide-y divide-slate-100">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-5 flex items-center justify-between gap-6 hover:bg-slate-50/50 transition-premium"
              >
                {/* Visual Thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                  <img
                    src={task.thumbnailUrl}
                    alt={task.assetTitle}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Task Meta and Progress */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-[13px] font-bold text-slate-700 truncate">{task.assetTitle}</h4>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0 bg-slate-50 px-2 py-0.5 rounded uppercase">
                        {task.sourceSiteName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.fileSize && (
                        <span className="text-[10.5px] font-semibold text-slate-400">
                          {(task.fileSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                      {getStatusLabel(task.status)}
                    </div>
                  </div>

                  {/* Progress slide bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          task.status === 'completed'
                            ? 'bg-emerald-500'
                            : task.status === 'failed'
                            ? 'bg-rose-500'
                            : 'bg-brand-500'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 w-8 text-right shrink-0">
                      {task.progress}%
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="shrink-0 flex items-center gap-2">
                  {task.status === 'failed' && (
                    <button
                      onClick={() => retryTask(task.id)}
                      className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-premium shadow-sm shadow-indigo-500/5"
                      title="重试下载"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <a
                    href={task.sourcePageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-premium"
                    title="查看来源页面"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-28 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium">
            <DownloadCloud className="w-9 h-9 stroke-[1.5]" />
            <span className="text-[12px] font-medium">当前没有任何下载队列任务</span>
            <p className="text-[10.5px] text-slate-400 font-medium">您在“素材搜索”中发起的下载项目会在本队列中显示进度。</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
  )
}
