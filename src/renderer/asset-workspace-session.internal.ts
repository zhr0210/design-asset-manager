import type { ActiveLibraryHostProjection } from '../shared/contracts/active-library.contract'
import type { AssetCardChangedEvent, AssetCardDraftRequest, AssetCardReturnEvent } from '../shared/contracts/asset-card.contract'
import type { Asset } from './stores/asset.store'

type Scope = { libraryIdentity: string; generation: string }
export type WorkspaceEvent =
  | { kind: 'download-imported' | 'tool-saved' | 'ocr-changed'; scope: Scope }
  | { kind: 'visual-ai-changed'; scope: Scope & { assetId: string } }
  | { kind: 'card-drafts' | 'card-metadata'; context: AssetCardChangedEvent }
  | { kind: 'card-return'; context: AssetCardReturnEvent }

export interface WorkspaceSnapshot {
  projection: ActiveLibraryHostProjection
  error: string
  reset: { kind: 'revoked' | 'inspection-failed'; revision: number } | null
}

interface WorkspaceAdapters {
  inspect(): Promise<ActiveLibraryHostProjection>
  view: {
    getScope(): string | null
    setScope(scope: string | null): void
    acceptDrafts(assetId: string, patch: Pick<AssetCardDraftRequest, 'promptDraft' | 'descriptionDraft'>): void
    setDesktopAsset(assetId: string | null): void
    setMode(mode: 'focus'): void
  }
  assets: {
    reset(): void
    loadAssets(): Promise<void>
    loadTags(): Promise<void>
    loadAssetTags(assetId: string): Promise<void>
    selectedId(): string | undefined
    find(assetId: string): Asset | undefined
    select(asset: Asset): void
  }
  drafts: {
    hasUnsavedNotes(): boolean
    hasUnsavedOcr(): boolean
    confirmDiscard(): boolean
    clearNotes(): void
    clearOcr(): void
  }
  navigate(destination: 'library' | 'ai-console'): void
}

const unopened: ActiveLibraryHostProjection = { state: 'unopened', identity: null, generation: null }
const scopeKey = (scope: Scope) => JSON.stringify([scope.libraryIdentity, scope.generation])
const projectionScope = (projection: ActiveLibraryHostProjection) => projection.state === 'ready' && projection.identity && projection.generation
  ? scopeKey({ libraryIdentity: projection.identity, generation: projection.generation }) : null

