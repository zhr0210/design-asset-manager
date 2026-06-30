import type { AssetTagService } from '../asset-tag.service'
import type { TagService } from '../tag.service'
import type { AiTagSuggestionProjection } from './ai-result-sync.projector'

export interface AiTagSuggestionSyncInput {
  db: {
    prepare: (sql: string) => {
      get?: (...args: any[]) => unknown
      run?: (...args: any[]) => unknown
    }
  }
  tagService: Pick<TagService, 'listTags' | 'createTag'>
  assetTagService: Pick<AssetTagService, 'addTagToAsset'>
  assetId: string
  suggestion: AiTagSuggestionProjection
  now: string
}

export function syncProjectedAiTagSuggestion(input: AiTagSuggestionSyncInput): void {
  const { db, tagService, assetTagService, assetId, suggestion, now } = input

  const sugExists = db.prepare(`
    SELECT 1 FROM tag_suggestions
    WHERE asset_id = ? AND tag_name = ? AND source = ? AND model_name = ?
  `).get?.(assetId, suggestion.tagName, suggestion.source, suggestion.modelName)

  if (!sugExists) {
    const sugId = `sug-${Math.random().toString(36).substr(2, 9)}`
    db.prepare(`
      INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `).run?.(
      sugId,
      assetId,
      suggestion.tagName,
      suggestion.tagType,
      suggestion.source,
      suggestion.confidence,
      suggestion.modelName,
      suggestion.rawPayload,
      now,
      now
    )
  }

  const tagList = tagService.listTags({ searchQuery: suggestion.tagName, type: suggestion.tagType })
  const tagId = tagList[0]?.id ?? tagService.createTag({
    name: suggestion.tagName,
    type: suggestion.tagType,
    color: 'bg-purple-50 text-purple-700 border border-purple-200'
  }).id

  assetTagService.addTagToAsset(assetId, tagId, {
    source: suggestion.source,
    confidence: suggestion.confidence,
    status: 'pending',
    modelName: suggestion.modelName,
    createdBy: 'ai'
  })
}
