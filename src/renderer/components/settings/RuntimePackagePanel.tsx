import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  Loader2,
  Package,
  Play,
  X
} from 'lucide-react'
import type {
  RuntimePackageExecuteSelectionRequest,
  RuntimePackageExecuteSelectionResponse,
  RuntimePackageExecutionSnapshotPreview,
  RuntimePackageGetExecutionStatusRequest,
  RuntimePackageGetExecutionStatusResponse,
  RuntimePackageIpcErrorCode,
  RuntimePackageSelectLocalManifestResponse,
  RuntimePackageSelectionPreview
} from '../../../shared/contracts/runtime-package.contract'
import {
  clampRuntimePackagePercent,
  projectRuntimePackageErrorDisplay,
  projectRuntimePackageExecutionDisplay,
  projectRuntimePackageIdleDisplay,
  projectRuntimePackageSelectionDisplay
} from '../../../shared/workflows/runtime-package-product.workflow'

const POLL_INTERVAL_MS = 500

type RuntimePackageApi = {
  selectLocalManifest: () => Promise<RuntimePackageSelectLocalManifestResponse>
  executeSelection: (request: RuntimePackageExecuteSelectionRequest) => Promise<RuntimePackageExecuteSelectionResponse>
  getExecutionStatus: (request: RuntimePackageGetExecutionStatusRequest) => Promise<RuntimePackageGetExecutionStatusResponse>
}

function getRuntimePackageApi(): RuntimePackageApi | null {
  const electronAPI = (window as unknown as { electronAPI?: { runtimePackage?: RuntimePackageApi } }).electronAPI
  return electronAPI?.runtimePackage ?? null
}

export default function RuntimePackagePanel() {
  const [selection, setSelection] = useState<RuntimePackageSelectionPreview | null>(null)
  const [execution, setExecution] = useState<RuntimePackageExecutionSnapshotPreview | null>(null)
  const [errorCode, setErrorCode] = useState<RuntimePackageIpcErrorCode | undefined>()
  const [failed, setFailed] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const display = useMemo(() => {
    if (failed) return projectRuntimePackageErrorDisplay(errorCode)
    if (execution) return projectRuntimePackageExecutionDisplay(execution)
    if (selection) return projectRuntimePackageSelectionDisplay(selection)
    return projectRuntimePackageIdleDisplay()
  }, [errorCode, execution, failed, selection])

  useEffect(() => {
    const executionId = execution?.executionId
    if (!executionId || execution.terminal) return

    let disposed = false
    let timer: number | undefined

    const poll = async () => {
      const api = getRuntimePackageApi()
      if (!api) {
        if (!disposed) {
          setErrorCode(undefined)
          setFailed(true)
        }
        return
      }
      try {
        const response = await api.getExecutionStatus({ executionId })
        if (disposed) return
        if (!response.success) {
          setErrorCode(response.errorCode)
          setFailed(true)
          return
        }
        setExecution(response.data)
        if (!response.data.terminal) {
          timer = window.setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch {
        if (!disposed) {
          setErrorCode(undefined)
          setFailed(true)
        }
      }
    }

    timer = window.setTimeout(poll, POLL_INTERVAL_MS)
    return () => {
      disposed = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [execution?.executionId, execution?.terminal])

  const handleSelect = async () => {
    const api = getRuntimePackageApi()
    if (!api) {
      setErrorCode(undefined)
      setFailed(true)
      return
    }
    setSelecting(true)
    setConfirming(false)
    setErrorCode(undefined)
    setFailed(false)
    try {
      const response = await api.selectLocalManifest()
      if (!response.success) {
        setSelection(null)
        setExecution(null)
        setErrorCode(response.errorCode)
        setFailed(true)
        return
      }
      setSelection(response.data)
      setExecution(null)
    } catch {
      setSelection(null)
      setExecution(null)
      setErrorCode(undefined)
      setFailed(true)
    } finally {
      setSelecting(false)
    }
  }

  const handleExecute = async () => {
    const api = getRuntimePackageApi()
    if (!api || !selection) return
    setExecuting(true)
    setErrorCode(undefined)
    setFailed(false)
    try {
      const response = await api.executeSelection({
        selectionId: selection.selectionId,
        confirmed: true
      })
      if (!response.success) {
        setErrorCode(response.errorCode)
        setFailed(true)
        return
      }
      setExecution(response.data)
      setConfirming(false)
    } catch {
      setErrorCode(undefined)
      setFailed(true)
    } finally {
      setExecuting(false)
    }
  }

  const clearSelection = () => {
    setSelection(null)
    setExecution(null)
    setErrorCode(undefined)
    setFailed(false)
    setConfirming(false)
  }

  const progress = clampRuntimePackagePercent(execution?.percent ?? 0)
  const busy = selecting || executing || Boolean(execution && !execution.terminal)

  return (
    <section
      data-testid="runtime-package-panel"
      className="min-h-[220px] w-full min-w-0 max-w-[calc(100vw-32px)] overflow-hidden rounded-[22px] border border-white bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-black text-slate-900 dark:text-slate-50">本地运行时包</h3>
          </div>
        </div>
        <span
          data-testid="runtime-package-status"
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${display.badgeClass}`}
        >
          {display.label}
        </span>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-[11px] font-bold leading-5 text-slate-600 dark:text-slate-300">
            {display.detail}
          </div>
          <button
            type="button"
            data-testid="runtime-package-select"
            onClick={handleSelect}
            disabled={busy}
            title="选择本地运行时包清单"
            className="inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {selecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
            {selection || execution ? '选择其他清单' : '选择清单'}
          </button>
        </div>

        {selection && !execution && (
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-2 sm:grid-cols-3">
              <PreviewValue label="包 ID" value={selection.packageId} />
              <PreviewValue label="安装模式" value={selection.installMode} />
              <PreviewValue label="有效期" value={new Date(selection.expiresAt).toLocaleString('zh-CN')} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <button
                    type="button"
                    data-testid="runtime-package-confirm"
                    onClick={handleExecute}
                    disabled={executing}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    确认安装
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={executing}
                    title="返回预览"
                    className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    data-testid="runtime-package-install"
                    onClick={() => setConfirming(true)}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-[11px] font-black text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950"
                  >
                    <Play className="h-3.5 w-3.5" />
                    安装运行时包
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    title="清除当前选择"
                    className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {selection?.warnings.length ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10.5px] font-bold leading-5 text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{selection.warnings.join('；')}</span>
          </div>
        ) : null}

        {execution && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3 text-[10px] font-black text-slate-500">
              <span>{execution.packageId}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                data-testid="runtime-package-progress"
                className={`h-full rounded-full transition-[width] duration-300 ${display.progressClass}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function PreviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9.5px] font-black text-slate-400">{label}</div>
      <div className="mt-1 truncate text-[10.5px] font-black text-slate-700 dark:text-slate-200" title={value}>
        {value}
      </div>
    </div>
  )
}
