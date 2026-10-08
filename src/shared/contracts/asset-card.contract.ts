import type { ActiveLibraryAssetProjection } from './active-library.contract'

export const CHANNEL_ASSET_CARD_OPEN = 'asset-card:open'
export const CHANNEL_ASSET_CARD_INSPECT = 'asset-card:inspect'
export const CHANNEL_ASSET_CARD_ACTION = 'asset-card:action'
export const CHANNEL_ASSET_CARD_DRAFT = 'asset-card:draft'
export const EVENT_ASSET_CARD_STATE = 'asset-card:state'
export const EVENT_ASSET_CARD_RETURN = 'asset-card:return'
export const EVENT_ASSET_CARD_CHANGED = 'asset-card:changed'

export interface AssetCardContext { libraryIdentity: string; generation: string; assetId: string }
export interface AssetDescriptionDraft { value: string; baseCaption: string }
export interface AssetCardOpenRequest extends AssetCardContext { assetIds?: string[] }
export interface AssetCardDraftRequest extends AssetCardContext { promptDraft?: string; descriptionDraft?: AssetDescriptionDraft }
export interface AssetCardChangedEvent extends AssetCardContext { promptDraft?: string; descriptionDraft?: AssetDescriptionDraft; metadataChanged?: true; windowSelectionChanged?: true }
export interface AssetCardReturnEvent extends AssetCardContext { configureAi: boolean; promptDraft: string; descriptionDraft: AssetDescriptionDraft }
export interface AssetCardSnapshot {
  token: string
  context: AssetCardContext
  asset: ActiveLibraryAssetProjection
  previewUrl: string
  pinned: boolean
  promptDraft: string
  descriptionDraft: AssetDescriptionDraft
  canPrevious: boolean
  canNext: boolean
}
export type AssetCardAction = { token: string } & (
  | { kind: 'close' | 'return' | 'configure-ai' | 'previous' | 'next' }
  | { kind: 'pin'; pinned: boolean }
  | { kind: 'prompt-draft'; value: string }
  | { kind: 'description-draft'; value: string; baseCaption: string }
  | { kind: 'save-description'; value: string; expectedCaption: string }
)
export type AssetCardResult = { ok: true; state: AssetCardSnapshot | null } | { ok: false; code: 'UNTRUSTED_SENDER' | 'INVALID_REQUEST' | 'ASSET_UNAVAILABLE' | 'STALE_CARD' | 'DESCRIPTION_CONFLICT' | 'CARD_UNAVAILABLE' }
export interface AssetCardApi {
  inspect(): Promise<AssetCardResult>
  act(action: AssetCardAction): Promise<AssetCardResult>
  onState(listener: (state: AssetCardSnapshot | null) => void): () => void
}
