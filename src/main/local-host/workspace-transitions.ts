import { randomUUID } from 'node:crypto'
import type { TransitionReview } from '../../shared/contracts/workspace-transition.contract'

interface Snapshot { fingerprint: string; drafts: number; nativeDrafts: number; accounts: number }
interface Review {
  owner: string; view: TransitionReview; snapshot: Snapshot; confirming: boolean
  operation(): Promise<unknown>; resolve(value: unknown): void; reject(error: unknown): void
  timer?: ReturnType<typeof setTimeout>
}
const cancelled = () => ({ success: false, code: 'TRANSITION_CANCELLED', error: '已取消，所有界面的输入继续保留。' })

/** Review belongs to its initiating client. Recovery data is kept across transitions. */
export function createWorkspaceTransitions(input: {
  snapshot(): Promise<Snapshot>
  flush(freeze?: boolean): Promise<void>
  notify(owner: string | null, frozen?: boolean): void
}) {
  let review: Review | undefined
  let preparing = false, applying = false, stopped = false
  const get = (owner: string, id: string) => {
    if (!review || review.owner !== owner || review.view.id !== id) throw Error('UNTRUSTED_TRANSITION')
    return review
  }
  const finish = (record: Review, committed = false) => {
    clearTimeout(record.timer)
    if (review === record) review = undefined
    applying = false
    if (committed && record.view.action === 'quit') stopped = true
    input.notify(null, stopped)
  }
  const armExpiry = (record: Review) => {
    clearTimeout(record.timer)
    record.timer = setTimeout(() => {
      if (review === record && !record.confirming) { finish(record); record.resolve(cancelled()) }
    }, 5 * 60_000)
  }
  return Object.freeze({
    applying: () => applying || stopped,
    /** Other global freeze owners must exclude pending and preparing reviews too. */
    busy: () => Boolean(review) || preparing || applying || stopped,
    async request(owner: string, action: TransitionReview['action'], operation: () => Promise<unknown>) {
      if (review || preparing || applying || stopped) throw Error('请先完成或取消当前切库或退出审查。')
      preparing = true
      try {
        await input.flush()
        const snapshot = await input.snapshot()
        if (action !== 'quit' && snapshot.drafts === 0 && snapshot.nativeDrafts === 0 && snapshot.accounts === 0) {
          try { await input.flush(true); const latest = await input.snapshot(); if (latest.fingerprint !== snapshot.fingerprint) throw Error('内容已变化，请重新发起切库。'); applying = true; return await operation() }
          finally { applying = false; input.notify(null) }
        }
        return await new Promise<unknown>((resolve, reject) => {
          const record: Review = { owner, operation, resolve, reject, snapshot, confirming: false,
            view: { id: `transition:${randomUUID()}`, action, drafts: snapshot.drafts, nativeDrafts: snapshot.nativeDrafts, accounts: snapshot.accounts, changed: false } }
          review = record
          armExpiry(record)
          input.notify(owner)
        })
      } finally { preparing = false }
    },
    pending(owner: string): TransitionReview | null { return review?.owner === owner ? { ...review.view } : null },
    async confirm(owner: string, id: string): Promise<{ changed: boolean }> {
      const record = get(owner, id)
      if (record.confirming) throw Error('TRANSITION_BUSY')
      record.confirming = true
      clearTimeout(record.timer)
      try {
        await input.flush(true)
        const snapshot = await input.snapshot()
        if (snapshot.fingerprint !== record.snapshot.fingerprint) {
          record.snapshot = snapshot
          record.view = { ...record.view, drafts: snapshot.drafts, nativeDrafts: snapshot.nativeDrafts, accounts: snapshot.accounts, changed: true }
          input.notify(owner)
          return { changed: true }
        }
        applying = true
        try { const result = await record.operation(); finish(record, true); record.resolve(result); return { changed: false } }
        catch (error) { finish(record); record.reject(error); throw error }
      } finally {
        record.confirming = false
        if (review === record) armExpiry(record)
        applying = false
        input.notify(review?.owner ?? null, stopped)
      }
    },
    cancel(owner: string, id: string) {
      const record = get(owner, id)
      if (record.confirming) throw Error('TRANSITION_BUSY')
      finish(record); record.resolve(cancelled())
    }
  })
}
