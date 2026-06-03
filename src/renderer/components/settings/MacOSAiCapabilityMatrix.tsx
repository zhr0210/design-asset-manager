import React from 'react'
import type { MacOSAiWorkerProbeResult, MacOSAiCapabilityStatus } from '../../../shared/types/macos-ai-runtime.types'

const STATUS_LABELS: Record<MacOSAiCapabilityStatus, string> = {
  ready: '就绪',
  optional: '可选',
  planned: '规划中',
  fallback: '回退',
  unavailable: '不可用'
}

const STATUS_STYLES: Record<MacOSAiCapabilityStatus, string> = {
  ready: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  optional: 'border-sky-100 bg-sky-50 text-sky-700',
  planned: 'border-amber-100 bg-amber-50 text-amber-700',
  fallback: 'border-slate-200 bg-slate-50 text-slate-600',
  unavailable: 'border-rose-100 bg-rose-50 text-rose-700'
}

export function MacOSAiCapabilityMatrix({ probe }: { probe: MacOSAiWorkerProbeResult | null }) {
  if (!probe) return null

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[12px] font-black text-slate-800 dark:text-slate-200">macOS 细项能力矩阵</div>
          <div className="mt-1 text-[10.5px] font-bold leading-5 text-slate-500 dark:text-slate-400">
            把 Python MPS、ONNX Runtime、CLIP/SigLIP ONNX 以及 Llama 路线拆到可见的 optional 能力上，方便确认下一步该补哪一段。
          </div>
        </div>
        <div className="text-[10.5px] font-black text-slate-500 dark:text-slate-400">
          Torch {probe.torch.version ?? 'unknown'} / ONNX {probe.onnxruntime.version ?? 'unknown'} / MLX {probe.mlx.version ?? 'unknown'}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {probe.lanes.map((lane) => (
          <div key={lane.id} className="rounded-xl border border-white bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-black text-slate-900 dark:text-slate-50">{lane.label}</div>
                <div className="mt-1 text-[10.5px] font-bold leading-5 text-slate-500 dark:text-slate-400">{lane.summary}</div>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${STATUS_STYLES[lane.status]}`}>
                {STATUS_LABELS[lane.status]}
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              {lane.capabilities.map((capability) => (
                <div key={capability.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <div className="min-w-0">
                    <div className="truncate text-[10.5px] font-black text-slate-700 dark:text-slate-200">{capability.label}</div>
                    <div className="mt-0.5 truncate text-[9.5px] font-bold text-slate-400 dark:text-slate-500">
                      {capability.modelFamily ?? capability.backend ?? capability.role}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${STATUS_STYLES[capability.status]}`}>
                    {STATUS_LABELS[capability.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
