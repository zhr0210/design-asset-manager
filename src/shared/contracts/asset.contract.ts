import { Asset, AssetFilters } from '../types/asset.types'

/**
 * 📦 资产通信契约与 IPC 通道常量 (Shared Asset IPC Contracts)
 */

export const CHANNEL_ASSETS_LIST = 'assets:list'
export const CHANNEL_ASSETS_SAVE = 'assets:save'
export const CHANNEL_ASSETS_DELETE = 'assets:delete'
export const CHANNEL_ASSETS_SAVE_CUSTOM_CATEGORY = 'assets:save-custom-category'
export const CHANNEL_ASSETS_GET_CUSTOM_CATEGORY = 'assets:get-custom-category'
export const CHANNEL_ASSETS_UPDATE_CAPTION = 'assets:update-caption'
export const CHANNEL_ASSETS_RESET_CAPTION_EDITED = 'assets:reset-caption-edited'

// DTOs
export interface ListAssetsRequest {
  filters?: AssetFilters
}

export interface ListAssetsResponse {
  success: boolean
  assets?: Asset[]
  error?: string
}

export interface SaveAssetRequest {
  asset: Partial<Asset>
  tags?: string[]
}

export interface SaveAssetResponse {
  success: boolean
  id?: string
  error?: string
}

export interface DeleteAssetRequest {
  id: string
}

export interface DeleteAssetResponse {
  success: boolean
  error?: string
}

export interface SaveCustomCategoryRequest {
  assetId: string
  category: string
}

export interface SaveCustomCategoryResponse {
  success: boolean
  error?: string
}

export interface GetCustomCategoryResponse {
  success: boolean
  category?: string | null
  error?: string
}

export interface UpdateAssetCaptionRequest {
  assetId: string
  caption: string
}

export interface UpdateAssetCaptionResponse {
  success: boolean
  error?: string
}

export interface ResetAssetCaptionEditedRequest {
  assetId: string
}

export interface ResetAssetCaptionEditedResponse {
  success: boolean
  error?: string
}
