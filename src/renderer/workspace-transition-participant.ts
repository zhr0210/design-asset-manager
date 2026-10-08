import type { NativeDraftBridge } from '../shared/contracts/workspace-draft.contract'
import { getWorkspaceClient } from './workspace-client'
import { flushWorkspaceDrafts, prepareWorkspaceDraftWriter } from './workspace-drafts'
import { freezeWorkspaceInput } from './workspace-input-lock'

/** Only real client events freeze input; no browser route or arbitrary IPC is used. */
export function connectTransitionParticipant(transient: () => boolean, flushExtra: () => Promise<void> = async () => {}) {
  const api = getWorkspaceClient()?.transitions ?? (window as Window & { nativeDraftsAPI?: NativeDraftBridge }).nativeDraftsAPI
  if (!api) return () => {}
  const stopFlush = api.onFlush(request => {
    if (request.freeze) freezeWorkspaceInput(true)
    void (async () => {
      let ok = true
      try { await flushExtra(); await flushWorkspaceDrafts() } catch { ok = false }
      await api.acknowledge({ id: request.id, ok, transient: transient() })
    })().catch(() => { freezeWorkspaceInput(false) })
  })
  const stopState = api.onState(state => { freezeWorkspaceInput(state.frozen) })
  void prepareWorkspaceDraftWriter().catch(() => {})
  return () => { stopFlush(); stopState(); freezeWorkspaceInput(false) }
}
