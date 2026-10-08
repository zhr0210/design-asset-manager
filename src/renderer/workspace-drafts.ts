import type { WorkspaceDraftInput, WorkspaceDraftRecord, WorkspaceDraftScope, WorkspaceDraftOrder, WorkspaceDraftRemoveInput, NativeDraftBridge } from '../shared/contracts/workspace-draft.contract'
import { getWorkspaceClient } from './workspace-client'

const pending = new Map<string, WorkspaceDraftInput | WorkspaceDraftRemoveInput>()
const failed = new Map<string, WorkspaceDraftInput | WorkspaceDraftRemoveInput>()
const restored = new Map<string, WorkspaceDraftRecord>()
const local = new Map<string, WorkspaceDraftInput>()
const loaded = new Set<string>()
const acknowledged = new Set<string>()
const inFlight = new Map<string, WorkspaceDraftInput | WorkspaceDraftRemoveInput>()
const archived = new Map<string, WorkspaceDraftInput>()
const discardedThrough = new Map<string, number>()
const archiveStorage = 'dam-unsent-recovery.v1'
let viewEpoch = 0
let navigation: WorkspaceDraftRecord | undefined
let queue: Promise<void> = Promise.resolve()
let timer: ReturnType<typeof setTimeout> | undefined
const draftWriterId = crypto.randomUUID()
let draftSequence = 0
let writerReady: Promise<void> | undefined
/** Number at the user action, before a request can be delayed in a queue. */
export function nextWorkspaceDraftOrder(): WorkspaceDraftOrder {
  if (draftSequence === Number.MAX_SAFE_INTEGER) throw Error('DRAFT_SEQUENCE_EXHAUSTED')
  return { writerId: draftWriterId, sequence: ++draftSequence }
}
/** A document registers once; reload creates a new writer and invalidates old requests. */
export function prepareWorkspaceDraftWriter(): Promise<void> {
  if (!writerReady) {
    const api = getWorkspaceClient()?.transitions ?? (typeof window === 'undefined' ? undefined : (window as Window & { nativeDraftsAPI?: NativeDraftBridge }).nativeDraftsAPI)
    if (!api) return Promise.reject(Error('DRAFT_API_UNAVAILABLE'))
    const current = Promise.resolve().then(() => api.ready({ draftWriterId }))
    writerReady = current
    void current.catch(() => { if (writerReady === current) writerReady = undefined })
  }
  return writerReady
}
const keyOf = (scope: WorkspaceDraftScope) => JSON.stringify([scope.libraryIdentity, scope.generation, scope.kind, scope.entityId])
const announce = () => { if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('workspace-draft-status')) }
const persistArchive = () => { try { window.sessionStorage.setItem(archiveStorage, JSON.stringify([...archived.values()])) } catch { /* In-memory input remains available. */ } }
const archive = (draft: WorkspaceDraftInput | WorkspaceDraftRemoveInput) => {
  if ('value' in draft) { archived.set(keyOf(draft), draft); persistArchive() }
}
try {
  const saved = typeof window === 'undefined' ? null : window.sessionStorage.getItem(archiveStorage)
  if (saved && saved.length < 4 * 1024 * 1024) for (const draft of JSON.parse(saved)) {
    if (draft && typeof draft.libraryIdentity === 'string' && typeof draft.generation === 'string' && typeof draft.entityId === 'string' && ['description','prompt','notebook','ocr','work-set'].includes(draft.kind) && 'value' in draft) archived.set(keyOf(draft), draft)
  }
} catch { /* Invalid tab storage cannot authorize any operation. */ }
export function archivedWorkspaceDrafts(): WorkspaceDraftInput[] { return [...archived.values()].map(draft => structuredClone(draft)) }
export function forgetArchivedWorkspaceDraft(scope: WorkspaceDraftScope): void { archived.delete(keyOf(scope)); persistArchive(); announce() }
export function workspaceDraftStatus(): 'pending' | 'failed' | 'saved' | 'none' {
  if (failed.size) return 'failed'
  if (pending.size || inFlight.size) return 'pending'
  return acknowledged.size ? 'saved' : 'none'
}

