import React from 'react'
import type { MacOSAiWorkerProbeResult } from '../../../shared/types/macos-ai-runtime.types'
import { projectMacOSAiCapabilityStatusDisplay } from '../../../shared/workflows/ai-runtime-status.workflow'

export function MacOSAiCapabilityMatrix({ probe }: { probe: MacOSAiWorkerProbeResult | null }) {
  if (!probe) return null

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[12px] font-black text-slate-800 dark:text-slate-200">macOS 细项能力矩阵</div>
          <div className="mt-1 text-[10.5px] font-bold leading-5 text-slate-500 dark:text-slate-400">
            区分依赖可用、依赖缺失、证据不足与真正尚未实现的路线，避免把探测缺口误报为功能规划。
          </div>
        </div>
        <div className="text-[10.5px] font-black text-slate-500 dark:text-slate-400">
          Torch {probe.torch.version ?? 'unknown'} / ONNX {probe.onnxruntime.version ?? 'unknown'} / MLX {probe.mlx.version ?? 'unknown'}
        </div>
      </div>

      <div className="mt-3 grid gap-2 xl:grid-cols-3">
        {probe.lanes.map((lane) => (
          <MacOSAiLaneCard key={lane.id} lane={lane} />
        ))}
      </div>
    </div>
  )
}

function MacOSAiLaneCard({ lane }: { lane: NonNullable<MacOSAiWorkerProbeResult['lanes']>[number] }) {
  const laneStatus = projectMacOSAiCapabilityStatusDisplay(lane.status)

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-[11px] font-black text-slate-800 dark:text-slate-200">{lane.label}</span>
          <span className={`shrink-0 rounded-full border px-1.5 py-px text-[8.5px] font-black ${laneStatus.badgeClass}`}>
            {laneStatus.label}
          </span>
        </div>
      </div>

      <div className="grid gap-1 sm:grid-cols-2">
        {lane.capabilities.map((capability) => {
          const capabilityStatus = projectMacOSAiCapabilityStatusDisplay(capability.status)
          return (
            <div key={capability.id} className="flex items-center justify-between gap-1 rounded-md border border-slate-100 bg-slate-50/70 px-2 py-1 dark:border-slate-800 dark:bg-slate-950">
              <div className="min-w-0 truncate">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{capability.label}</span>
                <span className="ml-1 text-[8.5px] font-medium text-slate-400 dark:text-slate-500">
                  {capability.modelFamily ?? capability.backend ?? capability.role}
                </span>
              </div>
              <span className={`shrink-0 rounded-full border px-1.5 py-px text-[8px] font-black ${capabilityStatus.badgeClass}`}>
                {capabilityStatus.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
