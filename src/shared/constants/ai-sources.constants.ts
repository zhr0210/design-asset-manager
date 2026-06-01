/**
 * 🤖 AI 及算法数据源别名共享常量与联合类型 (Shared AI Source Constants & Unions)
 * 作用: 规范 SQLite `tag_suggestions.source` 及 `asset_tags.source` 的写入契约，根治拼写混乱
 */

export const AI_SOURCE_RAM = 'ai_ram'
export const AI_SOURCE_RAM_PLUS = 'ai_ram_plus'
export const AI_SOURCE_FLORENCE = 'ai_florence'
export const AI_SOURCE_FLORENCE_SEMANTIC = 'ai_florence_semantic'
export const AI_SOURCE_WD_TAGGER = 'ai_wd_tagger'
export const AI_SOURCE_CLIP_DESIGN = 'ai_clip_design'
export const AI_SOURCE_DESIGN_RULE = 'design_rule'
export const AI_SOURCE_METADATA = 'metadata'
export const AI_SOURCE_COLOR_PALETTE = 'color_palette'
export const AI_SOURCE_QWEN_VL = 'ai_qwen_vl'
export const AI_SOURCE_JOYCAPTION = 'ai_joycaption'

// 所有的 AI 标签源只读常量集合
export const AI_SOURCES = [
  AI_SOURCE_RAM,
  AI_SOURCE_RAM_PLUS,
  AI_SOURCE_FLORENCE,
  AI_SOURCE_FLORENCE_SEMANTIC,
  AI_SOURCE_WD_TAGGER,
  AI_SOURCE_CLIP_DESIGN,
  AI_SOURCE_DESIGN_RULE,
  AI_SOURCE_METADATA,
  AI_SOURCE_COLOR_PALETTE,
  AI_SOURCE_QWEN_VL,
  AI_SOURCE_JOYCAPTION
] as const

// 强类型约束的 AI 标签源联合类型
export type AiSource = typeof AI_SOURCES[number]
