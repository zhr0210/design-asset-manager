/**
 * 🎨 资产视觉类型分类共享常量与联合类型 (Shared Asset Visual Type Constants & Unions)
 * 作用: 对齐 VisualRouter 分类决策分流，整合混合类型支持
 */

export const ASSET_TYPE_ANIME = 'anime'
export const ASSET_TYPE_ILLUSTRATION = 'illustration'
export const ASSET_TYPE_PHOTO = 'photo'
export const ASSET_TYPE_PRODUCT = 'product'
export const ASSET_TYPE_DESIGN = 'design'
export const ASSET_TYPE_UI = 'ui'
export const ASSET_TYPE_DOCUMENT = 'document'
export const ASSET_TYPE_MIXED = 'mixed'
export const ASSET_TYPE_UNKNOWN = 'unknown'

// 资产类型只读常量集合
export const ASSET_TYPES = [
  ASSET_TYPE_ANIME,
  ASSET_TYPE_ILLUSTRATION,
  ASSET_TYPE_PHOTO,
  ASSET_TYPE_PRODUCT,
  ASSET_TYPE_DESIGN,
  ASSET_TYPE_UI,
  ASSET_TYPE_DOCUMENT,
  ASSET_TYPE_MIXED,
  ASSET_TYPE_UNKNOWN
] as const

// 强类型约束的资产类型联合类型
export type AssetType = typeof ASSET_TYPES[number]
