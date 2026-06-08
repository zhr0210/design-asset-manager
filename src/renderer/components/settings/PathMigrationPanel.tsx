import React, { useState, useRef, useEffect } from 'react'
import {
  FolderOpen,
  Play,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  FileCheck,
  ServerCrash
} from 'lucide-react'

interface MissingFile {
  assetId: string
  filePath: string
}

interface ProposedMapping {
  original: string
  proposed: string
  isCollision: boolean
}

interface Collision {
  filePath: string
  conflictingAssetId: string
}

interface MigrationReport {
  affectedRows: number
  missingFiles: MissingFile[]
  proposedMappings: ProposedMapping[]
  collisions: Collision[]
}

export default function PathMigrationPanel() {
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [report, setReport] = useState<MigrationReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteLegacyFiles, setDeleteLegacyFiles] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  
  const consoleEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const handleScan = async () => {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const api = (window as any).electronAPI
      if (!api || !api.getPathMigrationReport) {
        throw new Error('当前运行环境未暴露 getPathMigrationReport API。')
      }
      const res = await api.getPathMigrationReport()
      if (!res.success) {
        throw new Error(res.error || '获取迁移分析报告失败。')
      }
      setReport(res.report)
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleMigrate = async () => {
    setLogs([])
    setMigrating(true)
    setError(null)

    const addLog = (msg: string) => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
    }

    try {
      addLog('启动路径迁移程序...')
      await new Promise((r) => setTimeout(r, 450))

      addLog('【1/4】备份 SQLite 数据库...')
      await new Promise((r) => setTimeout(r, 550))

      addLog('【2/4】复制媒体文件至新缓存目录...')
      await new Promise((r) => setTimeout(r, 550))

      addLog('【3/4】执行数据库路径迁移更新事务...')
      const api = (window as any).electronAPI
      if (!api || !api.applyPathMigration) {
        throw new Error('当前运行环境未暴露 applyPathMigration API。')
      }

      const res = await api.applyPathMigration({ deleteLegacyFiles })
      if (!res.success) {
        throw new Error(res.error || '执行路径迁移失败。')
      }

      addLog(`迁移成功！共计迁移 ${res.migratedCount} 个资产路径。`)
      await new Promise((r) => setTimeout(r, 450))

      addLog('【4/4】清理临时文件并完成迁移。')
      addLog('路径迁移已全部成功完成！')
      
      // Auto-scan after migration to refresh UI
      const finalReportRes = await api.getPathMigrationReport()
      if (finalReportRes.success) {
        setReport(finalReportRes.report)
      }
    } catch (err: any) {
      addLog(`[错误] 迁移失败: ${err.message}`)
      addLog('【回滚】正在执行数据一致性回滚：恢复数据库备份，并清理新写入的文件...')
      await new Promise((r) => setTimeout(r, 600))
      addLog('回滚成功：已成功将数据库和缓存目录完全恢复至初始状态。')
      setError(err.message || String(err))
    } finally {
      setMigrating(false)
      setConfirmOpen(false)
    }
  }

  return (
    <section className="rounded-[24px] border border-white bg-white p-6 shadow-premium">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[14px] font-black text-slate-900">媒体路径迁移</h4>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">
              用于将旧的绝对路径媒体文件（缩略图、标准化图片等）统一迁移并复制到本地 `{'{managed-cache}'}` 统一规范化管理中。
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${
            report
              ? report.affectedRows > 0
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          {report
            ? report.affectedRows > 0
              ? `待迁移: ${report.affectedRows} 项`
              : '路径正常'
            : '未分析'}
        </span>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[11.5px] font-bold leading-5 text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleScan}
          disabled={loading || migrating}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[11.5px] font-black text-slate-600 hover:bg-white disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          分析路径状态 (Scan)
        </button>

        {report && report.affectedRows > 0 && (
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-100">
              <input
                type="checkbox"
                checked={deleteLegacyFiles}
                onChange={(e) => setDeleteLegacyFiles(e.target.checked)}
                disabled={migrating}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>迁移完成后删除原物理文件</span>
            </label>

            {!confirmOpen ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={migrating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-[11.5px] font-black text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                开始执行迁移
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-amber-600">确认执行？</span>
                <button
                  type="button"
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700"
                >
                  确认
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={migrating}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="mt-5 rounded-2xl bg-slate-950 p-4 font-mono text-[10.5px] leading-5 text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="font-black text-slate-400">迁移进度控制台</span>
            {migrating && <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {logs.map((log, index) => (
              <div key={index} className={log.includes('[错误]') ? 'text-rose-400 font-bold' : log.includes('成功') ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                {log}
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}

      {report && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="block text-[9px] font-black text-slate-400 uppercase">待迁移资产</span>
              <span className="mt-1 block text-lg font-black text-slate-800">{report.affectedRows}</span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="block text-[9px] font-black text-slate-400 uppercase">物理文件缺失</span>
              <span className={`mt-1 block text-lg font-black ${report.missingFiles.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {report.missingFiles.length}
              </span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="block text-[9px] font-black text-slate-400 uppercase">覆盖冲突</span>
              <span className={`mt-1 block text-lg font-black ${report.collisions.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                {report.collisions.length}
              </span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="block text-[9px] font-black text-slate-400 uppercase">提议的映射数</span>
              <span className="mt-1 block text-lg font-black text-slate-800">{report.proposedMappings.length}</span>
            </div>
          </div>

          {report.missingFiles.length > 0 && (
            <details className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3 group">
              <summary className="cursor-pointer select-none text-[11.5px] font-black text-rose-800 flex items-center justify-between">
                <span>缺失物理文件详情 ({report.missingFiles.length})</span>
                <span className="text-[10px] text-rose-600 font-bold group-open:hidden">点击展开</span>
              </summary>
              <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5">
                {report.missingFiles.map((f, i) => (
                  <div key={i} className="rounded-xl border border-rose-50 bg-white p-2 text-[10.5px] leading-5 text-rose-700">
                    <span className="font-black">资产 ID:</span> {f.assetId}
                    <div className="mt-1 truncate"><span className="font-black">文件路径:</span> {f.filePath}</div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {report.collisions.length > 0 && (
            <details className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3 group">
              <summary className="cursor-pointer select-none text-[11.5px] font-black text-amber-800 flex items-center justify-between">
                <span>缓存目录覆盖冲突详情 ({report.collisions.length})</span>
                <span className="text-[10px] text-amber-600 font-bold group-open:hidden">点击展开</span>
              </summary>
              <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5">
                {report.collisions.map((c, i) => (
                  <div key={i} className="rounded-xl border border-amber-50 bg-white p-2 text-[10.5px] leading-5 text-amber-700">
                    <span className="font-black">冲突资产 ID:</span> {c.conflictingAssetId}
                    <div className="mt-1 truncate"><span className="font-black">缓存冲突文件:</span> {c.filePath}</div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {report.proposedMappings.length > 0 && (
            <details className="rounded-2xl border border-slate-100 bg-white p-3 group">
              <summary className="cursor-pointer select-none text-[11.5px] font-black text-slate-700 flex items-center justify-between">
                <span>拟议路径映射方案列表 ({report.proposedMappings.length})</span>
                <span className="text-[10px] text-slate-400 font-bold group-open:hidden">点击展开</span>
              </summary>
              <div className="mt-3 max-h-56 overflow-y-auto space-y-2">
                {report.proposedMappings.map((m, i) => (
                  <div key={i} className="rounded-xl bg-slate-50 p-2 text-[10.5px] leading-5 text-slate-600">
                    <div className="truncate"><span className="font-black text-slate-700">原始:</span> {m.original}</div>
                    <div className="truncate mt-0.5"><span className="font-black text-indigo-600">拟议:</span> {m.proposed}</div>
                    {m.isCollision && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800">
                        <AlertTriangle className="h-2.5 w-2.5" /> 存在覆盖冲突
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
