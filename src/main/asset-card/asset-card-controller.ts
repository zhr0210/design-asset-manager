import { randomUUID } from 'node:crypto'
import { normalizeDescriptionDraft, completeDescriptionDraft } from '../../shared/workflows/asset-description-draft.workflow'
import type { ActiveLibraryHost } from '../../shared/contracts/active-library.contract'
import type { AssetCardAction, AssetCardContext, AssetCardOpenRequest, AssetCardResult, AssetCardSnapshot, AssetDescriptionDraft, AssetCardChangedEvent, AssetCardDraftRequest } from '../../shared/contracts/asset-card.contract'

export interface AssetCardWindow {
  publish(state: AssetCardSnapshot | null): void
  show(): void
  setPinned(value: boolean): void
  close(): void
  isTrusted(event: unknown): boolean
}

/** A window owns one checked Library generation. It never receives a path or a database. */
export function createAssetCardController(deps: {
  host: Pick<ActiveLibraryHost, 'inspect' | 'readAssetContext' | 'updateAssetCaption'>
  createWindow(onClosed: () => void): AssetCardWindow
  returnToWorkspace(context: AssetCardContext, configureAi: boolean, promptDraft: string, descriptionDraft: AssetDescriptionDraft, owner: string): void
  onChanged(event: AssetCardChangedEvent, owner: string): void
  onCardReleased?(token: string): void
}) {
  let state: AssetCardSnapshot | null = null
  let owner = 'native:0'
  let window: AssetCardWindow | undefined
  let epoch = 0
  let tail: Promise<unknown> = Promise.resolve()
  let order: string[] = []
  const drafts = new Map<string, string>()
  const descriptions = new Map<string, AssetDescriptionDraft>()
  const draftKey = (context: AssetCardContext, workspace = owner) => JSON.stringify([workspace,context])
  const matches = (context: AssetCardContext) => {
    const authority = deps.host.inspect()
    return authority.state === 'ready' && authority.identity === context.libraryIdentity && authority.generation === context.generation
  }
  const close = () => {
    if (state) deps.onCardReleased?.(state.token)
    epoch++
    state = null
    order = []
    const previous = window
    window = undefined
    previous?.publish(null)
    previous?.close()
  }
  const invalidate = () => { drafts.clear(); descriptions.clear(); close() }
  const inspect = (): AssetCardSnapshot | null => {
    if (state && !matches(state.context)) invalidate()
    return state
  }
  const enqueue = (operation: () => Promise<AssetCardResult>): Promise<AssetCardResult> => {
    const queuedEpoch = epoch
    const task = tail.then(() => queuedEpoch === epoch ? operation() : { ok: false as const, code: 'STALE_CARD' as const })
      .catch((): AssetCardResult => ({ ok: false, code: 'CARD_UNAVAILABLE' }))
    tail = task
    return task
  }
  const publish = () => { try { window?.publish(state) } catch { /* A notification cannot undo a committed save. */ } }
  const descriptionFor = (context: AssetCardContext, caption: string): AssetDescriptionDraft => {
    return normalizeDescriptionDraft(descriptions.get(draftKey(context)), caption)
  }
  const syncDraft = async (input: AssetCardDraftRequest, workspace = 'native:0'): Promise<AssetCardResult> => {
    if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['libraryIdentity', 'generation', 'assetId', 'promptDraft', 'descriptionDraft'].includes(key)) ||
      !opaque(input.libraryIdentity) || !opaque(input.generation) || !opaque(input.assetId) ||
      (input.promptDraft !== undefined && (typeof input.promptDraft !== 'string' || input.promptDraft.length > 32000)) ||
      (input.descriptionDraft !== undefined && !validDescription(input.descriptionDraft))) return { ok: false, code: 'INVALID_REQUEST' }
    if (!matches(input)) return { ok: false, code: 'STALE_CARD' }
    const context = { libraryIdentity: input.libraryIdentity, generation: input.generation, assetId: input.assetId }
    if (input.promptDraft !== undefined) drafts.set(draftKey(context, workspace), input.promptDraft)
    if (input.descriptionDraft !== undefined) descriptions.set(draftKey(context, workspace), { ...input.descriptionDraft })
    if (workspace === owner && state && draftKey(state.context) === draftKey(context)) {
      state = { ...state, promptDraft: drafts.get(draftKey(context)) ?? '', descriptionDraft: descriptions.get(draftKey(context)) ?? state.descriptionDraft }
      publish()
    }
    return { ok: true, state: null }
  }
  const refresh = async (): Promise<void> => {
    const current = inspect()
    if (!current) return
    const before = epoch
    try {
      const asset = (await deps.host.readAssetContext([current.context.assetId])).assets.find(item => item.id === current.context.assetId)
      if (epoch !== before || state?.token !== current.token) return
      if (!asset || !matches(current.context)) { invalidate(); return }
      const descriptionDraft = normalizeDescriptionDraft(descriptions.get(draftKey(current.context)) ?? state!.descriptionDraft, asset.aiCaption)
      descriptions.set(draftKey(current.context), descriptionDraft)
      state = { ...state!, asset, descriptionDraft }
      publish()
    } catch { if (epoch === before) invalidate() }
  }
  const open = (input: AssetCardOpenRequest, workspace = 'native:0'): Promise<AssetCardResult> => enqueue(async () => {
    if (!validOpen(input)) return { ok: false, code: 'INVALID_REQUEST' }
    if (!matches(input)) return { ok: false, code: 'ASSET_UNAVAILABLE' }
    if (owner === workspace && state && window && state.context.assetId === input.assetId && state.context.libraryIdentity === input.libraryIdentity && state.context.generation === input.generation) {
      window.show(); return { ok: true, state }
    }
    const before = epoch
    const requested = input.assetIds?.includes(input.assetId) ? input.assetIds : [input.assetId]
    const assets = (await deps.host.readAssetContext(requested)).assets
    if (before !== epoch || !matches(input)) return { ok: false, code: 'STALE_CARD' }
    const asset = assets.find(item => item.id === input.assetId)
    if (!asset) return { ok: false, code: 'ASSET_UNAVAILABLE' }
    const context: AssetCardContext = { libraryIdentity: input.libraryIdentity, generation: input.generation, assetId: asset.id }
    if (state) { deps.returnToWorkspace(state.context, false, state.promptDraft, state.descriptionDraft, owner); deps.onCardReleased?.(state.token) }
    owner = workspace
    const available = new Set(assets.map(item => item.id))
    order = (input.assetIds ?? [input.assetId]).filter(id => available.has(id))
    if (!order.includes(asset.id)) order = [asset.id]
    state = {
      token: randomUUID(), context, asset,
      previewUrl: `dam-preview://preview/${[context.libraryIdentity, context.generation, asset.id].map(encodeURIComponent).join('/')}`,
      pinned: state?.pinned ?? true, promptDraft: drafts.get(draftKey(context)) ?? '',
      descriptionDraft: descriptionFor(context, asset.aiCaption),
      canPrevious: order.indexOf(asset.id) > 0, canNext: order.indexOf(asset.id) < order.length - 1
    }
    if (!window) {
      const created = deps.createWindow(() => {
        if (window !== created) return
        const previous = state
        if (previous) deps.onCardReleased?.(previous.token)
        window = undefined; state = null; order = []; epoch++
        if (previous && matches(previous.context)) deps.returnToWorkspace(previous.context, false, previous.promptDraft, previous.descriptionDraft, owner)
      })
      window = created
    }
    window.setPinned(state.pinned)
    publish()
    window.show()
    return { ok: true, state }
  })
  const act = (action: AssetCardAction): Promise<AssetCardResult> => enqueue(async () => {
    if (!validAction(action)) return { ok: false, code: 'INVALID_REQUEST' }
    const current = inspect()
    if (!current || current.token !== action.token) return { ok: false, code: 'STALE_CARD' }
    if (action.kind === 'close') { deps.returnToWorkspace(current.context, false, current.promptDraft, current.descriptionDraft, owner); close(); return { ok: true, state: null } }
    if (action.kind === 'return' || action.kind === 'configure-ai') {
      deps.returnToWorkspace(current.context, action.kind === 'configure-ai', current.promptDraft, current.descriptionDraft, owner)
      close(); return { ok: true, state: null }
    }
    if (action.kind === 'pin') { state = { ...current, pinned: action.pinned }; window?.setPinned(action.pinned) }
    if (action.kind === 'prompt-draft') {
      drafts.set(draftKey(current.context), action.value)
      state = { ...current, promptDraft: action.value }
      deps.onChanged({ ...current.context, promptDraft: action.value }, owner)
    }
    if (action.kind === 'description-draft') {
      const descriptionDraft = { value: action.value, baseCaption: action.baseCaption }
      descriptions.set(draftKey(current.context), descriptionDraft)
      state = { ...current, descriptionDraft }
      deps.onChanged({ ...current.context, descriptionDraft }, owner)
    }
    if (action.kind === 'save-description') {
      const before = epoch
      try { await deps.host.updateAssetCaption(current.context.assetId, action.value, action.expectedCaption) }
      catch { await refresh(); return { ok: false, code: matches(current.context) ? 'DESCRIPTION_CONFLICT' : 'STALE_CARD' } }
      if (epoch !== before || !matches(current.context)) return { ok: false, code: 'STALE_CARD' }
      const descriptionDraft = completeDescriptionDraft(descriptions.get(draftKey(current.context)), action.value, action.expectedCaption)
      descriptions.set(draftKey(current.context), descriptionDraft)
      deps.onChanged({ ...current.context, descriptionDraft, metadataChanged: true }, owner)
      await refresh()
    }
    if (action.kind === 'previous' || action.kind === 'next') {
      const target = order[order.indexOf(current.context.assetId) + (action.kind === 'previous' ? -1 : 1)]
      if (!target) return { ok: false, code: 'ASSET_UNAVAILABLE' }
      const before = epoch
      const asset = (await deps.host.readAssetContext([target])).assets.find(item => item.id === target)
      if (before !== epoch || !matches(current.context)) return { ok: false, code: 'STALE_CARD' }
      if (!asset) { await refresh(); return { ok: false, code: 'ASSET_UNAVAILABLE' } }
      const context = { ...current.context, assetId: asset.id }
      deps.onCardReleased?.(current.token)
      state = { ...current, token: randomUUID(), context, asset, promptDraft: drafts.get(draftKey(context)) ?? '',
        descriptionDraft: descriptionFor(context, asset.aiCaption),
        previewUrl: `dam-preview://preview/${[context.libraryIdentity, context.generation, asset.id].map(encodeURIComponent).join('/')}`,
        canPrevious: order.indexOf(asset.id) > 0, canNext: order.indexOf(asset.id) < order.length - 1 }
      deps.onChanged({ ...context, windowSelectionChanged: true }, owner)
    }
    publish()
    return { ok: true, state: inspect() }
  })
  return { open, act, syncDraft, inspect, refresh, invalidate, close, isTrusted: (event: unknown) => Boolean(window?.isTrusted(event)) }
}

