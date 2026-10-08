import { PageHeader, Notice, ReviewSheet } from '../components/ui/WorkspacePrimitives'
import React, { useEffect, useState } from 'react'
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
  const { tasks, jobs, review, loadError, loadDownloads, clearCompleted, prepareManaged, prepareResume, confirmManaged, dismissReview, loadManaged, cancelManaged, retryTask } = useDownloadStore()
  const [url, setUrl] = useState('')
  const [persistent, setPersistent] = useState(false)
  const [recoveryId, setRecoveryId] = useState<string | null>(null)
  const recoveryJob = jobs.find(job => job.id === recoveryId && job.state === 'recovery-required')
  useEffect(() => { let live = true; let timer: ReturnType<typeof setTimeout>; const tick = async () => { await loadManaged(); if (live) timer = setTimeout(tick, 600) }; void tick(); return () => { live = false; clearTimeout(timer) } }, [loadManaged])
  const queueSummary = projectDownloadTaskSummaryDisplay(tasks)

  return (
    <div className="ui-page ui-tool-page space-y-6 flex-1 flex flex-col">
      <PageHeader title="下载与入库" description="保存图片到素材库，并查看传输与入库状态。" actions={<><button className="ui-button ui-button-secondary" onClick={() => { void loadDownloads() }}><RefreshCw />刷新历史</button><button className="ui-button ui-button-ghost" onClick={clearCompleted}><Trash2 />清空历史完成记录</button></>} />

      <Notice>支持直连 PNG、JPEG、WebP 图片，单文件最多 32 MB。下载前确认目标库，校验成功后复制到素材库。不会发送登录 Cookie 或自动跟随重定向；历史记录不证明文件仍可用。同一会话中重试会尝试校验版本并续传，不支持时重新下载；默认临时下载在关闭应用后不保留续传数据。选择保留恢复检查点后，可重新打开此库并确认恢复。</Notice>
      <form className="ui-actions" onSubmit={event => { event.preventDefault(); void prepareManaged(url, undefined, persistent ? 'library' : 'memory') }}><input className="ui-input flex-1" aria-label="图片下载地址" type="url" required placeholder="粘贴直连图片地址" value={url} onChange={event => setUrl(event.target.value)} /><label className="ui-meta"><input type="checkbox" checked={persistent} onChange={event => setPersistent(event.target.checked)} /> 在当前库保留恢复检查点</label><button className="ui-button ui-button-primary" type="submit">准备下载</button></form>
      {review && <section className="ui-card" aria-label="确认下载入库"><h2>{review.action === 'abandon' ? '释放保留检查点' : review.recovery === 'local' ? '检查并恢复入库' : review.resumeTaskId ? '恢复下载到当前素材库' : '下载并复制到当前素材库'}</h2><p>{review.fileName} · {review.origin}</p>{review.upgradesLibrary && <Notice>确认后，当前素材库将升级为 v3，旧版本应用无法再打开此库。升级不启用 AI。取消不会升级或下载。</Notice>}{review.action === 'abandon' && <Notice>未完成的下载将被放弃，不能再续传。只释放已登记且核验匹配的检查点，已入库素材、原件和未知文件保持。登记待检查 {Math.round((review.checkpointBytes ?? 0) / 1024)} KB；不能核验的文件会保留并报告。</Notice>}{review.persistence === 'library' && review.action !== 'abandon' && <p className="ui-meta">检查点保存在当前素材库，最多占用 256 MiB；已验证 {Math.round((review.checkpointBytes ?? 0) / 1024)} KB。{review.recovery === 'local' ? '仅核验本地文件并补齐入库，不请求网络。' : '确认后请求显示的来源；版本不匹配时从头下载。'}</p>}{review.action !== 'abandon' && <p className="ui-meta">入库前校验实际图片格式。现有文件不会移动或覆盖。</p>}<div className="ui-actions"><button className="ui-button" onClick={dismissReview}>取消</button><button className="ui-button ui-button-primary" onClick={() => { void confirmManaged() }}>{review.action === 'abandon' ? '确认释放检查点' : review.recovery === 'local' ? '确认检查并恢复' : review.resumeTaskId ? '确认恢复下载' : '确认下载并入库'}</button></div></section>}
      {jobs.map(job => <section key={job.id} className="ui-card managed-download-job"><div className="preference-row"><strong>{job.fileName}</strong><span>{job.abandoned ? '已放弃' : job.restored && job.state === 'failed' ? '等待恢复下载' : ({ queued: '等待', downloading: '下载中', importing: '正在入库', completed: '已入库', failed: '失败', cancelled: '已取消', 'recovery-required': '需要恢复' })[job.state]}</span></div><p className="ui-meta">{job.origin} · {job.abandoned ? `登记保留 ${Math.round((job.retainedBytes ?? 0) / 1024)} KB` : `已接收 ${Math.round(job.receivedBytes / 1024)} KB`}{job.totalBytes ? ` / ${Math.round(job.totalBytes / 1024)} KB` : ''}</p>{job.error && <p role="alert">{job.error}</p>}<div className="ui-actions">{['queued','downloading'].includes(job.state) && <button className="ui-button" onClick={() => { void cancelManaged(job.id) }}>取消下载</button>}{['failed','cancelled'].includes(job.state) && job.persistence !== 'library' && <button className="ui-button" onClick={() => { void retryTask(job.id) }}>重试下载</button>}{job.state === 'recovery-required' && job.persistence !== 'library' && <button className="ui-button" onClick={() => setRecoveryId(job.id)}>检查并恢复入库</button>}{job.persistence === 'library' && !job.abandoned && ['failed','cancelled','recovery-required'].includes(job.state) && <button className="ui-button" onClick={() => { void prepareResume(job.id) }}>{job.recovery === 'local' ? '检查并恢复入库' : '恢复下载'}</button>}{job.persistence === 'library' && !['queued','downloading','importing'].includes(job.state) && ((!job.abandoned && job.state !== 'completed') || (job.retainedBytes ?? 0) > 0) && <button className="ui-button" onClick={() => { void prepareResume(job.id, 'abandon') }}>{job.abandoned || job.state === 'completed' ? '检查并释放保留数据' : '放弃任务并释放空间'}</button>}{job.state === 'completed' && <span className="ui-meta">已完成文件校验与入库</span>}</div></section>)}
      {recoveryJob && <ReviewSheet label="恢复已下载图片入库" onCancel={() => setRecoveryId(null)}><div className="p-6 space-y-4"><h2 className="text-lg font-semibold">恢复已下载图片入库</h2><p>{recoveryJob.fileName} · {recoveryJob.origin}</p><Notice>将核对已保留的文件和入库记录，仅在身份、哈希与当前资料库匹配时补齐入库。不会重新下载、覆盖不匹配文件或恢复回收站素材。</Notice><div className="ui-actions"><button className="ui-button ui-button-secondary" onClick={() => setRecoveryId(null)}>取消</button><button className="ui-button ui-button-primary" onClick={() => { const id = recoveryJob.id; setRecoveryId(null); void retryTask(id) }}>确认检查并恢复</button></div></div></ReviewSheet>}
      {loadError && <p role="alert" className="text-sm text-rose-600">{loadError}</p>}

      {/* Task list container */}
      <div className="flex-1 flex flex-col">
        {tasks.filter(task => !jobs.some(job => task.id === `managed-${job.id}`)).length > 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-premium overflow-hidden divide-y divide-slate-100">
            {tasks.filter(task => !jobs.some(job => task.id === `managed-${job.id}`)).map((task) => {
              const rowDisplay = projectDownloadQueueRowDisplay(task)
              const statusDisplay = rowDisplay.status
              return (
                <div
                  key={task.id}
                  className="p-5 flex items-center justify-between gap-6 hover:bg-slate-50/50 transition-premium"
                >
                  {/* Visual Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                    {rowDisplay.thumbnailSrc ? <img
                      src={rowDisplay.thumbnailSrc}
                      alt={rowDisplay.titleLabel}
                      className="w-full h-full object-cover"
                    /> : <span className="flex h-full items-center justify-center text-[10px] text-slate-400">无预览</span>}
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
                    {task.errorMessage && (
                      <p className="text-[12px] text-rose-600">{task.errorMessage}</p>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="shrink-0 flex items-center gap-2">
                    {statusDisplay.isFailed && (
                      <button
                        disabled
                        className="w-9 h-9 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center cursor-not-allowed"
                        title="历史任务请重新提交图片地址"
                        aria-label="历史任务请重新提交图片地址"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    {task.sourcePageUrl && <a
                      href={task.sourcePageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-premium"
                      title="查看来源页面"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-28 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium">
            <DownloadCloud className="w-9 h-9 stroke-[1.5]" />
            <span className="text-[12px] font-medium">{queueSummary.emptyQueueLabel}</span>
            <p className="text-[10.5px] text-slate-400 font-medium">{queueSummary.emptyQueueDetail}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
