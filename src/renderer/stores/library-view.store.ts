import { create } from 'zustand'
import {clearCanvasSession} from '../components/library/canvas/canvas-session'
import type { LibraryViewMode } from '../components/library/WorkspaceModes'
import type { AssetDescriptionDraft, AssetCardDraftRequest, AssetCardResult } from '../../shared/contracts/asset-card.contract'
import { completeDescriptionDraft } from '../../shared/workflows/asset-description-draft.workflow'

interface ViewState {
  scope: string | null
  mode: LibraryViewMode
  prompts: Record<string, string>
  descriptions: Record<string, AssetDescriptionDraft>
  desktopAssetId: string | null
  draftSyncFailed: boolean
  setScope(scope: string | null): void
  setMode(mode: LibraryViewMode): void
  setPrompt(assetId: string, value: string): void
  setDescription(assetId: string, value: AssetDescriptionDraft): void
  finishDescription(assetId: string, value: string, expected: string): void
  acceptDrafts(assetId: string, patch: { promptDraft?: string; descriptionDraft?: AssetDescriptionDraft }): void
  setDesktopAsset(assetId: string | null): void
}
let pending: Promise<void> = Promise.resolve()
const failed = new Map<string, AssetCardDraftRequest>()

function syncDraft(assetId: string, patch: { promptDraft?: string; descriptionDraft?: AssetDescriptionDraft }) {
  const scope = useLibraryViewStore.getState().scope
  const api = typeof window === 'undefined' ? undefined : (window as Window & { electronAPI?: { assetCard?: { updateDraft(request: AssetCardDraftRequest): Promise<AssetCardResult> } } }).electronAPI?.assetCard
  if (!scope || scope === 'compatibility' || !api?.updateDraft) return
  const [libraryIdentity, generation] = JSON.parse(scope) as [string, string]
  const request = { libraryIdentity, generation, assetId, ...patch }
  const key = `${scope}:${assetId}:${patch.promptDraft === undefined ? 'description' : 'prompt'}`
  pending = pending.then(async () => {
    if (useLibraryViewStore.getState().scope !== scope) return
    try {
      const result = await api.updateDraft(request)
      if (!result.ok) throw new Error('DRAFT_SYNC_FAILED')
      failed.delete(key)
    } catch { if (useLibraryViewStore.getState().scope === scope) failed.set(key, request) }
    if (useLibraryViewStore.getState().scope === scope) useLibraryViewStore.setState({ draftSyncFailed: failed.size > 0 })
  })
}

/** Main owns inter-window drafts; this store is the optimistic view for the application window. */
export const useLibraryViewStore = create<ViewState>((set, get) => ({
  scope: null, mode: 'library', prompts: {}, descriptions: {}, desktopAssetId: null, draftSyncFailed: false,
  setScope: scope => { if (scope !== get().scope) { failed.clear();clearCanvasSession(); set({ scope, mode: 'library', prompts: {}, descriptions: {}, desktopAssetId: null, draftSyncFailed: false }) } },
  setMode: mode => set({ mode }),
  setPrompt: (assetId, value) => { const text = value.slice(0, 32000); set(state => ({ prompts: { ...state.prompts, [assetId]: text } })); syncDraft(assetId, { promptDraft: text }) },
  setDescription: (assetId, value) => { set(state => ({ descriptions: { ...state.descriptions, [assetId]: value } })); syncDraft(assetId, { descriptionDraft: value }) },
  finishDescription: (assetId, value, expected) => { get().setDescription(assetId, completeDescriptionDraft(get().descriptions[assetId], value, expected)) },
  acceptDrafts: (assetId, patch) => set(state => ({
    ...(patch.promptDraft === undefined ? {} : { prompts: { ...state.prompts, [assetId]: patch.promptDraft } }),
    ...(patch.descriptionDraft === undefined ? {} : { descriptions: { ...state.descriptions, [assetId]: patch.descriptionDraft } })
  })),
  setDesktopAsset: desktopAssetId => set({ desktopAssetId })
}))

export async function flushLibraryDrafts() {
  await pending
  for (const request of [...failed.values()]) {
    if (request.assetId === useLibraryViewStore.getState().desktopAssetId) continue
    if (request.promptDraft !== undefined) syncDraft(request.assetId, { promptDraft: useLibraryViewStore.getState().prompts[request.assetId] ?? request.promptDraft })
    if (request.descriptionDraft !== undefined) syncDraft(request.assetId, { descriptionDraft: useLibraryViewStore.getState().descriptions[request.assetId] ?? request.descriptionDraft })
  }
  await pending
  if (failed.size) throw new Error('DRAFT_SYNC_FAILED')
}
export const libraryViewScope = (identity: string, generation: string) => JSON.stringify([identity, generation])
