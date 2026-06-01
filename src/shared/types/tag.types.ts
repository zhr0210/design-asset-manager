/**
 * 🏷️ 共享标签数据类型定义 (Shared Tag Types)
 */

export interface Tag {
  id: string
  name: string
  normalized_name: string
  slug?: string | null
  type?: 'custom' | 'system' | 'ai' | string // 标签类型划分
  color?: string | null
  description?: string | null
  shorthand?: string | null
  aliases?: string | null               // 逗号分隔的别名快照
  parent_id?: string | null             // 上级标签父ID
  is_category?: number                  // 是否为分类层 (0或1)
  is_system?: number                    // 是否为系统锁定内置标签 (0或1)
  usage_count?: number                  // 被资产确认引用的次数计数
  created_at: string
  updated_at: string
}

export interface AssetTagRelation {
  id: string
  asset_id: string
  tag_id: string
  source: string                        // 标记来源 (如 manual, ai_ram_plus)
  confidence?: number                   // 决策置信度 (0.0 到 1.0)
  status: 'confirmed' | 'pending' | 'rejected' | string // 标签确认状态
  model_name?: string | null            // 判定模型名称
  model_version?: string | null         // 模型版本号
  raw_value?: string | null             // 模型预测出来的原始未经清理的英文字段
  created_by?: 'user' | 'system' | string // 创建人角色
  created_at: string
  updated_at: string
}

export interface TagAlias {
  id: string
  tag_id: string
  alias: string
  normalized_alias: string
  created_at: string
}

export interface TagRelation {
  id: string
  parent_tag_id: string
  child_tag_id: string
  relation_type?: 'parent' | 'synonym' | string
  created_at: string
}

export interface TagSuggestion {
  id: string
  asset_id: string
  tag_name: string
  tag_type?: string | null
  source?: string | null                // 打标决策模型源 (如 ai_ram_plus)
  confidence?: number | null            // 置信度
  status: 'pending' | 'confirmed' | 'rejected' | string // 建议处理状态
  model_name?: string | null            // 模型名称
  raw_payload?: string | null           // 序列化后存储的详细多源融合分及推理证据
  created_at: string
  updated_at: string
}
