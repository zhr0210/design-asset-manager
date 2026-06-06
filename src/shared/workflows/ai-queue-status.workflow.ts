export type AiQueueStatusTone = 'good' | 'warn' | 'bad' | 'muted'

export interface AiQueueStatsLike {
  queued?: number | null
  running?: number | null
  completed?: number | null
  failed?: number | null
}

export interface AiQueueStatusRow {
  code: 'running' | 'queued' | 'completed' | 'failed'
  label: string
  value: number
  toneClass: string
}

export interface AiQueueStatusDisplay {
  running: number
  queued: number
  completed: number
  failed: number
  valueLabel: string
  captionLabel: string
  statusTone: AiQueueStatusTone
  rows: AiQueueStatusRow[]
}

export function projectAiQueueStatusDisplay(stats?: AiQueueStatsLike | null): AiQueueStatusDisplay {
  const running = safeCount(stats?.running)
  const queued = safeCount(stats?.queued)
  const completed = safeCount(stats?.completed)
  const failed = safeCount(stats?.failed)

  return {
    running,
    queued,
    completed,
    failed,
    valueLabel: `${running} 运行 / ${queued} 排队`,
    captionLabel: `${completed} 完成 / ${failed} 失败`,
    statusTone: failed > 0 ? 'warn' : 'good',
    rows: [
      { code: 'running', label: '运行中', value: running, toneClass: 'bg-emerald-500' },
      { code: 'queued', label: '排队中', value: queued, toneClass: 'bg-sky-500' },
      { code: 'completed', label: '已完成', value: completed, toneClass: 'bg-slate-400' },
      { code: 'failed', label: '失败', value: failed, toneClass: 'bg-rose-500' }
    ]
  }
}

function safeCount(value?: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}