const opaque = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(value)
function validOpen(value: AssetCardOpenRequest): boolean {
  return Boolean(value && typeof value === 'object' && Object.keys(value).every(key => ['libraryIdentity', 'generation', 'assetId', 'assetIds'].includes(key)) &&
    opaque(value.libraryIdentity) && opaque(value.generation) && opaque(value.assetId) &&
    (value.assetIds === undefined || Array.isArray(value.assetIds) && value.assetIds.length <= 500 && value.assetIds.every(opaque) && new Set(value.assetIds).size === value.assetIds.length))
}
function validAction(value: AssetCardAction): boolean {
  if (!value || typeof value !== 'object' || !opaque(value.token)) return false
  const extra = value.kind === 'pin' ? ['pinned'] : value.kind === 'prompt-draft' ? ['value'] : value.kind === 'save-description' ? ['value', 'expectedCaption'] : value.kind === 'description-draft' ? ['value', 'baseCaption'] : []
  if (Object.keys(value).some(key => !['kind', 'token', ...extra].includes(key))) return false
  if (value.kind === 'pin') return typeof value.pinned === 'boolean'
  if (value.kind === 'prompt-draft') return typeof value.value === 'string' && value.value.length <= 32000
  if (value.kind === 'description-draft') return validDescription({ value: value.value, baseCaption: value.baseCaption })
  if (value.kind === 'save-description') return typeof value.value === 'string' && value.value.length <= 32000 && typeof value.expectedCaption === 'string' && value.expectedCaption.length <= 32000
  return ['close', 'return', 'configure-ai', 'previous', 'next'].includes(value.kind)
}

function validDescription(value: AssetDescriptionDraft): boolean {
  return Boolean(value && typeof value === 'object' && Object.keys(value).every(key => key === 'value' || key === 'baseCaption') && typeof value.value === 'string' && value.value.length <= 32000 && typeof value.baseCaption === 'string' && value.baseCaption.length <= 32000)
}