/** Keystrokes stay local; bounded product drafts are sent to profile storage. */
export function holdWorkspaceDraft(scope: WorkspaceDraftScope, value: unknown, base: unknown): void {
  const key = keyOf(scope)
  loaded.add(key)
  acknowledged.delete(key)
  const input = { ...scope, value: structuredClone(value), base: structuredClone(base), ...nextWorkspaceDraftOrder() }
  local.set(key, input); pending.set(key, input)
  clearTimeout(timer); timer = setTimeout(() => { void flushWorkspaceDrafts().catch(() => {}) }, 400)
  announce()
}
export function removeWorkspaceDraft(scope: WorkspaceDraftScope): void {
  const key = keyOf(scope)
  local.delete(key); loaded.delete(key); acknowledged.delete(key); restored.delete(key); pending.set(key, { ...scope, ...nextWorkspaceDraftOrder() })
  clearTimeout(timer); timer = setTimeout(() => { void flushWorkspaceDrafts().catch(() => {}) }, 100)
  announce()
}
export function rememberRecoveredDraft(record: WorkspaceDraftRecord): void {
  local.set(keyOf(record), { ...record, ...nextWorkspaceDraftOrder() }); loaded.add(keyOf(record)); restored.set(keyOf(record), record); navigation = record
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('workspace-recovered-draft'))
}
export function takeRecoveredNavigation(libraryIdentity: string): WorkspaceDraftRecord | undefined {
  if (navigation?.libraryIdentity !== libraryIdentity) return
  const record = navigation; navigation = undefined; return record
}
export function recoveredWorkspaceDraft(scope: WorkspaceDraftScope): WorkspaceDraftRecord | undefined { return restored.get(keyOf(scope)) }
/** Reopening an editor in this document must retain both its input and original CAS baseline. */
export function currentWorkspaceDraft(scope: WorkspaceDraftScope): WorkspaceDraftInput | undefined { return local.get(keyOf(scope)) }
export function isWorkspaceDraftLoaded(scope: WorkspaceDraftScope): boolean { return loaded.has(keyOf(scope)) }
export function suspendRecoveredWorkspaceDraft(scope: WorkspaceDraftScope): void { loaded.delete(keyOf(scope)); announce() }
/** A received discard also withdraws this document's suspended editor copy. */
export function forgetDiscardedWorkspaceDraft(record: WorkspaceDraftRecord, order: WorkspaceDraftOrder): void {
  if (!record.owned || order.writerId !== draftWriterId) return
  const key = keyOf(record)
  discardedThrough.set(key, Math.max(discardedThrough.get(key) ?? 0, order.sequence))
  const precedes = (draft: WorkspaceDraftInput | WorkspaceDraftRemoveInput | undefined) =>
    !draft || draft.writerId === order.writerId && draft.sequence <= order.sequence
  for (const entries of [pending, failed, inFlight]) if (precedes(entries.get(key))) entries.delete(key)
  if (precedes(local.get(key))) { local.delete(key); loaded.delete(key); acknowledged.delete(key) }
  if (restored.get(key)?.id === record.id) restored.delete(key)
  if (navigation?.id === record.id) navigation = undefined
  announce()
}
export function clearWorkspaceDraftView(): void {
  ++viewEpoch
  for (const draft of [...inFlight.values(), ...failed.values(), ...pending.values()]) archive(draft)
  pending.clear(); failed.clear(); inFlight.clear(); acknowledged.clear()
  local.clear(); loaded.clear(); restored.clear(); navigation = undefined; announce()
}
export function hasPendingWorkspaceDrafts(): boolean { return pending.size > 0 || failed.size > 0 }
export function workspaceDraftSaveFailed(): boolean { return failed.size > 0 }
export async function flushWorkspaceDrafts(): Promise<void> {
  clearTimeout(timer)
  for (const [key, draft] of failed) if (!pending.has(key)) pending.set(key, draft)
  const writes = [...pending]; pending.clear()
  const epoch = viewEpoch
  for (const [key, draft] of writes) inFlight.set(key, draft)
  queue = queue.then(async () => {
    const api = getWorkspaceClient()?.drafts ?? (typeof window === 'undefined' ? undefined : (window as Window & { nativeDraftsAPI?: NativeDraftBridge }).nativeDraftsAPI)
    for (const [key, draft] of writes) {
      if (draft.sequence <= (discardedThrough.get(key) ?? 0)) continue
      if (epoch !== viewEpoch) { if (!archived.has(key)) archive(draft); continue }
      try {
        if (!api) throw Error('DRAFT_API_UNAVAILABLE')
        await prepareWorkspaceDraftWriter()
        if ('value' in draft) await api.put(draft)
        else await api.remove(draft)
        if (epoch === viewEpoch) {
          failed.delete(key)
          if ('value' in draft && !pending.has(key) && inFlight.get(key) === draft) acknowledged.add(key)
        } else if (JSON.stringify(archived.get(key)) === JSON.stringify(draft)) forgetArchivedWorkspaceDraft(draft)
      } catch {
        if (draft.sequence > (discardedThrough.get(key) ?? 0)) {
          if (epoch === viewEpoch) failed.set(key, draft); else if (!archived.has(key)) archive(draft)
        }
      }
      finally { if (inFlight.get(key) === draft) inFlight.delete(key) }
    }
    announce()
  })
  await queue
  if (failed.size) throw Error('草稿尚未暂存成功，请重新连接并重试。')
}
