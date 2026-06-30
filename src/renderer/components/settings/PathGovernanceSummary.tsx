import React, { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, FolderTree, ShieldAlert } from 'lucide-react'
import type { DoctorReport } from '../../../shared/types/doctor.types'
import { projectDoctorPathSummaryDisplay, type DoctorPathEntryDisplay } from '../../../shared/workflows/doctor-display.workflow'

export function PathGovernanceSummary({ report }: { report: DoctorReport | null }) {
  const summary = useMemo(() => projectDoctorPathSummaryDisplay(report), [report])

  if (summary.empty) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="flex items-center gap-2 text-[12px] font-black text-slate-700">
          <FolderTree className="h-4 w-4 text-slate-400" />
          {summary.emptyTitle}
        </div>
        <p className="mt-2 text-[10.5px] font-semibold leading-5 text-slate-400">{summary.emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-black text-slate-800">
            <FolderTree className="h-4 w-4 text-brand-500" />
            {summary.title}
          </div>
          <p className="mt-1 text-[10.5px] font-semibold leading-5 text-slate-400">
            {summary.description}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${summary.statusBadgeClass}`}>
          {summary.statusLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        {summary.paths.map((item) => (
          <PathRow key={item.key} item={item} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        <SummaryBox
          icon={AlertTriangle}
          label={summary.warningTitle}
          items={summary.warnings}
          empty={summary.warningEmptyLabel}
        />
        <SummaryBox
          icon={ShieldAlert}
          label={summary.permissionTitle}
          items={summary.permissions}
          empty={summary.permissionEmptyLabel}
        />
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer select-none text-[10px] font-black text-slate-400 transition-colors hover:text-slate-600">
          {summary.detailsTitle}
        </summary>
        <div className="mt-2 space-y-2 text-[10px] font-semibold leading-5 text-slate-500">
          {summary.details.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              {item}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

function PathRow({ item }: { item: DoctorPathEntryDisplay }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-[10px] font-black text-slate-500">{item.key}</span>
      <span className="truncate text-[10px] font-semibold text-slate-500" title={item.pathLabel}>
        {item.pathLabel}
      </span>
      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${item.statusBadgeClass}`}>
        {item.statusLabel}
      </span>
    </div>
  )
}

function SummaryBox({
  icon: Icon,
  label,
  items,
  empty
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  items: string[]
  empty: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 space-y-1">
        {(items.length > 0 ? items : [empty]).slice(0, 5).map((item) => (
          <p key={item} className="text-[10px] font-semibold leading-5 text-slate-500">
            {item}
          </p>
        ))}
      </div>
    </div>
  )
}
