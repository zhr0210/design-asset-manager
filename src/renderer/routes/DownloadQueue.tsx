import React from 'react'
import {
  DownloadCloud,
  RefreshCw,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { useDownloadStore } from '../stores/download.store'
import {
  projectDownloadQueueRowDisplay,
  projectDownloadTaskSummaryDisplay
} from '../../shared/workflows/download-status.workflow'

export default function DownloadQueue() {
  const { tasks, retryTask, clearCompleted } = useDownloadStore()
  const queueSummary = projectDownloadTaskSummaryDisplay(tasks)

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
            {tasks.map((task) => {
              const rowDisplay = projectDownloadQueueRowDisplay(task)
              const statusDisplay = rowDisplay.status
              return (
                <div
                  key={task.id}
                  className="p-5 flex items-center justify-between gap-6 hover:bg-slate-50/50 transition-premium"
                >
                  {/* Visual Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                    <img
                      src={rowDisplay.thumbnailSrc}
                      alt={rowDisplay.titleLabel}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Task Meta and Progress */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="text-[13px] font-bold text-slate-700 truncate">{rowDisplay.titleLabel}</h4>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0 bg-slate-50 px-2 py-0.5 rounded uppercase">
                          {rowDisplay.sourceSiteLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {rowDisplay.hasFileSize && (
                          <span className="text-[10.5px] font-semibold text-slate-400">
                            {rowDisplay.fileSizeLabel}
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusDisplay.badgeClass}`}>
                          {statusDisplay.label}
                        </span>
                      </div>
                    </div>

                    {/* Progress slide bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${statusDisplay.progressClass}`}
                          style={{ width: `${rowDisplay.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 w-8 text-right shrink-0">
                        {rowDisplay.progressLabel}
                      </span>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="shrink-0 flex items-center gap-2">
                    {statusDisplay.isFailed && (
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
              )
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-28 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium">
            <DownloadCloud className="w-9 h-9 stroke-[1.5]" />
            <span className="text-[12px] font-medium">{queueSummary.emptyQueueLabel}</span>
            <p className="text-[10.5px] text-slate-400 font-medium">{queueSummary.emptyQueueDetail}</p>
          </div>
        )}
      </div>
    </div>
  )
}
