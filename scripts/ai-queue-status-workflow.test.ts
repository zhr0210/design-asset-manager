import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  type AiQueueStatsLike,
  projectAiQueueStatusDisplay
} from '../src/shared/workflows/ai-queue-status.workflow'

const emptyDisplay = projectAiQueueStatusDisplay(null)
assert.equal(emptyDisplay.valueLabel, '0 运行 / 0 排队')
assert.equal(emptyDisplay.captionLabel, '0 完成 / 0 失败')
assert.equal(emptyDisplay.statusTone, 'good')
assert.deepEqual(emptyDisplay.rows.map((row) => ({
  code: row.code,
  label: row.label,
  value: row.value,
  toneClass: row.toneClass
})), [
  { code: 'running', label: '运行中', value: 0, toneClass: 'bg-emerald-500' },
  { code: 'queued', label: '排队中', value: 0, toneClass: 'bg-sky-500' },
  { code: 'completed', label: '已完成', value: 0, toneClass: 'bg-slate-400' },
  { code: 'failed', label: '失败', value: 0, toneClass: 'bg-rose-500' }
])

const activeQueueStats: AiQueueStatsLike = {
  running: 2,
  queued: 3,
  completed: 13,
  failed: 1
}
const activeDisplay = projectAiQueueStatusDisplay(activeQueueStats)

assert.equal(activeDisplay.valueLabel, '2 运行 / 3 排队')
assert.equal(activeDisplay.captionLabel, '13 完成 / 1 失败')
assert.equal(activeDisplay.statusTone, 'warn')
assert.deepEqual(activeDisplay.rows.map((row) => row.value), [2, 3, 13, 1])

const normalizedDisplay = projectAiQueueStatusDisplay({
  running: 2.9,
  queued: -1,
  completed: Number.NaN,
  failed: null
})
assert.deepEqual([normalizedDisplay.running, normalizedDisplay.queued, normalizedDisplay.completed, normalizedDisplay.failed], [2, 0, 0, 0])
assert.equal(normalizedDisplay.statusTone, 'good')

const aiConsoleSource = await fs.readFile('src/renderer/routes/AiConsolePage.tsx', 'utf8')
assert.match(aiConsoleSource, /projectAiQueueStatusDisplay/)
assert.match(aiConsoleSource, /AiQueueStatsLike/)
assert.match(aiConsoleSource, /const queueStats: AiQueueStatsLike/)
assert.match(aiConsoleSource, /function TaskListPreview\(\{ queueStats \}: \{ queueStats: AiQueueStatsLike \}\)/)
assert.match(aiConsoleSource, /queueStats: AiQueueStatsLike/)
assert.doesNotMatch(aiConsoleSource, /queueStats: any/)
assert.doesNotMatch(aiConsoleSource, /const rows = \[/)
assert.doesNotMatch(aiConsoleSource, /queueStats\.failed \? 'warn' : 'good'/)
assert.doesNotMatch(aiConsoleSource, /\$\{queueStats\.running \|\| 0\} 运行/)
assert.doesNotMatch(aiConsoleSource, /\$\{props\.queueStats\.running \|\| 0\} 运行/)

console.log('ai-queue-status-workflow passed')
