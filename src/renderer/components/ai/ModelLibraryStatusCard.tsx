import React, { useEffect, useState } from 'react'
import { Boxes, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { APP_MODEL_LIBRARY_ROUTE } from
  '../../../shared/workflows/app-navigation.workflow'
import { createElectronModelLibraryWorkspaceModule } from
  '../../modules/model-library-workspace/electron-model-library-workspace.adapter'
import {
  type ModelLibraryAiConsoleSnapshot
} from '../../modules/model-library-workspace/model-library-workspace.module'

type StatusState = { readonly state: 'loading' } | ModelLibraryAiConsoleSnapshot

export default function ModelLibraryStatusCard() {
  const [module] = useState(createElectronModelLibraryWorkspaceModule)
  const [status, setStatus] = useState<StatusState>({ state: 'loading' })

  useEffect(() => {
    let active = true
    void module.loadAiConsoleSummary().then((snapshot) => {
      if (active) setStatus(snapshot)
    })
    return () => {
      active = false
    }
  }, [module])

  const summary = status.state === 'ready' ? status.summary : null
  const catalogLabel = summary?.catalog.state === 'available'
    ? `${String(summary.catalog.familyCount ?? 0)} 个系列 · ${String(summary.catalog.variantCount ?? 0)} 个变体`
    : 'Official Catalog 不可用'
  const storageLabel = summary?.storage.state === 'available'
    ? '模型存储可用'
    : summary?.storage.state === 'setup-required'
      ? '模型存储尚未设置'
      : summary?.storage.state === 'attention-required'
        ? '模型存储需要处理'
        : summary?.storage.state === 'not-observed'
          ? '模型存储尚未检查'
          : '状态暂不可用'

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-300">
            <Boxes className="h-4 w-4" />
            <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">
              模型库
            </h3>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            {catalogLabel}
          </p>
          <p className="mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">
            {storageLabel}
          </p>
        </div>
        <Link
          to={APP_MODEL_LIBRARY_ROUTE.path}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300"
        >
          打开模型库
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}