/** Renderer presentation only. Host identity/generation and write authority stay in Main. */
export function createAssetWorkspaceSession(adapters: WorkspaceAdapters) {
  let snapshot: WorkspaceSnapshot = { projection: unopened, error: '', reset: null }
  let inspectionSequence = 0, lifetime = 0, routeLifetime = 0, appLifetime = 0, resetRevision = 0
  const listeners = new Set<() => void>()
  const publish = (next: WorkspaceSnapshot) => { snapshot = next; for (const listener of listeners) listener() }
  const adoptScope = (scope: string | null) => {
    if (scope !== adapters.view.getScope()) lifetime++
    adapters.view.setScope(scope)
  }
  const inspect = async () => {
    const sequence = ++inspectionSequence, epoch = lifetime, app = appLifetime, route = routeLifetime
    const current = () => sequence === inspectionSequence && epoch === lifetime && app === appLifetime && route === routeLifetime
    try {
      const projection = await adapters.inspect()
      if (!projection || !['unopened', 'opening', 'ready', 'quiescing', 'closed', 'recovery-required'].includes(projection.state)
        || (projection.state === 'ready' && (!projection.identity || !projection.generation))) throw Error('INVALID_AUTHORITY')
      if (!current()) return null
      adoptScope(projectionScope(projection))
      publish({ projection, error: '', reset: snapshot.reset })
      return { projection, sequence, epoch: lifetime, app, route }
    } catch (error) {
      if (!current()) return null
      if (error && typeof error === 'object' && 'preserveDrafts' in error) {
        publish({ ...snapshot, error: '本机连接已中断，当前输入尚未确认暂存。请重新连接后核对保存结果。' })
        return null
      }
      lifetime++
      adoptScope(null)
      adapters.assets.reset()
      publish({ projection: { state: 'recovery-required', identity: null, generation: null },
        error: '无法确认当前素材库状态，请重新检查或打开素材库。',
        reset: { kind: 'inspection-failed', revision: ++resetRevision } })
      return null
    }
  }
  const stillCurrent = (read: NonNullable<Awaited<ReturnType<typeof inspect>>>) => read.sequence === inspectionSequence
    && read.epoch === lifetime && read.app === appLifetime && read.route === routeLifetime
    && projectionScope(read.projection) === adapters.view.getScope()

  const refresh = async (intent: 'inspect' | 'ready-assets' | 'authority-change') => {
    let read = await inspect()
    if (intent === 'inspect' || !read || read.projection.state !== 'ready' || !stillCurrent(read)) return
    // Keep the controls' original two inspections and their await checkpoint.
    if (intent === 'authority-change') read = await inspect()
    if (!read || read.projection.state !== 'ready' || !stillCurrent(read)) return
    await Promise.all([adapters.assets.loadAssets(), adapters.assets.loadTags()])
  }
  const revoke = () => {
    if ((adapters.drafts.hasUnsavedNotes() || adapters.drafts.hasUnsavedOcr()) && !adapters.drafts.confirmDiscard()) {
      throw Error('已取消切换，笔记草稿保留。')
    }
    adapters.drafts.clearNotes(); adapters.drafts.clearOcr()
    lifetime++; inspectionSequence++
    adoptScope(null)
    publish({ projection: { state: 'quiescing', identity: null, generation: null }, error: snapshot.error,
      reset: { kind: 'revoked', revision: ++resetRevision } })
    adapters.assets.reset()
  }
  const receive = async (event: WorkspaceEvent) => {
    if (event.kind === 'card-return') {
      const epoch = lifetime, app = appLifetime, sequence = inspectionSequence, context = event.context
      try {
        const current = await adapters.inspect()
        if (epoch !== lifetime || app !== appLifetime || sequence !== inspectionSequence
          || current?.state !== 'ready' || current.identity !== context.libraryIdentity || current.generation !== context.generation) return
        adoptScope(scopeKey(context))
        adapters.view.acceptDrafts(context.assetId, context)
        adapters.view.setDesktopAsset(null)
        adapters.view.setMode('focus')
        const asset = adapters.assets.find(context.assetId)
        if (asset) adapters.assets.select(asset)
        adapters.navigate(context.configureAi ? 'ai-console' : 'library')
      } catch { /* A failed authority check must not restore stale window state. */ }
      return
    }
    const scope = 'scope' in event ? event.scope : event.context
    if (adapters.view.getScope() !== scopeKey(scope)) return
    switch (event.kind) {
      case 'card-drafts':
        adapters.view.acceptDrafts(event.context.assetId, event.context)
        if (event.context.windowSelectionChanged) adapters.view.setDesktopAsset(event.context.assetId)
        return
      case 'card-metadata':
        if (event.context.metadataChanged) await adapters.assets.loadAssets()
        return
      case 'ocr-changed': await adapters.assets.loadAssets(); return
      case 'visual-ai-changed':
        await Promise.all([adapters.assets.loadAssets(), adapters.assets.loadTags(),
          ...(adapters.assets.selectedId() === event.scope.assetId ? [adapters.assets.loadAssetTags(event.scope.assetId)] : [])])
        return
      case 'download-imported': case 'tool-saved':
        await Promise.all([adapters.assets.loadAssets(), adapters.assets.loadTags()])
    }
  }
  return {
    refresh, revoke, receive,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener); routeLifetime++ }
    },
    // Shell unmount cancels callbacks, never clears saved content or draft owners.
    disconnect: () => { appLifetime++; inspectionSequence++ }
  }
}
export type AssetWorkspaceSession = ReturnType<typeof createAssetWorkspaceSession>
