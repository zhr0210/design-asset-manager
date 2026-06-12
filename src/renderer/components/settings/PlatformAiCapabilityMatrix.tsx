import React from 'react'
import type {
  AiWorkerLaneProbe,
  PlatformAiWorkerProbeWithRuntimeVersions
} from '../../../shared/types/platform-ai-runtime.types'
import type { PlatformAiBranch } from '../../../shared/types/platform-ai-branch-status.types'
import {
  projectAiCapabilityStatusDisplay,
  projectAiRuntimeCapabilityMatrixDisplay
} from '../../../shared/workflows/ai-runtime-status.workflow'

export function PlatformAiCapabilityMatrix({
  probe,
  platformBranch
}: {
  probe: PlatformAiWorkerProbeWithRuntimeVersions | null
  platformBranch: PlatformAiBranch
}) {
  if (!probe) return null
  const display = projectAiRuntimeCapabilityMatrixDisplay(platformBranch)

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[12px] font-black text-slate-800 dark:text-slate-200">
            {display.title}
          </div>
          <div className="mt-1 text-[10.5px] font-bold leading-5 text-slate-500 dark:text-slate-400">
            {display.description}
          </div>
        </div>
        <div className="text-[10.5px] font-black text-slate-500 dark:text-slate-400">
          Torch {probe.torch.version ?? 'unknown'} / ONNX {probe.onnxruntime.version ?? 'unknown'}
        </div>
      </div>

      <div className="mt-3 grid gap-2 xl:grid-cols-3">
        {probe.lanes.map((lane) => (
          <PlatformAiLaneCard key={lane.id} lane={lane} />
        ))}
      </div>
    </div>
  )
}

function PlatformAiLaneCard({ lane }: { lane: AiWorkerLaneProbe }) {
  const laneStatus = projectAiCapabilityStatusDisplay(lane.status)

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
          const capabilityStatus = projectAiCapabilityStatusDisplay(capability.status)
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
