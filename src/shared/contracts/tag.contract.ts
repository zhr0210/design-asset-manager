import { Tag, AssetTagRelation, TagSuggestion } from '../types/tag.types'
import { Asset } from '../types/asset.types'

/**
 * 🏷️ 标签及打标系统通信契约与 IPC 通道常量 (Shared Tag & AssetTag IPC Contracts)
 */

// Tag CRUD Channels
export const CHANNEL_TAG_CREATE = 'tag:create'
export const CHANNEL_TAG_UPDATE = 'tag:update'
export const CHANNEL_TAG_DELETE = 'tag:delete'
export const CHANNEL_TAG_MERGE = 'tag:merge'
export const CHANNEL_TAG_GET = 'tag:get'
export const CHANNEL_TAG_LIST = 'tag:list'
export const CHANNEL_TAG_SEARCH = 'tag:search'
export const CHANNEL_TAG_CREATE_ALIAS = 'tag:create-alias'
export const CHANNEL_TAG_REMOVE_ALIAS = 'tag:remove-alias'
export const CHANNEL_TAG_SET_PARENT = 'tag:set-parent'

// Asset Tagging Channels
export const CHANNEL_ASSET_TAG_ADD = 'asset-tag:add'
export const CHANNEL_ASSET_TAG_REMOVE = 'asset-tag:remove'
export const CHANNEL_ASSET_TAG_BATCH_ADD = 'asset-tag:batch-add'
export const CHANNEL_ASSET_TAG_BATCH_REMOVE = 'asset-tag:batch-remove'
export const CHANNEL_ASSET_TAG_REPLACE = 'asset-tag:replace'
export const CHANNEL_ASSET_TAG_LIST_BY_ASSET = 'asset-tag:list-by-asset'
export const CHANNEL_ASSET_TAG_CONFIRM_AI = 'asset-tag:confirm-ai'
export const CHANNEL_ASSET_TAG_REJECT_AI = 'asset-tag:reject-ai'

// Tag Search Channels
export const CHANNEL_TAG_SEARCH_ASSETS = 'tag-search:assets'
export const CHANNEL_TAG_SEARCH_UNTAGGED = 'tag-search:untagged'
export const CHANNEL_TAG_SEARCH_AI_PENDING = 'tag-search:ai-pending'

// Mock AI suggestions Channels
export const CHANNEL_MOCK_AI_GENERATE_SUGGESTIONS = 'mock-ai:generate-suggestions'

// DTOs
export interface CreateTagRequest {
  name: string
  type?: string
  color?: string
  description?: string
  parentId?: string | null
  isCategory?: boolean
}

export interface TagResponse {
  success: boolean
  tag?: Tag
  error?: string
}

export interface ListTagsResponse {
  success: boolean
  tags?: Tag[]
  error?: string
}

export interface UpdateTagRequest {
  id: string
  input: Partial<Tag>
}

export interface MergeTagsRequest {
  sourceTagId: string
  targetTagId: string
}

export interface CreateAliasRequest {
  tagId: string
  alias: string
}

export interface SetParentRequest {
  tagId: string
  parentId: string | null
}

export interface AssetTagOptions {
  source?: string
  confidence?: number
  modelName?: string
  modelVersion?: string
  rawValue?: string
}

export interface AddAssetTagRequest {
  assetId: string
  tagId: string
  options?: AssetTagOptions
}

export interface AddAssetTagResponse {
  success: boolean
  relation?: AssetTagRelation
  error?: string
}

export interface BatchAddAssetTagsRequest {
  assetIds: string[]
  tagIds: string[]
  options?: AssetTagOptions
}

export interface ListAssetTagsResponse {
  success: boolean
  relations?: AssetTagRelation[]
  error?: string
}

export interface TagSearchAssetsResponse {
  success: boolean
  assets?: Asset[]
  error?: string
}

export interface MockAiSuggestionsResponse {
  success: boolean
  suggestions?: TagSuggestion[]
  error?: string
}
